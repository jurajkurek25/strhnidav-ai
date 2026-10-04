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
    return <p className="mt-6 rounded-lg bg-zinc-900 p-4 text-sm">Skontroluj si e-mail <b>{email}</b> a klikni na odkaz.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tvoj@email.sk"
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-amber-400"
      />
      <button
        disabled={state === "sending"}
        className="rounded-lg bg-amber-400 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50"
      >
        {state === "sending" ? "Posielam…" : "Poslať odkaz"}
      </button>
      {state === "error" && <p className="text-sm text-red-400">Nepodarilo sa odoslať e-mail. Skús znova.</p>}
    </form>
  );
}
