import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

// Key figure: label, value, optional detail line; the whole tile links to the matching list.
export function StatTile({ label, value, detail, href }: { label: string; value: string; detail?: ReactNode; href: string }) {
  return (
    <Link href={href} className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-[3px]">
      <Card className="hover:bg-muted/40 h-full gap-1 px-5 py-4 transition-colors">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {detail && <div className="text-muted-foreground text-xs">{detail}</div>}
      </Card>
    </Link>
  );
}
