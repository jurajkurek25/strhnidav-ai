"use client";

import { useActionState, useState } from "react";
import { saveKnowhow, type SaveState } from "./actions";

// Pokyny pre partnera sa posielajú pri každej výmene v rozhovore – nad túto dĺžku upozorniť
const PARTNER_GUIDE_SOFT_LIMIT = 1500;

const textareaClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm leading-relaxed outline-none focus:border-amber-400";

export function KnowhowForm({
  id,
  defaultCriteria,
  initial,
}: {
  id: string;
  defaultCriteria: string[];
  initial: { criteria: string; evaluation_guide: string; partner_guide: string };
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveKnowhow, null);
  const [partnerGuide, setPartnerGuide] = useState(initial.partner_guide);

  return (
    <form action={action} className="mt-4 space-y-5">
      <input type="hidden" name="id" value={id} />

      <label className="block">
        <span className="text-sm font-medium">Hodnotiace kritériá</span>
        <span className="block text-xs text-zinc-500">
          Jedno na riadok (ideálne 4–6). Prázdne = {defaultCriteria.length ? "predvolené" : "kritériá zo scenára"}.
        </span>
        <textarea
          name="criteria"
          rows={5}
          defaultValue={initial.criteria}
          placeholder={defaultCriteria.join("\n")}
          className={`mt-2 ${textareaClass}`}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Knowhow pre vyhodnotenie</span>
        <span className="block text-xs text-zinc-500">
          Tvoja metóda, ako vyzerá 10/10 vs. 3/10, typické chyby, príklady dobrých a zlých viet, cvičenia.
          Dĺžka nie je obmedzená.
        </span>
        <textarea
          name="evaluation_guide"
          rows={14}
          defaultValue={initial.evaluation_guide}
          placeholder={`Príklad:\n\nMETÓDA\n– Rozhovor má 3 fázy: otvorenie, prepojenie, uzavretie…\n\nKRITÉRIUM: Sebavedomie\n10/10: hovorí pokojne, nevyprosuje si súhlas, drží očný kontakt hlasom…\n3/10: ospravedlňuje sa, slová ako „asi“, „možno“, „ak by to nevadilo“…\n\nTYPICKÉ CHYBY\n– Výsluch: otázka za otázkou bez vlastného zdieľania\n\nPRÍKLADY\nZle: „Tak čo robíš?“\nDobre: „Tipujem, že robíš niečo kreatívne – mám pravdu?“`}
          className={`mt-2 ${textareaClass}`}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Pokyny pre AI partnera počas rozhovoru</span>
        <span className="block text-xs text-zinc-500">
          Ako sa má partner správať, aby bol realistický. Krátko – posiela sa pri každej výmene.
        </span>
        <textarea
          name="partner_guide"
          rows={5}
          value={partnerGuide}
          onChange={(e) => setPartnerGuide(e.target.value)}
          placeholder="Napr. Ak ťa predajca hneď na začiatku zavalí ponukou, zlož. Po druhej námietke ustúp, iba ak sa pýtal na tvoje potreby."
          className={`mt-2 ${textareaClass}`}
        />
        <span
          className={`text-xs ${partnerGuide.length > PARTNER_GUIDE_SOFT_LIMIT ? "text-amber-400" : "text-zinc-500"}`}
        >
          {partnerGuide.length} znakov
          {partnerGuide.length > PARTNER_GUIDE_SOFT_LIMIT && " – dlhé pokyny zvyšujú náklady na rozhovor"}
        </span>
      </label>

      <div className="flex items-center gap-4">
        <button
          disabled={pending}
          className="rounded-lg bg-amber-400 px-5 py-2 font-semibold text-zinc-950 disabled:opacity-50"
        >
          {pending ? "Ukladám…" : "Uložiť"}
        </button>
        {state && <span className={`text-sm ${state.ok ? "text-green-400" : "text-red-400"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
