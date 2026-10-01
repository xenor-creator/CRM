import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { deliveryUpdate, MAX_ATTEMPTS, sendWebhook, webhookRequest, type WebhookEvent } from "./delivery";
import { signWebhook } from "./signature";

const event: WebhookEvent = {
  id: "8d3c6f1e-0000-4000-8000-000000000001",
  event: "deal.stage_changed",
  payload: { id: "8d3c6f1e-0000-4000-8000-000000000001", event: "deal.stage_changed", data: { deal: { titel: "Ä" } } },
  ziel_url: "https://n8n.example.test/webhook/crm",
  versuche: 0,
};
const now = new Date("2026-10-02T10:00:00Z");

describe("signWebhook", () => {
  it("signs timestamp and body with HMAC-SHA256", () => {
    const expected = createHmac("sha256", "geheim").update('1790000000.{"a":1}').digest("hex");
    expect(signWebhook("geheim", 1790000000, '{"a":1}')).toBe(`sha256=${expected}`);
  });
});

describe("webhookRequest", () => {
  it("builds headers a receiver can verify", () => {
    const { body, headers } = webhookRequest(event, "geheim", now);
    expect(JSON.parse(body)).toEqual(event.payload);
    expect(headers["X-CRM-Event"]).toBe("deal.stage_changed");
    expect(headers["X-CRM-Delivery"]).toBe(event.id);
    const timestamp = now.getTime() / 1000;
    expect(headers["X-CRM-Timestamp"]).toBe(String(timestamp));
    expect(headers["X-CRM-Signature"]).toBe(signWebhook("geheim", timestamp, body));
  });
});

describe("sendWebhook", () => {
  it("treats 2xx as success and everything else as failure", async () => {
    const ok = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    expect(await sendWebhook(event, "s", ok)).toEqual({ ok: true, status: 204 });
    expect(ok).toHaveBeenCalledWith(event.ziel_url, expect.objectContaining({ method: "POST", redirect: "manual" }));

    const fail = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    expect(await sendWebhook(event, "s", fail)).toEqual({ ok: false, status: 500, error: "HTTP 500" });

    const redirect = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));
    expect((await sendWebhook(event, "s", redirect)).ok).toBe(false);
  });

  it("reports network errors and timeouts", async () => {
    const down = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await sendWebhook(event, "s", down)).toMatchObject({ ok: false, status: null, error: "TypeError: fetch failed" });

    const timeout = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "TimeoutError" }));
    expect(await sendWebhook(event, "s", timeout)).toMatchObject({ error: "Zeitüberschreitung" });
  });
});

describe("deliveryUpdate", () => {
  it("marks successful deliveries as sent", () => {
    expect(deliveryUpdate({ ok: true, status: 200 }, 0, now)).toEqual({
      versuche: 1,
      antwort_status: 200,
      gesperrt_bis: null,
      status: "gesendet",
      gesendet_am: now.toISOString(),
      fehler: null,
    });
  });

  it("retries three times with growing delays, then gives up", () => {
    const failure = { ok: false as const, status: 503, error: "HTTP 503" };
    const delays = [0, 1, 2].map((before) => {
      const update = deliveryUpdate(failure, before, now);
      expect(update.status).toBe("ausstehend");
      return (new Date(update.naechster_versuch_am!).getTime() - now.getTime()) / 1000;
    });
    expect(delays).toEqual([10, 60, 150]);
    expect(MAX_ATTEMPTS).toBe(4);

    const last = deliveryUpdate(failure, 3, now);
    expect(last).toMatchObject({ status: "fehlgeschlagen", versuche: 4, fehler: "HTTP 503", naechster_versuch_am: null });
  });
});
