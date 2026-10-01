"use client";

import { useActionState, useState } from "react";

import { FormError, SelectField, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { Card, CardContent } from "@/components/ui/card";
import { initialFormState, type FormState } from "@/lib/form-state";
import { formatEuroInput } from "@/lib/money";
import type { Option } from "@/lib/queries";
import type { Tables } from "@/lib/supabase/database.types";

export type ContactOption = Option & { companyId: string };

type DealDefaults = Partial<Tables<"deals">>;

export function DealForm({
  action,
  deal = {},
  companyOptions,
  contactOptions,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  deal?: DealDefaults;
  companyOptions: Option[];
  contactOptions: ContactOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = (name: keyof DealDefaults) => valueOf(state, name, deal[name] as string | number | null);
  const amount = (name: "wert_einmalig" | "wert_monatlich") =>
    state.values?.[name] ?? (deal[name] ? formatEuroInput(deal[name]) : "");

  const [companyId, setCompanyId] = useState(v("company_id"));
  const contactsOfCompany = contactOptions.filter((c) => c.companyId === companyId);

  return (
    <form key={state.attempt} action={formAction} className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField label="Titel *" name="titel" defaultValue={v("titel")} required className="sm:col-span-2" />
          <SelectField
            label="Firma *"
            name="company_id"
            defaultValue={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={companyOptions}
            emptyLabel="Bitte wählen"
            required
          />
          <SelectField
            key={companyId}
            label="Kontakt"
            name="contact_id"
            defaultValue={contactsOfCompany.some((c) => c.value === v("contact_id")) ? v("contact_id") : ""}
            options={contactsOfCompany}
            emptyLabel={companyId ? "Kein Kontakt" : "Erst Firma wählen"}
          />
          <TextField
            label="Wert einmalig (netto, €)"
            name="wert_einmalig"
            defaultValue={amount("wert_einmalig")}
            inputMode="decimal"
            placeholder="0,00"
          />
          <TextField
            label="Wert monatlich (netto, €)"
            name="wert_monatlich"
            defaultValue={amount("wert_monatlich")}
            inputMode="decimal"
            placeholder="0,00"
          />
          <TextField
            label="Wahrscheinlichkeit (%)"
            name="wahrscheinlichkeit"
            defaultValue={v("wahrscheinlichkeit")}
            inputMode="numeric"
          />
          <TextField
            label="Erwarteter Abschluss"
            name="erwarteter_abschluss"
            type="date"
            defaultValue={v("erwarteter_abschluss")}
          />
          <TextField label="Quelle" name="quelle" defaultValue={v("quelle")} placeholder="z. B. Empfehlung, LinkedIn, Website" className="sm:col-span-2" />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
