"use client";

import { useActionState } from "react";

import { FormError, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { initialFormState, type FormState } from "@/lib/form-state";

export function TimeEntryForm({
  action,
  today,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  today: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form key={state.attempt} action={formAction} className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Datum" name="datum" id="time-datum" type="date" defaultValue={valueOf(state, "datum", today)} required />
        <TextField label="Dauer" name="dauer" id="time-dauer" defaultValue={valueOf(state, "dauer", "")} placeholder="1:30" required />
      </div>
      <TextField label="Beschreibung" name="beschreibung" id="time-beschreibung" defaultValue={valueOf(state, "beschreibung", "")} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" variant="secondary">
          Zeit nachtragen
        </SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
