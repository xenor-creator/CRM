import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { CLOSED_DEALS_WINDOW_DAYS, isRecentlyClosed } from "@/lib/deals";
import { getInactiveDealActivity } from "@/lib/queries";

import { DealBoard } from "./deal-board";

export const metadata: Metadata = { title: "Deals" };

export default async function DealsPage() {
  const { supabase } = await requireVerifiedSession();

  const [{ data: stages }, { data: deals, error }, inactive] = await Promise.all([
    supabase.from("deal_stages").select("id, name, position, art").order("position"),
    supabase
      .from("deals")
      .select(
        "id, titel, stage_id, wert_einmalig, wert_monatlich, wahrscheinlichkeit, erwarteter_abschluss, abgeschlossen_am, companies(id, name)",
      )
      .order("created_at", { ascending: false }),
    getInactiveDealActivity(supabase),
  ]);

  const visibleDeals = (deals ?? []).filter((d) => isRecentlyClosed(d.abgeschlossen_am));

  return (
    <>
      <PageHeader
        title="Deals"
        description={`Karten zwischen den Phasen ziehen. „Gewonnen“ und „Verloren“ zeigen die letzten ${CLOSED_DEALS_WINDOW_DAYS} Tage.`}
        actions={
          <Button asChild>
            <Link href="/deals/neu">
              <Plus />
              Neuer Deal
            </Link>
          </Button>
        }
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Die Deals konnten nicht geladen werden.
        </p>
      ) : (
        <DealBoard stages={stages ?? []} deals={visibleDeals} inactiveDealIds={[...inactive.keys()]} today={berlinDate()} />
      )}
    </>
  );
}
