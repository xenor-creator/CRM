import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityForm } from "@/components/activities/activity-form";
import { TaskForm } from "@/components/activities/task-form";
import { TaskList } from "@/components/activities/task-list";
import { ActivityTimeline, timelineSelect } from "@/components/activity-timeline";
import { DefinitionList } from "@/components/definition-list";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate, daysSince, INACTIVITY_DAYS, inactivityCutoff } from "@/lib/dates";
import { weightedValue } from "@/lib/deals";
import { formatDate, formatDateTime, formatEuro } from "@/lib/format";
import { contactName } from "@/lib/names";

import { changeDealStage, deleteDeal } from "../actions";
import { StageForm } from "../stage-form";

export const metadata: Metadata = { title: "Deal" };

export default async function DealPage(props: PageProps<"/deals/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();

  const { data: deal } = await supabase
    .from("deals")
    .select("*, companies(id, name, kundennummer), contacts(id, vorname, nachname), deal_stages(id, name, art)")
    .eq("id", id)
    .maybeSingle();
  if (!deal) {
    notFound();
  }

  const [stages, activities, tasks, status] = await Promise.all([
    supabase.from("deal_stages").select("id, name, position, art").order("position"),
    supabase
      .from("activities")
      .select(timelineSelect)
      .eq("deal_id", id)
      .order("zeitpunkt", { ascending: false })
      .limit(100),
    supabase
      .from("tasks")
      .select("id, titel, faellig_am, erledigt, prioritaet")
      .eq("deal_id", id)
      .eq("erledigt", false)
      .order("faellig_am", { ascending: true, nullsFirst: false }),
    supabase.from("deal_activity_status").select("letzte_aktivitaet").eq("deal_id", id).maybeSingle(),
  ]);

  const lastActivity = status.data?.letzte_aktivitaet;
  const isInactive =
    deal.deal_stages?.art === "offen" && lastActivity !== null && lastActivity !== undefined && lastActivity < inactivityCutoff();

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {deal.titel}
            <Badge variant="outline">{deal.deal_stages?.name}</Badge>
          </span>
        }
        description={
          deal.companies && (
            <Link href={`/firmen/${deal.companies.id}`} className="hover:underline">
              {deal.companies.name} ({deal.companies.kundennummer})
            </Link>
          )
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/deals/${id}/bearbeiten`}>
                <Pencil />
                Bearbeiten
              </Link>
            </Button>
            <ConfirmActionButton
              action={deleteDeal.bind(null, id)}
              confirmMessage={`Deal „${deal.titel}“ mit Aktivitäten und Aufgaben löschen?`}
              variant="outline"
              size="sm"
            >
              <Trash2 />
              Löschen
            </ConfirmActionButton>
          </>
        }
      />

      {isInactive && lastActivity && (
        <p className="mb-6 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30">
          <AlertTriangle className="size-4 text-amber-600" />
          Seit {daysSince(lastActivity)} Tagen keine Aktivität (Warnschwelle: {INACTIVITY_DAYS} Tage).
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <SectionCard title="Details">
            <DefinitionList
              items={[
                ["Wert einmalig", formatEuro(deal.wert_einmalig)],
                ["Wert monatlich", deal.wert_monatlich > 0 ? formatEuro(deal.wert_monatlich) : null],
                ["Wahrscheinlichkeit", deal.wahrscheinlichkeit !== null ? `${deal.wahrscheinlichkeit} %` : null],
                ["Gewichtet", deal.wahrscheinlichkeit !== null ? formatEuro(weightedValue(deal)) : null],
                ["Erwarteter Abschluss", deal.erwarteter_abschluss && formatDate(deal.erwarteter_abschluss)],
                [
                  "Kontakt",
                  deal.contacts && (
                    <Link href={`/kontakte/${deal.contacts.id}`} className="hover:underline">
                      {contactName(deal.contacts)}
                    </Link>
                  ),
                ],
                ["Quelle", deal.quelle],
                ["Abgeschlossen am", deal.abgeschlossen_am && formatDateTime(deal.abgeschlossen_am)],
                ["Verlustgrund", deal.verlustgrund],
              ]}
            />
          </SectionCard>
          <SectionCard title="Aktivitäten">
            <div className="grid gap-6">
              <ActivityForm
                links={{
                  deal_id: id,
                  company_id: deal.company_id,
                  ...(deal.contact_id ? { contact_id: deal.contact_id } : {}),
                }}
              />
              <ActivityTimeline activities={activities.data ?? []} />
            </div>
          </SectionCard>
        </div>
        <div className="grid content-start gap-6">
          <SectionCard title="Phase">
            <StageForm
              key={deal.stage_id}
              action={changeDealStage.bind(null, id)}
              stages={stages.data ?? []}
              currentStageId={deal.stage_id}
            />
          </SectionCard>
          <SectionCard title="Aufgaben">
            <div className="grid gap-4">
              <TaskList tasks={tasks.data ?? []} today={berlinDate()} />
              <TaskForm links={{ deal_id: id }} />
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
