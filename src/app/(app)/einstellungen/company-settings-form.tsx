"use client";

import { useActionState } from "react";

import { FormError, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { formatIban } from "@/lib/iban";
import { initialFormState } from "@/lib/form-state";
import type { Tables } from "@/lib/supabase/database.types";

import { saveCompanySettings } from "./actions";

type Settings = Pick<
  Tables<"settings">,
  | "firmenname" | "inhaber" | "strasse" | "plz" | "ort" | "land" | "email" | "telefon" | "website" | "ust_id"
  | "steuernummer" | "bank_name" | "iban" | "bic" | "standard_ust_satz" | "zahlungsziel_tage" | "angebot_gueltig_tage"
>;

export function CompanySettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction] = useActionState(saveCompanySettings, initialFormState);
  const v = (name: keyof Settings) => valueOf(state, name, settings[name]);

  return (
    <form key={state.attempt} action={formAction} className="grid gap-4 sm:grid-cols-6">
      <TextField label="Firmenname *" name="firmenname" defaultValue={v("firmenname")} className="sm:col-span-4" />
      <TextField label="Inhaber" name="inhaber" defaultValue={v("inhaber")} className="sm:col-span-2" />
      <TextField label="Straße *" name="strasse" defaultValue={v("strasse")} className="sm:col-span-6" />
      <TextField label="PLZ *" name="plz" defaultValue={v("plz")} className="sm:col-span-2" />
      <TextField label="Ort *" name="ort" defaultValue={v("ort")} className="sm:col-span-3" />
      <TextField label="Land" name="land" defaultValue={v("land")} maxLength={2} className="sm:col-span-1" />
      <TextField label="E-Mail" name="email" type="email" defaultValue={v("email")} className="sm:col-span-3" />
      <TextField label="Telefon" name="telefon" defaultValue={v("telefon")} className="sm:col-span-3" />
      <TextField label="Website" name="website" defaultValue={v("website")} className="sm:col-span-6" />
      <TextField label="Steuernummer" name="steuernummer" defaultValue={v("steuernummer")} className="sm:col-span-3" />
      <TextField label="USt-IdNr." name="ust_id" defaultValue={v("ust_id")} className="sm:col-span-3" />
      <TextField label="Bank" name="bank_name" defaultValue={v("bank_name")} className="sm:col-span-6" />
      <TextField
        label="IBAN *"
        name="iban"
        defaultValue={state.values?.iban ?? (settings.iban ? formatIban(settings.iban) : "")}
        className="sm:col-span-4"
      />
      <TextField label="BIC" name="bic" defaultValue={v("bic")} className="sm:col-span-2" />
      <TextField label="USt-Satz (%)" name="standard_ust_satz" defaultValue={v("standard_ust_satz")} inputMode="decimal" className="sm:col-span-2" />
      <TextField label="Zahlungsziel (Tage)" name="zahlungsziel_tage" defaultValue={v("zahlungsziel_tage")} inputMode="numeric" className="sm:col-span-2" />
      <TextField label="Angebot gültig (Tage)" name="angebot_gueltig_tage" defaultValue={v("angebot_gueltig_tage")} inputMode="numeric" className="sm:col-span-2" />
      <p className="text-muted-foreground text-xs sm:col-span-6">
        Pflicht für Rechnungen nach § 14 UStG: Name, Anschrift, Steuernummer oder USt-IdNr. Die IBAN steht in der E-Rechnung als Zahlungsweg.
      </p>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <SubmitButton>Firmendaten speichern</SubmitButton>
        {state.ok && <p className="text-muted-foreground text-sm">Gespeichert.</p>}
        <FormError state={state} />
      </div>
    </form>
  );
}
