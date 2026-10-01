import { sumAmounts, weightAmount } from "@/lib/money";
import type { Enums } from "@/lib/supabase/database.types";

export type Stage = { id: string; name: string; position: number; art: Enums<"deal_stage_art"> };

export type BoardDeal = {
  id: string;
  titel: string;
  stage_id: string;
  wert_einmalig: number;
  wert_monatlich: number;
  wahrscheinlichkeit: number | null;
  erwarteter_abschluss: string | null;
  abgeschlossen_am: string | null;
  companies: { id: string; name: string } | null;
};

export type ColumnTotals = { count: number; einmalig: number; monatlich: number };

export function columnTotals(deals: readonly Pick<BoardDeal, "wert_einmalig" | "wert_monatlich">[]): ColumnTotals {
  return {
    count: deals.length,
    einmalig: sumAmounts(deals.map((d) => d.wert_einmalig)),
    monatlich: sumAmounts(deals.map((d) => d.wert_monatlich)),
  };
}

export function groupByStage<T extends { stage_id: string }>(stages: readonly Stage[], deals: readonly T[]) {
  return stages.map((stage) => ({ stage, deals: deals.filter((d) => d.stage_id === stage.id) }));
}

export function moveDealToStage<T extends { id: string; stage_id: string }>(
  deals: readonly T[],
  dealId: string,
  stageId: string,
): T[] {
  return deals.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d));
}

export function weightedValue(deal: Pick<BoardDeal, "wert_einmalig" | "wahrscheinlichkeit">): number {
  return weightAmount(deal.wert_einmalig, deal.wahrscheinlichkeit ?? 0);
}

export const CLOSED_DEALS_WINDOW_DAYS = 90;

// Won/lost columns only show recently closed deals so the board stays readable.
export function isRecentlyClosed(closedAt: string | null, now: Date = new Date()): boolean {
  if (!closedAt) return true;
  return now.getTime() - new Date(closedAt).getTime() <= CLOSED_DEALS_WINDOW_DAYS * 86_400_000;
}
