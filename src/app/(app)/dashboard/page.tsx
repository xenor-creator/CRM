import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TaskList } from "@/components/activities/task-list";
import { PageHeader } from "@/components/page-header";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { StaleDealList } from "@/components/stale-deal-list";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { requireVerifiedSession } from "@/lib/auth/session";
import { pipeline, receivables, revenue } from "@/lib/dashboard";
import { addDays, berlinDate, INACTIVITY_DAYS } from "@/lib/dates";
import { formatDate, formatEuro } from "@/lib/format";
import type { Prepayment } from "@/lib/invoices/line-items";
import { projectStatusLabels } from "@/lib/labels";
import { getDueTasks, getStaleDeals } from "@/lib/queries";
import { monthlyRecurringRevenue } from "@/lib/retainers";

export const metadata: Metadata = { title: "Dashboard" };

const DEADLINE_DAYS = 7;
const MONTHS = new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "UTC" });

export default async function DashboardPage() {
  const { supabase } = await requireVerifiedSession();
  const today = berlinDate();
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const [deals, retainers, openInvoices, yearInvoices, projects, tasks, staleDeals] = await Promise.all([
    supabase.from("deals").select("wert_einmalig, wert_monatlich, wahrscheinlichkeit, deal_stages!inner(art)").eq("deal_stages.art", "offen"),
    supabase.from("retainers").select("status, monatsbetrag").neq("status", "beendet"),
    supabase.from("invoices").select("status, art, zahlbetrag").in("status", ["versendet", "ueberfaellig"]),
    supabase.from("invoices").select("status, datum, summe_netto, abschlaege").neq("status", "entwurf").gte("datum", yearStart),
    supabase
      .from("projects")
      .select("id, titel, deadline, status, companies(id, name)")
      .neq("status", "abgeschlossen")
      .not("deadline", "is", null)
      .lte("deadline", addDays(today, DEADLINE_DAYS))
      .order("deadline"),
    getDueTasks(supabase, today),
    getStaleDeals(supabase),
  ]);

  const pipe = pipeline(deals.data ?? []);
  const mrr = monthlyRecurringRevenue(retainers.data ?? []);
  const open = receivables(openInvoices.data ?? []);
  const sales = revenue(
    (yearInvoices.data ?? []).map((i) => ({ ...i, abschlaege: i.abschlaege as Prepayment[] })),
    today,
  );
  const failed = [deals, retainers, openInvoices, yearInvoices, projects].some((r) => r.error);

  return (
    <>
      <PageHeader title="Dashboard" description={formatDate(today)} />
      {failed && (
        <p role="alert" className="text-destructive mb-4 text-sm">
          Einige Kennzahlen konnten nicht geladen werden.
        </p>
      )}

      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Pipeline gewichtet"
          value={formatEuro(pipe.einmaligGewichtet)}
          href="/deals"
          detail={
            <>
              gesamt {formatEuro(pipe.einmalig)} einmalig · {formatEuro(pipe.monatlich)} monatlich
              <br />
              {pipe.count} offene Deals · monatlich gewichtet {formatEuro(pipe.monatlichGewichtet)}
            </>
          }
        />
        <StatTile label="MRR aus Retainern" value={formatEuro(mrr)} href="/retainer" detail={`${retainers.data?.length ?? 0} aktive oder gekündigte Retainer`} />
        <StatTile
          label="Offene Rechnungen"
          value={formatEuro(open.betrag)}
          href={open.ueberfaellig ? "/rechnungen?status=ueberfaellig" : "/rechnungen?status=versendet"}
          detail={
            <span className="flex flex-wrap items-center gap-x-2">
              {open.count} {open.count === 1 ? "Rechnung" : "Rechnungen"}
              {open.ueberfaellig > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
                  <AlertCircle className="size-3.5" aria-hidden />
                  {open.ueberfaellig} überfällig ({formatEuro(open.ueberfaelligBetrag)})
                </span>
              )}
            </span>
          }
        />
        <StatTile
          label={`Umsatz ${MONTHS.format(new Date(`${today}T00:00:00Z`))}`}
          value={formatEuro(sales.monat)}
          href="/rechnungen"
          detail={`${today.slice(0, 4)} bisher ${formatEuro(sales.jahr)} · netto nach Rechnungsdatum`}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Aufgaben für heute" action={<Link href="/heute" className="text-sm hover:underline">Alle</Link>}>
          <TaskList tasks={tasks} today={today} showLinks />
        </SectionCard>
        <SectionCard title={`Projekte mit Deadline in ${DEADLINE_DAYS} Tagen`}>
          {projects.data?.length ? (
            <ul className="divide-y text-sm">
              {projects.data.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={`/projekte/${p.id}`} className="font-medium hover:underline">
                      {p.titel}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {p.companies?.name} · {projectStatusLabels[p.status]}
                    </p>
                  </div>
                  <Badge variant={p.deadline! < today ? "destructive" : "secondary"}>
                    {p.deadline! < today ? "überfällig seit " : "bis "}
                    {formatDate(p.deadline!)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint>Keine Deadlines in den nächsten {DEADLINE_DAYS} Tagen.</EmptyHint>
          )}
        </SectionCard>
        <SectionCard title={`Deals ohne Aktivität seit ${INACTIVITY_DAYS} Tagen`}>
          <StaleDealList deals={staleDeals} />
        </SectionCard>
      </div>
    </>
  );
}
