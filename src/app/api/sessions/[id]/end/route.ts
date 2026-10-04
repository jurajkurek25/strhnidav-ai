import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScenario } from "@/lib/scenarios";
import { evaluateSession, liveCostUsd, type LiveUsage, type TranscriptEntry } from "@/lib/gemini";

// Pod toto množstvo reči používateľa nemá vyhodnotenie zmysel
const MIN_USER_WORDS = 15;

// Spotrebu hlási prehliadač – iba na analytiku nákladov, nie na účtovanie
function parseUsage(raw: unknown): LiveUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const counts = (v: unknown) =>
    Object.fromEntries(
      Object.entries(v && typeof v === "object" ? v : {})
        .filter(([k, n]) => k.length <= 32 && Number.isFinite(n) && (n as number) >= 0)
        .slice(0, 10),
    ) as Record<string, number>;
  const num = (v: unknown) => (Number.isFinite(v) && (v as number) >= 0 ? Math.floor(v as number) : 0);
  return {
    turns: num(r.turns),
    input: counts(r.input),
    output: counts(r.output),
    max_prompt_tokens: num(r.max_prompt_tokens),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("training_sessions")
    .select("id, user_id, status, evaluation")
    .eq("id", id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Session neexistuje" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const transcript: TranscriptEntry[] = Array.isArray(body.transcript)
    ? body.transcript
        .filter((t: TranscriptEntry) => (t?.role === "user" || t?.role === "ai") && typeof t.text === "string")
        .map((t: TranscriptEntry) => ({ role: t.role, text: t.text.slice(0, 5000) }))
        .slice(0, 500)
    : [];

  const { data: session, error } = await admin.rpc("finalize_session", {
    p_session_id: id,
    p_transcript: existing.status === "active" ? transcript : null,
  });
  if (error || !session) {
    return NextResponse.json({ error: "Session sa nepodarilo ukončiť" }, { status: 500 });
  }

  const usage = existing.status === "active" ? parseUsage(body.usage) : null;
  if (usage) {
    await admin
      .from("training_sessions")
      .update({ live_usage: usage, live_cost_usd: liveCostUsd(usage) })
      .eq("id", id);
  }
  // Neúspešné vyhodnotenie sa dá zopakovať
  if (session.evaluation && !session.evaluation.failed) return NextResponse.json({ ok: true });

  const scenario = getScenario(session.scenario_id)!;
  const userWords = (session.transcript as TranscriptEntry[])
    .filter((t) => t.role === "user")
    .reduce((n, t) => n + t.text.split(/\s+/).filter(Boolean).length, 0);

  if (userWords < MIN_USER_WORDS) {
    await admin
      .from("training_sessions")
      .update({ evaluation: { skipped: true, reason: "Rozhovor bol príliš krátky na vyhodnotenie." } })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  }

  const { data: previous } = await admin
    .from("training_sessions")
    .select("overall_score")
    .eq("user_id", user.id)
    .eq("scenario_id", session.scenario_id)
    .not("overall_score", "is", null)
    .neq("id", id)
    .order("started_at", { ascending: false })
    .limit(5);

  try {
    const { evaluation, usage: evalUsage, costUsd } = await evaluateSession({
      scenario,
      difficulty: session.difficulty,
      customContext: session.custom_context,
      transcript: session.transcript,
      previousScores: (previous ?? []).map((p) => p.overall_score).reverse(),
    });
    await admin
      .from("training_sessions")
      .update({
        evaluation,
        overall_score: evaluation.overall_score,
        eval_usage: evalUsage,
        eval_cost_usd: costUsd,
      })
      .eq("id", id);
  } catch (e) {
    console.error(e);
    await admin
      .from("training_sessions")
      .update({ evaluation: { skipped: true, failed: true, reason: "Vyhodnotenie zlyhalo." } })
      .eq("id", id);
  }
  return NextResponse.json({ ok: true });
}
