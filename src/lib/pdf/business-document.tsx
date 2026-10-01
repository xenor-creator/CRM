import path from "node:path";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate, formatEuro } from "@/lib/format";
import { formatIban } from "@/lib/iban";
import { lineTotalCents, type LineItem, type Prepayment } from "@/lib/invoices/line-items";
import type { Buyer, Seller } from "@/lib/invoices/zugferd";

const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/assets");
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONT_DIR, "Inter-400.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Inter-700.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

export type BusinessDocument = {
  titel: string;
  nummer: string;
  datum: string;
  meta: [label: string, value: string][];
  absender: Seller;
  empfaenger: Buyer & { kontakt?: { name: string } | null };
  positionen: LineItem[];
  ust_satz: number;
  summe_netto: number;
  summe_ust: number;
  summe_brutto: number;
  abschlaege: Prepayment[];
  zahlbetrag: number;
  einleitung: string | null;
  schluss: string[];
};

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9, color: "#1a1a1a", paddingTop: 48, paddingBottom: 80, paddingHorizontal: 56 },
  senderLine: { fontSize: 7, color: "#666", marginBottom: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 36 },
  address: { width: "55%", lineHeight: 1.4 },
  meta: { width: "40%" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  metaLabel: { color: "#666" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  intro: { marginBottom: 12, lineHeight: 1.4 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#999", paddingBottom: 4, fontWeight: 700 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 5 },
  cPos: { width: "6%" },
  cText: { width: "44%", paddingRight: 8 },
  cQty: { width: "14%", textAlign: "right" },
  cPrice: { width: "18%", textAlign: "right" },
  cTotal: { width: "18%", textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { fontWeight: 700, borderTopWidth: 1, borderColor: "#999", marginTop: 2, paddingTop: 4 },
  closing: { marginTop: 20, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 32, left: 56, right: 56, fontSize: 7, color: "#666", borderTopWidth: 0.5, borderColor: "#ccc", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
});

const quantity = (menge: number) => menge.toLocaleString("de-DE", { maximumFractionDigits: 3 });

export function BusinessDocumentPdf({ doc }: { doc: BusinessDocument }) {
  const seller = doc.absender;
  const buyer = doc.empfaenger;
  const taxIds = [seller.steuernummer && `St.-Nr. ${seller.steuernummer}`, seller.ust_id && `USt-IdNr. ${seller.ust_id}`].filter(Boolean);

  return (
    <Document title={`${doc.titel} ${doc.nummer}`} author={seller.firmenname} creator="Agentur-CRM" producer="Agentur-CRM" language="de-DE">
      <Page size="A4" style={s.page}>
        <Text style={s.senderLine}>
          {seller.firmenname} · {seller.strasse} · {seller.plz} {seller.ort}
        </Text>
        <View style={s.header}>
          <View style={s.address}>
            <Text style={{ fontWeight: 700 }}>{buyer.name}</Text>
            {buyer.kontakt?.name && <Text>z. Hd. {buyer.kontakt.name}</Text>}
            {buyer.strasse && <Text>{buyer.strasse}</Text>}
            <Text>
              {buyer.plz} {buyer.ort}
            </Text>
            {buyer.land !== "DE" && <Text>{buyer.land}</Text>}
          </View>
          <View style={s.meta}>
            {doc.meta.map(([label, value]) => (
              <View key={label} style={s.metaRow}>
                <Text style={s.metaLabel}>{label}</Text>
                <Text>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.title}>
          {doc.titel} {doc.nummer}
        </Text>
        {doc.einleitung && <Text style={s.intro}>{doc.einleitung}</Text>}

        <View style={s.tableHead}>
          <Text style={s.cPos}>Pos.</Text>
          <Text style={s.cText}>Leistung</Text>
          <Text style={s.cQty}>Menge</Text>
          <Text style={s.cPrice}>Einzelpreis</Text>
          <Text style={s.cTotal}>Gesamt</Text>
        </View>
        {doc.positionen.map((item, index) => (
          <View key={index} style={s.row} wrap={false}>
            <Text style={s.cPos}>{index + 1}</Text>
            <Text style={s.cText}>{item.beschreibung}</Text>
            <Text style={s.cQty}>
              {quantity(item.menge)} {item.einheit}
            </Text>
            <Text style={s.cPrice}>{formatEuro(item.einzelpreis)}</Text>
            <Text style={s.cTotal}>{formatEuro(lineTotalCents(item) / 100)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>Summe netto</Text>
            <Text>{formatEuro(doc.summe_netto)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>zzgl. {doc.ust_satz.toLocaleString("de-DE")} % USt.</Text>
            <Text>{formatEuro(doc.summe_ust)}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text>Gesamtbetrag</Text>
            <Text>{formatEuro(doc.summe_brutto)}</Text>
          </View>
          {doc.abschlaege.map((a) => (
            <View key={a.nummer} style={s.totalRow}>
              <Text>
                abzgl. {a.nummer} vom {formatDate(a.datum)} (netto {formatEuro(a.netto)}, USt. {formatEuro(a.ust)})
              </Text>
              <Text>{formatEuro(-a.brutto)}</Text>
            </View>
          ))}
          {doc.abschlaege.length > 0 && (
            <View style={[s.totalRow, s.grand]}>
              <Text>Zahlbetrag</Text>
              <Text>{formatEuro(doc.zahlbetrag)}</Text>
            </View>
          )}
        </View>

        <View style={s.closing}>
          {doc.schluss.map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </View>

        <View style={s.footer} fixed>
          <View>
            <Text>{seller.firmenname}</Text>
            <Text>
              {seller.strasse}, {seller.plz} {seller.ort}
            </Text>
            {seller.email && <Text>{seller.email}</Text>}
          </View>
          <View>
            {taxIds.map((t) => (
              <Text key={t as string}>{t}</Text>
            ))}
          </View>
          <View>
            {seller.bank_name && <Text>{seller.bank_name}</Text>}
            <Text>IBAN {formatIban(seller.iban)}</Text>
            {seller.bic && <Text>BIC {seller.bic}</Text>}
          </View>
        </View>
      </Page>
    </Document>
  );
}
