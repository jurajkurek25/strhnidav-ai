import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";
import type { Scenario } from "@/lib/scenarios";

export const LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-native-audio-preview-12-2025";
export const EVAL_MODEL = process.env.GEMINI_EVAL_MODEL ?? "gemini-2.5-flash";

function client(apiVersion?: string) {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    ...(apiVersion ? { httpOptions: { apiVersion } } : {}),
  });
}

// Krátkodobý token pre prehliadač. Model, rola a hlas sú v tokene uzamknuté,
// takže klient ich nemôže zmeniť. Po expireTime Gemini session ukončí –
// to je tvrdý strop na fair-use/kredity.
export async function createLiveToken(opts: {
  systemInstruction: string;
  voice: string;
  allowedSeconds: number;
}) {
  const expire = new Date(Date.now() + (opts.allowedSeconds + 15) * 1000).toISOString();
  const token = await client("v1alpha").authTokens.create({
    config: {
      uses: 1,
      expireTime: expire,
      // Povoliť opätovné pripojenie (session resumption) počas celej session
      newSessionExpireTime: expire,
      liveConnectConstraints: {
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: opts.systemInstruction,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          contextWindowCompression: { slidingWindow: {} },
        },
      },
      // Uzamknúť iba polia nastavené vyššie; sessionResumption nastavuje klient
      lockAdditionalFields: [],
    },
  });
  if (!token.name) throw new Error("Nepodarilo sa vytvoriť Gemini token");
  return token.name;
}

export type TranscriptEntry = { role: "user" | "ai"; text: string };

export type Evaluation = {
  overall_score: number;
  summary: string;
  categories: { name: string; score: number; comment: string }[];
  strengths: string[];
  improvements: string[];
  key_moments: { quote: string; feedback: string }[];
  next_exercise: string;
};

const EVALUATION_SCHEMA = {
  type: "object",
  properties: {
    overall_score: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 10 },
          comment: { type: "string" },
        },
        required: ["name", "score", "comment"],
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    key_moments: {
      type: "array",
      items: {
        type: "object",
        properties: { quote: { type: "string" }, feedback: { type: "string" } },
        required: ["quote", "feedback"],
      },
    },
    next_exercise: { type: "string" },
  },
  required: [
    "overall_score", "summary", "categories", "strengths", "improvements", "key_moments", "next_exercise",
  ],
};

export async function evaluateSession(opts: {
  scenario: Scenario;
  difficulty: string;
  customContext?: string | null;
  transcript: TranscriptEntry[];
  previousScores: number[];
}): Promise<Evaluation> {
  const dialogue = opts.transcript
    .map((t) => `${t.role === "user" ? "POUŽÍVATEĽ" : "PARTNER"}: ${t.text}`)
    .join("\n");

  const prompt = [
    "Si skúsený kouč komunikácie a charizmy. Vyhodnoť, ako dobre POUŽÍVATEĽ komunikoval v tréningovom rozhovore. Hodnotíš iba používateľa, nie partnera.",
    `Scenár: ${opts.scenario.title} – ${opts.scenario.description}`,
    `Náročnosť: ${opts.difficulty}`,
    opts.customContext ? `Kontext od používateľa: ${opts.customContext}` : "",
    `Hodnotiace kategórie (použi presne tieto, skóre 0–10): ${opts.scenario.criteria.join("; ")}`,
    opts.previousScores.length
      ? `Predchádzajúce celkové skóre v tomto scenári (od najstaršieho): ${opts.previousScores.join(", ")}. V zhrnutí krátko spomeň progres.`
      : "",
    "Pravidlá: buď úprimný a konkrétny, nie lichotivý. Celkové skóre 0–100. V key_moments cituj presné vety používateľa z prepisu a povedz, čo by bolo lepšie. Prepis vznikol automaticky z reči, preto ignoruj drobné chyby prepisu. Píš po slovensky.",
    `PREPIS:\n${dialogue}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await client().models.generateContent({
    model: EVAL_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json", responseJsonSchema: EVALUATION_SCHEMA },
  });
  if (!res.text) throw new Error("Prázdne vyhodnotenie");
  return JSON.parse(res.text) as Evaluation;
}
