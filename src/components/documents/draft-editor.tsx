"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { FormError, SubmitButton, TextAreaField, TextField, valueOf } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate, formatEuro } from "@/lib/format";
import { initialFormState, type FormState } from "@/lib/form-state";
import { computeTotals, lineTotalCents, UNITS, type LineItem, type Prepayment, type Unit } from "@/lib/invoices/line-items";
import { formatEuroInput, parseEuroInput } from "@/lib/money";

type Row = { key: number; beschreibung: string; menge: string; einheit: Unit; einzelpreis: string };

export type ExtraField = { name: string; label: string; type?: "date" | "text"; value: string | null };

const toRow = (item: LineItem, key: number): Row => ({
  key,
  beschreibung: item.beschreibung,
  menge: String(item.menge).replace(".", ","),
  einheit: item.einheit,
  einzelpreis: formatEuroInput(item.einzelpreis),
});

// Negative prices are allowed (e.g. discounts); parseEuroInput only handles the absolute value.
function parsePrice(value: string): number | null {
  const negative = value.trim().startsWith("-");
  const parsed = parseEuroInput(value.trim().replace(/^-/, ""));
  return parsed.ok ? (negative ? -parsed.value : parsed.value) : null;
}

function toItem(row: Row): LineItem | null {
  const menge = Number(row.menge.replace(",", "."));
  const einzelpreis = parsePrice(row.einzelpreis);
  if (!row.beschreibung.trim() || !Number.isFinite(menge) || menge === 0 || einzelpreis === null) return null;
  return { beschreibung: row.beschreibung.trim(), menge, einheit: row.einheit, einzelpreis };
}

export function DraftEditor({
  action,
  items,
  vatRate,
  prepayments = [],
  extraFields,
  hinweis,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  items: LineItem[];
  vatRate: number;
  prepayments?: Prepayment[];
  extraFields: ExtraField[];
  hinweis: string | null;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [rows, setRows] = useState<Row[]>(() => (items.length ? items : [{ beschreibung: "", menge: 1, einheit: "Stk", einzelpreis: 0 } as LineItem]).map(toRow));
  const [rate, setRate] = useState(String(vatRate).replace(".", ","));
  const [nextKey, setNextKey] = useState(rows.length);

  const parsedItems = rows.map(toItem);
  const valid = parsedItems.every(Boolean);
  const totals = computeTotals(parsedItems.filter((i): i is LineItem => i !== null), Number(rate.replace(",", ".")) || 0, prepayments);
  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="positionen" value={JSON.stringify(parsedItems.filter(Boolean))} />
      <div className="grid gap-3">
        <div className="text-muted-foreground hidden grid-cols-[1fr_6rem_7rem_8rem_7rem_2.25rem] gap-2 text-xs font-medium md:grid">
          <span>Leistung</span>
          <span>Menge</span>
          <span>Einheit</span>
          <span>Einzelpreis (€)</span>
          <span className="text-right">Gesamt</span>
          <span />
        </div>
        {rows.map((row, index) => {
          const item = parsedItems[index];
          return (
            <div key={row.key} className="grid grid-cols-2 gap-2 border-b pb-3 md:grid-cols-[1fr_6rem_7rem_8rem_7rem_2.25rem] md:border-0 md:pb-0">
              <Input
                aria-label={`Position ${index + 1} Leistung`}
                value={row.beschreibung}
                onChange={(e) => update(row.key, { beschreibung: e.target.value })}
                placeholder="Leistung"
                className="col-span-2 md:col-span-1"
              />
              <Input aria-label={`Position ${index + 1} Menge`} value={row.menge} onChange={(e) => update(row.key, { menge: e.target.value })} inputMode="decimal" />
              <NativeSelect aria-label={`Position ${index + 1} Einheit`} value={row.einheit} onChange={(e) => update(row.key, { einheit: e.target.value as Unit })}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </NativeSelect>
              <Input
                aria-label={`Position ${index + 1} Einzelpreis`}
                value={row.einzelpreis}
                onChange={(e) => update(row.key, { einzelpreis: e.target.value })}
                inputMode="decimal"
                aria-invalid={item === null}
              />
              <span className="self-center text-right text-sm tabular-nums">{item ? formatEuro(lineTotalCents(item) / 100) : "–"}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Position ${index + 1} entfernen`}
                onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                disabled={rows.length === 1}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setRows((current) => [...current, { key: nextKey, beschreibung: "", menge: "1", einheit: "Stk", einzelpreis: "" }]);
              setNextKey((k) => k + 1);
            }}
          >
            <Plus />
            Position
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="draft-ust">USt-Satz (%)</Label>
          <Input id="draft-ust" name="ust_satz" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" />
        </div>
        {extraFields.map((field) => (
          <TextField
            key={field.name}
            label={field.label}
            name={field.name}
            id={`draft-${field.name}`}
            type={field.type ?? "text"}
            defaultValue={valueOf(state, field.name, field.value)}
          />
        ))}
      </div>
      <TextAreaField label="Hinweis auf dem Dokument (optional)" name="hinweis" id="draft-hinweis" defaultValue={valueOf(state, "hinweis", hinweis)} rows={2} />

      <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums" data-testid="draft-totals">
        <dt>Summe netto</dt>
        <dd className="text-right">{formatEuro(totals.netto)}</dd>
        <dt>USt.</dt>
        <dd className="text-right">{formatEuro(totals.ust)}</dd>
        <dt className="font-semibold">Gesamtbetrag</dt>
        <dd className="text-right font-semibold">{formatEuro(totals.brutto)}</dd>
        {prepayments.map((p) => (
          <div key={p.nummer} className="contents text-muted-foreground">
            <dt>
              abzgl. {p.nummer} vom {formatDate(p.datum)}
            </dt>
            <dd className="text-right">{formatEuro(-p.brutto)}</dd>
          </div>
        ))}
        {prepayments.length > 0 && (
          <>
            <dt className="font-semibold">Zahlbetrag</dt>
            <dd className="text-right font-semibold">{formatEuro(totals.zahlbetrag)}</dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton disabled={!valid}>Entwurf speichern</SubmitButton>
        {!valid && <p className="text-destructive text-sm">Bitte alle Positionen vollständig ausfüllen.</p>}
        {state.ok && <p className="text-muted-foreground text-sm">Gespeichert.</p>}
        <FormError state={state} />
      </div>
    </form>
  );
}
