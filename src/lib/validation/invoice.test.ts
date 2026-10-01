import { describe, expect, it } from "vitest";

import { invoiceDraftSchema } from "./invoice";

const item = { beschreibung: "Workshop", menge: 1.5, einheit: "Std", einzelpreis: 95 };

describe("invoiceDraftSchema", () => {
  it("parses positions from the editor's JSON field", () => {
    const parsed = invoiceDraftSchema.parse({ positionen: JSON.stringify([item]), ust_satz: "19", leistung_von: "2026-10-01", leistung_bis: "" });
    expect(parsed).toMatchObject({ positionen: [item], ust_satz: 19, leistung_bis: null });
  });

  it("rejects invalid positions and periods", () => {
    const bad = (positionen: unknown, extra = {}) =>
      invoiceDraftSchema.safeParse({ positionen: JSON.stringify(positionen), ust_satz: "19", leistung_von: "2026-10-01", ...extra }).success;
    expect(bad([{ ...item, menge: 0 }])).toBe(false);
    expect(bad([{ ...item, einzelpreis: 1.005 }])).toBe(false);
    expect(bad([{ ...item, einheit: "Kiste" }])).toBe(false);
    expect(bad([{ ...item, beschreibung: " " }])).toBe(false);
    expect(bad([item], { leistung_bis: "2026-09-30" })).toBe(false);
    expect(invoiceDraftSchema.safeParse({ positionen: "{kaputt", ust_satz: "19", leistung_von: "2026-10-01" }).success).toBe(false);
  });
});
