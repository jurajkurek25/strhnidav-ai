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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Môj progres</h1>
        <Link href="/train" className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-zinc-950">
          Nový tréning
        </Link>
      </div>

      {checkout === "success" && (
        <p className="rounded-xl bg-green-500/10 p-4 text-sm text-green-300">
          Platba prebehla. Aktivácia môže trvať pár sekúnd – ak sa nič nezmenilo, obnov stránku.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 p-4">
          <p className="text-sm text-zinc-400">Priemerné skóre</p>
          <p className="mt-1 text-3xl font-bold">{avg ?? "–"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4">
          <p className="text-sm text-zinc-400">Tréningov</p>
          <p className="mt-1 text-3xl font-bold">{sessions?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4">
          <p className="text-sm text-zinc-400">Natrénované</p>
          <p className="mt-1 text-3xl font-bold">{totalMinutes} min</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 p-5">
        <h2 className="mb-4 font-semibold">Vývoj skóre</h2>
        <ScoreChart scores={scores} />
      </section>

      <section className="rounded-xl border border-zinc-800 p-5">
        <h2 className="font-semibold">Predplatné a čas</h2>
        {usage.subscribed ? (
          <>
            <p className="mt-2 text-sm text-zinc-400">
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
              <div className="mt-2 h-2 rounded-full bg-zinc-800">
                <div className="h-2 rounded-full bg-amber-400" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
            <form action="/api/stripe/portal" method="post" className="mt-4">
              <button className="text-sm text-zinc-400 underline hover:text-zinc-200">Spravovať predplatné</button>
            </form>
          </>
        ) : (
          <form action="/api/stripe/checkout" method="post" className="mt-4">
            <input type="hidden" name="kind" value="subscription" />
            <button className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-zinc-950">
              Aktivovať predplatné – 49 € / mesiac
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-zinc-800 pt-4">
          <p className="text-sm">
            Kredity navyše: <b>{minutes(usage.creditSeconds)} min</b>
            <span className="text-zinc-500"> · použijú sa až po vyčerpaní denného limitu</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {CREDIT_PACKS.map((p) => (
              <form key={p.id} action="/api/stripe/checkout" method="post">
                <input type="hidden" name="kind" value="credits" />
                <input type="hidden" name="pack" value={p.id} />
                <button className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-amber-400">
                  +{p.label} za {(p.priceCents / 100).toLocaleString("sk-SK")} €
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">História</h2>
        {!sessions?.length && <p className="text-sm text-zinc-500">Zatiaľ žiadne tréningy.</p>}
        <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {sessions?.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between p-4 hover:bg-zinc-900">
              <div>
                <p className="font-medium">{getScenario(s.scenario_id)?.title ?? s.scenario_id}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(s.started_at).toLocaleString("sk-SK", { timeZone: "Europe/Bratislava" })} ·{" "}
                  {minutes(s.duration_seconds ?? 0)} min
                </p>
              </div>
              <span className="text-xl font-bold text-amber-400">{s.overall_score ?? "–"}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
