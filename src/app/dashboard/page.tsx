import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, createClient } from "@/lib/supabase/server";
import { CREDIT_PACKS, DAILY_FAIR_USE_SECONDS, getUsage } from "@/lib/billing";
import { getScenario } from "@/lib/scenarios";
import { ScoreChart } from "./score-chart";

function minutes(seconds: number) {
  return Math.floor(seconds / 60);
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { checkout } = await searchParams;
  const usage = await getUsage(user.id);

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("id, scenario_id, difficulty, started_at, duration_seconds, overall_score, status")
    .order("started_at", { ascending: false })
    .limit(50);

  const scored = (sessions ?? []).filter((s) => s.overall_score != null).reverse();
  const scores = scored.map((s) => s.overall_score as number);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const totalMinutes = minutes((sessions ?? []).reduce((a, s) => a + (s.duration_seconds ?? 0), 0));
  const usedPct = Math.min(100, (usage.usedTodaySeconds / DAILY_FAIR_USE_SECONDS) * 100);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1 className="text-[clamp(36px,5vw,56px)]">Môj <em>progres</em></h1>
        </div>
        <Link href="/train" className="btn">
          Nový tréning
        </Link>
      </div>

      {checkout === "success" && (
        <p className="rounded-sm bg-good/10 p-4 text-sm text-good">
          Platba prebehla. Aktivácia môže trvať pár sekúnd – ak sa nič nezmenilo, obnov stránku.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-muted">Priemerné skóre</p>
          <p className="mt-1 font-display text-4xl font-semibold text-gold-bright">{avg ?? "–"}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Tréningov</p>
          <p className="mt-1 font-display text-4xl font-semibold text-gold-bright">{sessions?.length ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Natrénované</p>
          <p className="mt-1 font-display text-4xl font-semibold text-gold-bright">{totalMinutes} min</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-[22px]">Vývoj skóre</h2>
        <ScoreChart scores={scores} />
      </section>

      <section className="card p-5">
        <h2 className="text-[22px]">Predplatné a čas</h2>
        {usage.subscribed ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Aktívne predplatné
              {usage.profile.subscription_period_end &&
                ` · obnovenie ${new Date(usage.profile.subscription_period_end).toLocaleDateString("sk-SK")}`}
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span>Dnes využité</span>
                <span>
                  {minutes(usage.usedTodaySeconds)} / {minutes(DAILY_FAIR_USE_SECONDS)} min
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-bg-alt">
                <div className="h-2 rounded-full bg-gold" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
            <form action="/api/stripe/portal" method="post" className="mt-4">
              <button className="text-sm text-muted underline hover:text-cream">Spravovať predplatné</button>
            </form>
          </>
        ) : (
          <form action="/api/stripe/checkout" method="post" className="mt-4">
            <input type="hidden" name="kind" value="subscription" />
            <button className="btn">
              Aktivovať predplatné – 49 € / mesiac
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-line pt-4">
          <p className="text-sm">
            Kredity navyše: <b>{minutes(usage.creditSeconds)} min</b>
            <span className="text-muted"> · použijú sa až po vyčerpaní denného limitu</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {CREDIT_PACKS.map((p) => (
              <form key={p.id} action="/api/stripe/checkout" method="post">
                <input type="hidden" name="kind" value="credits" />
                <input type="hidden" name="pack" value={p.id} />
                <button className="btn btn-ghost btn-sm">
                  +{p.label} za {(p.priceCents / 100).toLocaleString("sk-SK")} €
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[26px]">História</h2>
        {!sessions?.length && <p className="text-sm text-muted">Zatiaľ žiadne tréningy.</p>}
        <div className="card divide-y divide-line">
          {sessions?.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between p-4 hover:bg-card">
              <div>
                <p className="font-medium">{getScenario(s.scenario_id)?.title ?? s.scenario_id}</p>
                <p className="text-xs text-muted">
                  {new Date(s.started_at).toLocaleString("sk-SK", { timeZone: "Europe/Bratislava" })} ·{" "}
                  {minutes(s.duration_seconds ?? 0)} min
                </p>
              </div>
              <span className="text-xl font-bold text-gold">{s.overall_score ?? "–"}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
