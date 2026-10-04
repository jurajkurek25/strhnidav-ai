"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GENERAL_ID, isAdmin } from "@/lib/knowhow";
import { SCENARIOS } from "@/lib/scenarios";

export type SaveState = { ok: boolean; message: string } | null;

export async function saveKnowhow(_prev: SaveState, form: FormData): Promise<SaveState> {
  const user = await getUser();
  if (!isAdmin(user?.email)) return { ok: false, message: "Nemáš oprávnenie." };

  const id = String(form.get("id"));
  if (id !== GENERAL_ID && !SCENARIOS.some((s) => s.id === id)) {
    return { ok: false, message: "Neznáma sekcia." };
  }
  const field = (name: string) => String(form.get(name) ?? "").trim();

  const { error } = await createAdminClient().from("knowhow").upsert({
    id,
    criteria: field("criteria"),
    evaluation_guide: field("evaluation_guide"),
    partner_guide: field("partner_guide"),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: "Uloženie zlyhalo." };

  revalidatePath("/admin");
  return { ok: true, message: "Uložené – platí od ďalšieho tréningu." };
}
