import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsage, MAX_SESSION_SECONDS, MIN_SESSION_SECONDS } from "@/lib/billing";
import { buildSystemInstruction, DIFFICULTIES, getScenario, type Difficulty } from "@/lib/scenarios";
import { createLiveToken, LIVE_MODEL } from "@/lib/gemini";
import { getKnowhow } from "@/lib/knowhow";

// Spustenie tréningovej session: overí limit, založí záznam a vydá Gemini token
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const scenario = getScenario(body.scenarioId);
  const difficulty: Difficulty = body.difficulty in DIFFICULTIES ? body.difficulty : "medium";
  const customContext =
    typeof body.customContext === "string" ? body.customContext.slice(0, 1000).trim() || null : null;
  if (!scenario) return NextResponse.json({ error: "Neznámy scenár" }, { status: 400 });
  if (scenario.id === "custom" && !customContext) {
    return NextResponse.json({ error: "Opíš svoj scenár" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Naraz môže bežať iba jedna session – staršie aktívne uzavrieť a zaúčtovať
  const { data: active } = await admin
    .from("training_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active");
  for (const s of active ?? []) {
    await admin.rpc("finalize_session", { p_session_id: s.id });
  }

  const usage = await getUsage(user.id);
  const allowedSeconds = Math.min(usage.availableSeconds, MAX_SESSION_SECONDS);
  if (allowedSeconds < MIN_SESSION_SECONDS) {
    return NextResponse.json(
      {
        error: usage.subscribed
          ? "Dnešný fair-use limit (2 h) je vyčerpaný. Dokúp si kredity alebo pokračuj zajtra."
          : "Na tréning potrebuješ aktívne predplatné alebo kredity.",
      },
      { status: 402 },
    );
  }

  const { data: session, error } = await admin
    .from("training_sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenario.id,
      difficulty,
      custom_context: customContext,
      allowed_seconds: allowedSeconds,
      fair_use_budget_seconds: Math.min(usage.fairUseLeftSeconds, allowedSeconds),
    })
    .select("id")
    .single();
  if (error || !session) {
    return NextResponse.json({ error: "Session sa nepodarilo založiť" }, { status: 500 });
  }

  try {
    const { partnerGuide } = await getKnowhow(scenario.id);
    const token = await createLiveToken({
      systemInstruction: buildSystemInstruction(scenario, difficulty, customContext, partnerGuide),
      voice: scenario.voice,
      allowedSeconds,
    });
    return NextResponse.json({ sessionId: session.id, token, model: LIVE_MODEL, allowedSeconds });
  } catch (e) {
    console.error(e);
    await admin.from("training_sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: "Nepodarilo sa pripojiť k AI" }, { status: 502 });
  }
}
