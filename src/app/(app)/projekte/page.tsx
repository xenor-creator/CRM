import { Plus, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireVerifiedSession } from "@/lib/auth/session";
import { addDays, berlinDate } from "@/lib/dates";
import { formatDate, formatEuro } from "@/lib/format";
import { labelOptions, projectStatusLabels } from "@/lib/labels";
import { formatMinutes } from "@/lib/projects";
import { firstParam } from "@/lib/search";
import { Constants, type Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Projekte" };

const isStatus = (v: string | undefined): v is Enums<"project_status"> =>
  (Constants.public.Enums.project_status as readonly string[]).includes(v ?? "");

const DEADLINE_WARNING_DAYS = 7;

export default async function ProjectsPage(props: PageProps<"/projekte">) {
  const status = firstParam((await props.searchParams).status);
  const { supabase } = await requireVerifiedSession();

  let query = supabase
    .from("projects")
    .select("id, titel, status, deadline, festpreis, timer_gestartet_am, companies(id, name), time_entries(minuten)")
    .order("deadline", { ascending: true, nullsFirst: false });
  query = isStatus(status) ? query.eq("status", status) : query.neq("status", "abgeschlossen");
  const { data: projects, error } = await query;

  const today = berlinDate();
  const warnUntil = addDays(today, DEADLINE_WARNING_DAYS);

  return (
    <>
      <PageHeader
        title="Projekte"
        description={isStatus(status) ? undefined : "Offene Projekte (ohne Abgeschlossene)."}
        actions={
          <Button asChild>
            <Link href="/projekte/neu">
              <Plus />
              Neues Projekt
            </Link>
          </Button>
        }
      />
      <form className="mb-4 flex gap-2">
        <NativeSelect name="status" defaultValue={isStatus(status) ? status : ""} aria-label="Status">
          <option value="">Alle offenen</option>
          {labelOptions(projectStatusLabels).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Anwenden
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Die Projekte konnten nicht geladen werden.
        </p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Projekte gefunden.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projekt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="hidden md:table-cell">Festpreis</TableHead>
              <TableHead className="hidden md:table-cell">Erfasst</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => {
              const minutes = p.time_entries.reduce((sum, t) => sum + t.minuten, 0);
              const soon = p.deadline && p.deadline <= warnUntil && p.status !== "abgeschlossen";
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/projekte/${p.id}`} className="hover:underline">
                      {p.titel}
                    </Link>
                    {p.timer_gestartet_am && <Timer className="ml-2 inline size-3.5 text-emerald-600" aria-label="Timer läuft" />}
                    {p.companies && <span className="text-muted-foreground block text-xs">{p.companies.name}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{projectStatusLabels[p.status]}</Badge>
                  </TableCell>
                  <TableCell className={soon ? (p.deadline! < today ? "text-destructive font-medium" : "font-medium text-amber-700") : ""}>
                    {p.deadline ? formatDate(p.deadline) : "–"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{p.festpreis != null ? formatEuro(p.festpreis) : "–"}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatMinutes(minutes)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
