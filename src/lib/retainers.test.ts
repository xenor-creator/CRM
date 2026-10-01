import { describe, expect, it } from "vitest";

import {
  duePeriods,
  minimumTermEnd,
  monthlyRecurringRevenue,
  nextBillingDate,
  periodEnd,
  periodIndex,
  periodStart,
  possibleEndDates,
  retainerNotices,
} from "./retainers";

describe("periods", () => {
  it("anchors on the start day and clamps to month end", () => {
    expect(periodStart("2026-01-31", 1)).toBe("2026-02-28");
    expect(periodStart("2026-01-31", 2)).toBe("2026-03-31");
    expect(periodStart("2027-12-15", 1)).toBe("2028-01-15");
    expect(periodEnd("2026-01-31", 0)).toBe("2026-02-27");
    expect(periodEnd("2026-10-01", 0)).toBe("2026-10-31");
    expect(periodEnd("2026-10-15", 0)).toBe("2026-11-14");
  });

  it("finds the period containing a date", () => {
    expect(periodIndex("2026-10-15", "2026-10-15")).toBe(0);
    expect(periodIndex("2026-10-15", "2026-11-14")).toBe(0);
    expect(periodIndex("2026-10-15", "2026-11-15")).toBe(1);
    expect(periodIndex("2026-01-31", "2026-02-28")).toBe(1);
  });
});

const terms = { start: "2026-01-01", laufzeit_monate: 12, kuendigungsfrist_tage: 30 };

describe("minimumTermEnd and possibleEndDates", () => {
  it("ends the minimum term after laufzeit_monate", () => {
    expect(minimumTermEnd(terms)).toBe("2026-12-31");
    expect(minimumTermEnd({ ...terms, laufzeit_monate: null })).toBeNull();
  });

  it("offers the minimum term end while notice is still possible", () => {
    expect(possibleEndDates(terms, "2026-06-15", 2)).toEqual(["2026-12-31", "2027-01-31"]);
    expect(possibleEndDates(terms, "2026-12-01", 1)).toEqual(["2026-12-31"]);
  });

  it("moves to the next month once the notice deadline has passed", () => {
    expect(possibleEndDates(terms, "2026-12-02", 1)).toEqual(["2027-01-31"]);
    expect(possibleEndDates({ ...terms, laufzeit_monate: null, kuendigungsfrist_tage: 14 }, "2026-03-20", 2)).toEqual([
      "2026-04-30",
      "2026-05-31",
    ]);
    expect(possibleEndDates({ ...terms, laufzeit_monate: null, kuendigungsfrist_tage: 14 }, "2026-03-17", 1)).toEqual(["2026-03-31"]);
  });
});

describe("retainerNotices", () => {
  const active = { ...terms, status: "aktiv" as const, gekuendigt_zum: null };

  it("warns 30 days before the notice deadline and the term end", () => {
    expect(retainerNotices(active, "2026-10-31")).toEqual([]);
    expect(retainerNotices(active, "2026-11-01")).toEqual([
      { kind: "kuendigungsfrist", date: "2026-12-01", days: 30, endDate: "2026-12-31" },
    ]);
    expect(retainerNotices(active, "2026-12-15")).toEqual([{ kind: "laufzeitende", date: "2026-12-31", days: 16 }]);
  });

  it("is quiet after the minimum term and for open-ended retainers", () => {
    expect(retainerNotices(active, "2027-02-10")).toEqual([]);
    expect(retainerNotices({ ...active, laufzeit_monate: null }, "2026-11-20")).toEqual([]);
  });

  it("announces the end of a cancelled retainer", () => {
    const cancelled = { ...active, status: "gekuendigt" as const, gekuendigt_zum: "2027-01-31" };
    expect(retainerNotices(cancelled, "2027-01-01")).toEqual([{ kind: "laufzeitende", date: "2027-01-31", days: 30 }]);
    expect(retainerNotices(cancelled, "2026-12-01")).toEqual([]);
    expect(retainerNotices({ ...cancelled, status: "beendet" }, "2027-01-20")).toEqual([]);
  });
});

describe("duePeriods", () => {
  const r = { start: "2026-08-15", laufzeit_monate: null, kuendigungsfrist_tage: 30, gekuendigt_zum: null };

  it("bills in advance on the billing day and catches up missed months", () => {
    expect(duePeriods({ ...r, naechste_abrechnung: "2026-08-15" }, "2026-08-14")).toEqual([]);
    expect(duePeriods({ ...r, naechste_abrechnung: "2026-08-15" }, "2026-08-15")).toEqual([{ from: "2026-08-15", to: "2026-09-14" }]);
    expect(duePeriods({ ...r, naechste_abrechnung: "2026-08-15" }, "2026-10-20")).toEqual([
      { from: "2026-08-15", to: "2026-09-14" },
      { from: "2026-09-15", to: "2026-10-14" },
      { from: "2026-10-15", to: "2026-11-14" },
    ]);
    expect(duePeriods({ ...r, naechste_abrechnung: "2026-10-15" }, "2026-10-20")).toEqual([{ from: "2026-10-15", to: "2026-11-14" }]);
  });

  it("stops after the cancellation date", () => {
    expect(duePeriods({ ...r, naechste_abrechnung: "2026-10-15", gekuendigt_zum: "2026-10-14" }, "2026-12-01")).toEqual([]);
    expect(duePeriods({ ...r, naechste_abrechnung: "2026-09-15", gekuendigt_zum: "2026-10-14" }, "2026-12-01")).toEqual([
      { from: "2026-09-15", to: "2026-10-14" },
    ]);
  });

  it("computes the next billing date", () => {
    expect(nextBillingDate(r, "2026-10-15")).toBe("2026-11-15");
    expect(nextBillingDate({ ...r, start: "2026-01-31" }, "2026-02-28")).toBe("2026-03-31");
  });
});

describe("monthlyRecurringRevenue", () => {
  it("sums running retainers exactly", () => {
    expect(
      monthlyRecurringRevenue([
        { status: "aktiv", monatsbetrag: 499.99 },
        { status: "gekuendigt", monatsbetrag: 0.01 },
        { status: "beendet", monatsbetrag: 1000 },
      ]),
    ).toBe(500);
  });
});
