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
3. **Supabase:** spusti migrácie zo `supabase/migrations/` v poradí (SQL Editor alebo `supabase db push`).
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

## Nasadenie na ai.strhnidav.sk (CloudPanel)

**1. V CloudPanel** pridaj stránku typu **Node.js**: doména `ai.strhnidav.sk`, Node.js 22,
App Port `3000`. Zapni SSL (Let's Encrypt).

**2. Prvé nasadenie** (cez SSH ako používateľ stránky):

```bash
cd /home/strhnidav-ai/htdocs/ai.strhnidav.sk
git clone https://github.com/jurajkurek25/strhnidav-ai.git .   # priečinok musí byť prázdny
git checkout claude/affectionate-feynman-o6ot5n                 # alebo main po zlúčení
cp .env.example .env.local && nano .env.local                   # vyplň hodnoty
npm install -g pm2   # ak PM2 ešte nie je
./deploy.sh
pm2 startup          # aby appka nabehla aj po reštarte servera (vypíše príkaz na spustenie)
```

**3. Každá ďalšia verzia:**

```bash
cd /home/strhnidav-ai/htdocs/ai.strhnidav.sk && ./deploy.sh
```

`deploy.sh` urobí `git pull`, `npm ci`, `npm run build` a reštart cez PM2 bez výpadku.
Premenné `NEXT_PUBLIC_*` sa vkladajú pri builde – po ich zmene v `.env.local` treba znova `./deploy.sh`.

**4. Nastavenia služieb pre produkciu:**

- `.env.local`: `NEXT_PUBLIC_APP_URL=https://ai.strhnidav.sk`, `ADMIN_EMAILS=…`
- Supabase → Authentication → URL Configuration: Site URL `https://ai.strhnidav.sk`,
  Redirect URL `https://ai.strhnidav.sk/auth/callback`
- Stripe → Webhooks: `https://ai.strhnidav.sk/api/stripe/webhook` (udalosti vyššie),
  jeho Signing secret do `STRIPE_WEBHOOK_SECRET`
- Mikrofón v prehliadači funguje iba cez HTTPS – SSL musí byť zapnuté.

## Meranie nákladov

Ku každej session sa ukladá spotreba tokenov z Gemini Live (`live_usage`, `live_cost_usd`)
a z vyhodnotenia (`eval_usage`, `eval_cost_usd`). Prehľad v Supabase SQL Editore:

```sql
-- náklad na používateľa a mesiac, vrátane ceny za minútu
select * from monthly_costs order by month desc, cost_usd desc;

-- rastie najväčší prompt s dĺžkou rozhovoru? → Gemini účtuje aj kontext
select duration_seconds, live_usage->'max_prompt_tokens' as max_prompt, live_cost_usd
from training_sessions where live_usage is not null order by duration_seconds;
```

Spotrebu Live API hlási prehliadač (spojenie ide priamo na Gemini), preto slúži na analytiku,
nie na účtovanie – čas sa účtuje vždy na serveri. Ceny za tokeny sú v `src/lib/gemini.ts`.

## Admin – knowhow

Na `/admin` (prístup majú iba e-maily z `ADMIN_EMAILS`) píšeš svoju metodiku pre
„Všeobecné“ a pre každý scenár:

- **Hodnotiace kritériá** – jedno na riadok, nahradia predvolené kategórie scenára.
- **Knowhow pre vyhodnotenie** – metóda, rubrika 10/10 vs. 3/10, chyby, príklady, cvičenia.
  Ide iba do vyhodnotenia (lacný textový model), dĺžka nevadí.
- **Pokyny pre AI partnera** – krátke pravidlá správania v role. Idú do hlasového rozhovoru,
  kde sa platia pri každej výmene, preto ich drž stručné.

Všeobecné knowhow sa spája so scenárovým, kritériá scenára majú prednosť. Zmeny platia
od ďalšieho tréningu.

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
| `src/app/admin` | Editor knowhow (metodika, kritériá, pokyny pre partnera) |
| `supabase/migrations` | DB schéma, RLS, účtovanie času (`finalize_session`), kredity (`add_credits`) |
