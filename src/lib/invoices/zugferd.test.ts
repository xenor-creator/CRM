import { describe, expect, it } from "vitest";

import { buildZugferdXml, escapeXml, type InvoiceDocument } from "./zugferd";

const base: InvoiceDocument = {
  nummer: "RE-2026-0001-K1001",
  art: "rechnung",
  datum: "2026-10-02",
  faellig_am: "2026-10-16",
  leistung_von: "2026-09-30",
  leistung_bis: null,
  ust_satz: 19,
  positionen: [{ beschreibung: "Automatisierung <Angebote> & Rechnungen", menge: 1, einheit: "Pauschal", einzelpreis: 4800 }],
  abschlaege: [],
  summe_netto: 4800,
  summe_ust: 912,
  summe_brutto: 5712,
  bereits_gezahlt: 0,
  zahlbetrag: 5712,
  hinweis: null,
  absender: {
    firmenname: "Agentur Beispiel",
    strasse: "Hauptstr. 1",
    plz: "10115",
    ort: "Berlin",
    land: "DE",
    email: "rechnung@agentur.example",
    steuernummer: "11/111/11111",
    ust_id: null,
    iban: "DE02120300000000202051",
  },
  empfaenger: { name: "Beispiel GmbH", kundennummer: "K1001", strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt", land: "DE" },
};

describe("buildZugferdXml", () => {
  it("contains the EN 16931 guideline, totals and payment data", () => {
    const xml = buildZugferdXml(base);
    expect(xml).toContain("<ram:ID>urn:cen.eu:en16931:2017</ram:ID>");
    expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>");
    expect(xml).toContain('<udt:DateTimeString format="102">20261002</udt:DateTimeString>');
    expect(xml).toContain('<ram:BilledQuantity unitCode="LS">1.000</ram:BilledQuantity>');
    expect(xml).toContain('<ram:TaxTotalAmount currencyID="EUR">912.00</ram:TaxTotalAmount>');
    expect(xml).toContain("<ram:GrandTotalAmount>5712.00</ram:GrandTotalAmount>");
    expect(xml).toContain("<ram:DuePayableAmount>5712.00</ram:DuePayableAmount>");
    expect(xml).toContain("<ram:IBANID>DE02120300000000202051</ram:IBANID>");
    expect(xml).toContain('<ram:ID schemeID="FC">11/111/11111</ram:ID>');
    expect(xml).toContain("<ram:BuyerReference>K1001</ram:BuyerReference>");
    expect(xml).toContain("Automatisierung &lt;Angebote&gt; &amp; Rechnungen");
    expect(xml).toContain("<ram:ActualDeliverySupplyChainEvent>");
    expect(xml).not.toContain("BillingSpecifiedPeriod");
  });

  it("uses a billing period for retainer invoices", () => {
    const xml = buildZugferdXml({ ...base, leistung_von: "2026-10-01", leistung_bis: "2026-10-31" });
    expect(xml).toContain("<ram:BillingSpecifiedPeriod>");
    expect(xml).toContain("20261031");
    expect(xml).not.toContain("ActualDeliverySupplyChainEvent");
  });

  it("emits cancellations as credit notes with positive amounts and a reference", () => {
    const xml = buildZugferdXml({
      ...base,
      art: "stornorechnung",
      nummer: "RE-2026-0002-K1001",
      positionen: [{ ...base.positionen[0]!, einzelpreis: -4800 }],
      summe_netto: -4800,
      summe_ust: -912,
      summe_brutto: -5712,
      zahlbetrag: -5712,
      storno_von: { nummer: "RE-2026-0001-K1001", datum: "2026-10-02" },
    });
    expect(xml).toContain("<ram:TypeCode>381</ram:TypeCode>");
    expect(xml).toContain("<ram:GrandTotalAmount>5712.00</ram:GrandTotalAmount>");
    expect(xml).toContain('<ram:BilledQuantity unitCode="LS">1.000</ram:BilledQuantity>');
    expect(xml).toContain("<ram:IssuerAssignedID>RE-2026-0001-K1001</ram:IssuerAssignedID>");
    expect(xml).not.toContain("SpecifiedTradePaymentTerms");
  });

  it("lists prepayments on final invoices", () => {
    const xml = buildZugferdXml({
      ...base,
      art: "schlussrechnung",
      summe_netto: 10000,
      summe_ust: 1900,
      summe_brutto: 11900,
      bereits_gezahlt: 3570,
      zahlbetrag: 8330,
      abschlaege: [{ nummer: "RE-2026-0001-K1001", datum: "2026-09-01", netto: 3000, ust: 570, brutto: 3570 }],
    });
    expect(xml).toContain("<ram:TotalPrepaidAmount>3570.00</ram:TotalPrepaidAmount>");
    expect(xml).toContain("<ram:DuePayableAmount>8330.00</ram:DuePayableAmount>");
    expect(xml).toContain("RE-2026-0001-K1001 vom 01.09.2026");
  });
});

describe("escapeXml", () => {
  it("escapes markup characters", () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;");
  });
});
