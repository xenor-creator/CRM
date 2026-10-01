// Outgoing webhook events with the phase in which the CRM starts sending them.
export const WEBHOOK_EVENTS = [
  { name: "deal.created", label: "Deal angelegt", phase: 3 },
  { name: "deal.stage_changed", label: "Deal-Phase geändert", phase: 3 },
  { name: "deal.won", label: "Deal gewonnen", phase: 3 },
  { name: "deal.lost", label: "Deal verloren", phase: 3 },
  { name: "task.overdue", label: "Aufgabe überfällig (täglich)", phase: 3 },
  { name: "invoice.created", label: "Rechnung erstellt", phase: 4 },
  { name: "invoice.overdue", label: "Rechnung überfällig", phase: 4 },
  { name: "invoice.paid", label: "Rechnung bezahlt", phase: 4 },
  { name: "retainer.ending_soon", label: "Retainer läuft aus", phase: 4 },
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number]["name"];

export function isWebhookEvent(name: string): name is WebhookEventName {
  return WEBHOOK_EVENTS.some((e) => e.name === name);
}
