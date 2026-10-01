import { formatDate, formatEuro } from "@/lib/format";
import { lineTotalCents, type LineItem, type Prepayment } from "@/lib/invoices/line-items";

// Read-only line items and totals of a finalized invoice or quote.
export function DocumentView({
  positionen,
  ustSatz,
  netto,
  ust,
  brutto,
  abschlaege = [],
  zahlbetrag,
}: {
  positionen: LineItem[];
  ustSatz: number;
  netto: number;
  ust: number;
  brutto: number;
  abschlaege?: Prepayment[];
  zahlbetrag?: number;
}) {
  return (
    <div className="grid gap-4 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-muted-foreground border-b text-left text-xs">
            <tr>
              <th className="py-2 pr-2">Leistung</th>
              <th className="py-2 pr-2 text-right">Menge</th>
              <th className="py-2 pr-2 text-right">Einzelpreis</th>
              <th className="py-2 text-right">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 pr-2">{p.beschreibung}</td>
                <td className="py-2 pr-2 text-right whitespace-nowrap">
                  {p.menge.toLocaleString("de-DE")} {p.einheit}
                </td>
                <td className="py-2 pr-2 text-right whitespace-nowrap">{formatEuro(p.einzelpreis)}</td>
                <td className="py-2 text-right whitespace-nowrap">{formatEuro(lineTotalCents(p) / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
        <dt>Summe netto</dt>
        <dd className="text-right">{formatEuro(netto)}</dd>
        <dt>{ustSatz.toLocaleString("de-DE")} % USt.</dt>
        <dd className="text-right">{formatEuro(ust)}</dd>
        <dt className="font-semibold">Gesamtbetrag</dt>
        <dd className="text-right font-semibold">{formatEuro(brutto)}</dd>
        {abschlaege.map((a) => (
          <div key={a.nummer} className="text-muted-foreground contents">
            <dt>
              abzgl. {a.nummer} vom {formatDate(a.datum)}
            </dt>
            <dd className="text-right">{formatEuro(-a.brutto)}</dd>
          </div>
        ))}
        {abschlaege.length > 0 && zahlbetrag !== undefined && (
          <>
            <dt className="font-semibold">Zahlbetrag</dt>
            <dd className="text-right font-semibold">{formatEuro(zahlbetrag)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
