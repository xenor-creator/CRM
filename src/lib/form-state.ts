export type Duplicate = {
  company_id: string;
  company_name: string;
  kundennummer: string;
  grund: string;
};

// Result of a form Server Action. `values` echoes the submitted fields so the
// form can show them again after React resets it.
export type FormState = {
  error: string | null;
  values?: Record<string, string>;
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

export function failure(error: string, formData: FormData, extra?: Partial<FormState>): FormState {
  return { error, values: submittedValues(formData), ...extra };
}
