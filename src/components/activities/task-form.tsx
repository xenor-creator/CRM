"use client";

import { useActionState, useEffect } from "react";

import { FormError, SelectField, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { createTask } from "@/lib/actions/activities";
import { initialFormState } from "@/lib/form-state";
import { labelOptions, prioritaetLabels } from "@/lib/labels";
import type { Option } from "@/lib/queries";

export type TaskLinks = { company_id?: string; deal_id?: string; project_id?: string };

export function TaskForm({
  links = {},
  companyOptions,
  dealOptions,
  idPrefix = "task",
  onSaved,
}: {
  links?: TaskLinks;
  companyOptions?: Option[];
  dealOptions?: Option[];
  idPrefix?: string;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(createTask, initialFormState);
  const id = (name: string) => `${idPrefix}-${name}`;

  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state, onSaved]);

  return (
    <form key={state.attempt} action={formAction} className="grid gap-3">
      {Object.entries(links).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <TextField label="Neue Aufgabe" name="titel" id={id("titel")} defaultValue={valueOf(state, "titel", "")} required />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Fällig am" name="faellig_am" id={id("faellig")} type="date" defaultValue={valueOf(state, "faellig_am", "")} />
        <SelectField
          label="Priorität"
          name="prioritaet"
          id={id("prioritaet")}
          defaultValue={valueOf(state, "prioritaet", "mittel")}
          options={labelOptions(prioritaetLabels)}
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
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" variant="secondary">
          Aufgabe anlegen
        </SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
