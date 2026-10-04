import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { GENERAL_ID, isAdmin, listKnowhow } from "@/lib/knowhow";
import { SCENARIOS } from "@/lib/scenarios";
import { KnowhowForm } from "./knowhow-form";

export default async function AdminPage() {
  const user = await getUser();
  if (!isAdmin(user?.email)) notFound();
  const rows = await listKnowhow();

  const sections = [
    {
      id: GENERAL_ID,
      title: "Všeobecné",
      description: "Platí pre všetky scenáre. Scenárové knowhow sa pridáva k nemu.",
      defaultCriteria: [] as string[],
    },
    ...SCENARIOS.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      defaultCriteria: s.criteria,
    })),
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="eyebrow">Admin</div>
      <h1 className="text-[clamp(36px,5vw,56px)]">Moje <em>knowhow</em></h1>
      <p className="mt-2 text-sm text-muted">
        Čo tu napíšeš, AI použije pri vyhodnocovaní tréningov a pri hraní rolí. Zmeny platia od ďalšieho
        tréningu.
      </p>

      <div className="mt-8 space-y-4">
        {sections.map((s) => {
          const row = rows.get(s.id);
          const filled = !!(row?.criteria || row?.evaluation_guide || row?.partner_guide);
          return (
            <details key={s.id} className="card p-5" open={s.id === GENERAL_ID}>
              <summary className="flex cursor-pointer items-center justify-between">
                <span>
                  <span className="font-display text-xl font-semibold">{s.title}</span>
                  <span className="ml-3 text-sm text-muted">{s.description}</span>
                </span>
                <span className={`text-xs ${filled ? "text-good" : "text-muted"}`}>
                  {filled
                    ? `upravené ${new Date(row!.updated_at).toLocaleDateString("sk-SK")}`
                    : "prázdne"}
                </span>
              </summary>
              <KnowhowForm
                id={s.id}
                defaultCriteria={s.defaultCriteria}
                initial={{
                  criteria: row?.criteria ?? "",
                  evaluation_guide: row?.evaluation_guide ?? "",
                  partner_guide: row?.partner_guide ?? "",
                }}
              />
            </details>
          );
        })}
      </div>
    </main>
  );
}
