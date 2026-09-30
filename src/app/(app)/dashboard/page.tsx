import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireVerifiedSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase } = await requireVerifiedSession();
  const { data: stages, error } = await supabase
    .from("deal_stages")
    .select("id, name, art")
    .order("position");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Kennzahlen zu Pipeline, MRR, offenen Rechnungen und Umsatz folgen in Phase 5."
      />
      <Card>
        <CardHeader>
          <CardTitle>Vertriebsphasen</CardTitle>
          <CardDescription>
            Aus der Datenbank geladen, nur mit gültiger Anmeldung und Zwei-Faktor-Bestätigung.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              Die Vertriebsphasen konnten nicht geladen werden.
            </p>
          ) : (
            <ol className="flex flex-wrap gap-2">
              {stages.map((stage) => (
                <li
                  key={stage.id}
                  className="bg-muted rounded-md px-3 py-1 text-sm data-[art=gewonnen]:bg-emerald-100 data-[art=gewonnen]:text-emerald-900 data-[art=verloren]:bg-red-100 data-[art=verloren]:text-red-900"
                  data-art={stage.art}
                >
                  {stage.name}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}
