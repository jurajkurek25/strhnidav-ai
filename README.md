# Strhni Dav – AI tréning charizmy a komunikácie

Hlasový AI partner, s ktorým trénuješ rôzne situácie (rande, predaj, pohovor, vyjednávanie,
networking, náročný rozhovor alebo vlastný scenár). Po každom rozhovore AI vyhodnotí, ako dobre
si komunikoval, a ukladá históriu aj progres.

**Model predplatného:** 49 € / mesiac, fair use max. 2 hodiny denne + dokupové kredity (minúty).

## Ako to funguje

```
Prehliadač ──(mikrofón 16 kHz PCM)──► Gemini Live API ──(hlas 24 kHz + prepis)──► Prehliadač
    │                                       ▲
    │ POST /api/sessions                    │ ephemeral token (model, rola, hlas
    ▼                                       │ uzamknuté; expirácia = zostávajúci čas)
Next.js server ─────────────────────────────┘
    │  overí predplatné / fair-use / kredity, založí session
    │  heartbeat každých 15 s → server počíta reálnu dĺžku
    │  POST /api/sessions/:id/end → zaúčtuje čas, Gemini vyhodnotí prepis (JSON)
    ▼
Supabase (auth, profily, sessions, kredity)        Stripe (predplatné, kredity, webhook)
```

- **Hlas ↔ hlas v reálnom čase:** Gemini Live (native audio), dá sa skočiť AI do reči.
- **Bezpečnosť:** API kľúč Gemini nikdy neopustí server, prehliadač dostane len krátkodobý token.
- **Fair use:** dĺžku session počíta server (štart + heartbeat), nie klient. Najprv sa míňa denný
  limit 2 h (deň podľa času Europe/Bratislava), potom kredity. Token má tvrdú expiráciu, takže
  limit sa nedá obísť. Jedna session má max. 30 min.
- **Vyhodnotenie:** celkové skóre 0–100, 5 kategórií (0–10) podľa scenára, silné stránky,
  čo zlepšiť, kľúčové momenty s citáciami a cvičenie na budúce. Zohľadňuje predošlé skóre.

## Spustenie

1. `npm install`
2. Skopíruj `.env.example` do `.env.local` a vyplň hodnoty.
3. **Supabase:** spusti `supabase/migrations/0001_init.sql` (SQL Editor alebo `supabase db push`).
   V Authentication → URL Configuration pridaj `http://localhost:3000/auth/callback`
   (a produkčnú URL) do Redirect URLs.
4. **Stripe:**
   - Vytvor produkt „Strhni Dav predplatné“ s mesačnou cenou 49 € → Price ID do `STRIPE_PRICE_SUBSCRIPTION`.
   - Zapni Customer Portal (Settings → Billing → Customer portal).
   - Webhook na `https://<tvoja-domena>/api/stripe/webhook` s udalosťami
     `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`.
     Lokálne: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
5. `npm run dev` a otvor http://localhost:3000 (mikrofón funguje na `localhost` alebo cez HTTPS).

## Úpravy

- **Scenáre, role a hodnotiace kritériá:** `src/lib/scenarios.ts`
- **Limity (2 h/deň, 30 min/session) a kreditové balíky s cenami:** `src/lib/billing.ts`
- **Prompt a štruktúra vyhodnotenia:** `src/lib/gemini.ts`

## Štruktúra

| Cesta | Čo robí |
|---|---|
| `src/app/train/[scenarioId]/trainer.tsx` | Hlasový rozhovor (mikrofón, prehrávanie, prepis, časovač) |
| `src/lib/live-audio.ts`, `public/pcm-recorder-worklet.js` | Audio v prehliadači |
| `src/app/api/sessions/**` | Štart, heartbeat, ukončenie + vyhodnotenie |
| `src/app/api/stripe/**` | Checkout (predplatné/kredity), portál, webhook |
| `src/app/dashboard` | Progres, graf skóre, fair-use, kredity, história |
| `src/app/sessions/[id]` | Detail vyhodnotenia a prepis |
| `supabase/migrations` | DB schéma, RLS, účtovanie času (`finalize_session`), kredity (`add_credits`) |
