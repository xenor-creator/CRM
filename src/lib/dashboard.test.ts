import { describe, expect, it } from "vitest";

import { invoiceRevenueCents, pipeline, receivables, revenue, type RevenueInvoice } from "./dashboard";

describe("pipeline", () => {
  it("sums one-off and monthly values separately and weights them", () => {
    const result = pipeline([
      { wert_einmalig: 4800, wert_monatlich: 500, wahrscheinlichkeit: 50 },
      { wert_einmalig: 1000.1, wert_monatlich: 0, wahrscheinlichkeit: 25 },
      { wert_einmalig: 300, wert_monatlich: 99.99, wahrscheinlichkeit: null },
    ]);
    expect(result).toEqual({ count: 3, einmalig: 6100.1, monatlich: 599.99, einmaligGewichtet: 2650.03, monatlichGewichtet: 250 });
  });

  it("is zero without deals", () => {
    expect(pipeline([])).toEqual({ count: 0, einmalig: 0, monatlich: 0, einmaligGewichtet: 0, monatlichGewichtet: 0 });
  });
});

describe("receivables", () => {
  it("counts sent and overdue invoices, not drafts, paid or cancellations", () => {
    expect(
      receivables([
        { status: "versendet", art: "rechnung", zahlbetrag: 1713.6 },
        { status: "ueberfaellig", art: "rechnung", zahlbetrag: 595 },
        { status: "versendet", art: "stornorechnung", zahlbetrag: -595 },
        { status: "bezahlt", art: "schlussrechnung", zahlbetrag: 3998.4 },
        { status: "entwurf", art: "rechnung", zahlbetrag: 100 },
        { status: "storniert", art: "rechnung", zahlbetrag: 50 },
      ]),
    ).toEqual({ count: 2, betrag: 2308.6, ueberfaellig: 1, ueberfaelligBetrag: 595 });
  });
});

describe("revenue", () => {
  const invoice = (datum: string | null, summe_netto: number, extra: Partial<RevenueInvoice> = {}): RevenueInvoice => ({
    status: "versendet",
    datum,
    summe_netto,
    abschlaege: [],
    ...extra,
  });

  it("deducts down payments listed on final invoices", () => {
    expect(invoiceRevenueCents({ summe_netto: 4800, abschlaege: [{ netto: 1440 }] })).toBe(336000);
  });

  it("splits by month and year of the invoice date, cancellations offset", () => {
    const result = revenue(
      [
        invoice("2026-10-01", 1440),
        invoice("2026-10-01", 4800, { abschlaege: [{ netto: 1440 }], status: "bezahlt" }),
        invoice("2026-10-01", 500, { status: "storniert" }),
        invoice("2026-10-01", -500),
        invoice("2026-03-15", 1000.55, { status: "ueberfaellig" }),
        invoice("2025-12-31", 9999),
        invoice(null, 777, { status: "entwurf" }),
      ],
      "2026-10-15",
    );
    expect(result).toEqual({ monat: 4800, jahr: 5800.55 });
  });

  it("ignores invoices dated after today", () => {
    expect(revenue([invoice("2026-10-20", 100)], "2026-10-15")).toEqual({ monat: 0, jahr: 0 });
  });
});
