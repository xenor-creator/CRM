import { Calendar, Mail, NotebookPen, Phone } from "lucide-react";
import Link from "next/link";

import { DeleteActivityButton } from "@/components/activities/delete-activity-button";
import { formatDateTime } from "@/lib/format";
import { activityTypLabels } from "@/lib/labels";
import { contactName } from "@/lib/names";
import type { Enums } from "@/lib/supabase/database.types";

export type TimelineActivity = {
  id: string;
  typ: Enums<"activity_typ">;
  inhalt: string | null;
  zeitpunkt: string;
  contacts: { id: string; vorname: string | null; nachname: string } | null;
  deals: { id: string; titel: string } | null;
};

const icons = { anruf: Phone, mail: Mail, meeting: Calendar, notiz: NotebookPen } as const;

export function ActivityTimeline({ activities }: { activities: TimelineActivity[] }) {
  if (activities.length === 0) {
    return <p className="text-muted-foreground text-sm">Noch keine Aktivitäten.</p>;
  }

  return (
    <ol className="grid gap-4">
      {activities.map((activity) => {
        const Icon = icons[activity.typ];
        return (
          <li key={activity.id} className="flex gap-3">
            <span className="bg-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs">
                {activityTypLabels[activity.typ]} · {formatDateTime(activity.zeitpunkt)}
                {activity.contacts && (
                  <>
                    {" · "}
                    <Link href={`/kontakte/${activity.contacts.id}`} className="hover:underline">
                      {contactName(activity.contacts)}
                    </Link>
                  </>
                )}
                {activity.deals && (
                  <>
                    {" · "}
                    <Link href={`/deals/${activity.deals.id}`} className="hover:underline">
                      {activity.deals.titel}
                    </Link>
                  </>
                )}
              </p>
              {activity.inhalt && (
                <p className="mt-1 text-sm break-words whitespace-pre-line">{activity.inhalt}</p>
              )}
            </div>
            <DeleteActivityButton id={activity.id} />
          </li>
        );
      })}
    </ol>
  );
}

export const timelineSelect =
  "id, typ, inhalt, zeitpunkt, contacts(id, vorname, nachname), deals(id, titel)" as const;
