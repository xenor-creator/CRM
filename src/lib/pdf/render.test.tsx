import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFStream } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { renderInvoice, renderQuote, type FinalizedInvoice } from "./render";

const invoice: FinalizedInvoice = {
  nummer: "RE-2026-0001-K1001",
  art: "rechnung",
  datum: "2026-10-02",
  faellig_am: "2026-10-16",
  leistung_von: "2026-09-30",
  leistung_bis: null,
  ust_satz: 19,
  positionen: [
    { beschreibung: "Automatisierung Angebotsprozess (Festpreis)", menge: 1, einheit: "Pauschal", einzelpreis: 4800 },
    { beschreibung: "Workshop Prozessaufnahme", menge: 1.5, einheit: "Std", einzelpreis: 95.33 },
  ],
  abschlaege: [],
  summe_netto: 4943,
  summe_ust: 939.17,
  summe_brutto: 5882.17,
  bereits_gezahlt: 0,
  zahlbetrag: 5882.17,
  hinweis: null,
  absender: {
    firmenname: "Agentur Beispiel",
    inhaber: "Max Beispiel",
    strasse: "Hauptstr. 1",
    plz: "10115",
    ort: "Berlin",
    land: "DE",
    email: "rechnung@agentur.example",
    telefon: "+49 30 1234567",
    steuernummer: "11/111/11111",
    ust_id: "DE123456789",
    iban: "DE02120300000000202051",
    bic: "BYLADEM1001",
    bank_name: "Beispielbank",
  },
  empfaenger: {
    name: "Beispiel Kunde GmbH",
    kundennummer: "K1001",
    strasse: "Musterweg 1",
    plz: "12345",
    ort: "Musterstadt",
    land: "DE",
    ust_id: null,
    kontakt: { name: "Erika Muster", email: "erika@kunde.example" },
  },
  storno_von: null,
};

describe("renderInvoice", () => {
  it("produces a PDF/A-3 with embedded factur-x.xml", async () => {
    const { pdf, xml } = await renderInvoice(invoice);
    await writeFile(path.join(os.tmpdir(), "crm-test-invoice.pdf"), pdf);

    const doc = await PDFDocument.load(pdf);
    const catalog = doc.catalog;
    expect(catalog.has(PDFName.of("AF"))).toBe(true);
    expect(catalog.has(PDFName.of("OutputIntents"))).toBe(true);
    const metadata = catalog.lookup(PDFName.of("Metadata"), PDFStream);
    const xmp = Buffer.from((metadata as unknown as { contents: Uint8Array }).contents).toString("utf8");
    expect(xmp).toContain("<pdfaid:part>3</pdfaid:part>");
    expect(xmp).toContain("<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>");

    const attachments = catalog.lookup(PDFName.of("AF"), PDFArray);
    const spec = attachments.lookup(0, PDFDict);
    expect(spec.lookup(PDFName.of("AFRelationship"))?.toString()).toBe("/Alternative");
    expect(spec.lookup(PDFName.of("UF"), PDFHexString).decodeText()).toBe("factur-x.xml");
    expect(xml).toContain("RE-2026-0001-K1001");
    expect(doc.getPageCount()).toBe(1);
  }, 30_000);
});

describe("renderQuote", () => {
  it("renders a PDF/A quote without attachment", async () => {
    const pdf = await renderQuote({
      nummer: "AN-2026-0001-K1001",
      datum: "2026-10-02",
      gueltig_bis: "2026-11-01",
      ust_satz: 19,
      positionen: invoice.positionen,
      summe_netto: 4943,
      summe_ust: 939.17,
      summe_brutto: 5882.17,
      hinweis: null,
      absender: invoice.absender,
      empfaenger: invoice.empfaenger,
    });
    await writeFile(path.join(os.tmpdir(), "crm-test-quote.pdf"), pdf);
    const doc = await PDFDocument.load(pdf);
    expect(doc.catalog.has(PDFName.of("AF"))).toBe(false);
    expect(doc.catalog.has(PDFName.of("OutputIntents"))).toBe(true);
  }, 30_000);
});
