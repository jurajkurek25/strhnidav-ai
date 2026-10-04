import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getUsage } from "@/lib/billing";
import { appUrl, getOrCreateCustomer, stripe } from "@/lib/stripe";

// Správa predplatného (zrušenie, zmena karty, faktúry) cez Stripe portál
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login`, 303);
  const { profile } = await getUsage(user.id);
  const portal = await stripe().billingPortal.sessions.create({
    customer: await getOrCreateCustomer(profile),
    return_url: `${appUrl()}/dashboard`,
  });
  return NextResponse.redirect(portal.url, 303);
}
