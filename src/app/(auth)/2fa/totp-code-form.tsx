"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { verifyTotp } from "./actions";

export function TotpCodeForm({ factorId, submitLabel }: { factorId: string; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(verifyTotp, { error: null });

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <div className="grid gap-2">
        <Label htmlFor="code">Code aus der Authenticator-App</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          required
          autoFocus
        />
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Prüfen …" : submitLabel}
      </Button>
    </form>
  );
}
