import { describe, expect, it } from "vitest";

import { projectSchema, retainerSchema, timeEntrySchema } from "./project";

const companyId = "5b1e4c1e-6a51-4f4e-9d3a-0c1c2e3f4a5b";

describe("projectSchema", () => {
  it("parses optional amounts as null", () => {
    expect(projectSchema.parse({ company_id: companyId, titel: "Chatbot", status: "geplant", festpreis: "", interner_stundensatz: "85" })).toMatchObject({
      festpreis: null,
      interner_stundensatz: 85,
      deal_id: null,
    });
  });
});

describe("timeEntrySchema", () => {
  it("converts the duration to minutes", () => {
    expect(timeEntrySchema.parse({ datum: "2026-10-01", dauer: "1:15" })).toMatchObject({ dauer: 75 });
    expect(timeEntrySchema.safeParse({ datum: "2026-10-01", dauer: "viel" }).success).toBe(false);
  });
});

describe("retainerSchema", () => {
  const base = { company_id: companyId, titel: "Betreuung", monatsbetrag: "750", start: "2026-10-01" };
  it("defaults the notice period and allows an open term", () => {
    expect(retainerSchema.parse({ ...base, laufzeit_monate: "", kuendigungsfrist_tage: "" })).toMatchObject({
      monatsbetrag: 750,
      laufzeit_monate: null,
      kuendigungsfrist_tage: 30,
    });
  });
  it("rejects a zero term and missing start", () => {
    expect(retainerSchema.safeParse({ ...base, laufzeit_monate: "0" }).success).toBe(false);
    expect(retainerSchema.safeParse({ ...base, start: "" }).success).toBe(false);
  });
});
