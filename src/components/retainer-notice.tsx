import { AlertTriangle } from "lucide-react";

import { formatDate } from "@/lib/format";
import type { RetainerNotice } from "@/lib/retainers";

export function noticeText(notice: RetainerNotice): string {
  const when = notice.days === 0 ? "heute" : `in ${notice.days} Tagen`;
  return notice.kind === "kuendigungsfrist"
    ? `Kündigungsfrist endet ${when} (${formatDate(notice.date)}), sonst Verlängerung über den ${formatDate(notice.endDate)} hinaus.`
    : `Laufzeit endet ${when} (${formatDate(notice.date)}).`;
}

export function RetainerNoticeList({ notices }: { notices: RetainerNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <ul className="grid gap-1">
      {notices.map((n) => (
        <li key={n.kind} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {noticeText(n)}
        </li>
      ))}
    </ul>
  );
}
