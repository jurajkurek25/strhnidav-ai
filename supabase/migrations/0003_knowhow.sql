-- Knowhow autora: metodika pre vyhodnotenie a pokyny pre AI partnera.
-- id = 'general' (platí pre všetky scenáre) alebo id scenára (napr. 'first-date').
create table public.knowhow (
  id text primary key,
  criteria text not null default '',          -- hodnotiace kategórie, jedna na riadok (prázdne = predvolené)
  evaluation_guide text not null default '',  -- metodika pre vyhodnotenie
  partner_guide text not null default '',     -- krátke pokyny pre AI partnera počas rozhovoru
  updated_at timestamptz not null default now()
);

-- Bez politík: čítať aj zapisovať môže iba server (service role)
alter table public.knowhow enable row level security;
