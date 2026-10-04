import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
        Trénuj charizmu <span className="text-amber-400">nahlas</span>.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-400">
        AI partner, s ktorým sa rozprávaš hlasom ako s človekom – na rande, pri predaji, na pohovore
        či v náročnom rozhovore. Po každom tréningu dostaneš úprimné vyhodnotenie a sleduješ svoj progres.
      </p>
      <Link
        href="/train"
        className="mt-8 inline-block rounded-xl bg-amber-400 px-6 py-3 font-semibold text-zinc-950"
      >
        Začať trénovať
      </Link>

      <div className="mt-16 grid gap-3 sm:grid-cols-3">
        {SCENARIOS.map((s) => (
          <div key={s.id} className="rounded-xl border border-zinc-800 p-4">
            <p className="font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{s.description}</p>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-8">
        <h2 className="text-2xl font-bold">49 € / mesiac</h2>
        <ul className="mt-4 space-y-2 text-zinc-300">
          <li>• Až 2 hodiny hlasového tréningu denne (fair use)</li>
          <li>• Všetky scenáre + vlastné situácie, 3 úrovne náročnosti</li>
          <li>• Detailné vyhodnotenie po každom rozhovore</li>
          <li>• História a sledovanie progresu</li>
          <li>• Potrebuješ viac? Dokúp si kredity</li>
        </ul>
      </section>
    </main>
  );
}
