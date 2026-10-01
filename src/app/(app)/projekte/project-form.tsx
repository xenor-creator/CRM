"use client";

import { useActionState } from "react";

import { FormError, SelectField, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { Card, CardContent } from "@/components/ui/card";
import { initialFormState, type FormState } from "@/lib/form-state";
import { labelOptions, projectStatusLabels } from "@/lib/labels";
import { formatEuroInput } from "@/lib/money";
import type { Option } from "@/lib/queries";
import type { Tables } from "@/lib/supabase/database.types";

type ProjectDefaults = Partial<Tables<"projects">>;

export function ProjectForm({
  action,
  project = {},
  companyOptions,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  project?: ProjectDefaults;
  companyOptions: Option[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = (name: keyof ProjectDefaults) => valueOf(state, name, project[name] as string | null);
  const amount = (name: "festpreis" | "interner_stundensatz") =>
    state.values?.[name] ?? (project[name] != null ? formatEuroInput(project[name]) : "");

  return (
    <form key={state.attempt} action={formAction} className="grid gap-6">
      {project.deal_id && <input type="hidden" name="deal_id" value={project.deal_id} />}
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField label="Titel *" name="titel" defaultValue={v("titel")} required className="sm:col-span-2" />
          <SelectField
            label="Firma *"
            name="company_id"
            defaultValue={v("company_id")}
            options={companyOptions}
            emptyLabel="Bitte wählen"
            required
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={v("status") || "geplant"}
            options={labelOptions(projectStatusLabels)}
          />
          <TextField label="Start" name="start" type="date" defaultValue={v("start")} />
          <TextField label="Deadline" name="deadline" type="date" defaultValue={v("deadline")} />
          <TextField label="Festpreis (netto, €)" name="festpreis" defaultValue={amount("festpreis")} inputMode="decimal" />
          <TextField
            label="Interner Stundensatz (€)"
            name="interner_stundensatz"
            defaultValue={amount("interner_stundensatz")}
            inputMode="decimal"
          />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
