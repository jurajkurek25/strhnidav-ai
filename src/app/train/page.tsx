import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

export default function TrainPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="eyebrow">Tréning</div>
      <h1 className="text-[clamp(36px,5vw,56px)]">Vyber si <em>situáciu</em></h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SCENARIOS.map((s) => (
          <Link
            key={s.id}
            href={`/train/${s.id}`}
            className="card p-5 transition hover:border-gold"
          >
            <p className="font-display text-xl font-medium">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
