import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Klient posiela každých ~15 s – podľa toho server počíta reálnu dĺžku session
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });
  const { id } = await params;

  const { data } = await createAdminClient()
    .from("training_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .select("id");

  if (!data?.length) return NextResponse.json({ error: "Session nie je aktívna" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
