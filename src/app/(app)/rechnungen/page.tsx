import type { Metadata } from "next";
import Link from "next/link";

import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireVerifiedSession } from "@/lib/auth/session";
import { formatDate, formatEuro } from "@/lib/format";
import { invoiceStatusLabels, labelOptions } from "@/lib/labels";
import { INVOICE_TITLES } from "@/lib/pdf/render";
import { firstParam } from "@/lib/search";
import { Constants, type Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Rechnungen" };

const isStatus = (v: string | undefined): v is Enums<"invoice_status"> =>
  (Constants.public.Enums.invoice_status as readonly string[]).includes(v ?? "");

export default async function InvoicesPage(props: PageProps<"/rechnungen">) {
  const status = firstParam((await props.searchParams).status);
  const { supabase } = await requireVerifiedSession();
  let query = supabase
    .from("invoices")
    .select("id, nummer, art, status, datum, faellig_am, summe_brutto, zahlbetrag, leistung_von, companies(id, name)")
    .order("status")
    .order("datum", { ascending: false, nullsFirst: true })
    .limit(500);
  if (isStatus(status)) query = query.eq("status", status);
  const { data: invoices, error } = await query;

  return (
    <>
      <PageHeader title="Rechnungen" description="Rechnungen entstehen aus Projekten (Festpreis, Abschlag, Schluss) und automatisch aus Retainern." />
      <form className="mb-4 flex gap-2">
        <NativeSelect name="status" defaultValue={isStatus(status) ? status : ""} aria-label="Status">
          <option value="">Alle Status</option>
          {labelOptions(invoiceStatusLabels).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Anwenden
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Die Rechnungen konnten nicht geladen werden.
        </p>
      ) : !invoices.length ? (
        <p className="text-muted-foreground text-sm">Keine Rechnungen gefunden.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead className="hidden md:table-cell">Datum</TableHead>
              <TableHead className="hidden md:table-cell">Fällig</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">
                  <Link href={`/rechnungen/${i.id}`} className="hover:underline">
                    {i.nummer ?? `Entwurf (${INVOICE_TITLES[i.art]})`}
                  </Link>
                  {i.leistung_von && !i.nummer && <span className="text-muted-foreground block text-xs">Leistung ab {formatDate(i.leistung_von)}</span>}
                </TableCell>
                <TableCell>{i.companies?.name ?? "–"}</TableCell>
                <TableCell className="hidden md:table-cell">{i.datum ? formatDate(i.datum) : "–"}</TableCell>
                <TableCell className="hidden md:table-cell">{i.faellig_am ? formatDate(i.faellig_am) : "–"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEuro(i.zahlbetrag)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={i.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
