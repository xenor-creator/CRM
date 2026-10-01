import { describe, expect, it } from "vitest";

import {
  columnTotals,
  groupByStage,
  isRecentlyClosed,
  moveDealToStage,
  weightedValue,
  type Stage,
} from "./deals";

const stages: Stage[] = [
  { id: "neu", name: "Neu", position: 1, art: "offen" },
  { id: "won", name: "Gewonnen", position: 6, art: "gewonnen" },
];

const deals = [
  { id: "a", stage_id: "neu", wert_einmalig: 1999.99, wert_monatlich: 0.1 },
  { id: "b", stage_id: "neu", wert_einmalig: 0.01, wert_monatlich: 0.2 },
  { id: "c", stage_id: "won", wert_einmalig: 500, wert_monatlich: 250 },
];

describe("columnTotals", () => {
  it("sums one-off and monthly values exactly", () => {
    expect(columnTotals(deals.slice(0, 2))).toEqual({ count: 2, einmalig: 2000, monatlich: 0.3 });
    expect(columnTotals([])).toEqual({ count: 0, einmalig: 0, monatlich: 0 });
  });
});

describe("groupByStage", () => {
  it("keeps stage order and assigns deals", () => {
    const groups = groupByStage(stages, deals);
    expect(groups.map((g) => [g.stage.id, g.deals.map((d) => d.id)])).toEqual([
      ["neu", ["a", "b"]],
      ["won", ["c"]],
    ]);
  });
});

describe("moveDealToStage", () => {
  it("moves only the given deal without mutating the input", () => {
    const moved = moveDealToStage(deals, "a", "won");
    expect(moved.find((d) => d.id === "a")?.stage_id).toBe("won");
    expect(deals[0]?.stage_id).toBe("neu");
  });
});

describe("weightedValue", () => {
  it("weights by probability, treating missing probability as 0 %", () => {
    expect(weightedValue({ wert_einmalig: 4800, wahrscheinlichkeit: 25 })).toBe(1200);
    expect(weightedValue({ wert_einmalig: 4800, wahrscheinlichkeit: null })).toBe(0);
  });
});

describe("isRecentlyClosed", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  it("keeps deals closed within 90 days", () => {
    expect(isRecentlyClosed("2026-07-02T12:00:00Z", now)).toBe(true);
    expect(isRecentlyClosed("2026-07-01T11:59:00Z", now)).toBe(false);
    expect(isRecentlyClosed(null, now)).toBe(true);
  });
});
