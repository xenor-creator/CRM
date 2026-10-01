import { describe, expect, it } from "vitest";

import {
  apiActivityCreate,
  apiCompanyQuery,
  apiCompanyUpdate,
  apiDealUpdate,
  apiInvoiceQuery,
  apiLeadCreate,
} from "./api";

describe("apiLeadCreate", () => {
  it("accepts a typical n8n lead", () => {
    const lead = apiLeadCreate.parse({
      company: { name: "Beispiel GmbH", website: "https://beispiel.de", tool_stack: ["Excel"] },
      contact: { vorname: "Max", nachname: "Muster", email: " Max@Beispiel.DE " },
      deal: { wert_einmalig: 4800.5, quelle: "Website-Formular" },
      notiz: "Anfrage über Kontaktformular",
    });
    expect(lead.contact.email).toBe("max@beispiel.de");
    expect(lead.deal?.wert_einmalig).toBe(4800.5);
  });

  it("rejects unknown fields and invalid amounts with German messages", () => {
    const unknown = apiLeadCreate.safeParse({ company: { name: "A", webseite: "x" }, contact: { nachname: "B" } });
    expect(unknown.error?.issues[0]?.message).toContain("Unbekannter Schlüssel");

    const cents = apiLeadCreate.safeParse({ company: { name: "A" }, contact: { nachname: "B" }, deal: { wert_einmalig: 1.005 } });
    expect(cents.error?.issues[0]?.message).toBe("Höchstens zwei Nachkommastellen.");

    const negative = apiLeadCreate.safeParse({ company: { name: "A" }, contact: { nachname: "B" }, deal: { wert_einmalig: -1 } });
    expect(negative.success).toBe(false);
  });

  it("requires company name and contact last name", () => {
    expect(apiLeadCreate.safeParse({ company: { name: " " }, contact: { nachname: "B" } }).success).toBe(false);
    expect(apiLeadCreate.safeParse({ company: { name: "A" }, contact: {} }).success).toBe(false);
  });
});

describe("apiCompanyUpdate", () => {
  it("allows clearing fields with null and empty strings, but not empty bodies", () => {
    expect(apiCompanyUpdate.parse({ website: "", notizen: null })).toEqual({ website: null, notizen: null });
    expect(apiCompanyUpdate.safeParse({}).success).toBe(false);
  });
});

describe("apiDealUpdate", () => {
  it("accepts a stage name or id, not both", () => {
    expect(apiDealUpdate.parse({ stage: "Verloren", verlustgrund: "Budget" })).toEqual({ stage: "Verloren", verlustgrund: "Budget" });
    expect(
      apiDealUpdate.safeParse({ stage: "Neu", stage_id: "5b1e4c1e-6a51-4f4e-9d3a-0c1c2e3f4a5b" }).success,
    ).toBe(false);
  });
});

describe("apiActivityCreate", () => {
  it("accepts an e-mail as link and requires some link", () => {
    expect(apiActivityCreate.parse({ typ: "mail", email: "A@B.DE", zeitpunkt: "2026-10-02T09:30:00+02:00" }).email).toBe("a@b.de");
    expect(apiActivityCreate.safeParse({ typ: "mail" }).success).toBe(false);
  });
});

describe("queries", () => {
  it("coerces pagination and maps English invoice statuses", () => {
    expect(apiCompanyQuery.parse({ limit: "10" })).toMatchObject({ limit: 10, offset: 0 });
    expect(apiCompanyQuery.safeParse({ limit: "500" }).success).toBe(false);
    expect(apiInvoiceQuery.parse({ status: "overdue" }).status).toBe("ueberfaellig");
    expect(apiInvoiceQuery.parse({ status: "bezahlt" }).status).toBe("bezahlt");
    expect(apiInvoiceQuery.safeParse({ status: "unknown" }).success).toBe(false);
  });
});
