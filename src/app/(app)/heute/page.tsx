import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TaskList } from "@/components/activities/task-list";
import { PageHeader } from "@/components/page-header";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate, daysSince, INACTIVITY_DAYS } from "@/lib/dates";
import { formatDate, formatEuro } from "@/lib/format";
import { getInactiveDealActivity } from "@/lib/queries";

export const metadata: Metadata = { title: "Heute" };

export default async function TodayPage() {
  const { supabase } = await requireVerifiedSession();
  const today = berlinDate();

  const [{ data: tasks }, inactive] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titel, faellig_am, erledigt, prioritaet, companies(id, name), deals(id, titel)")
      .eq("erledigt", false)
      .lte("faellig_am", today)
      .order("faellig_am")
      .order("prioritaet", { ascending: false }),
    getInactiveDealActivity(supabase),
  ]);

  const { data: staleDeals } = inactive.size
    ? await supabase
        .from("deals")
        .select("id, titel, wert_einmalig, companies(id, name), deal_stages!inner(name, art)")
        .in("id", [...inactive.keys()])
        .eq("deal_stages.art", "offen")
    : { data: [] };

  const sortedStale = (staleDeals ?? []).toSorted(
    (a, b) => (inactive.get(a.id) ?? "").localeCompare(inactive.get(b.id) ?? ""),
  );

  return (
    <>
      <PageHeader title="Heute" description={formatDate(today)} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Fällige und überfällige Aufgaben">
          <TaskList tasks={tasks ?? []} today={today} showLinks />
        </SectionCard>
        <SectionCard title={`Deals ohne Aktivität seit ${INACTIVITY_DAYS} Tagen`}>
          {sortedStale.length ? (
            <ul className="divide-y text-sm">
              {sortedStale.map((deal) => {
                const last = inactive.get(deal.id);
                return (
                  <li key={deal.id} className="flex items-start gap-3 py-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
                        {deal.titel}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {deal.companies?.name} · {deal.deal_stages.name} · {formatEuro(deal.wert_einmalig)}
                        {last && <> · seit {daysSince(last)} Tagen ruhig</>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyHint>Alle offenen Deals sind aktiv betreut.</EmptyHint>
          )}
        </SectionCard>
      </div>
    </>
  );
}
