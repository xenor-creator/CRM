"use client";

import { Play, Square } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMinutes } from "@/lib/projects";

import { startTimer, stopTimer } from "./actions";

function elapsed(startedAt: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

export function ProjectTimer({ projectId, startedAt }: { projectId: string; startedAt: string | null }) {
  const [display, setDisplay] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setDisplay(elapsed(startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) {
    return (
      <Button onClick={() => startTransition(() => startTimer(projectId))} disabled={pending}>
        <Play />
        Timer starten
      </Button>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="font-mono text-2xl tabular-nums" aria-live="polite" data-testid="timer">
        {display ?? formatMinutes(0)}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Was hast du gemacht? (optional)"
          aria-label="Tätigkeit (Timer)"
        />
        <Button
          variant="destructive"
          onClick={() =>
            startTransition(async () => {
              await stopTimer(projectId, note);
              setNote("");
            })
          }
          disabled={pending}
        >
          <Square />
          Stoppen und buchen
        </Button>
      </div>
    </div>
  );
}
