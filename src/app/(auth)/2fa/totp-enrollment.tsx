"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { startTotpEnrollment, type EnrollmentResult } from "./actions";
import { TotpCodeForm } from "./totp-code-form";

export function TotpEnrollment() {
  const [result, setResult] = useState<EnrollmentResult | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      setResult(await startTotpEnrollment());
    });

  if (!result?.ok) {
    return (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          Für den Zugang ist eine Zwei-Faktor-Authentifizierung Pflicht. Du brauchst eine
          Authenticator-App, zum Beispiel 1Password, Bitwarden oder Google Authenticator.
        </p>
        {result && (
          <p role="alert" className="text-destructive text-sm">
            {result.error}
          </p>
        )}
        <Button onClick={start} disabled={pending}>
          {pending ? "Wird vorbereitet …" : "Zwei-Faktor-Authentifizierung einrichten"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Scanne den QR-Code mit deiner Authenticator-App und gib anschließend den angezeigten Code
        ein.
      </p>
      <div className="flex justify-center rounded-md bg-white p-3">
        <Image src={result.qrCode} alt="QR-Code für die Authenticator-App" width={180} height={180} unoptimized />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer">QR-Code lässt sich nicht scannen?</summary>
        <p className="text-muted-foreground mt-2">Diesen Schlüssel manuell eingeben:</p>
        <code className="bg-muted mt-1 block rounded px-2 py-1 break-all">{result.secret}</code>
      </details>
      <TotpCodeForm factorId={result.factorId} submitLabel="Einrichtung abschließen" />
    </div>
  );
}
