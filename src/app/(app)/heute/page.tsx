import type { Metadata } from "next";

import { TaskList } from "@/components/activities/task-list";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StaleDealList } from "@/components/stale-deal-list";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate, INACTIVITY_DAYS } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { getDueTasks, getStaleDeals } from "@/lib/queries";

export const metadata: Metadata = { title: "Heute" };

export default async function TodayPage() {
  const { supabase } = await requireVerifiedSession();
  const today = berlinDate();
  const [tasks, staleDeals] = await Promise.all([getDueTasks(supabase, today), getStaleDeals(supabase)]);

  return (
    <>
      <PageHeader title="Heute" description={formatDate(today)} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Fällige und überfällige Aufgaben">
          <TaskList tasks={tasks} today={today} showLinks />
        </SectionCard>
        <SectionCard title={`Deals ohne Aktivität seit ${INACTIVITY_DAYS} Tagen`}>
          <StaleDealList deals={staleDeals} />
        </SectionCard>
      </div>
    </>
  );
}
