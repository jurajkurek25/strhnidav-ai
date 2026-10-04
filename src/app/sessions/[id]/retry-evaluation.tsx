"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryEvaluation({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/sessions/${sessionId}/end`, { method: "POST", body: "{}" });
        router.refresh();
        setBusy(false);
      }}
      className="ml-3 text-gold-bright underline disabled:opacity-50"
    >
      {busy ? "Vyhodnocujem…" : "Skúsiť vyhodnotiť znova"}
    </button>
  );
}
