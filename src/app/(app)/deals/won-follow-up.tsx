"use client";

import { useActionState, useState } from "react";

import { FormError, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { initialFormState } from "@/lib/form-state";
import { formatEuroInput } from "@/lib/money";

import { createFromWonDeal } from "./actions";

export type WonDeal = { id: string; titel: string; wert_einmalig: number; wert_monatlich: number };

// "Projekt anlegen, Retainer anlegen oder beides" with values taken over from the deal.
export function WonFollowUpForm({ deal, today }: { deal: WonDeal; today: string }) {
  const [state, formAction] = useActionState(createFromWonDeal.bind(null, deal.id), initialFormState);
  const checkedDefault = (name: string, fallback: boolean) => (state.values ? state.values[name] === "on" : fallback);
  const [project, setProject] = useState(checkedDefault("projekt_anlegen", deal.wert_einmalig > 0 || deal.wert_monatlich === 0));
  const [retainer, setRetainer] = useState(checkedDefault("retainer_anlegen", deal.wert_monatlich > 0));
  const v = (name: string, fallback: string) => valueOf(state, name, fallback);

  return (
    <form key={state.attempt} action={formAction} className="grid gap-5">
      <fieldset className="grid gap-3 rounded-md border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="projekt_anlegen" checked={project} onChange={(e) => setProject(e.target.checked)} className="accent-primary size-4" />
          Projekt anlegen
        </label>
        {project && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Titel" name="projekt_titel" id="won-projekt-titel" defaultValue={v("projekt_titel", deal.titel)} className="sm:col-span-2" />
            <TextField label="Festpreis (netto, €)" name="projekt_festpreis" id="won-projekt-festpreis" defaultValue={v("projekt_festpreis", deal.wert_einmalig ? formatEuroInput(deal.wert_einmalig) : "")} inputMode="decimal" />
            <TextField label="Deadline" name="projekt_deadline" id="won-projekt-deadline" type="date" defaultValue={v("projekt_deadline", "")} />
            <TextField label="Interner Stundensatz (€)" name="projekt_interner_stundensatz" id="won-projekt-satz" defaultValue={v("projekt_interner_stundensatz", "")} inputMode="decimal" />
            <TextField label="Start" name="projekt_start" id="won-projekt-start" type="date" defaultValue={v("projekt_start", today)} />
          </div>
        )}
      </fieldset>
      <fieldset className="grid gap-3 rounded-md border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="retainer_anlegen" checked={retainer} onChange={(e) => setRetainer(e.target.checked)} className="accent-primary size-4" />
          Retainer anlegen
        </label>
        {retainer && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Titel" name="retainer_titel" id="won-retainer-titel" defaultValue={v("retainer_titel", `${deal.titel} – Betreuung`)} className="sm:col-span-2" />
            <TextField label="Monatsbetrag (netto, €)" name="retainer_monatsbetrag" id="won-retainer-betrag" defaultValue={v("retainer_monatsbetrag", deal.wert_monatlich ? formatEuroInput(deal.wert_monatlich) : "")} inputMode="decimal" />
            <TextField label="Start (= Abrechnungstag)" name="retainer_start" id="won-retainer-start" type="date" defaultValue={v("retainer_start", today)} />
            <TextField label="Mindestlaufzeit (Monate)" name="retainer_laufzeit_monate" id="won-retainer-laufzeit" defaultValue={v("retainer_laufzeit_monate", "")} inputMode="numeric" placeholder="leer = monatlich kündbar" />
            <TextField label="Kündigungsfrist (Tage)" name="retainer_kuendigungsfrist_tage" id="won-retainer-frist" defaultValue={v("retainer_kuendigungsfrist_tage", "30")} inputMode="numeric" />
          </div>
        )}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Anlegen</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
