import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
import { LOGIN_PATH } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";

import { TotpCodeForm } from "./totp-code-form";
import { TotpEnrollment } from "./totp-enrollment";

export const metadata: Metadata = { title: "Zwei-Faktor-Authentifizierung" };

export default async function TwoFactorPage() {
  const supabase = await createClient();
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    redirect(LOGIN_PATH);
  }

  const verifiedFactor = factors.totp[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Zwei-Faktor-Authentifizierung</CardTitle>
        <CardDescription>
          {verifiedFactor
            ? "Gib den aktuellen Code aus deiner Authenticator-App ein."
            : "Richte jetzt deinen zweiten Faktor ein."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {verifiedFactor ? (
          <TotpCodeForm factorId={verifiedFactor.id} submitLabel="Bestätigen" />
        ) : (
          <TotpEnrollment />
        )}
        <form action={signOut}>
          <Button type="submit" variant="link" className="h-auto px-0">
            Abmelden
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
