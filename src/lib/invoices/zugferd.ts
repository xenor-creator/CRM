import { formatDate } from "@/lib/format";

import { lineTotalCents, UNIT_CODES, type LineItem, type Prepayment } from "./line-items";

// Factur-X / ZUGFeRD 2 (UN/CEFACT CII D16B), profile EN 16931 ("COMFORT").
export const ZUGFERD_GUIDELINE = "urn:cen.eu:en16931:2017";
export const ZUGFERD_FILENAME = "factur-x.xml";

export type Seller = {
  firmenname: string;
  inhaber?: string | null;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  email?: string | null;
  telefon?: string | null;
  ust_id?: string | null;
  steuernummer?: string | null;
  iban: string;
  bic?: string | null;
  bank_name?: string | null;
};

export type Buyer = {
  name: string;
  kundennummer: string;
  strasse?: string | null;
  plz: string;
  ort: string;
  land: string;
  ust_id?: string | null;
};

export type InvoiceDocument = {
  nummer: string;
  art: "rechnung" | "abschlagsrechnung" | "schlussrechnung" | "stornorechnung";
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
  empfaenger: Buyer;
  storno_von?: { nummer: string; datum: string } | null;
};

const NS = {
  rsm: "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
  ram: "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
  udt: "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
  qdt: "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const amount = (value: number) => value.toFixed(2);
const date102 = (iso: string) => iso.replaceAll("-", "");
const el = (name: string, content: string | null | undefined, attrs = "") =>
  content == null || content === "" ? "" : `<${name}${attrs}>${content}</${name}>`;
const text = (name: string, value: string | null | undefined) => el(name, value == null ? null : escapeXml(value));
const dateTime = (name: string, iso: string) => `<${name}><udt:DateTimeString format="102">${date102(iso)}</udt:DateTimeString></${name}>`;

function address(party: { strasse?: string | null; plz: string; ort: string; land: string }): string {
  return (
    "<ram:PostalTradeAddress>" +
    text("ram:PostcodeCode", party.plz) +
    text("ram:LineOne", party.strasse) +
    text("ram:CityName", party.ort) +
    text("ram:CountryID", party.land) +
    "</ram:PostalTradeAddress>"
  );
}

function sellerParty(s: Seller): string {
  const contact =
    s.email || s.telefon
      ? "<ram:DefinedTradeContact>" +
        text("ram:PersonName", s.inhaber ?? s.firmenname) +
        (s.telefon ? `<ram:TelephoneUniversalCommunication>${text("ram:CompleteNumber", s.telefon)}</ram:TelephoneUniversalCommunication>` : "") +
        (s.email ? `<ram:EmailURIUniversalCommunication>${text("ram:URIID", s.email)}</ram:EmailURIUniversalCommunication>` : "") +
        "</ram:DefinedTradeContact>"
      : "";
  return (
    "<ram:SellerTradeParty>" +
    text("ram:Name", s.firmenname) +
    contact +
    address(s) +
    (s.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${escapeXml(s.email)}</ram:URIID></ram:URIUniversalCommunication>` : "") +
    (s.steuernummer ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${escapeXml(s.steuernummer)}</ram:ID></ram:SpecifiedTaxRegistration>` : "") +
    (s.ust_id ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(s.ust_id)}</ram:ID></ram:SpecifiedTaxRegistration>` : "") +
    "</ram:SellerTradeParty>"
  );
}

function buyerParty(b: Buyer): string {
  return (
    "<ram:BuyerTradeParty>" +
    text("ram:Name", b.name) +
    address(b) +
    (b.ust_id ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(b.ust_id)}</ram:ID></ram:SpecifiedTaxRegistration>` : "") +
    "</ram:BuyerTradeParty>"
  );
}

function notes(doc: InvoiceDocument): string[] {
  const result: string[] = [];
  if (doc.hinweis) result.push(doc.hinweis);
  if (doc.abschlaege.length) {
    result.push(
      "Bereits in Rechnung gestellte Abschläge: " +
        doc.abschlaege
          .map((a) => `${a.nummer} vom ${formatDate(a.datum)}: netto ${amount(Math.abs(a.netto))} EUR, USt ${amount(Math.abs(a.ust))} EUR, brutto ${amount(Math.abs(a.brutto))} EUR`)
          .join("; "),
    );
  }
  return result;
}

// Builds the CII XML. Cancellation invoices are emitted as credit notes (381) with positive amounts.
export function buildZugferdXml(doc: InvoiceDocument): string {
  const isCreditNote = doc.art === "stornorechnung";
  const sign = isCreditNote ? -1 : 1;
  const money = (value: number) => amount(sign * value);
  const category = doc.ust_satz > 0 ? "S" : "Z";
  const period = doc.leistung_bis && doc.leistung_bis !== doc.leistung_von;

  const lines = doc.positionen
    .map((item, index) => {
      const lineTotal = (sign * lineTotalCents(item)) / 100;
      return (
        "<ram:IncludedSupplyChainTradeLineItem>" +
        `<ram:AssociatedDocumentLineDocument><ram:LineID>${index + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>` +
        `<ram:SpecifiedTradeProduct>${text("ram:Name", item.beschreibung)}</ram:SpecifiedTradeProduct>` +
        `<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${amount(Math.abs(item.einzelpreis))}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>` +
        `<ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${UNIT_CODES[item.einheit]}">${(Math.sign(item.einzelpreis) * sign * item.menge).toFixed(3)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>` +
        "<ram:SpecifiedLineTradeSettlement>" +
        `<ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${category}</ram:CategoryCode><ram:RateApplicablePercent>${amount(doc.ust_satz)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>` +
        `<ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amount(lineTotal)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>` +
        "</ram:SpecifiedLineTradeSettlement>" +
        "</ram:IncludedSupplyChainTradeLineItem>"
      );
    })
    .join("");

  const payment =
    "<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode>" +
    `<ram:PayeePartyCreditorFinancialAccount>${text("ram:IBANID", doc.absender.iban)}${text("ram:AccountName", doc.absender.firmenname)}</ram:PayeePartyCreditorFinancialAccount>` +
    (doc.absender.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>${text("ram:BICID", doc.absender.bic)}</ram:PayeeSpecifiedCreditorFinancialInstitution>` : "") +
    "</ram:SpecifiedTradeSettlementPaymentMeans>";

  const terms =
    !isCreditNote && doc.faellig_am
      ? `<ram:SpecifiedTradePaymentTerms>${text("ram:Description", `Zahlbar bis ${formatDate(doc.faellig_am)} ohne Abzug.`)}${dateTime("ram:DueDateDateTime", doc.faellig_am)}</ram:SpecifiedTradePaymentTerms>`
      : "";

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<rsm:CrossIndustryInvoice xmlns:rsm="${NS.rsm}" xmlns:ram="${NS.ram}" xmlns:udt="${NS.udt}" xmlns:qdt="${NS.qdt}">` +
    `<rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${ZUGFERD_GUIDELINE}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>` +
    "<rsm:ExchangedDocument>" +
    text("ram:ID", doc.nummer) +
    `<ram:TypeCode>${isCreditNote ? "381" : "380"}</ram:TypeCode>` +
    dateTime("ram:IssueDateTime", doc.datum) +
    notes(doc).map((n) => `<ram:IncludedNote>${text("ram:Content", n)}</ram:IncludedNote>`).join("") +
    "</rsm:ExchangedDocument>" +
    "<rsm:SupplyChainTradeTransaction>" +
    lines +
    "<ram:ApplicableHeaderTradeAgreement>" +
    text("ram:BuyerReference", doc.empfaenger.kundennummer) +
    sellerParty(doc.absender) +
    buyerParty(doc.empfaenger) +
    "</ram:ApplicableHeaderTradeAgreement>" +
    "<ram:ApplicableHeaderTradeDelivery>" +
    (period ? "" : `<ram:ActualDeliverySupplyChainEvent>${dateTime("ram:OccurrenceDateTime", doc.leistung_von)}</ram:ActualDeliverySupplyChainEvent>`) +
    "</ram:ApplicableHeaderTradeDelivery>" +
    "<ram:ApplicableHeaderTradeSettlement>" +
    text("ram:PaymentReference", doc.nummer) +
    "<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>" +
    payment +
    `<ram:ApplicableTradeTax><ram:CalculatedAmount>${money(doc.summe_ust)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>` +
    `<ram:BasisAmount>${money(doc.summe_netto)}</ram:BasisAmount><ram:CategoryCode>${category}</ram:CategoryCode><ram:RateApplicablePercent>${amount(doc.ust_satz)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>` +
    (period ? `<ram:BillingSpecifiedPeriod>${dateTime("ram:StartDateTime", doc.leistung_von)}${dateTime("ram:EndDateTime", doc.leistung_bis!)}</ram:BillingSpecifiedPeriod>` : "") +
    terms +
    "<ram:SpecifiedTradeSettlementHeaderMonetarySummation>" +
    `<ram:LineTotalAmount>${money(doc.summe_netto)}</ram:LineTotalAmount>` +
    `<ram:TaxBasisTotalAmount>${money(doc.summe_netto)}</ram:TaxBasisTotalAmount>` +
    `<ram:TaxTotalAmount currencyID="EUR">${money(doc.summe_ust)}</ram:TaxTotalAmount>` +
    `<ram:GrandTotalAmount>${money(doc.summe_brutto)}</ram:GrandTotalAmount>` +
    `<ram:TotalPrepaidAmount>${money(doc.bereits_gezahlt)}</ram:TotalPrepaidAmount>` +
    `<ram:DuePayableAmount>${money(doc.zahlbetrag)}</ram:DuePayableAmount>` +
    "</ram:SpecifiedTradeSettlementHeaderMonetarySummation>" +
    (doc.storno_von
      ? `<ram:InvoiceReferencedDocument>${text("ram:IssuerAssignedID", doc.storno_von.nummer)}<ram:FormattedIssueDateTime><qdt:DateTimeString format="102">${date102(doc.storno_von.datum)}</qdt:DateTimeString></ram:FormattedIssueDateTime></ram:InvoiceReferencedDocument>`
      : "") +
    "</ram:ApplicableHeaderTradeSettlement>" +
    "</rsm:SupplyChainTradeTransaction>" +
    "</rsm:CrossIndustryInvoice>"
  );
}
