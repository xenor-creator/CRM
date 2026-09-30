"use client";

import { useActionState, useEffect } from "react";

import { FormError, SelectField, SubmitButton, TextAreaField, TextField, valueOf } from "@/components/form/fields";
import { createActivity } from "@/lib/actions/activities";
import { initialFormState } from "@/lib/form-state";
import { activityTypLabels, labelOptions } from "@/lib/labels";
import type { Option } from "@/lib/queries";

export type ActivityLinks = {
  company_id?: string;
  contact_id?: string;
  deal_id?: string;
  project_id?: string;
};

// Logs a call, mail, meeting or note. Fixed links are passed as hidden fields; optional
// company/contact/deal choices are offered when options are given.
export function ActivityForm({
  links = {},
  companyOptions,
  contactOptions,
  dealOptions,
  idPrefix = "activity",
  onSaved,
}: {
  links?: ActivityLinks;
  companyOptions?: Option[];
  contactOptions?: Option[];
  dealOptions?: Option[];
  idPrefix?: string;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(createActivity, initialFormState);
  const id = (name: string) => `${idPrefix}-${name}`;

  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state, onSaved]);

  return (
    <form key={state.attempt} action={formAction} className="grid gap-3">
      {Object.entries(links).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Art"
          name="typ"
          id={id("typ")}
          defaultValue={valueOf(state, "typ", "notiz")}
          options={labelOptions(activityTypLabels)}
        />
        <TextField
          label="Zeitpunkt"
          name="zeitpunkt"
          id={id("zeitpunkt")}
          type="datetime-local"
          defaultValue={valueOf(state, "zeitpunkt", "")}
          title="Leer lassen für jetzt"
        />
        {companyOptions && (
          <SelectField
            label="Firma"
            name="company_id"
            id={id("company")}
            defaultValue={valueOf(state, "company_id", "")}
            options={companyOptions}
            emptyLabel="Keine Firma"
          />
        )}
        {contactOptions && contactOptions.length > 0 && (
          <SelectField
            label="Kontakt"
            name="contact_id"
            id={id("contact")}
            defaultValue={valueOf(state, "contact_id", "")}
            options={contactOptions}
            emptyLabel="Kein Kontakt"
          />
        )}
        {dealOptions && dealOptions.length > 0 && (
          <SelectField
            label="Deal"
            name="deal_id"
            id={id("deal")}
            defaultValue={valueOf(state, "deal_id", "")}
            options={dealOptions}
            emptyLabel="Kein Deal"
          />
        )}
      </div>
      <TextAreaField
        label="Inhalt"
        name="inhalt"
        id={id("inhalt")}
        defaultValue={valueOf(state, "inhalt", "")}
        rows={3}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Aktivität speichern</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
