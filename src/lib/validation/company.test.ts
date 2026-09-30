import { describe, expect, it } from "vitest";

import { companySchema, firstContactSchema } from "./company";

const base = { name: "Beispiel GmbH", status: "lead" };

describe("companySchema", () => {
  it("turns empty fields into null and applies defaults", () => {
    const result = companySchema.parse({ ...base, website: "", mitarbeiterzahl: "", land: "" });
    expect(result.website).toBeNull();
    expect(result.mitarbeiterzahl).toBeNull();
    expect(result.land).toBe("DE");
    expect(result.tool_stack).toEqual([]);
    expect(result.automatisierungspotenzial).toBeNull();
  });

  it("parses the tool stack as a unique list", () => {
    const result = companySchema.parse({ ...base, tool_stack: "Make, n8n , ,HubSpot, n8n" });
    expect(result.tool_stack).toEqual(["Make", "n8n", "HubSpot"]);
  });

  it("validates numbers, enums and country codes", () => {
    expect(companySchema.safeParse({ ...base, mitarbeiterzahl: "-3" }).success).toBe(false);
    expect(companySchema.safeParse({ ...base, mitarbeiterzahl: "2,5" }).success).toBe(false);
    expect(companySchema.safeParse({ ...base, status: "partner" }).success).toBe(false);
    expect(companySchema.safeParse({ ...base, land: "Deutschland" }).success).toBe(false);
    expect(companySchema.parse({ ...base, land: "at", mitarbeiterzahl: "12" })).toMatchObject({
      land: "AT",
      mitarbeiterzahl: 12,
    });
  });

  it("requires a name", () => {
    const result = companySchema.safeParse({ ...base, name: "  " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Bitte einen Firmennamen eingeben.");
  });
});

describe("firstContactSchema", () => {
  it("allows omitting the contact entirely", () => {
    expect(firstContactSchema.safeParse({}).success).toBe(true);
  });

  it("requires a last name once any contact field is filled", () => {
    expect(firstContactSchema.safeParse({ kontakt_email: "a@beispiel.de" }).success).toBe(false);
    expect(
      firstContactSchema.parse({ kontakt_nachname: "Muster", kontakt_email: "A@Beispiel.de" }),
    ).toMatchObject({ kontakt_nachname: "Muster", kontakt_email: "a@beispiel.de" });
  });
});
