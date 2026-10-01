"use client";

import { useActionState } from "react";

import { FormError, SelectField, SubmitButton, TextAreaField, TextField, valueOf } from "@/components/form/fields";
import { Card, CardContent } from "@/components/ui/card";
import { initialFormState, type FormState } from "@/lib/form-state";
import { formatEuroInput } from "@/lib/money";
import type { Option } from "@/lib/queries";
import type { Tables } from "@/lib/supabase/database.types";

type RetainerDefaults = Partial<Tables<"retainers">>;

export function RetainerForm({
  action,
  retainer = {},
  companyOptions,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  retainer?: RetainerDefaults;
  companyOptions: Option[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = (name: keyof RetainerDefaults) => valueOf(state, name, retainer[name] as string | number | null);

  return (
    <form key={state.attempt} action={formAction} className="grid gap-6">
      {retainer.deal_id && <input type="hidden" name="deal_id" value={retainer.deal_id} />}
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField label="Titel *" name="titel" defaultValue={v("titel")} required className="sm:col-span-2" />
          <SelectField label="Firma *" name="company_id" defaultValue={v("company_id")} options={companyOptions} emptyLabel="Bitte wählen" required />
          <TextField
            label="Monatsbetrag (netto, €) *"
            name="monatsbetrag"
            defaultValue={state.values?.monatsbetrag ?? (retainer.monatsbetrag != null ? formatEuroInput(retainer.monatsbetrag) : "")}
            inputMode="decimal"
            required
          />
          <TextField label="Start (= Abrechnungstag) *" name="start" type="date" defaultValue={v("start")} required />
          <TextField label="Mindestlaufzeit (Monate)" name="laufzeit_monate" defaultValue={v("laufzeit_monate")} inputMode="numeric" placeholder="leer = monatlich kündbar" />
          <TextField label="Kündigungsfrist (Tage)" name="kuendigungsfrist_tage" defaultValue={v("kuendigungsfrist_tage") || "30"} inputMode="numeric" />
          <TextAreaField label="Leistungsumfang" name="leistungsumfang" defaultValue={v("leistungsumfang")} className="sm:col-span-2" />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-sm">
        Abrechnung monatlich im Voraus zum Abrechnungstag. Nach der Mindestlaufzeit verlängert sich der Retainer jeweils um einen Monat.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
