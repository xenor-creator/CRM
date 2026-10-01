import { Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityForm } from "@/components/activities/activity-form";
import { ActivityTimeline, timelineSelect } from "@/components/activity-timeline";
import { DefinitionList } from "@/components/definition-list";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { PageHeader } from "@/components/page-header";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireVerifiedSession } from "@/lib/auth/session";
import { formatDateTime, formatEuro } from "@/lib/format";
import { contactName } from "@/lib/names";

import { deleteContact } from "../actions";

export const metadata: Metadata = { title: "Kontakt" };

export default async function ContactPage(props: PageProps<"/kontakte/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*, companies(id, name, kundennummer)")
    .eq("id", id)
    .maybeSingle();
  if (!contact) {
    notFound();
  }

  const [deals, activities] = await Promise.all([
    supabase
      .from("deals")
      .select("id, titel, wert_einmalig, deal_stages(name)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select(timelineSelect)
      .eq("contact_id", id)
      .order("zeitpunkt", { ascending: false })
      .limit(100),
  ]);

  const name = contactName(contact);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {name}
            {contact.ist_hauptkontakt && <Badge variant="secondary">Hauptkontakt</Badge>}
          </span>
        }
        description={
          contact.companies && (
            <Link href={`/firmen/${contact.companies.id}`} className="hover:underline">
              {contact.companies.name} ({contact.companies.kundennummer})
            </Link>
          )
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/kontakte/${id}/bearbeiten`}>
                <Pencil />
                Bearbeiten
              </Link>
            </Button>
            <ConfirmActionButton
              action={deleteContact.bind(null, id)}
              confirmMessage={`${name} mit allen Aktivitäten löschen?`}
              variant="outline"
              size="sm"
            >
              <Trash2 />
              Löschen
            </ConfirmActionButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-1 content-start gap-6 lg:col-span-2">
          <SectionCard title="Kontaktdaten">
            <DefinitionList
              items={[
                ["Position", contact.position],
                ["E-Mail", contact.email && <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>],
                ["Telefon", contact.telefon && <a href={`tel:${contact.telefon}`} className="hover:underline">{contact.telefon}</a>],
                ["LinkedIn", contact.linkedin],
                [
                  "Marketing",
                  contact.einwilligung_marketing && contact.einwilligung_datum
                    ? `Einwilligung am ${formatDateTime(contact.einwilligung_datum)}`
                    : "Keine Einwilligung",
                ],
              ]}
            />
          </SectionCard>
          <SectionCard title="Deals">
            {deals.data?.length ? (
              <ul className="divide-y text-sm">
                {deals.data.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/deals/${d.id}`} className="font-medium hover:underline">
                      {d.titel}
                    </Link>
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      {formatEuro(d.wert_einmalig)}
                      <Badge variant="outline">{d.deal_stages?.name}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Keine Deals mit diesem Kontakt.</EmptyHint>
            )}
          </SectionCard>
        </div>
        <SectionCard title="Aktivitäten">
          <div className="grid gap-6">
            <ActivityForm links={{ company_id: contact.company_id, contact_id: id }} />
            <ActivityTimeline activities={activities.data ?? []} />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
