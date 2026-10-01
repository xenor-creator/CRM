import { describe, expect, it } from "vitest";

import { apiKeySchema, companySettingsSchema, webhookUrlsSchema } from "./settings";

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

describe("companySettingsSchema", () => {
  const base = {
    firmenname: "Agentur Beispiel",
    strasse: "Hauptstr. 1",
    plz: "10115",
    ort: "Berlin",
    iban: "de02 1203 0000 0000 2020 51",
    steuernummer: "11/111/11111",
    standard_ust_satz: "19",
    zahlungsziel_tage: "14",
    angebot_gueltig_tage: "30",
  };

  it("normalizes the IBAN and parses numbers", () => {
    expect(companySettingsSchema.parse(base)).toMatchObject({ iban: "DE02120300000000202051", standard_ust_satz: 19, zahlungsziel_tage: 14, land: "DE" });
  });

  it("requires a tax number or VAT id and a valid IBAN", () => {
    expect(companySettingsSchema.safeParse({ ...base, steuernummer: "" }).error?.issues[0]?.message).toContain("§ 14 UStG");
    expect(companySettingsSchema.safeParse({ ...base, iban: "DE02120300000000202052" }).error?.issues[0]?.message).toBe("Die IBAN ist ungültig (Prüfsumme).");
  });
});
