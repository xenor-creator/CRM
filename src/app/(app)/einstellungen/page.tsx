import { Ban } from "lucide-react";
import type { Metadata } from "next";

import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { PageHeader } from "@/components/page-header";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireVerifiedSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

import { revokeApiKey } from "./actions";
import { ApiKeyForm } from "./api-key-form";
import { CompanySettingsForm } from "./company-settings-form";
import { WebhookSecret, WebhookUrlsForm } from "./webhook-settings";

export const metadata: Metadata = { title: "Einstellungen" };

const deliveryLabels: Record<Enums<"webhook_event_status">, string> = {
  ausstehend: "Ausstehend",
  gesendet: "Zugestellt",
  fehlgeschlagen: "Fehlgeschlagen",
};

export default async function SettingsPage() {
  const { supabase, email } = await requireVerifiedSession();

  const [{ data: settings }, { data: keys }, { data: deliveries }] = await Promise.all([
    supabase
      .from("settings")
      .select(
        "webhook_urls, webhook_secret, firmenname, inhaber, strasse, plz, ort, land, email, telefon, website, ust_id, steuernummer, bank_name, iban, bic, standard_ust_satz, zahlungsziel_tage, angebot_gueltig_tage",
      )
      .single(),
    supabase
      .from("api_keys")
      .select("id, name, key_praefix, zuletzt_genutzt_am, widerrufen_am, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("webhook_events")
      .select("id, event, status, versuche, antwort_status, fehler, created_at, gesendet_am")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <PageHeader title="Einstellungen" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="grid grid-cols-1 content-start gap-6">
          <SectionCard title="Zugang">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">E-Mail</dt>
              <dd className="break-all">{email}</dd>
              <dt className="text-muted-foreground">Zwei-Faktor</dt>
              <dd>Aktiv (Authenticator-App)</dd>
            </dl>
          </SectionCard>

          <SectionCard title="API-Keys für n8n">
            <div className="grid gap-6">
              <ApiKeyForm />
              {keys?.length ? (
                <ul className="divide-y text-sm">
                  {keys.map((key) => (
                    <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div>
                        <span className="font-medium">{key.name}</span>{" "}
                        <code className="text-muted-foreground text-xs">{key.key_praefix}…</code>
                        <p className="text-muted-foreground text-xs">
                          Erstellt {formatDateTime(key.created_at)} ·{" "}
                          {key.zuletzt_genutzt_am ? `zuletzt genutzt ${formatDateTime(key.zuletzt_genutzt_am)}` : "noch nie genutzt"}
                        </p>
                      </div>
                      {key.widerrufen_am ? (
                        <Badge variant="outline">Widerrufen</Badge>
                      ) : (
                        <ConfirmActionButton
                          action={revokeApiKey.bind(null, key.id)}
                          confirmMessage={`API-Key „${key.name}“ widerrufen? n8n-Workflows mit diesem Key funktionieren danach nicht mehr.`}
                          variant="outline"
                          size="sm"
                        >
                          <Ban />
                          Widerrufen
                        </ConfirmActionButton>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint>Noch keine API-Keys.</EmptyHint>
              )}
            </div>
          </SectionCard>

          {settings && (
            <SectionCard title="Firmendaten für Angebote und Rechnungen">
              <CompanySettingsForm settings={settings} />
            </SectionCard>
          )}
        </div>

        <div className="grid grid-cols-1 content-start gap-6">
          <SectionCard title="Webhooks an n8n">
            <div className="grid gap-6">
              {settings && <WebhookSecret secret={settings.webhook_secret} />}
              <WebhookUrlsForm urls={(settings?.webhook_urls as Record<string, string> | null) ?? {}} />
            </div>
          </SectionCard>

          <SectionCard title="Letzte Zustellungen">
            {deliveries?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ereignis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Versuche</TableHead>
                    <TableHead>Zeit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <code className="text-xs">{d.event}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === "fehlgeschlagen" ? "destructive" : d.status === "gesendet" ? "secondary" : "outline"}>
                          {deliveryLabels[d.status]}
                        </Badge>
                        {d.fehler && <span className="text-muted-foreground block text-xs">{d.fehler}</span>}
                      </TableCell>
                      <TableCell>{d.versuche}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(d.gesendet_am ?? d.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyHint>Noch keine Webhooks versendet.</EmptyHint>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
