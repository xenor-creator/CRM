export const UNITS = ["Stk", "Std", "Tag", "Monat", "Pauschal"] as const;
export type Unit = (typeof UNITS)[number];

// UN/ECE Recommendation 20 codes for the e-invoice (BT-130).
export const UNIT_CODES: Record<Unit, string> = {
  Stk: "C62",
  Std: "HUR",
  Tag: "DAY",
  Monat: "MON",
  Pauschal: "LS",
};

export type LineItem = { beschreibung: string; menge: number; einheit: Unit; einzelpreis: number };

export type Prepayment = { invoice_id?: string; nummer: string; datum: string; netto: number; ust: number; brutto: number };

// Rounds half away from zero, like Postgres round(numeric).
function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

// Line total in cents: quantity (3 decimals) × unit price (2 decimals), computed in integers.
export function lineTotalCents(item: Pick<LineItem, "menge" | "einzelpreis">): number {
  const product = Math.round(item.menge * 1000) * Math.round(item.einzelpreis * 100); // 1/100000 €
  return roundHalfAwayFromZero(product / 1000);
}

export type Totals = { netto: number; ust: number; brutto: number; bereitsGezahlt: number; zahlbetrag: number };

// Mirrors the database trigger compute_invoice_totals.
export function computeTotals(items: readonly LineItem[], vatRate: number, prepayments: readonly Prepayment[] = []): Totals {
  const nettoCents = items.reduce((sum, item) => sum + lineTotalCents(item), 0);
  const ustCents = roundHalfAwayFromZero((nettoCents * Math.round(vatRate * 100)) / 10000);
  const paidCents = prepayments.reduce((sum, p) => sum + Math.round(p.brutto * 100), 0);
  const bruttoCents = nettoCents + ustCents;
  return {
    netto: nettoCents / 100,
    ust: ustCents / 100,
    brutto: bruttoCents / 100,
    bereitsGezahlt: paidCents / 100,
    zahlbetrag: (bruttoCents - paidCents) / 100,
  };
}
