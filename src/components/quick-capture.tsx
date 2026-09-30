"use client";

import { Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ActivityForm } from "@/components/activities/activity-form";
import { TaskForm } from "@/components/activities/task-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Option } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Mode = "aufgabe" | "aktivitaet";

// Global quick capture for tasks and activities, opened with Ctrl/⌘ + K or the button.
export function QuickCapture({
  companyOptions,
  dealOptions,
}: {
  companyOptions: Option[];
  dealOptions: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("aufgabe");
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Zap />
          Schnellerfassung
          <kbd className="text-muted-foreground ml-auto hidden text-xs md:inline">Strg K</kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schnellerfassung</DialogTitle>
          <DialogDescription>Aufgabe oder Aktivität erfassen, ohne die Seite zu verlassen.</DialogDescription>
        </DialogHeader>
        <div role="tablist" className="bg-muted grid grid-cols-2 gap-1 rounded-md p-1">
          {(
            [
              ["aufgabe", "Aufgabe"],
              ["aktivitaet", "Aktivität"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium",
                mode === value ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "aufgabe" ? (
          <TaskForm idPrefix="quick-task" companyOptions={companyOptions} dealOptions={dealOptions} onSaved={close} />
        ) : (
          <ActivityForm
            idPrefix="quick-activity"
            companyOptions={companyOptions}
            dealOptions={dealOptions}
            onSaved={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
