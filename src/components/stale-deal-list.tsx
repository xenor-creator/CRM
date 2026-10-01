import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { EmptyHint } from "@/components/section-card";
import { daysSince } from "@/lib/dates";
import { formatEuro } from "@/lib/format";
import type { StaleDeal } from "@/lib/queries";

export function StaleDealList({ deals }: { deals: StaleDeal[] }) {
  if (!deals.length) return <EmptyHint>Alle offenen Deals sind aktiv betreut.</EmptyHint>;
  return (
    <ul className="divide-y text-sm">
      {deals.map((deal) => (
        <li key={deal.id} className="flex items-start gap-3 py-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
              {deal.titel}
            </Link>
            <p className="text-muted-foreground text-xs">
              {deal.companies?.name} · {deal.deal_stages.name} · {formatEuro(deal.wert_einmalig)}
              {deal.letzte_aktivitaet && <> · seit {daysSince(deal.letzte_aktivitaet)} Tagen ruhig</>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
