"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";

import { FormError, SubmitButton, TextField, valueOf } from "@/components/form/fields";
import { Button } from "@/components/ui/button";

import { createApiKey, type CreateKeyState } from "./actions";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Kopiert" : label}
    </Button>
  );
}

export function ApiKeyForm() {
  const [state, formAction] = useActionState<CreateKeyState, FormData>(createApiKey, { error: null });

  return (
    <div className="grid gap-4">
      {state.key && (
        <div className="grid gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30">
          <p className="font-medium">Neuer API-Key – er wird nur jetzt angezeigt:</p>
          <code data-testid="new-api-key" className="bg-background rounded px-2 py-1 break-all">
            {state.key}
          </code>
          <div>
            <CopyButton value={state.key} label="Key kopieren" />
          </div>
        </div>
      )}
      <form key={state.attempt} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField
          label="Name"
          name="name"
          id="api-key-name"
          defaultValue={valueOf(state, "name", "")}
          placeholder="z. B. n8n Produktion"
          className="flex-1"
          required
        />
        <SubmitButton pendingLabel="Erzeuge …">API-Key erzeugen</SubmitButton>
      </form>
      <FormError state={state} />
    </div>
  );
}
