import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { CREDIT_PACKS, getUsage } from "@/lib/billing";
import { appUrl, getOrCreateCustomer, stripe } from "@/lib/stripe";

// Formulár POST: kind=subscription alebo kind=credits&pack=<id>
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login`, 303);

  const form = await request.formData();
  const kind = form.get("kind");
  const { profile, subscribed } = await getUsage(user.id);
  const customer = await getOrCreateCustomer(profile);
  const common = {
    customer,
    client_reference_id: user.id,
    success_url: `${appUrl()}/dashboard?checkout=success`,
    cancel_url: `${appUrl()}/dashboard`,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    customer_update: { address: "auto" as const },
  };

  if (kind === "subscription") {
    if (subscribed) return NextResponse.redirect(`${appUrl()}/dashboard`, 303);
    const session = await stripe().checkout.sessions.create({
      ...common,
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_SUBSCRIPTION!, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
    });
    return NextResponse.redirect(session.url!, 303);
  }

  const pack = CREDIT_PACKS.find((p) => p.id === form.get("pack"));
  if (kind === "credits" && pack) {
    const session = await stripe().checkout.sessions.create({
      ...common,
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: pack.priceCents,
            tax_behavior: "inclusive",
            product_data: { name: `Strhni Dav – kredity ${pack.label}` },
          },
        },
      ],
      metadata: { user_id: user.id, credit_seconds: String(pack.minutes * 60) },
    });
    return NextResponse.redirect(session.url!, 303);
  }

  return NextResponse.json({ error: "Neplatná požiadavka" }, { status: 400 });
}
