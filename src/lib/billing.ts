import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Fair use: max 2 hodiny tréningu denne v rámci predplatného
export const DAILY_FAIR_USE_SECONDS = 2 * 60 * 60;
// Jedna session má strop 30 min (dlhšie rozhovory nemajú tréningový zmysel)
export const MAX_SESSION_SECONDS = 30 * 60;
// Pod túto hranicu nemá zmysel session spúšťať
export const MIN_SESSION_SECONDS = 60;
// Deň sa počíta podľa slovenského času
export const TIMEZONE = "Europe/Bratislava";

export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

export type Profile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  credit_seconds: number;
};

export function hasActiveSubscription(p: Pick<Profile, "subscription_status">) {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(p.subscription_status ?? "");
}

// Začiatok dnešného dňa v Europe/Bratislava ako UTC Date
export function startOfTodayLocal(now = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const localAsUtc = Date.UTC(
    +parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second,
  );
  const offsetMs = localAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offsetMs);
}

export async function getUsage(userId: string) {
  const admin = createAdminClient();
  const [{ data: profile, error }, { data: today }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).single<Profile>(),
    admin
      .from("training_sessions")
      .select("fair_use_seconds")
      .eq("user_id", userId)
      .gte("started_at", startOfTodayLocal().toISOString()),
  ]);
  if (error || !profile) throw new Error("Profil neexistuje");

  const subscribed = hasActiveSubscription(profile);
  const usedToday = (today ?? []).reduce((sum, s) => sum + (s.fair_use_seconds ?? 0), 0);
  const fairUseLeft = subscribed ? Math.max(0, DAILY_FAIR_USE_SECONDS - usedToday) : 0;

  return {
    profile,
    subscribed,
    usedTodaySeconds: usedToday,
    fairUseLeftSeconds: fairUseLeft,
    creditSeconds: profile.credit_seconds,
    availableSeconds: fairUseLeft + profile.credit_seconds,
  };
}

// Kreditové balíky (jednorazový nákup). Ceny v centoch, s DPH.
export const CREDIT_PACKS = [
  { id: "60min", minutes: 60, priceCents: 900, label: "60 minút" },
  { id: "300min", minutes: 300, priceCents: 3900, label: "300 minút" },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];
