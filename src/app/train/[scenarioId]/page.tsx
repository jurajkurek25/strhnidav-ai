import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getScenario } from "@/lib/scenarios";
import { getUser } from "@/lib/supabase/server";
import { getUsage, MAX_SESSION_SECONDS } from "@/lib/billing";
import { getKnowhow } from "@/lib/knowhow";
import { Trainer } from "./trainer";

export default async function ScenarioPage({ params }: PageProps<"/train/[scenarioId]">) {
  const { scenarioId } = await params;
  const scenario = getScenario(scenarioId);
  if (!scenario) notFound();
  const user = await getUser();
  if (!user) redirect("/login");
  const [usage, knowhow] = await Promise.all([getUsage(user.id), getKnowhow(scenario.id)]);
  const criteria = knowhow.criteria.length ? knowhow.criteria : scenario.criteria;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/train" className="text-sm text-zinc-400 hover:text-zinc-200">← Späť</Link>
      <h1 className="mt-3 text-3xl font-bold">{scenario.title}</h1>
      <p className="mt-2 text-zinc-400">{scenario.description}</p>
      <p className="mt-4 text-sm text-zinc-500">Hodnotí sa: {criteria.join(" · ")}</p>

      {usage.availableSeconds < 60 && (
        <div className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          {usage.subscribed
            ? "Dnešný limit 2 hodiny je vyčerpaný. "
            : "Na tréning potrebuješ predplatné alebo kredity. "}
          <Link href="/dashboard" className="font-semibold text-amber-300 underline">
            {usage.subscribed ? "Dokúpiť kredity" : "Aktivovať predplatné"}
          </Link>
        </div>
      )}

      <Trainer
        scenarioId={scenario.id}
        isCustom={scenario.id === "custom"}
        availableSeconds={Math.min(usage.availableSeconds, MAX_SESSION_SECONDS)}
      />
    </main>
  );
}
