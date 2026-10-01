import { describe, expect, it } from "vitest";

import { apiKeySchema, webhookUrlsSchema } from "./settings";

describe("webhookUrlsSchema", () => {
  it("keeps filled URLs keyed by event", () => {
    expect(
      webhookUrlsSchema.parse({
        "url:deal.created": " https://n8n.example.test/webhook/a ",
        "url:deal.won": "",
        "url:task.overdue": "http://192.168.1.10:5678/webhook/b",
      }),
    ).toEqual({
      "deal.created": "https://n8n.example.test/webhook/a",
      "task.overdue": "http://192.168.1.10:5678/webhook/b",
    });
  });

  it("rejects other protocols and invalid URLs", () => {
    expect(webhookUrlsSchema.safeParse({ "url:deal.created": "ftp://x.de" }).success).toBe(false);
    const result = webhookUrlsSchema.safeParse({ "url:deal.created": "n8n.example.test" });
    expect(result.error?.issues[0]?.message).toBe("Bitte eine gültige http(s)-URL eingeben.");
  });
});

describe("apiKeySchema", () => {
  it("requires a name", () => {
    expect(apiKeySchema.safeParse({ name: " " }).success).toBe(false);
    expect(apiKeySchema.parse({ name: "n8n Produktion" }).name).toBe("n8n Produktion");
  });
});
