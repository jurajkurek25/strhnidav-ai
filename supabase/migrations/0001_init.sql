-- Strhni Dav – základná schéma
-- Všetky zápisy (session, kredity, predplatné) robí server cez service role.
-- Používateľ cez RLS iba číta svoje dáta.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  subscription_status text,              -- stav zo Stripe: active, trialing, past_due, canceled...
  subscription_period_end timestamptz,
  credit_seconds integer not null default 0 check (credit_seconds >= 0),
  created_at timestamptz not null default now()
);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scenario_id text not null,
  difficulty text not null default 'medium',
  custom_context text,
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  allowed_seconds integer not null,      -- maximálna dĺžka session (fair-use + kredity)
  fair_use_budget_seconds integer not null, -- koľko z allowed ide z denného fair-use
  duration_seconds integer,
  fair_use_seconds integer not null default 0,
  credit_seconds_used integer not null default 0,
  transcript jsonb not null default '[]'::jsonb,
  evaluation jsonb,
  overall_score integer
);

create index training_sessions_user_started_idx
  on public.training_sessions (user_id, started_at desc);

create table public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  seconds integer not null check (seconds > 0),
  created_at timestamptz not null default now()
);

-- RLS: používateľ vidí len svoje záznamy, zápisy iba service role
alter table public.profiles enable row level security;
alter table public.training_sessions enable row level security;
alter table public.credit_purchases enable row level security;

create policy "own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "own sessions" on public.training_sessions
  for select using (auth.uid() = user_id);
create policy "own purchases" on public.credit_purchases
  for select using (auth.uid() = user_id);

-- Profil sa vytvorí automaticky pri registrácii
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ukončí session a zaúčtuje čas. Dĺžku počíta server:
-- koniec = min(teraz, posledný heartbeat + 30 s), strop = allowed_seconds.
-- Najprv sa míňa denný fair-use, zvyšok ide z kreditov.
create function public.finalize_session(p_session_id uuid, p_transcript jsonb default null)
returns public.training_sessions
language plpgsql
security definer set search_path = public
as $$
declare
  s public.training_sessions;
  v_end timestamptz;
  v_duration integer;
  v_fair integer;
  v_credit integer;
begin
  select * into s from public.training_sessions where id = p_session_id for update;
  if not found then
    raise exception 'session not found';
  end if;
  if s.status = 'completed' then
    return s;
  end if;

  v_end := least(now(), s.last_seen_at + interval '30 seconds');
  v_duration := least(
    greatest(0, extract(epoch from (v_end - s.started_at))::integer),
    s.allowed_seconds
  );
  v_fair := least(v_duration, s.fair_use_budget_seconds);
  v_credit := v_duration - v_fair;

  update public.profiles
    set credit_seconds = greatest(0, credit_seconds - v_credit)
    where id = s.user_id;

  update public.training_sessions
    set status = 'completed',
        ended_at = v_end,
        duration_seconds = v_duration,
        fair_use_seconds = v_fair,
        credit_seconds_used = v_credit,
        transcript = coalesce(p_transcript, transcript)
    where id = p_session_id
    returning * into s;

  return s;
end;
$$;

-- Idempotentné pripísanie kreditov zo Stripe webhooku
create function public.add_credits(p_user_id uuid, p_checkout_session_id text, p_seconds integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.credit_purchases (user_id, stripe_checkout_session_id, seconds)
    values (p_user_id, p_checkout_session_id, p_seconds)
    on conflict (stripe_checkout_session_id) do nothing;
  if found then
    update public.profiles set credit_seconds = credit_seconds + p_seconds where id = p_user_id;
  end if;
end;
$$;

revoke execute on function public.finalize_session(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.add_credits(uuid, text, integer) from public, anon, authenticated;
