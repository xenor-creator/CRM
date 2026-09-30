"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteTask, setTaskDone } from "@/lib/actions/activities";
import { dueState } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { prioritaetLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type TaskItem = {
  id: string;
  titel: string;
  faellig_am: string | null;
  erledigt: boolean;
  prioritaet: Enums<"task_prioritaet">;
  companies?: { id: string; name: string } | null;
  deals?: { id: string; titel: string } | null;
};

const dueStyles = {
  ueberfaellig: "text-destructive font-medium",
  heute: "text-amber-700 dark:text-amber-400 font-medium",
  spaeter: "text-muted-foreground",
  ohne: "text-muted-foreground",
} as const;

export function TaskList({
  tasks,
  today,
  showLinks = false,
}: {
  tasks: TaskItem[];
  today: string;
  showLinks?: boolean;
}) {
  const [optimisticTasks, toggleOptimistic] = useOptimistic(
    tasks,
    (current, { id, erledigt }: { id: string; erledigt: boolean }) =>
      current.map((t) => (t.id === id ? { ...t, erledigt } : t)),
  );
  const [, startTransition] = useTransition();

  if (tasks.length === 0) {
    return <p className="text-muted-foreground text-sm">Keine offenen Aufgaben.</p>;
  }

  return (
    <ul className="grid gap-2">
      {optimisticTasks.map((task) => {
        const due = dueState(task.faellig_am, today);
        return (
          <li key={task.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              aria-label={`${task.titel} erledigt`}
              checked={task.erledigt}
              onChange={(e) => {
                const erledigt = e.target.checked;
                startTransition(async () => {
                  toggleOptimistic({ id: task.id, erledigt });
                  await setTaskDone(task.id, erledigt);
                });
              }}
              className="accent-primary mt-1 size-4 shrink-0"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className={cn("break-words", task.erledigt && "text-muted-foreground line-through")}>
                {task.titel}
                {task.prioritaet === "hoch" && (
                  <Badge variant="destructive" className="ml-2">
                    {prioritaetLabels.hoch}
                  </Badge>
                )}
              </p>
              <p className="text-xs">
                {task.faellig_am && (
                  <span className={dueStyles[due]}>
                    {due === "ueberfaellig" ? "Überfällig seit " : "Fällig "}
                    {formatDate(task.faellig_am)}
                  </span>
                )}
                {showLinks && task.companies && (
                  <Link href={`/firmen/${task.companies.id}`} className="text-muted-foreground ml-2 hover:underline">
                    {task.companies.name}
                  </Link>
                )}
                {showLinks && task.deals && (
                  <Link href={`/deals/${task.deals.id}`} className="text-muted-foreground ml-2 hover:underline">
                    {task.deals.titel}
                  </Link>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`${task.titel} löschen`}
              onClick={() => startTransition(() => deleteTask(task.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
