import type { Enums, TablesUpdate } from "@/lib/supabase/database.types";

import { signWebhook } from "./signature";

// Delays before retry 1, 2 and 3 (seconds). With an 8 s timeout per attempt, all four
// attempts finish within 252 s, inside the 300 s function limit.
export const RETRY_DELAYS_SECONDS = [10, 60, 150] as const;
export const MAX_ATTEMPTS = 1 + RETRY_DELAYS_SECONDS.length;
export const DELIVERY_TIMEOUT_MS = 8_000;

export type WebhookEvent = {
  id: string;
  event: string;
  payload: unknown;
  ziel_url: string | null;
  versuche: number;
};

export type DeliveryResult = { ok: true; status: number } | { ok: false; status: number | null; error: string };

export function webhookRequest(event: WebhookEvent, secret: string, now: Date = new Date()) {
  const body = JSON.stringify(event.payload);
  const timestamp = Math.floor(now.getTime() / 1000);
  return {
    body,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Agentur-CRM-Webhooks/1",
      "X-CRM-Event": event.event,
      "X-CRM-Delivery": event.id,
      "X-CRM-Timestamp": String(timestamp),
      "X-CRM-Signature": signWebhook(secret, timestamp, body),
    },
  };
}

export async function sendWebhook(
  event: WebhookEvent,
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DeliveryResult> {
  if (!event.ziel_url) {
    return { ok: false, status: null, error: "Keine Ziel-URL konfiguriert." };
  }
  const { body, headers } = webhookRequest(event, secret);
  try {
    const response = await fetchImpl(event.ziel_url, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, status: response.status };
    }
    return { ok: false, status: response.status, error: `HTTP ${response.status}` };
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "Zeitüberschreitung" : String(error);
    return { ok: false, status: null, error: message.slice(0, 500) };
  }
}

// Row update after an attempt: sent, scheduled for retry or finally failed.
export function deliveryUpdate(
  result: DeliveryResult,
  attemptsBefore: number,
  now: Date = new Date(),
): TablesUpdate<"webhook_events"> {
  const versuche = attemptsBefore + 1;
  const base = { versuche, antwort_status: result.status, gesperrt_bis: null };
  if (result.ok) {
    return { ...base, status: "gesendet" satisfies Enums<"webhook_event_status">, gesendet_am: now.toISOString(), fehler: null };
  }
  const delay = RETRY_DELAYS_SECONDS[versuche - 1];
  if (delay === undefined) {
    return { ...base, status: "fehlgeschlagen", fehler: result.error, naechster_versuch_am: null };
  }
  return {
    ...base,
    status: "ausstehend",
    fehler: result.error,
    naechster_versuch_am: new Date(now.getTime() + delay * 1000).toISOString(),
  };
}
