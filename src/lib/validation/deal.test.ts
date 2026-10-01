import { describe, expect, it } from "vitest";

import { dealSchema } from "./deal";

const companyId = "5b1e4c1e-6a51-4f4e-9d3a-0c1c2e3f4a5b";

describe("dealSchema", () => {
  it("parses German amounts and optional fields", () => {
    expect(
      dealSchema.parse({
        company_id: companyId,
        contact_id: "",
        titel: "Rechnungsautomatisierung",
        wert_einmalig: "4.800,00",
        wert_monatlich: "",
        wahrscheinlichkeit: "40",
      }),
    ).toMatchObject({
      contact_id: null,
      wert_einmalig: 4800,
      wert_monatlich: 0,
      wahrscheinlichkeit: 40,
      erwarteter_abschluss: null,
    });
  });

  it("rejects invalid amounts and probabilities", () => {
    const base = { company_id: companyId, titel: "x" };
    expect(dealSchema.safeParse({ ...base, wert_einmalig: "12,345" }).success).toBe(false);
    expect(dealSchema.safeParse({ ...base, wahrscheinlichkeit: "120" }).success).toBe(false);
  });
});
