"use client";

import { useActionState } from "react";

import { FormError, SelectField, SubmitButton } from "@/components/form/fields";
import { formatDate } from "@/lib/format";
import { initialFormState, type FormState } from "@/lib/form-state";

export function CancelRetainerForm({
  action,
  endDates,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  endDates: string[];
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="grid gap-3">
      <SelectField
        label="Kündigen zum"
        name="gekuendigt_zum"
        id="gekuendigt-zum"
        defaultValue={endDates[0] ?? ""}
        options={endDates.map((d, i) => ({ value: d, label: `${formatDate(d)}${i === 0 ? " (frühestmöglich)" : ""}` }))}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" variant="outline" pendingLabel="Speichern …">
          Kündigung erfassen
        </SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
