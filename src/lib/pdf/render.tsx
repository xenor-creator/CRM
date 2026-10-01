import { renderToBuffer } from "@react-pdf/renderer";

import { formatDate, formatEuro } from "@/lib/format";
import type { LineItem, Prepayment } from "@/lib/invoices/line-items";
import { buildZugferdXml, type Buyer, type InvoiceDocument, type Seller } from "@/lib/invoices/zugferd";
import type { Enums } from "@/lib/supabase/database.types";

import { BusinessDocumentPdf, type BusinessDocument } from "./business-document";
import { toPdfA3 } from "./pdfa";

type Recipient = Buyer & { kontakt?: { name: string; email: string | null } | null };

export type FinalizedInvoice = {
  nummer: string;
  art: Enums<"invoice_art">;
  datum: string;
  faellig_am: string | null;
  leistung_von: string;
  leistung_bis: string | null;
  ust_satz: number;
  positionen: LineItem[];
  abschlaege: Prepayment[];
  summe_netto: number;
  summe_ust: number;
  summe_brutto: number;
  bereits_gezahlt: number;
  zahlbetrag: number;
  hinweis: string | null;
  absender: Seller;
  empfaenger: Recipient;
  storno_von: { nummer: string; datum: string } | null;
};

export type FinalizedQuote = {
  nummer: string;
  datum: string;
  gueltig_bis: string;
  ust_satz: number;
  positionen: LineItem[];
  summe_netto: number;
  summe_ust: number;
  summe_brutto: number;
  hinweis: string | null;
  absender: Seller;
  empfaenger: Recipient;
};

export const INVOICE_TITLES: Record<Enums<"invoice_art">, string> = {
  rechnung: "Rechnung",
  abschlagsrechnung: "Abschlagsrechnung",
  schlussrechnung: "Schlussrechnung",
  stornorechnung: "Stornorechnung",
};

function performance(von: string, bis: string | null): [string, string] {
  return bis && bis !== von ? ["Leistungszeitraum", `${formatDate(von)}–${formatDate(bis)}`] : ["Leistungsdatum", formatDate(von)];
}

export function invoiceBusinessDocument(invoice: FinalizedInvoice): BusinessDocument {
  const isStorno = invoice.art === "stornorechnung";
  const closing = isStorno
    ? [`Diese Stornorechnung hebt die Rechnung ${invoice.storno_von?.nummer} vom ${formatDate(invoice.storno_von?.datum ?? invoice.datum)} vollständig auf.`]
    : [
        `Bitte überweisen Sie ${formatEuro(invoice.zahlbetrag)} bis zum ${formatDate(invoice.faellig_am!)} ohne Abzug unter Angabe der Rechnungsnummer ${invoice.nummer}.`,
        "Vielen Dank für die Zusammenarbeit.",
      ];
  return {
    titel: INVOICE_TITLES[invoice.art],
    nummer: invoice.nummer,
    datum: invoice.datum,
    meta: [
      ["Rechnungsdatum", formatDate(invoice.datum)],
      ["Kundennummer", invoice.empfaenger.kundennummer],
      performance(invoice.leistung_von, invoice.leistung_bis),
      ...(isStorno || !invoice.faellig_am ? [] : [["Fällig am", formatDate(invoice.faellig_am)] as [string, string]]),
    ],
    absender: invoice.absender,
    empfaenger: invoice.empfaenger,
    positionen: invoice.positionen,
    ust_satz: invoice.ust_satz,
    summe_netto: invoice.summe_netto,
    summe_ust: invoice.summe_ust,
    summe_brutto: invoice.summe_brutto,
    abschlaege: invoice.abschlaege,
    zahlbetrag: invoice.zahlbetrag,
    einleitung: isStorno ? null : "Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Leistungen:",
    schluss: [...(invoice.hinweis ? [invoice.hinweis] : []), ...closing],
  };
}

export function invoiceXmlDocument(invoice: FinalizedInvoice): InvoiceDocument {
  return { ...invoice, art: invoice.art };
}

// Renders the invoice as PDF/A-3 with embedded ZUGFeRD XML. Returns both files.
export async function renderInvoice(invoice: FinalizedInvoice): Promise<{ pdf: Uint8Array; xml: string }> {
  const xml = buildZugferdXml(invoiceXmlDocument(invoice));
  const rendered = await renderToBuffer(<BusinessDocumentPdf doc={invoiceBusinessDocument(invoice)} />);
  const pdf = await toPdfA3(new Uint8Array(rendered), {
    title: `${INVOICE_TITLES[invoice.art]} ${invoice.nummer}`,
    author: invoice.absender.firmenname,
    zugferdXml: xml,
  });
  return { pdf, xml };
}

export async function renderQuote(quote: FinalizedQuote): Promise<Uint8Array> {
  const doc: BusinessDocument = {
    titel: "Angebot",
    nummer: quote.nummer,
    datum: quote.datum,
    meta: [
      ["Angebotsdatum", formatDate(quote.datum)],
      ["Kundennummer", quote.empfaenger.kundennummer],
      ["Gültig bis", formatDate(quote.gueltig_bis)],
    ],
    absender: quote.absender,
    empfaenger: quote.empfaenger,
    positionen: quote.positionen,
    ust_satz: quote.ust_satz,
    summe_netto: quote.summe_netto,
    summe_ust: quote.summe_ust,
    summe_brutto: quote.summe_brutto,
    abschlaege: [],
    zahlbetrag: quote.summe_brutto,
    einleitung: "Gerne bieten wir Ihnen folgende Leistungen an:",
    schluss: [
      ...(quote.hinweis ? [quote.hinweis] : []),
      `Dieses Angebot ist gültig bis zum ${formatDate(quote.gueltig_bis)}.`,
      "Wir freuen uns auf die Zusammenarbeit.",
    ],
  };
  const rendered = await renderToBuffer(<BusinessDocumentPdf doc={doc} />);
  return toPdfA3(new Uint8Array(rendered), { title: `Angebot ${quote.nummer}`, author: quote.absender.firmenname });
}
