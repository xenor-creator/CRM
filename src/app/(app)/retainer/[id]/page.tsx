import { Pencil, Trash2, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DefinitionList } from "@/components/definition-list";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { PageHeader } from "@/components/page-header";
import { RetainerNoticeList } from "@/components/retainer-notice";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { formatDate, formatEuro } from "@/lib/format";
import { invoiceStatusLabels, retainerStatusLabels } from "@/lib/labels";
import { minimumTermEnd, possibleEndDates, retainerNotices } from "@/lib/retainers";

import { cancelRetainer, deleteRetainer, withdrawCancellation } from "../actions";
import { CancelRetainerForm } from "../cancel-form";

export const metadata: Metadata = { title: "Retainer" };

export default async function RetainerPage(props: PageProps<"/retainer/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const { data: retainer } = await supabase
    .from("retainers")
    .select("*, companies(id, name, kundennummer), deals(id, titel)")
    .eq("id", id)
    .maybeSingle();
  if (!retainer) notFound();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, nummer, status, summe_netto, leistung_von, leistung_bis")
    .eq("retainer_id", id)
    .order("leistung_von", { ascending: false });

  const today = berlinDate();
  const termEnd = minimumTermEnd(retainer);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {retainer.titel}
            <Badge variant="outline">{retainerStatusLabels[retainer.status]}</Badge>
          </span>
        }
        description={
          retainer.companies && (
            <Link href={`/firmen/${retainer.companies.id}`} className="hover:underline">
              {retainer.companies.name} ({retainer.companies.kundennummer})
            </Link>
          )
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/retainer/${id}/bearbeiten`}>
                <Pencil />
                Bearbeiten
              </Link>
            </Button>
            <ConfirmActionButton
              action={deleteRetainer.bind(null, id)}
              confirmMessage={`Retainer „${retainer.titel}“ löschen? Rechnungen bleiben erhalten.`}
              variant="outline"
              size="sm"
            >
              <Trash2 />
              Löschen
            </ConfirmActionButton>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-1 content-start gap-6 lg:col-span-2">
          <SectionCard title="Vertrag">
            <div className="grid gap-4">
              <RetainerNoticeList notices={retainerNotices(retainer, today)} />
              <DefinitionList
                items={[
                  ["Monatsbetrag", `${formatEuro(retainer.monatsbetrag)} netto`],
                  ["Start / Abrechnungstag", formatDate(retainer.start)],
                  ["Mindestlaufzeit", retainer.laufzeit_monate ? `${retainer.laufzeit_monate} Monate (bis ${formatDate(termEnd!)})` : "keine, monatlich kündbar"],
                  ["Kündigungsfrist", `${retainer.kuendigungsfrist_tage} Tage`],
                  ["Gekündigt zum", retainer.gekuendigt_zum && formatDate(retainer.gekuendigt_zum)],
                  ["Nächste Abrechnung", retainer.status !== "beendet" && retainer.naechste_abrechnung ? formatDate(retainer.naechste_abrechnung) : null],
                  ["Leistungsumfang", retainer.leistungsumfang],
                  ["Deal", retainer.deals && <Link href={`/deals/${retainer.deals.id}`} className="hover:underline">{retainer.deals.titel}</Link>],
                ]}
              />
            </div>
          </SectionCard>
          <SectionCard title="Rechnungen">
            {invoices?.length ? (
              <ul className="divide-y text-sm">
                {invoices.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/rechnungen/${i.id}`} className="font-medium hover:underline">
                      {i.nummer ?? "Entwurf"}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {i.leistung_von && i.leistung_bis && `${formatDate(i.leistung_von)}–${formatDate(i.leistung_bis)} · `}
                      {formatEuro(i.summe_netto)} · {invoiceStatusLabels[i.status]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Der erste Rechnungsentwurf entsteht automatisch am Abrechnungstag.</EmptyHint>
            )}
          </SectionCard>
        </div>
        <div className="grid grid-cols-1 content-start gap-6">
          <SectionCard title="Kündigung">
            {retainer.status === "aktiv" ? (
              <CancelRetainerForm action={cancelRetainer.bind(null, id)} endDates={possibleEndDates(retainer, today, 12)} />
            ) : retainer.status === "gekuendigt" ? (
              <div className="grid gap-3 text-sm">
                <p>Gekündigt zum {formatDate(retainer.gekuendigt_zum!)}.</p>
                <ConfirmActionButton
                  action={withdrawCancellation.bind(null, id)}
                  confirmMessage="Kündigung zurücknehmen? Der Retainer läuft dann weiter."
                  variant="outline"
                  size="sm"
                >
                  <Undo2 />
                  Kündigung zurücknehmen
                </ConfirmActionButton>
              </div>
            ) : (
              <EmptyHint>Der Retainer ist beendet.</EmptyHint>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
