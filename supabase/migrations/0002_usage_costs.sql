-- Meranie spotreby tokenov a nákladov na Gemini
alter table public.training_sessions
  add column live_usage jsonb,          -- súhrn tokenov z Gemini Live (hlási klient)
  add column live_cost_usd numeric(10, 5),
  add column eval_usage jsonb,          -- tokeny vyhodnotenia (hlási Gemini serveru)
  add column eval_cost_usd numeric(10, 5);

-- Mesačný prehľad nákladov na používateľa – iba pre service role / SQL Editor
create view public.monthly_costs as
select
  user_id,
  date_trunc('month', started_at at time zone 'Europe/Bratislava')::date as month,
  count(*) as sessions,
  round(sum(coalesce(duration_seconds, 0)) / 60.0, 1) as minutes,
  round(sum(coalesce(live_cost_usd, 0) + coalesce(eval_cost_usd, 0)), 4) as cost_usd,
  round(
    sum(coalesce(live_cost_usd, 0) + coalesce(eval_cost_usd, 0))
      / nullif(sum(coalesce(duration_seconds, 0)) / 60.0, 0),
    5
  ) as cost_usd_per_minute
from public.training_sessions
where status = 'completed'
group by 1, 2;

revoke all on public.monthly_costs from public, anon, authenticated;
