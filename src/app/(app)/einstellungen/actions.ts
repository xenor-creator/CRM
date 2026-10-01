"use server";

import { randomBytes, randomUUID } from "node:crypto";

import { refresh } from "next/cache";

import { displayPrefix, generateApiKey, hashApiKey } from "@/lib/api/keys";
import { requireVerifiedSession } from "@/lib/auth/session";
import { failure, success, type FormState } from "@/lib/form-state";
import { createServiceClient } from "@/lib/supabase/service";
import { firstIssue } from "@/lib/validation/fields";
import { apiKeySchema, webhookUrlsSchema } from "@/lib/validation/settings";
import { dispatchDueWebhooks } from "@/lib/webhooks/dispatcher";
import { isWebhookEvent } from "@/lib/webhooks/events";

export type CreateKeyState = FormState & { key?: string };

export async function createApiKey(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const parsed = apiKeySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure(firstIssue(parsed.error), formData);
  }

  const { supabase } = await requireVerifiedSession();
  const key = generateApiKey();
  const { error } = await supabase
    .from("api_keys")
    .insert({ name: parsed.data.name, key_hash: hashApiKey(key), key_praefix: displayPrefix(key) });
  if (error) {
    console.error("insert api key failed", error);
    return failure("Der API-Key konnte nicht erzeugt werden.", formData);
  }

  refresh();
  return { ...success(), key };
}

export async function revokeApiKey(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase
    .from("api_keys")
    .update({ widerrufen_am: new Date().toISOString() })
    .eq("id", id)
    .is("widerrufen_am", null);
  if (error) {
    console.error("revoke api key failed", error);
    throw new Error("Der API-Key konnte nicht widerrufen werden.");
  }
  refresh();
}

export async function saveWebhookUrls(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = webhookUrlsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure(firstIssue(parsed.error), formData);
  }

  const { supabase, userId } = await requireVerifiedSession();
  const { error } = await supabase.from("settings").update({ webhook_urls: parsed.data }).eq("owner_id", userId);
  if (error) {
    console.error("save webhook urls failed", error);
    return failure("Die Webhook-Ziele konnten nicht gespeichert werden.", formData);
  }
  refresh();
  return { ...success(), values: Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [`url:${k}`, v])) };
}

export async function regenerateWebhookSecret() {
  const { supabase, userId } = await requireVerifiedSession();
  const { error } = await supabase
    .from("settings")
    .update({ webhook_secret: randomBytes(32).toString("hex") })
    .eq("owner_id", userId);
  if (error) {
    console.error("regenerate webhook secret failed", error);
    throw new Error("Das Webhook-Geheimnis konnte nicht erneuert werden.");
  }
  refresh();
}

export type TestResult = { ok: boolean; message: string };

// Sends a test event to the configured URL right away (single attempt, no retries).
export async function sendTestWebhook(event: string): Promise<TestResult> {
  if (!isWebhookEvent(event)) {
    return { ok: false, message: "Unbekanntes Ereignis." };
  }
  const { supabase, userId } = await requireVerifiedSession();
  const { data: settings } = await supabase.from("settings").select("webhook_urls").eq("owner_id", userId).single();
  const url = (settings?.webhook_urls as Record<string, string> | null)?.[event];
  if (!url) {
    return { ok: false, message: "Für dieses Ereignis ist keine URL gespeichert." };
  }

  const id = randomUUID();
  const { error } = await supabase.from("webhook_events").insert({
    id,
    event,
    ziel_url: url,
    payload: { id, event, occurred_at: new Date().toISOString(), test: true, data: {} },
  });
  if (error) {
    console.error("insert test webhook failed", error);
    return { ok: false, message: "Das Test-Ereignis konnte nicht angelegt werden." };
  }

  const db = createServiceClient();
  await dispatchDueWebhooks(db, userId);
  // A test is a single attempt: drop any scheduled retry.
  const { data: row } = await db
    .from("webhook_events")
    .update({ status: "fehlgeschlagen", naechster_versuch_am: null })
    .eq("id", id)
    .eq("status", "ausstehend")
    .select("id")
    .maybeSingle();
  const { data: result } = await supabase.from("webhook_events").select("status, antwort_status, fehler").eq("id", id).single();
  refresh();

  if (!row && result?.status === "gesendet") {
    return { ok: true, message: `Zugestellt (HTTP ${result.antwort_status}).` };
  }
  return { ok: false, message: `Fehlgeschlagen: ${result?.fehler ?? "unbekannter Fehler"}.` };
}
