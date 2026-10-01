"use client";

import { useActionState } from "react";

import { FormError, SelectField, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { initialFormState, type FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function PaidForm({ action, today }: { action: Action; today: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <TextField label="Bezahlt am" name="bezahlt_am" id="bezahlt-am" type="date" defaultValue={valueOf(state, "bezahlt_am", today)} />
      <SubmitButton variant="secondary">Als bezahlt markieren</SubmitButton>
      <FormError state={state} />
    </form>
  );
}

export function ProjectInvoiceForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form key={state.attempt} action={formAction} className="grid gap-3">
      <SelectField
        label="Art"
        name="art"
        id="invoice-art"
        defaultValue={valueOf(state, "art", "rechnung")}
        options={[
          { value: "rechnung", label: "Rechnung über den Festpreis" },
          { value: "abschlagsrechnung", label: "Abschlagsrechnung" },
          { value: "schlussrechnung", label: "Schlussrechnung (abzgl. Abschläge)" },
        ]}
      />
      <TextField
        label="Abschlag (nur bei Abschlagsrechnung)"
        name="abschlag"
        id="invoice-abschlag"
        defaultValue={valueOf(state, "abschlag", "")}
        placeholder="z. B. 30 % oder 1.500,00"
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Rechnungsentwurf erstellen</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
