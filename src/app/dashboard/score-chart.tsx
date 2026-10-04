// Jednoduchý graf vývoja celkového skóre (0–100)
export function ScoreChart({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return <p className="text-sm text-zinc-500">Graf progresu sa zobrazí po 2 vyhodnotených tréningoch.</p>;
  }
  const w = 600;
  const h = 160;
  const pad = 10;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (scores.length - 1);
  const y = (s: number) => h - pad - (s / 100) * (h - 2 * pad);
  const points = scores.map((s, i) => `${x(i)},${y(s)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" role="img" aria-label="Vývoj skóre">
      {[25, 50, 75].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="#27272a" strokeDasharray="4 4" />
      ))}
      <polyline points={points} fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinejoin="round" />
      {scores.map((s, i) => (
        <circle key={i} cx={x(i)} cy={y(s)} r="4" fill="#fbbf24">
          <title>{s}</title>
        </circle>
      ))}
    </svg>
  );
}
