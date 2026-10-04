"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") {
    return <p className="mt-6 rounded-sm bg-card p-4 text-sm">Skontroluj si e-mail <b>{email}</b> a klikni na odkaz.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tvoj@email.sk"
        className="field"
      />
      <button
        disabled={state === "sending"}
        className="btn"
      >
        {state === "sending" ? "Posielam…" : "Poslať odkaz"}
      </button>
      {state === "error" && <p className="text-sm text-wine-soft">Nepodarilo sa odoslať e-mail. Skús znova.</p>}
    </form>
  );
}
