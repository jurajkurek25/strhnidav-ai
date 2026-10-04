import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type KnowhowRow = {
  id: string;
  criteria: string;
  evaluation_guide: string;
  partner_guide: string;
  updated_at: string;
};

export const GENERAL_ID = "general";

export function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

export async function listKnowhow() {
  const { data } = await createAdminClient().from("knowhow").select("*");
  return new Map((data as KnowhowRow[] | null)?.map((r) => [r.id, r]) ?? []);
}

// Spojí všeobecné a scenárové knowhow do podoby pre prompty
export async function getKnowhow(scenarioId: string) {
  const { data } = await createAdminClient()
    .from("knowhow")
    .select("*")
    .in("id", [GENERAL_ID, scenarioId]);
  const rows = (data ?? []) as KnowhowRow[];
  const general = rows.find((r) => r.id === GENERAL_ID);
  const scenario = rows.find((r) => r.id === scenarioId);
  const join = (a?: string, b?: string) => [a?.trim(), b?.trim()].filter(Boolean).join("\n\n");
  const lines = (s?: string) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  return {
    // Kritériá scenára majú prednosť pred všeobecnými
    criteria: lines(scenario?.criteria).length ? lines(scenario?.criteria) : lines(general?.criteria),
    evaluationGuide: join(general?.evaluation_guide, scenario?.evaluation_guide),
    partnerGuide: join(general?.partner_guide, scenario?.partner_guide),
  };
}
