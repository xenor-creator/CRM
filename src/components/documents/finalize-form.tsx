"use client";

import { useActionState } from "react";

import { FormError, SubmitButton } from "@/components/form/fields";
import { initialFormState, type FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

// Finalizing assigns the number and freezes the document, hence the confirmation.
export function FinalizeForm({ action, label, confirmText }: { action: Action; label: string; confirmText: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="grid gap-2"
    >
      <SubmitButton pendingLabel="Wird abgeschlossen …">{label}</SubmitButton>
      <FormError state={state} />
    </form>
  );
}
