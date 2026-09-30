"use client";

import { useActionState } from "react";

import { DuplicateWarning } from "@/components/form/duplicate-warning";
import {
  CheckboxField,
  FormError,
  SelectField,
  SubmitButton,
  TextField,
  valueOf,
} from "@/components/form/fields";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { initialFormState, type FormState } from "@/lib/form-state";
import type { Option } from "@/lib/queries";
import type { Tables } from "@/lib/supabase/database.types";

type ContactDefaults = Partial<Tables<"contacts">>;

export function ContactForm({
  action,
  contact = {},
  companyOptions,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  contact?: ContactDefaults;
  companyOptions: Option[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = (name: keyof ContactDefaults) => valueOf(state, name, contact[name] as string | null);
  const checked = (name: "ist_hauptkontakt" | "einwilligung_marketing") =>
    state.values ? state.values[name] === "on" : Boolean(contact[name]);

  return (
    <form key={state.attempt} action={formAction} className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Firma *"
            name="company_id"
            defaultValue={v("company_id")}
            options={companyOptions}
            emptyLabel="Bitte wählen"
            required
            className="sm:col-span-2"
          />
          <TextField label="Vorname" name="vorname" defaultValue={v("vorname")} />
          <TextField label="Nachname *" name="nachname" defaultValue={v("nachname")} required />
          <TextField label="E-Mail" name="email" type="email" defaultValue={v("email")} />
          <TextField label="Telefon" name="telefon" type="tel" defaultValue={v("telefon")} />
          <TextField label="Position" name="position" defaultValue={v("position")} />
          <TextField label="LinkedIn" name="linkedin" defaultValue={v("linkedin")} placeholder="https://www.linkedin.com/in/…" />
          <CheckboxField
            label="Hauptkontakt der Firma"
            name="ist_hauptkontakt"
            defaultChecked={checked("ist_hauptkontakt")}
            description="Ein bisheriger Hauptkontakt wird automatisch abgelöst."
          />
          <CheckboxField
            label="Einwilligung Marketing"
            name="einwilligung_marketing"
            defaultChecked={checked("einwilligung_marketing")}
            description={
              contact.einwilligung_datum
                ? `Erteilt am ${formatDateTime(contact.einwilligung_datum)}`
                : "Das Datum wird beim Speichern automatisch erfasst."
            }
          />
        </CardContent>
      </Card>

      <DuplicateWarning duplicates={state.duplicates} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
