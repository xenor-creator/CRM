import "server-only";

import { after } from "next/server";

import { createServiceClient, type ServiceClient } from "@/lib/supabase/service";

import { deliveryUpdate, sendWebhook } from "./delivery";

// Stop waiting for retries well before the 300 s function limit.
const RETRY_BUDGET_MS = 260_000;

async function secretFor(db: ServiceClient, ownerId: string, cache: Map<string, string>) {
  const known = cache.get(ownerId);
  if (known) return known;
  const { data, error } = await db.from("settings").select("webhook_secret").eq("owner_id", ownerId).single();
  if (error) throw new Error(`webhook secret missing for owner ${ownerId}`);
  cache.set(ownerId, data.webhook_secret);
  return data.webhook_secret;
}

// Sends all due events (optionally for one owner). Returns the number of attempts made.
export async function dispatchDueWebhooks(db: ServiceClient, ownerId?: string): Promise<number> {
  const { data: events, error } = await db.rpc("claim_webhook_events", { p_owner: ownerId, p_limit: 25 });
  if (error) {
    console.error("claim_webhook_events failed", error);
    return 0;
  }
  const secrets = new Map<string, string>();
  for (const event of events) {
    const result = await sendWebhook(event, await secretFor(db, event.owner_id, secrets));
    const { error: updateError } = await db
      .from("webhook_events")
      .update(deliveryUpdate(result, event.versuche))
      .eq("id", event.id)
      .eq("owner_id", event.owner_id);
    if (updateError) console.error("webhook status update failed", updateError);
  }
  return events.length;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Delivers the owner's due events and keeps waiting for scheduled retries within the budget.
export async function deliverWithRetries(ownerId: string): Promise<void> {
  const db = createServiceClient();
  const deadline = Date.now() + RETRY_BUDGET_MS;
  for (;;) {
    const attempted = await dispatchDueWebhooks(db, ownerId);
    const { data: next } = await db.rpc("next_webhook_retry", { p_owner: ownerId });
    if (!next) return;
    const waitMs = Math.max(0, new Date(next).getTime() - Date.now());
    // Due but not claimable: another dispatcher holds the lock and will handle it.
    if (waitMs === 0 && attempted === 0) return;
    if (Date.now() + waitMs > deadline) return;
    await sleep(waitMs + 250);
  }
}

// Runs delivery after the response has been sent. Events left over are picked up by the daily cron.
export function scheduleWebhookDelivery(ownerId: string): void {
  after(() =>
    deliverWithRetries(ownerId).catch((error) => console.error("webhook delivery failed", error)),
  );
}
