import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireVerifiedSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const { email } = await requireVerifiedSession();

  return (
    <>
      <PageHeader title="Einstellungen" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Zugang</CardTitle>
            <CardDescription>Einziger Nutzer dieses CRM.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">E-Mail</dt>
              <dd className="break-all">{email}</dd>
              <dt className="text-muted-foreground">Zwei-Faktor</dt>
              <dd>Aktiv (Authenticator-App)</dd>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weitere Einstellungen</CardTitle>
            <CardDescription>
              API-Keys und Webhook-Ziele folgen in Phase 3, Firmendaten, Bankverbindung,
              Nummernkreise und Umsatzsteuer in Phase 4.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
