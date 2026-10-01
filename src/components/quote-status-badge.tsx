import { Badge } from "@/components/ui/badge";
import { quoteStatusLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const styles: Record<Enums<"quote_status">, string> = {
  entwurf: "bg-muted text-muted-foreground",
  versendet: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  angenommen: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  abgelehnt: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function QuoteStatusBadge({ status }: { status: Enums<"quote_status"> }) {
  return (
    <Badge variant="secondary" className={cn(styles[status])}>
      {quoteStatusLabels[status]}
    </Badge>
  );
}
