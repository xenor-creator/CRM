import { describe, expect, it } from "vitest";

import { contactSchema } from "./contact";

const companyId = "5b1e4c1e-6a51-4f4e-9d3a-0c1c2e3f4a5b";

describe("contactSchema", () => {
  it("parses checkboxes and normalizes the e-mail", () => {
    const result = contactSchema.parse({
      company_id: companyId,
      nachname: "Muster",
      email: " Max@Beispiel.DE ",
      ist_hauptkontakt: "on",
    });
    expect(result).toMatchObject({
      email: "max@beispiel.de",
      ist_hauptkontakt: true,
      einwilligung_marketing: false,
      vorname: null,
    });
  });

  it("requires company and last name", () => {
    expect(contactSchema.safeParse({ company_id: "", nachname: "Muster" }).success).toBe(false);
    expect(contactSchema.safeParse({ company_id: companyId, nachname: " " }).success).toBe(false);
  });

  it("rejects invalid e-mails", () => {
    const result = contactSchema.safeParse({ company_id: companyId, nachname: "Muster", email: "kein@" });
    expect(result.error?.issues[0]?.message).toBe("Bitte eine gültige E-Mail-Adresse eingeben.");
  });
});
