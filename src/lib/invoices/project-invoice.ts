import type { LineItem, Prepayment } from "./line-items";

export type ProjectInvoiceKind = "rechnung" | "abschlagsrechnung" | "schlussrechnung";

export type PriorInvoice = {
  id: string;
  nummer: string | null;
  datum: string | null;
  art: "rechnung" | "abschlagsrechnung" | "schlussrechnung" | "stornorechnung";
  status: "entwurf" | "versendet" | "bezahlt" | "ueberfaellig" | "storniert";
  summe_netto: number;
  summe_ust: number;
  summe_brutto: number;
};

export type ProjectInvoiceDraft =
  | { ok: true; positionen: LineItem[]; abschlaege: Prepayment[] }
  | { ok: false; error: string };

// Finalized, not cancelled down payments of the project.
export function settledDownPayments(invoices: readonly PriorInvoice[]): Prepayment[] {
  return invoices
    .filter((i) => i.art === "abschlagsrechnung" && i.nummer && i.datum && ["versendet", "bezahlt", "ueberfaellig"].includes(i.status))
    .map((i) => ({ invoice_id: i.id, nummer: i.nummer!, datum: i.datum!, netto: i.summe_netto, ust: i.summe_ust, brutto: i.summe_brutto }));
}

// Line items for a fixed-price project invoice: full price, a down payment (amount or percent
// of the fixed price) or the final invoice that deducts all settled down payments.
export function projectInvoiceDraft(
  project: { titel: string; festpreis: number | null },
  kind: ProjectInvoiceKind,
  priorInvoices: readonly PriorInvoice[],
  downPayment?: { betrag: number } | { prozent: number },
): ProjectInvoiceDraft {
  if (!project.festpreis || project.festpreis <= 0) {
    return { ok: false, error: "Das Projekt hat keinen Festpreis." };
  }
  const fixed = project.festpreis;
  const fullPrice: LineItem = { beschreibung: `${project.titel} (Festpreis)`, menge: 1, einheit: "Pauschal", einzelpreis: fixed };
  const downPayments = settledDownPayments(priorInvoices);

  if (kind === "rechnung") {
    return downPayments.length
      ? { ok: false, error: "Es gibt bereits Abschlagsrechnungen. Bitte eine Schlussrechnung erstellen." }
      : { ok: true, positionen: [fullPrice], abschlaege: [] };
  }

  if (kind === "schlussrechnung") {
    return { ok: true, positionen: [fullPrice], abschlaege: downPayments };
  }

  if (!downPayment) return { ok: false, error: "Bitte Betrag oder Prozentsatz des Abschlags angeben." };
  const amount =
    "betrag" in downPayment ? downPayment.betrag : Math.round(fixed * downPayment.prozent) / 100;
  const alreadyNet = downPayments.reduce((sum, d) => sum + Math.round(d.netto * 100), 0) / 100;
  if (amount <= 0) return { ok: false, error: "Der Abschlag muss größer als 0 sein." };
  if (Math.round((alreadyNet + amount) * 100) > Math.round(fixed * 100)) {
    return { ok: false, error: `Die Abschläge würden den Festpreis übersteigen (bereits abgerechnet: ${alreadyNet.toFixed(2)} € netto).` };
  }
  const label = "prozent" in downPayment ? `${downPayment.prozent.toLocaleString("de-DE")} % ` : "";
  return {
    ok: true,
    positionen: [{ beschreibung: `Abschlag ${label}auf ${project.titel} (Festpreis ${fixed.toFixed(2).replace(".", ",")} € netto)`, menge: 1, einheit: "Pauschal", einzelpreis: amount }],
    abschlaege: [],
  };
}

