"use client";

import { Eye, EyeOff, RefreshCw, Send } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { FormError, SubmitButton, valueOf } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/lib/form-state";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

import { CopyButton } from "./api-key-form";
import { regenerateWebhookSecret, saveWebhookUrls, sendTestWebhook, type TestResult } from "./actions";

export function WebhookSecret({ secret }: { secret: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-2">
      <Label htmlFor="webhook-secret">Signatur-Geheimnis (HMAC-SHA256)</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="webhook-secret"
          readOnly
          value={visible ? secret : "•".repeat(32)}
          className="min-w-0 flex-1 font-mono text-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff /> : <Eye />}
          {visible ? "Verbergen" : "Anzeigen"}
        </Button>
        <CopyButton value={secret} label="Kopieren" />
        <ConfirmActionButton
          action={regenerateWebhookSecret}
          confirmMessage="Neues Geheimnis erzeugen? n8n muss danach mit dem neuen Wert prüfen."
          variant="outline"
          size="sm"
        >
          <RefreshCw />
          Erneuern
        </ConfirmActionButton>
      </div>
    </div>
  );
}

export function WebhookUrlsForm({ urls }: { urls: Record<string, string> }) {
  const [state, formAction] = useActionState(saveWebhookUrls, initialFormState);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testing, startTest] = useTransition();

  return (
    <form key={state.attempt} action={formAction} className="grid gap-4">
      {WEBHOOK_EVENTS.map((event) => {
        const field = `url:${event.name}`;
        const result = results[event.name];
        return (
          <div key={event.name} className="grid gap-2">
            <Label htmlFor={field} className="flex-wrap gap-x-2 gap-y-1 leading-snug">
              {event.label} <code className="text-muted-foreground text-xs">{event.name}</code>
              {event.phase > 3 && <span className="text-muted-foreground text-xs">(wird ab Phase 4 gesendet)</span>}
            </Label>
            <div className="flex gap-2">
              <Input
                id={field}
                name={field}
                type="url"
                defaultValue={valueOf(state, field, urls[event.name])}
                placeholder="https://n8n.example.de/webhook/…"
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={testing || !urls[event.name]}
                title={urls[event.name] ? "Test-Ereignis senden" : "Erst URL speichern"}
                onClick={() =>
                  startTest(async () => {
                    const outcome = await sendTestWebhook(event.name);
                    setResults((current) => ({ ...current, [event.name]: outcome }));
                  })
                }
              >
                <Send />
                Test
              </Button>
            </div>
            {result && (
              <p role="status" className={result.ok ? "text-xs text-emerald-700 dark:text-emerald-400" : "text-destructive text-xs"}>
                {result.message}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Webhook-Ziele speichern</SubmitButton>
        {state.ok && <p className="text-muted-foreground text-sm">Gespeichert.</p>}
        <FormError state={state} />
      </div>
    </form>
  );
}
