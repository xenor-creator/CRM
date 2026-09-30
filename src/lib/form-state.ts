export type Duplicate = {
  company_id: string;
  company_name: string;
  kundennummer: string;
  grund: string;
};

// Result of a form Server Action. `values` echoes the submitted fields so the
// form can show them again; `attempt` changes on every failure and is used as the
// form's key, so React remounts it with those values (selects keep their choice).
export type FormState = {
  error: string | null;
  values?: Record<string, string>;
  attempt?: number;
  ok?: boolean;
  duplicates?: Duplicate[];
};

export const initialFormState: FormState = { error: null };

export function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !key.startsWith("$")) {
      values[key] = value;
    }
  });
  return values;
}

// Successful submission of a form that stays on the page; the new key clears the form.
export function success(): FormState {
  return { error: null, ok: true, attempt: Date.now() };
}

export function failure(error: string, formData: FormData, extra?: Partial<FormState>): FormState {
  return { error, values: submittedValues(formData), attempt: Date.now(), ...extra };
}
