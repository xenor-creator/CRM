import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTimeline, timelineSelect } from "@/components/activity-timeline";
import { CompanyStatusBadge } from "@/components/company-status-badge";
import { DefinitionList } from "@/components/definition-list";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { PageHeader } from "@/components/page-header";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/address";
import { requireVerifiedSession } from "@/lib/auth/session";
import { formatDate, formatEuro } from "@/lib/format";
import {
  invoiceStatusLabels,
  potenzialLabels,
  projectStatusLabels,
  retainerStatusLabels,
} from "@/lib/labels";
import { contactName } from "@/lib/names";

import { deleteCompany } from "../actions";

export const metadata: Metadata = { title: "Firma" };

export default async function CompanyPage(props: PageProps<"/firmen/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!company) {
    notFound();
  }

  const [contacts, deals, projects, retainers, invoices, activities] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, vorname, nachname, email, telefon, position, ist_hauptkontakt")
      .eq("company_id", id)
      .order("ist_hauptkontakt", { ascending: false })
      .order("nachname"),
    supabase
      .from("deals")
      .select("id, titel, wert_einmalig, wert_monatlich, deal_stages(name, art)")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, titel, status, deadline, festpreis")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("retainers")
      .select("id, titel, status, monatsbetrag")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, nummer, datum, status, summe_brutto")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select(timelineSelect)
      .eq("company_id", id)
      .order("zeitpunkt", { ascending: false })
      .limit(100),
  ]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {company.name}
            <CompanyStatusBadge status={company.status} />
          </span>
        }
        description={
          <>
            {company.kundennummer}
            {company.domain && <> · {company.domain}</>}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/firmen/${id}/bearbeiten`}>
                <Pencil />
                Bearbeiten
              </Link>
            </Button>
            <ConfirmActionButton
              action={deleteCompany.bind(null, id)}
              confirmMessage={`„${company.name}“ mit allen Kontakten, Deals, Aktivitäten und Aufgaben löschen? Rechnungen bleiben erhalten.`}
              variant="outline"
              size="sm"
            >
              <Trash2 />
              Löschen
            </ConfirmActionButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <SectionCard title="Stammdaten">
            <DefinitionList
              items={[
                ["Website", company.website],
                ["Branche", company.branche],
                ["Größe", company.groesse],
                ["Mitarbeiter", company.mitarbeiterzahl],
                ["Adresse", formatAddress(company)],
                ["USt-IdNr.", company.ust_id],
                ["Tools", company.tool_stack.join(", ")],
                [
                  "Potenzial",
                  company.automatisierungspotenzial && potenzialLabels[company.automatisierungspotenzial],
                ],
                ["Schmerzpunkte", company.schmerzpunkte],
                ["Notizen", company.notizen],
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Kontakte"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={`/kontakte/neu?firma=${id}`}>
                  <Plus />
                  Kontakt
                </Link>
              </Button>
            }
          >
            {contacts.data?.length ? (
              <ul className="divide-y text-sm">
                {contacts.data.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <Link href={`/kontakte/${c.id}`} className="font-medium hover:underline">
                        {contactName(c)}
                      </Link>
                      {c.ist_hauptkontakt && (
                        <Badge variant="secondary" className="ml-2">
                          Hauptkontakt
                        </Badge>
                      )}
                      {c.position && <span className="text-muted-foreground block text-xs">{c.position}</span>}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="hover:underline">
                          {c.email}
                        </a>
                      )}
                      {c.telefon && <span className="block">{c.telefon}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Noch keine Kontakte.</EmptyHint>
            )}
          </SectionCard>

          <SectionCard
            title="Deals"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={`/deals/neu?firma=${id}`}>
                  <Plus />
                  Deal
                </Link>
              </Button>
            }
          >
            {deals.data?.length ? (
              <ul className="divide-y text-sm">
                {deals.data.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/deals/${d.id}`} className="font-medium hover:underline">
                      {d.titel}
                    </Link>
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      {formatEuro(d.wert_einmalig)}
                      {d.wert_monatlich > 0 && <> + {formatEuro(d.wert_monatlich)}/Monat</>}
                      <Badge variant="outline">{d.deal_stages?.name}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Noch keine Deals.</EmptyHint>
            )}
          </SectionCard>

          <div className="grid gap-6 md:grid-cols-3">
            <SectionCard title="Projekte">
              {projects.data?.length ? (
                <ul className="grid gap-2 text-sm">
                  {projects.data.map((p) => (
                    <li key={p.id}>
                      <span className="font-medium">{p.titel}</span>
                      <span className="text-muted-foreground block text-xs">
                        {projectStatusLabels[p.status]}
                        {p.deadline && <> · bis {formatDate(p.deadline)}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint>Keine Projekte.</EmptyHint>
              )}
            </SectionCard>
            <SectionCard title="Retainer">
              {retainers.data?.length ? (
                <ul className="grid gap-2 text-sm">
                  {retainers.data.map((r) => (
                    <li key={r.id}>
                      <span className="font-medium">{r.titel}</span>
                      <span className="text-muted-foreground block text-xs">
                        {retainerStatusLabels[r.status]} · {formatEuro(r.monatsbetrag)}/Monat
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint>Keine Retainer.</EmptyHint>
              )}
            </SectionCard>
            <SectionCard title="Rechnungen">
              {invoices.data?.length ? (
                <ul className="grid gap-2 text-sm">
                  {invoices.data.map((i) => (
                    <li key={i.id}>
                      <span className="font-medium">{i.nummer ?? "Entwurf"}</span>
                      <span className="text-muted-foreground block text-xs">
                        {invoiceStatusLabels[i.status]} · {formatEuro(i.summe_brutto)}
                        {i.datum && <> · {formatDate(i.datum)}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint>Keine Rechnungen.</EmptyHint>
              )}
            </SectionCard>
          </div>
        </div>

        <div className="grid content-start gap-6">
          <SectionCard title="Aktivitäten">
            <ActivityTimeline activities={activities.data ?? []} />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
