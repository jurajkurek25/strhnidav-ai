"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { createPlayer, startMicrophone } from "@/lib/live-audio";

type Entry = { role: "user" | "ai"; text: string };
type Usage = {
  turns: number;
  input: Record<string, number>;
  output: Record<string, number>;
  max_prompt_tokens: number;
};
type Phase = "setup" | "connecting" | "live" | "evaluating";

const DIFFICULTY_OPTIONS = [
  { id: "easy", label: "Ľahká" },
  { id: "medium", label: "Stredná" },
  { id: "hard", label: "Ťažká" },
];

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Trainer({
  scenarioId,
  isCustom,
  availableSeconds,
}: {
  scenarioId: string;
  isCustom: boolean;
  availableSeconds: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState("medium");
  const [customContext, setCustomContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Entry[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);

  const transcriptRef = useRef<Entry[]>([]);
  const usageRef = useRef<Usage>({ turns: 0, input: {}, output: {}, max_prompt_tokens: 0 });
  const sessionIdRef = useRef<string | null>(null);
  const liveRef = useRef<Session | null>(null);
  const micRef = useRef<Awaited<ReturnType<typeof startMicrophone>> | null>(null);
  const playerRef = useRef<ReturnType<typeof createPlayer> | null>(null);
  const endingRef = useRef(false);
  const resumeHandleRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  function addText(role: Entry["role"], text?: string) {
    if (!text) return;
    const list = transcriptRef.current;
    const last = list[list.length - 1];
    if (last?.role === role) last.text += text;
    else list.push({ role, text: text.trimStart() });
    setTranscript(list.map((e) => ({ ...e })));
  }

  function onMessage(msg: LiveServerMessage) {
    const content = msg.serverContent;
    if (content?.interrupted) playerRef.current?.interrupt();
    const audio = msg.data;
    if (audio) playerRef.current?.play(audio);
    addText("user", content?.inputTranscription?.text);
    addText("ai", content?.outputTranscription?.text);
    // Spotreba tokenov – Gemini ju posiela po každej výmene
    const um = msg.usageMetadata;
    if (um) {
      const u = usageRef.current;
      u.turns++;
      u.max_prompt_tokens = Math.max(u.max_prompt_tokens, um.promptTokenCount ?? 0);
      for (const d of um.promptTokensDetails ?? []) {
        const m = d.modality ?? "UNKNOWN";
        u.input[m] = (u.input[m] ?? 0) + (d.tokenCount ?? 0);
      }
      for (const d of um.responseTokensDetails ?? []) {
        const m = d.modality ?? "UNKNOWN";
        u.output[m] = (u.output[m] ?? 0) + (d.tokenCount ?? 0);
      }
    }
    if (msg.sessionResumptionUpdate?.resumable && msg.sessionResumptionUpdate.newHandle) {
      resumeHandleRef.current = msg.sessionResumptionUpdate.newHandle;
    }
  }

  async function connect(ai: GoogleGenAI, model: string) {
    const live = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        sessionResumption: resumeHandleRef.current ? { handle: resumeHandleRef.current } : {},
      },
      callbacks: {
        onmessage: onMessage,
        onerror: (e) => console.error("Gemini Live error", e),
        onclose: () => {
          if (endingRef.current) return;
          // Gemini spojenie po čase zatvára (goAway) – pokračujeme cez resumption handle
          if (resumeHandleRef.current) {
            connect(ai, model).catch(() => void finish());
          } else {
            void finish();
          }
        },
      },
    });
    liveRef.current = live;
    return live;
  }

  async function start() {
    setError(null);
    setPhase("connecting");
    // Audio kontext treba vytvoriť priamo po kliknutí (autoplay pravidlá)
    const player = createPlayer();
    playerRef.current = player;
    await player.resume();

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId, difficulty, customContext }),
    });
    const data = await res.json();
    if (!res.ok) {
      player.close();
      setError(data.error ?? "Niečo sa pokazilo");
      setPhase("setup");
      return;
    }
    sessionIdRef.current = data.sessionId;

    try {
      const ai = new GoogleGenAI({ apiKey: data.token, httpOptions: { apiVersion: "v1alpha" } });
      const live = await connect(ai, data.model);
      micRef.current = await startMicrophone((pcm, level) => {
        liveRef.current?.sendRealtimeInput({ audio: { data: pcm, mimeType: "audio/pcm;rate=16000" } });
        setMicLevel(level);
      });
      // AI začína rozhovor
      live.sendClientContent({
        turns: [{ role: "user", parts: [{ text: "(Rozhovor sa začína. Začni ty podľa svojej roly.)" }] }],
        turnComplete: true,
      });
    } catch (e) {
      console.error(e);
      await finish(false);
      setError("Nepodarilo sa spustiť mikrofón alebo pripojiť k AI. Povoľ prístup k mikrofónu.");
      return;
    }

    const startedAt = Date.now();
    setRemaining(data.allowedSeconds);
    setPhase("live");
    timersRef.current.push(
      setInterval(() => {
        const left = data.allowedSeconds - (Date.now() - startedAt) / 1000;
        setRemaining(left);
        setAiSpeaking(playerRef.current?.speaking ?? false);
        if (left <= 0) void finish();
      }, 250),
      setInterval(() => {
        fetch(`/api/sessions/${data.sessionId}/heartbeat`, { method: "POST" })
          .then((r) => {
            if (r.status === 409) void finish();
          })
          .catch(() => {}); // krátky výpadok siete nevadí, ďalší heartbeat to dorovná
      }, 15000),
    );
  }

  async function finish(redirect = true) {
    if (endingRef.current) return;
    endingRef.current = true;
    timersRef.current.forEach(clearInterval);
    micRef.current?.stop();
    liveRef.current?.close();
    playerRef.current?.close();

    const id = sessionIdRef.current;
    if (redirect) setPhase("evaluating");
    await fetch(`/api/sessions/${id}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: transcriptRef.current, usage: usageRef.current }),
    });
    if (redirect) {
      router.push(`/sessions/${id}`);
      return;
    }
    // Späť na nastavenie – pripraviť na nový pokus
    sessionIdRef.current = null;
    resumeHandleRef.current = null;
    transcriptRef.current = [];
    usageRef.current = { turns: 0, input: {}, output: {}, max_prompt_tokens: 0 };
    timersRef.current = [];
    endingRef.current = false;
    setTranscript([]);
    setPhase("setup");
  }

  // Zatvorenie karty počas rozhovoru – session uložiť a zaúčtovať
  useEffect(() => {
    const onHide = () => {
      if (sessionIdRef.current && !endingRef.current) {
        endingRef.current = true;
        navigator.sendBeacon(
          `/api/sessions/${sessionIdRef.current}/end`,
          new Blob([JSON.stringify({ transcript: transcriptRef.current, usage: usageRef.current })], {
            type: "application/json",
          }),
        );
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  if (phase === "setup" || phase === "connecting") {
    return (
      <div className="mt-8 space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Náročnosť</p>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  difficulty === d.id ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-zinc-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">
            {isCustom ? "Opíš situáciu a rolu partnera" : "Doplňujúci kontext (nepovinné)"}
          </p>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={
              isCustom
                ? "Napr. Som realitný maklér, volám klientovi, ktorý zvažuje predaj bytu…"
                : "Napr. hlásim sa na pozíciu junior marketéra"
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-amber-400"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={start}
          disabled={phase === "connecting" || availableSeconds < 60}
          className="w-full rounded-xl bg-amber-400 px-6 py-4 text-lg font-semibold text-zinc-950 disabled:opacity-50"
        >
          {phase === "connecting" ? "Pripájam…" : "Začať rozhovor"}
        </button>
        <p className="text-center text-xs text-zinc-500">
          Dostupný čas: {formatTime(availableSeconds)} · Použi slúchadlá pre najlepší zážitok
        </p>
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
        <p className="text-lg font-medium">Vyhodnocujem tvoj rozhovor…</p>
        <p className="text-sm text-zinc-400">Zvyčajne to trvá do 20 sekúnd.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-zinc-900 p-8">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full transition-all ${
            aiSpeaking ? "bg-amber-400/30 ring-4 ring-amber-400" : "bg-zinc-800"
          }`}
          style={{ transform: `scale(${aiSpeaking ? 1.05 : 1 + Math.min(micLevel * 3, 0.25)})` }}
        >
          <span className="text-sm font-medium">{aiSpeaking ? "Hovorí AI" : muted ? "Stlmené" : "Počúvam"}</span>
        </div>
        <p className={`font-mono text-2xl ${remaining < 60 ? "text-red-400" : ""}`}>{formatTime(remaining)}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              micRef.current?.setMuted(!muted);
              setMuted(!muted);
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            {muted ? "Zapnúť mikrofón" : "Stlmiť"}
          </button>
          <button onClick={() => void finish()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold">
            Ukončiť a vyhodnotiť
          </button>
        </div>
      </div>

      <div className="max-h-[40vh] space-y-3 overflow-y-auto rounded-2xl border border-zinc-800 p-4">
        {transcript.length === 0 && <p className="text-sm text-zinc-500">Tu sa zobrazí prepis rozhovoru…</p>}
        {transcript.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                t.role === "user" ? "bg-amber-400 text-zinc-950" : "bg-zinc-800"
              }`}
            >
              {t.text}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
