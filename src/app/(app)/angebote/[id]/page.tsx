import { Check, FileDown, Trash2, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DefinitionList } from "@/components/definition-list";
import { DocumentView } from "@/components/documents/document-view";
import { DraftEditor } from "@/components/documents/draft-editor";
import { FinalizeForm } from "@/components/documents/finalize-form";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { PageHeader } from "@/components/page-header";
import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { requireVerifiedSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import type { LineItem } from "@/lib/invoices/line-items";

import { deleteQuoteDraft, finalizeQuote, setQuoteDecision, updateQuoteDraft } from "../actions";

export const metadata: Metadata = { title: "Angebot" };

export default async function QuotePage(props: PageProps<"/angebote/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, deals(id, titel, companies(id, name, kundennummer))")
    .eq("id", id)
    .maybeSingle();
  if (!quote) notFound();

  const isDraft = quote.status === "entwurf";
  const items = quote.positionen as LineItem[];
  const company = quote.deals?.companies;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {quote.nummer ? `Angebot ${quote.nummer}` : "Angebot (Entwurf)"}
            <QuoteStatusBadge status={quote.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap gap-x-2">
            {company && (
              <Link href={`/firmen/${company.id}`} className="hover:underline">
                {company.name} ({company.kundennummer})
              </Link>
            )}
            {quote.deals && (
              <Link href={`/deals/${quote.deals.id}`} className="hover:underline">
                · Deal {quote.deals.titel}
              </Link>
            )}
          </span>
        }
        actions={
          isDraft ? (
            <ConfirmActionButton action={deleteQuoteDraft.bind(null, id)} confirmMessage="Diesen Entwurf löschen?" variant="outline" size="sm">
              <Trash2 />
              Entwurf löschen
            </ConfirmActionButton>
          ) : (
            <Button asChild variant="outline" size="sm">
              <a href={`/angebote/${id}/pdf`} target="_blank" rel="noopener">
                <FileDown />
                PDF
              </a>
            </Button>
          )
        }
      />

      {isDraft ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard title="Entwurf bearbeiten">
              <DraftEditor
                action={updateQuoteDraft.bind(null, id)}
                items={items}
                vatRate={quote.ust_satz}
                hinweis={quote.hinweis}
                extraFields={[{ name: "gueltig_bis", label: "Gültig bis", type: "date", value: quote.gueltig_bis }]}
              />
            </SectionCard>
          </div>
          <SectionCard title="Abschließen">
            <div className="grid gap-3 text-sm">
              <p className="text-muted-foreground">
                Vergibt die fortlaufende Angebotsnummer, setzt das Angebotsdatum (heute) und erzeugt das PDF. Ohne Gültigkeitsdatum gilt die
                Frist aus den Einstellungen. Danach ist das Angebot unveränderlich.
              </p>
              <FinalizeForm
                action={finalizeQuote.bind(null, id)}
                label="Angebot abschließen"
                confirmText="Angebot jetzt abschließen? Es kann danach nicht mehr geändert werden."
              />
            </div>
          </SectionCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard title="Positionen">
              <DocumentView positionen={items} ustSatz={quote.ust_satz} netto={quote.summe_netto} ust={quote.summe_ust} brutto={quote.summe_brutto} />
            </SectionCard>
          </div>
          <div className="grid grid-cols-1 content-start gap-6">
            <SectionCard title="Daten">
              <DefinitionList
                items={[
                  ["Angebotsdatum", quote.datum && formatDate(quote.datum)],
                  ["Gültig bis", quote.gueltig_bis && formatDate(quote.gueltig_bis)],
                ]}
              />
            </SectionCard>
            {quote.status === "versendet" && (
              <SectionCard title="Entscheidung des Kunden">
                <div className="flex flex-wrap gap-2">
                  <ConfirmActionButton action={setQuoteDecision.bind(null, id, "angenommen")} confirmMessage="Angebot als angenommen markieren?" size="sm">
                    <Check />
                    Angenommen
                  </ConfirmActionButton>
                  <ConfirmActionButton
                    action={setQuoteDecision.bind(null, id, "abgelehnt")}
                    confirmMessage="Angebot als abgelehnt markieren?"
                    variant="outline"
                    size="sm"
                  >
                    <X />
                    Abgelehnt
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
