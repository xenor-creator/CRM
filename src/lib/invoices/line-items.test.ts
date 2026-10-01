import { describe, expect, it } from "vitest";

import { computeTotals, lineTotalCents } from "./line-items";

describe("lineTotalCents", () => {
  it("rounds half away from zero like Postgres", () => {
    expect(lineTotalCents({ menge: 1.5, einzelpreis: 95.33 })).toBe(14300); // 142.995 -> 143.00
    expect(lineTotalCents({ menge: 1.5, einzelpreis: -95.33 })).toBe(-14300);
    expect(lineTotalCents({ menge: 0.333, einzelpreis: 10 })).toBe(333);
    expect(lineTotalCents({ menge: 3, einzelpreis: 0.1 })).toBe(30);
  });
});

describe("computeTotals", () => {
  it("matches the database example (VAT on the net total)", () => {
    expect(
      computeTotals(
        [
          { beschreibung: "Workshop", menge: 1.5, einheit: "Std", einzelpreis: 95.33 },
          { beschreibung: "Pauschale", menge: 1, einheit: "Pauschal", einzelpreis: 1000 },
        ],
        19,
      ),
    ).toEqual({ netto: 1143, ust: 217.17, brutto: 1360.17, bereitsGezahlt: 0, zahlbetrag: 1360.17 });
  });

  it("deducts prepayments on final invoices", () => {
    const totals = computeTotals([{ beschreibung: "Festpreis", menge: 1, einheit: "Pauschal", einzelpreis: 10000 }], 19, [
      { nummer: "RE-2026-0002-K1001", datum: "2026-10-01", netto: 3000, ust: 570, brutto: 3570 },
    ]);
    expect(totals).toEqual({ netto: 10000, ust: 1900, brutto: 11900, bereitsGezahlt: 3570, zahlbetrag: 8330 });
  });

  it("handles cancellations and reduced rates", () => {
    expect(computeTotals([{ beschreibung: "x", menge: 1, einheit: "Stk", einzelpreis: -1360.17 }], 19).ust).toBe(-258.43);
    expect(computeTotals([{ beschreibung: "x", menge: 1, einheit: "Stk", einzelpreis: 99.99 }], 7).ust).toBe(7);
  });
});
