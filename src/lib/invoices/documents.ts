import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { renderInvoice, renderQuote, type FinalizedInvoice, type FinalizedQuote } from "@/lib/pdf/render";
import type { Database, Tables } from "@/lib/supabase/database.types";

import type { LineItem, Prepayment } from "./line-items";
import type { Buyer, Seller } from "./zugferd";

type Db = SupabaseClient<Database>;

const BUCKET = "dokumente";

function finalizedInvoice(row: Tables<"invoices">, original: { nummer: string | null; datum: string | null } | null): FinalizedInvoice {
  if (!row.nummer || !row.datum || !row.leistung_von || !row.absender || !row.empfaenger) {
    throw new Error(`invoice ${row.id} is not finalized`);
  }
  return {
    nummer: row.nummer,
    art: row.art,
    datum: row.datum,
    faellig_am: row.faellig_am,
    leistung_von: row.leistung_von,
    leistung_bis: row.leistung_bis,
    ust_satz: row.ust_satz,
    positionen: row.positionen as LineItem[],
    abschlaege: row.abschlaege as Prepayment[],
    summe_netto: row.summe_netto,
    summe_ust: row.summe_ust,
    summe_brutto: row.summe_brutto,
    bereits_gezahlt: row.bereits_gezahlt,
    zahlbetrag: row.zahlbetrag,
    hinweis: row.hinweis,
    absender: row.absender as Seller,
    empfaenger: row.empfaenger as FinalizedInvoice["empfaenger"],
    storno_von: original?.nummer && original.datum ? { nummer: original.nummer, datum: original.datum } : null,
  };
}

async function upload(db: Db, filePath: string, body: Uint8Array | string, contentType: string) {
  const { error } = await db.storage.from(BUCKET).upload(filePath, body, { contentType, upsert: true });
  if (error) throw new Error(`upload ${filePath} failed: ${error.message}`);
}

async function download(db: Db, filePath: string): Promise<Uint8Array> {
  const { data, error } = await db.storage.from(BUCKET).download(filePath);
  if (error || !data) throw new Error(`download ${filePath} failed: ${error?.message}`);
  return new Uint8Array(await data.arrayBuffer());
}

// Renders PDF (with embedded ZUGFeRD XML) and XML of a finalized invoice, stores both under
// <owner>/rechnungen/ and records the paths (each only once, see protect_sent_invoice).
export async function storeInvoiceDocuments(db: Db, invoiceId: string): Promise<{ pdf: Uint8Array; xml: string }> {
  const { data: row, error } = await db.from("invoices").select("*").eq("id", invoiceId).single();
  if (error) throw new Error(`load invoice failed: ${error.message}`);
  const original = row.storno_von_id
    ? (await db.from("invoices").select("nummer, datum").eq("id", row.storno_von_id).single()).data
    : null;

  const documents = await renderInvoice(finalizedInvoice(row, original));
  const base = `${row.owner_id}/rechnungen/${row.nummer}`;
  await upload(db, `${base}.pdf`, documents.pdf, "application/pdf");
  await upload(db, `${base}.xml`, documents.xml, "application/xml");
  const { error: updateError } = await db
    .from("invoices")
    .update({ pdf_pfad: `${base}.pdf`, xml_pfad: `${base}.xml` })
    .eq("id", invoiceId)
    .is("pdf_pfad", null);
  if (updateError) throw new Error(`store document paths failed: ${updateError.message}`);
  return documents;
}

export type StoredDocument = { bytes: Uint8Array; fileName: string };

// Stored invoice PDF or XML; generated on first access if it is missing.
export async function invoiceDocument(db: Db, invoiceId: string, kind: "pdf" | "xml"): Promise<StoredDocument | null> {
  const { data: row } = await db.from("invoices").select("nummer, status, pdf_pfad, xml_pfad").eq("id", invoiceId).maybeSingle();
  if (!row?.nummer || row.status === "entwurf") return null;
  const storedPath = kind === "pdf" ? row.pdf_pfad : row.xml_pfad;
  const fileName = `${row.nummer}.${kind}`;
  if (storedPath) return { bytes: await download(db, storedPath), fileName };
  const generated = await storeInvoiceDocuments(db, invoiceId);
  return { bytes: kind === "pdf" ? generated.pdf : new TextEncoder().encode(generated.xml), fileName };
}

export async function storeQuoteDocument(db: Db, quoteId: string): Promise<Uint8Array> {
  const { data: row, error } = await db.from("quotes").select("*").eq("id", quoteId).single();
  if (error) throw new Error(`load quote failed: ${error.message}`);
  if (!row.nummer || !row.datum || !row.gueltig_bis || !row.absender || !row.empfaenger) {
    throw new Error(`quote ${quoteId} is not finalized`);
  }
  const quote: FinalizedQuote = {
    nummer: row.nummer,
    datum: row.datum,
    gueltig_bis: row.gueltig_bis,
    ust_satz: row.ust_satz,
    positionen: row.positionen as LineItem[],
    summe_netto: row.summe_netto,
    summe_ust: row.summe_ust,
    summe_brutto: row.summe_brutto,
    hinweis: row.hinweis,
    absender: row.absender as Seller,
    empfaenger: row.empfaenger as Buyer,
  };
  const pdf = await renderQuote(quote);
  const filePath = `${row.owner_id}/angebote/${row.nummer}.pdf`;
  await upload(db, filePath, pdf, "application/pdf");
  await db.from("quotes").update({ pdf_pfad: filePath }).eq("id", quoteId).is("pdf_pfad", null);
  return pdf;
}

export async function quoteDocument(db: Db, quoteId: string): Promise<StoredDocument | null> {
  const { data: row } = await db.from("quotes").select("nummer, status, pdf_pfad").eq("id", quoteId).maybeSingle();
  if (!row?.nummer || row.status === "entwurf") return null;
  const bytes = row.pdf_pfad ? await download(db, row.pdf_pfad) : await storeQuoteDocument(db, quoteId);
  return { bytes, fileName: `${row.nummer}.pdf` };
}

export function documentResponse(doc: StoredDocument, contentType: string): Response {
  return new Response(Buffer.from(doc.bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
