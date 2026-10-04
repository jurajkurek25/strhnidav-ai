import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/billing";

let _stripe: Stripe | null = null;
export function stripe() {
  _stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// Vráti (alebo vytvorí) Stripe zákazníka pre profil
export async function getOrCreateCustomer(profile: Profile) {
  if (profile.stripe_customer_id) return profile.stripe_customer_id;
  const customer = await stripe().customers.create({
    email: profile.email ?? undefined,
    metadata: { user_id: profile.id },
  });
  await createAdminClient()
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", profile.id);
  return customer.id;
}
