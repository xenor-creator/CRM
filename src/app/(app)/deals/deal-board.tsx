"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useId, useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { columnTotals, groupByStage, moveDealToStage, type BoardDeal, type Stage } from "@/lib/deals";
import { formatDate, formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

import { moveDeal } from "./actions";

type PendingLoss = { dealId: string; stageId: string; titel: string };

export function DealBoard({
  stages,
  deals,
  inactiveDealIds,
}: {
  stages: Stage[];
  deals: BoardDeal[];
  inactiveDealIds: string[];
}) {
  const [optimisticDeals, applyMove] = useOptimistic(
    deals,
    (current, move: { dealId: string; stageId: string }) => moveDealToStage(current, move.dealId, move.stageId),
  );
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingLoss, setPendingLoss] = useState<PendingLoss | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Stable id so dnd-kit's accessibility attributes match between server and client render.
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const inactive = new Set(inactiveDealIds);
  const activeDeal = optimisticDeals.find((d) => d.id === activeId) ?? null;

  const commitMove = (dealId: string, stageId: string, verlustgrund: string | null = null) => {
    setError(null);
    startTransition(async () => {
      applyMove({ dealId, stageId });
      const result = await moveDeal(dealId, stageId, verlustgrund);
      if (!result.ok) setError(result.error);
    });
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const deal = optimisticDeals.find((d) => d.id === event.active.id);
    const target = event.over ? stageById.get(String(event.over.id)) : undefined;
    if (!deal || !target || target.id === deal.stage_id) return;
    if (target.art === "verloren") {
      setPendingLoss({ dealId: deal.id, stageId: target.id, titel: deal.titel });
    } else {
      commitMove(deal.id, target.id);
    }
  };

  return (
    <>
      {error && (
        <p role="alert" className="text-destructive mb-3 text-sm">
          {error}
        </p>
      )}
      <DndContext
        id={dndId}
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {groupByStage(stages, optimisticDeals).map(({ stage, deals: columnDeals }) => (
            <StageColumn key={stage.id} stage={stage} deals={columnDeals} inactive={inactive} />
          ))}
        </div>
        <DragOverlay>{activeDeal && <DealCard deal={activeDeal} inactive={false} overlay />}</DragOverlay>
      </DndContext>

      <LossReasonDialog
        pending={pendingLoss}
        onCancel={() => setPendingLoss(null)}
        onConfirm={(reason) => {
          if (pendingLoss) commitMove(pendingLoss.dealId, pendingLoss.stageId, reason);
          setPendingLoss(null);
        }}
      />
    </>
  );
}

function StageColumn({ stage, deals, inactive }: { stage: Stage; deals: BoardDeal[]; inactive: Set<string> }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totals = columnTotals(deals);

  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      data-testid={`stage-${stage.name}`}
      className={cn(
        "bg-muted/50 flex w-72 shrink-0 flex-col rounded-lg border p-2 transition-colors",
        isOver && "border-primary bg-muted",
        stage.art === "gewonnen" && "bg-emerald-50/60 dark:bg-emerald-950/20",
        stage.art === "verloren" && "bg-red-50/60 dark:bg-red-950/20",
      )}
    >
      <header className="mb-2 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{stage.name}</h2>
          <span className="text-muted-foreground text-xs">{totals.count}</span>
        </div>
        <p className="text-muted-foreground text-xs" data-testid={`sum-${stage.name}`}>
          {formatEuro(totals.einmalig)}
          {totals.monatlich > 0 && <> + {formatEuro(totals.monatlich)}/Monat</>}
        </p>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2">
        {deals.map((deal) => (
          <DraggableDeal key={deal.id} deal={deal} inactive={stage.art === "offen" && inactive.has(deal.id)} />
        ))}
      </div>
    </section>
  );
}

function DraggableDeal({ deal, inactive }: { deal: BoardDeal; inactive: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn("touch-manipulation", isDragging && "opacity-40")}>
      <DealCard deal={deal} inactive={inactive} />
    </div>
  );
}

function DealCard({ deal, inactive, overlay = false }: { deal: BoardDeal; inactive: boolean; overlay?: boolean }) {
  return (
    <article
      className={cn(
        "bg-card rounded-md border p-3 text-sm shadow-xs",
        overlay ? "cursor-grabbing shadow-lg" : "cursor-grab",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/deals/${deal.id}`} className="font-medium break-words hover:underline" draggable={false}>
          {deal.titel}
        </Link>
        {inactive && (
          <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-label="Seit 14 Tagen keine Aktivität" />
        )}
      </div>
      {deal.companies && <p className="text-muted-foreground text-xs">{deal.companies.name}</p>}
      <p className="mt-2 text-xs">
        {formatEuro(deal.wert_einmalig)}
        {deal.wert_monatlich > 0 && <> + {formatEuro(deal.wert_monatlich)}/Monat</>}
        {deal.wahrscheinlichkeit !== null && (
          <span className="text-muted-foreground"> · {deal.wahrscheinlichkeit} %</span>
        )}
      </p>
      {deal.erwarteter_abschluss && (
        <p className="text-muted-foreground text-xs">Abschluss bis {formatDate(deal.erwarteter_abschluss)}</p>
      )}
    </article>
  );
}

function LossReasonDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingLoss | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) {
          setReason("");
          onCancel();
        }
      }}
    >
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(reason.trim());
            setReason("");
          }}
        >
          <DialogHeader>
            <DialogTitle>Deal als verloren markieren</DialogTitle>
            <DialogDescription>{pending?.titel}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="verlustgrund">Verlustgrund *</Label>
            <Textarea
              id="verlustgrund"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z. B. Budget fehlt, Wettbewerber, kein Bedarf"
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={reason.trim() === ""}>
              Als verloren markieren
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
