import type { Prepayment } from "@/lib/invoices/line-items";
import type { Enums } from "@/lib/supabase/database.types";

const cents = (amount: number) => Math.round(amount * 100);
const euros = (amountCents: number) => amountCents / 100;
const weighted = (amountCents: number, percent: number | null) => Math.round((amountCents * (percent ?? 0)) / 100);

export type PipelineDeal = { wert_einmalig: number; wert_monatlich: number; wahrscheinlichkeit: number | null };
export type Pipeline = { count: number; einmalig: number; monatlich: number; einmaligGewichtet: number; monatlichGewichtet: number };

// Open deals only; one-off and monthly values stay separate (as on the board).
export function pipeline(deals: readonly PipelineDeal[]): Pipeline {
  const sum = (pick: (d: PipelineDeal) => number) => euros(deals.reduce((total, d) => total + pick(d), 0));
  return {
    count: deals.length,
    einmalig: sum((d) => cents(d.wert_einmalig)),
    monatlich: sum((d) => cents(d.wert_monatlich)),
    einmaligGewichtet: sum((d) => weighted(cents(d.wert_einmalig), d.wahrscheinlichkeit)),
    monatlichGewichtet: sum((d) => weighted(cents(d.wert_monatlich), d.wahrscheinlichkeit)),
  };
}

export type ReceivableInvoice = { status: Enums<"invoice_status">; art: Enums<"invoice_art">; zahlbetrag: number };
export type Receivables = { count: number; betrag: number; ueberfaellig: number; ueberfaelligBetrag: number };

// Invoices sent but not paid; cancellation invoices are never receivables.
export function receivables(invoices: readonly ReceivableInvoice[]): Receivables {
  const open = invoices.filter((i) => i.art !== "stornorechnung" && (i.status === "versendet" || i.status === "ueberfaellig"));
  const overdue = open.filter((i) => i.status === "ueberfaellig");
  const total = (list: readonly ReceivableInvoice[]) => euros(list.reduce((sum, i) => sum + cents(i.zahlbetrag), 0));
  return { count: open.length, betrag: total(open), ueberfaellig: overdue.length, ueberfaelligBetrag: total(overdue) };
}

export type RevenueInvoice = {
  status: Enums<"invoice_status">;
  datum: string | null;
  summe_netto: number;
  abschlaege: readonly Pick<Prepayment, "netto">[];
};

// Net revenue of one invoice: final invoices only count what the listed down payments did not
// already invoice. Cancellations carry negative amounts and offset their original.
export function invoiceRevenueCents(invoice: Pick<RevenueInvoice, "summe_netto" | "abschlaege">): number {
  return cents(invoice.summe_netto) - invoice.abschlaege.reduce((sum, a) => sum + cents(a.netto), 0);
}

// Net revenue by invoice date (accrual) for the month and year of `today` (YYYY-MM-DD).
export function revenue(invoices: readonly RevenueInvoice[], today: string): { monat: number; jahr: number } {
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  let monat = 0;
  let jahr = 0;
  for (const invoice of invoices) {
    if (invoice.status === "entwurf" || !invoice.datum || invoice.datum > today) continue;
    if (!invoice.datum.startsWith(year)) continue;
    const amount = invoiceRevenueCents(invoice);
    jahr += amount;
    if (invoice.datum.startsWith(month)) monat += amount;
  }
  return { monat: euros(monat), jahr: euros(jahr) };
}
