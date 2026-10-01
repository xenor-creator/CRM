import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { RetainerNoticeList } from "@/components/retainer-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { formatDate, formatEuro } from "@/lib/format";
import { retainerStatusLabels } from "@/lib/labels";
import { monthlyRecurringRevenue, retainerNotices } from "@/lib/retainers";

export const metadata: Metadata = { title: "Retainer" };

export default async function RetainersPage() {
  const { supabase } = await requireVerifiedSession();
  const { data: retainers, error } = await supabase
    .from("retainers")
    .select("id, titel, status, monatsbetrag, start, laufzeit_monate, kuendigungsfrist_tage, gekuendigt_zum, naechste_abrechnung, companies(id, name)")
    .order("status")
    .order("start", { ascending: false });

  const today = berlinDate();
  const running = (retainers ?? []).filter((r) => r.status !== "beendet");

  return (
    <>
      <PageHeader
        title="Retainer"
        actions={
          <Button asChild>
            <Link href="/retainer/neu">
              <Plus />
              Neuer Retainer
            </Link>
          </Button>
        }
      />
      <Card className="mb-6 max-w-sm gap-2">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">Monatlich wiederkehrender Umsatz (MRR)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums" data-testid="mrr">
            {formatEuro(monthlyRecurringRevenue(running))}
          </p>
          <p className="text-muted-foreground text-xs">{running.length} laufende Retainer, netto</p>
        </CardContent>
      </Card>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Die Retainer konnten nicht geladen werden.
        </p>
      ) : !retainers.length ? (
        <p className="text-muted-foreground text-sm">Noch keine Retainer.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Retainer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Monatlich</TableHead>
              <TableHead className="hidden md:table-cell">Nächste Abrechnung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retainers.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-normal">
                  <Link href={`/retainer/${r.id}`} className="font-medium hover:underline">
                    {r.titel}
                  </Link>
                  {r.companies && <span className="text-muted-foreground block text-xs">{r.companies.name}</span>}
                  <RetainerNoticeList notices={retainerNotices(r, today)} />
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "aktiv" ? "secondary" : "outline"}>{retainerStatusLabels[r.status]}</Badge>
                  {r.gekuendigt_zum && <span className="text-muted-foreground block text-xs">zum {formatDate(r.gekuendigt_zum)}</span>}
                </TableCell>
                <TableCell>{formatEuro(r.monatsbetrag)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {r.status === "beendet" || !r.naechste_abrechnung ? "–" : formatDate(r.naechste_abrechnung)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
