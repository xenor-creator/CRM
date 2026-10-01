import { Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TaskForm } from "@/components/activities/task-form";
import { TaskList } from "@/components/activities/task-list";
import { DefinitionList } from "@/components/definition-list";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { PageHeader } from "@/components/page-header";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { formatDate, formatEuro } from "@/lib/format";
import { invoiceStatusLabels, projectStatusLabels } from "@/lib/labels";
import { formatMinutes, profitability } from "@/lib/projects";

import { createProjectInvoice } from "../../rechnungen/actions";
import { ProjectInvoiceForm } from "../../rechnungen/invoice-forms";
import { addTimeEntry, deleteProject, deleteTimeEntry } from "../actions";
import { ProjectTimer } from "../project-timer";
import { TimeEntryForm } from "../time-entry-form";

export const metadata: Metadata = { title: "Projekt" };

export default async function ProjectPage(props: PageProps<"/projekte/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();

  const { data: project } = await supabase
    .from("projects")
    .select("*, companies(id, name, kundennummer), deals(id, titel)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [entries, tasks, invoices] = await Promise.all([
    supabase.from("time_entries").select("id, datum, minuten, beschreibung").eq("project_id", id).order("datum", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, titel, faellig_am, erledigt, prioritaet")
      .eq("project_id", id)
      .eq("erledigt", false)
      .order("faellig_am", { ascending: true, nullsFirst: false }),
    supabase
      .from("invoices")
      .select("id, nummer, art, status, summe_netto, datum")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const minutes = (entries.data ?? []).reduce((sum, e) => sum + e.minuten, 0);
  const result = profitability(minutes, project.interner_stundensatz, project.festpreis);
  const today = berlinDate();

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.titel}
            <Badge variant="outline">{projectStatusLabels[project.status]}</Badge>
          </span>
        }
        description={
          <>
            {project.companies && (
              <Link href={`/firmen/${project.companies.id}`} className="hover:underline">
                {project.companies.name} ({project.companies.kundennummer})
              </Link>
            )}
            {project.deals && (
              <>
                {" · Deal "}
                <Link href={`/deals/${project.deals.id}`} className="hover:underline">
                  {project.deals.titel}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projekte/${id}/bearbeiten`}>
                <Pencil />
                Bearbeiten
              </Link>
            </Button>
            <ConfirmActionButton
              action={deleteProject.bind(null, id)}
              confirmMessage={`Projekt „${project.titel}“ mit Zeiteinträgen und Aufgaben löschen? Rechnungen bleiben erhalten.`}
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SectionCard title="Details">
              <DefinitionList
                items={[
                  ["Start", project.start && formatDate(project.start)],
                  ["Deadline", project.deadline && formatDate(project.deadline)],
                  ["Festpreis", project.festpreis != null ? formatEuro(project.festpreis) : null],
                  ["Stundensatz intern", project.interner_stundensatz != null ? formatEuro(project.interner_stundensatz) : null],
                ]}
              />
            </SectionCard>
            <SectionCard title="Rentabilität">
              <DefinitionList
                items={[
                  ["Erfasste Zeit", formatMinutes(result.minutes)],
                  ["Interne Kosten", result.internalCost != null ? formatEuro(result.internalCost) : "Kein Stundensatz hinterlegt"],
                  [
                    "Marge",
                    result.margin != null && (
                      <span className={result.margin < 0 ? "text-destructive font-medium" : "font-medium text-emerald-700 dark:text-emerald-400"} data-testid="margin">
                        {formatEuro(result.margin)}
                        {result.marginPercent != null && ` (${result.marginPercent.toLocaleString("de-DE")} %)`}
                      </span>
                    ),
                  ],
                ]}
              />
            </SectionCard>
          </div>

          <SectionCard title="Zeiterfassung">
            <div className="grid gap-6">
              <ProjectTimer projectId={id} startedAt={project.timer_gestartet_am} />
              <TimeEntryForm action={addTimeEntry.bind(null, id)} today={today} />
              {entries.data?.length ? (
                <ul className="divide-y text-sm">
                  {entries.data.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <span className="font-medium tabular-nums">{formatMinutes(e.minuten)}</span>
                        <span className="text-muted-foreground"> · {formatDate(e.datum)}</span>
                        {e.beschreibung && <p className="text-muted-foreground break-words text-xs">{e.beschreibung}</p>}
                      </div>
                      <ConfirmActionButton
                        action={deleteTimeEntry.bind(null, e.id)}
                        confirmMessage="Diesen Zeiteintrag löschen?"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Zeiteintrag löschen"
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmActionButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint>Noch keine Zeit erfasst.</EmptyHint>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 content-start gap-6">
          <SectionCard title="Rechnungen">
            {invoices.data?.length ? (
              <ul className="grid gap-2 text-sm">
                {invoices.data.map((i) => (
                  <li key={i.id}>
                    <Link href={`/rechnungen/${i.id}`} className="font-medium hover:underline">
                      {i.nummer ?? "Entwurf"}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {invoiceStatusLabels[i.status]} · {formatEuro(i.summe_netto)} netto
                      {i.datum && <> · {formatDate(i.datum)}</>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Noch keine Rechnungen.</EmptyHint>
            )}
            <div className="mt-4 border-t pt-4">
              <ProjectInvoiceForm action={createProjectInvoice.bind(null, id)} />
            </div>
          </SectionCard>
          <SectionCard title="Aufgaben">
            <div className="grid gap-4">
              <TaskList tasks={tasks.data ?? []} today={today} />
              <TaskForm links={{ project_id: id }} />
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
