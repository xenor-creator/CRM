import { Badge } from "@/components/ui/badge";
import { companyStatusLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const styles: Record<Enums<"company_status">, string> = {
  lead: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  kunde: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  ehemalig: "bg-muted text-muted-foreground",
};

export function CompanyStatusBadge({ status }: { status: Enums<"company_status"> }) {
  return (
    <Badge variant="secondary" className={cn(styles[status])}>
      {companyStatusLabels[status]}
    </Badge>
  );
}
