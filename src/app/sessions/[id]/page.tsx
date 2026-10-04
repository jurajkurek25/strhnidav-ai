import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getScenario } from "@/lib/scenarios";
import type { Evaluation, TranscriptEntry } from "@/lib/gemini";
import { RetryEvaluation } from "./retry-evaluation";

function scoreColor(score: number, max: number) {
  const r = score / max;
  return r >= 0.75 ? "text-green-400" : r >= 0.5 ? "text-amber-400" : "text-red-400";
}

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("training_sessions").select("*").eq("id", id).single();
  if (!s) notFound();

  const scenario = getScenario(s.scenario_id);
  const transcript = (s.transcript ?? []) as TranscriptEntry[];
  const skipped = s.evaluation?.skipped ? (s.evaluation as { reason: string; failed?: boolean }) : null;
  const ev = !skipped ? (s.evaluation as Evaluation | null) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← Môj progres</Link>
        <h1 className="mt-3 text-3xl font-bold">{scenario?.title}</h1>
        <p className="text-sm text-zinc-500">
          {new Date(s.started_at).toLocaleString("sk-SK", { timeZone: "Europe/Bratislava" })} ·{" "}
          {Math.round((s.duration_seconds ?? 0) / 60)} min
        </p>
      </div>

      {skipped && (
        <div className="rounded-xl border border-zinc-800 p-5 text-zinc-300">
          {skipped.reason}
          {skipped.failed && <RetryEvaluation sessionId={s.id} />}
        </div>
      )}

      {ev && (
        <>
          <section className="flex items-center gap-6 rounded-2xl bg-zinc-900 p-6">
            <p className={`text-6xl font-bold ${scoreColor(ev.overall_score, 100)}`}>{ev.overall_score}</p>
            <p className="text-zinc-300">{ev.summary}</p>
          </section>

          <section className="space-y-3">
            {ev.categories.map((c) => (
              <div key={c.name} className="rounded-xl border border-zinc-800 p-4">
                <div className="flex justify-between">
                  <p className="font-medium">{c.name}</p>
                  <p className={`font-bold ${scoreColor(c.score, 10)}`}>{c.score}/10</p>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{c.comment}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-green-500/30 p-4">
              <h2 className="font-semibold text-green-400">Čo sa ti darilo</h2>
              <ul className="mt-2 space-y-2 text-sm">{ev.strengths.map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-red-500/30 p-4">
              <h2 className="font-semibold text-red-400">Čo zlepšiť</h2>
              <ul className="mt-2 space-y-2 text-sm">{ev.improvements.map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
          </section>

          {ev.key_moments.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Kľúčové momenty</h2>
              <div className="space-y-3">
                {ev.key_moments.map((m, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 p-4">
                    <p className="italic text-zinc-300">„{m.quote}“</p>
                    <p className="mt-2 text-sm text-zinc-400">{m.feedback}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
            <h2 className="font-semibold text-amber-300">Cvičenie na budúce</h2>
            <p className="mt-1 text-sm">{ev.next_exercise}</p>
          </section>
        </>
      )}

      <Link
        href={`/train/${s.scenario_id}`}
        className="inline-block rounded-lg bg-amber-400 px-5 py-3 font-semibold text-zinc-950"
      >
        Skúsiť znova
      </Link>

      <details className="rounded-xl border border-zinc-800 p-4">
        <summary className="cursor-pointer font-semibold">Prepis rozhovoru</summary>
        <div className="mt-4 space-y-2 text-sm">
          {transcript.map((t, i) => (
            <p key={i}>
              <b className={t.role === "user" ? "text-amber-400" : "text-zinc-400"}>
                {t.role === "user" ? "Ty" : "Partner"}:
              </b>{" "}
              {t.text}
            </p>
          ))}
        </div>
      </details>
    </main>
  );
}
