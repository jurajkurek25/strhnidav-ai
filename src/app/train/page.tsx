import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

export default function TrainPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Vyber si situáciu</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SCENARIOS.map((s) => (
          <Link
            key={s.id}
            href={`/train/${s.id}`}
            className="rounded-xl border border-zinc-800 p-5 transition hover:border-amber-400"
          >
            <p className="text-lg font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{s.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
