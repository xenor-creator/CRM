import { FileCode2, FileDown, Trash2, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentView } from "@/components/documents/document-view";
import { DraftEditor } from "@/components/documents/draft-editor";
import { FinalizeForm } from "@/components/documents/finalize-form";
import { DefinitionList } from "@/components/definition-list";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { formatDate, formatDateTime } from "@/lib/format";
import type { LineItem, Prepayment } from "@/lib/invoices/line-items";
import { INVOICE_TITLES } from "@/lib/pdf/render";

import { createCancellation, deleteInvoiceDraft, finalizeInvoice, markInvoicePaid, updateInvoiceDraft } from "../actions";
import { PaidForm } from "../invoice-forms";

export const metadata: Metadata = { title: "Rechnung" };

export default async function InvoicePage(props: PageProps<"/rechnungen/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, companies(id, name, kundennummer), projects(id, titel), retainers(id, titel)")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const [{ data: original }, { data: cancellation }] = await Promise.all([
    invoice.storno_von_id
      ? supabase.from("invoices").select("id, nummer").eq("id", invoice.storno_von_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("invoices").select("id, nummer, status").eq("storno_von_id", id).maybeSingle(),
  ]);

  const isDraft = invoice.status === "entwurf";
  const items = invoice.positionen as LineItem[];
  const prepayments = invoice.abschlaege as Prepayment[];
  const title = INVOICE_TITLES[invoice.art];
  const today = berlinDate();

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {invoice.nummer ? `${title} ${invoice.nummer}` : `${title} (Entwurf)`}
            <InvoiceStatusBadge status={invoice.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap gap-x-2">
            {invoice.companies && (
              <Link href={`/firmen/${invoice.companies.id}`} className="hover:underline">
                {invoice.companies.name} ({invoice.companies.kundennummer})
              </Link>
            )}
            {invoice.projects && (
              <Link href={`/projekte/${invoice.projects.id}`} className="hover:underline">
                · Projekt {invoice.projects.titel}
              </Link>
            )}
            {invoice.retainers && (
              <Link href={`/retainer/${invoice.retainers.id}`} className="hover:underline">
                · Retainer {invoice.retainers.titel}
              </Link>
            )}
          </span>
        }
        actions={
          isDraft ? (
            <ConfirmActionButton action={deleteInvoiceDraft.bind(null, id)} confirmMessage="Diesen Entwurf löschen?" variant="outline" size="sm">
              <Trash2 />
              Entwurf löschen
            </ConfirmActionButton>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <a href={`/rechnungen/${id}/pdf`} target="_blank" rel="noopener">
                  <FileDown />
                  PDF (ZUGFeRD)
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/rechnungen/${id}/xml`} download>
                  <FileCode2 />
                  XML
                </a>
              </Button>
            </>
          )
        }
      />

      {isDraft ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard title="Entwurf bearbeiten">
              <DraftEditor
                action={updateInvoiceDraft.bind(null, id)}
                items={items}
                vatRate={invoice.ust_satz}
                prepayments={prepayments}
                hinweis={invoice.hinweis}
                extraFields={[
                  { name: "leistung_von", label: "Leistung von / am *", type: "date", value: invoice.leistung_von },
                  { name: "leistung_bis", label: "Leistung bis", type: "date", value: invoice.leistung_bis },
                ]}
              />
            </SectionCard>
          </div>
          <SectionCard title="Abschließen">
            <div className="grid gap-3 text-sm">
              <p className="text-muted-foreground">
                Vergibt die fortlaufende Nummer, setzt Rechnungsdatum (heute) und Fälligkeit, erzeugt PDF und E-Rechnung (ZUGFeRD) und meldet{" "}
                <code>invoice.created</code> an n8n. Danach ist die Rechnung unveränderlich. Gespeicherte Änderungen vorher sichern.
              </p>
              {original && (
                <p>
                  Storniert:{" "}
                  <Link href={`/rechnungen/${original.id}`} className="underline">
                    {original.nummer}
                  </Link>
                </p>
              )}
              <FinalizeForm
                action={finalizeInvoice.bind(null, id)}
                label={invoice.art === "stornorechnung" ? "Stornorechnung abschließen" : "Rechnung abschließen"}
                confirmText="Rechnung jetzt abschließen? Sie kann danach nur noch storniert werden."
              />
            </div>
          </SectionCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard title="Positionen">
              <DocumentView
                positionen={items}
                ustSatz={invoice.ust_satz}
                netto={invoice.summe_netto}
                ust={invoice.summe_ust}
                brutto={invoice.summe_brutto}
                abschlaege={prepayments}
                zahlbetrag={invoice.zahlbetrag}
              />
            </SectionCard>
          </div>
          <div className="grid grid-cols-1 content-start gap-6">
            <SectionCard title="Daten">
              <DefinitionList
                items={[
                  ["Rechnungsdatum", invoice.datum && formatDate(invoice.datum)],
                  [
                    invoice.leistung_bis && invoice.leistung_bis !== invoice.leistung_von ? "Leistungszeitraum" : "Leistungsdatum",
                    invoice.leistung_von &&
                      (invoice.leistung_bis && invoice.leistung_bis !== invoice.leistung_von
                        ? `${formatDate(invoice.leistung_von)}–${formatDate(invoice.leistung_bis)}`
                        : formatDate(invoice.leistung_von)),
                  ],
                  ["Fällig am", invoice.art !== "stornorechnung" && invoice.faellig_am && formatDate(invoice.faellig_am)],
                  ["Bezahlt am", invoice.bezahlt_am && formatDate(invoice.bezahlt_am)],
                  ["Abgeschlossen", invoice.versendet_am && formatDateTime(invoice.versendet_am)],
                  ["Storniert durch", cancellation && <Link href={`/rechnungen/${cancellation.id}`} className="underline">{cancellation.nummer ?? "Entwurf"}</Link>],
                  ["Storno von", original && <Link href={`/rechnungen/${original.id}`} className="underline">{original.nummer}</Link>],
                ]}
              />
            </SectionCard>
            {invoice.art !== "stornorechnung" && (invoice.status === "versendet" || invoice.status === "ueberfaellig") && (
              <SectionCard title="Zahlung">
                <PaidForm action={markInvoicePaid.bind(null, id)} today={today} />
              </SectionCard>
            )}
            {invoice.art !== "stornorechnung" && invoice.status !== "storniert" && !cancellation && (
              <SectionCard title="Korrektur">
                <div className="grid gap-3 text-sm">
                  <p className="text-muted-foreground">Abgeschlossene Rechnungen sind unveränderlich. Korrekturen nur über eine Stornorechnung.</p>
                  <ConfirmActionButton
                    action={createCancellation.bind(null, id)}
                    confirmMessage="Stornorechnung als Entwurf anlegen?"
                    variant="outline"
                    size="sm"
                  >
                    <Undo2 />
                    Stornorechnung erstellen
                  </ConfirmActionButton>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </>
  );
}
