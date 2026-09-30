import { describe, expect, it } from "vitest";

import { activitySchema, taskSchema } from "./activity";

const companyId = "5b1e4c1e-6a51-4f4e-9d3a-0c1c2e3f4a5b";

describe("activitySchema", () => {
  it("converts Berlin local time and leaves empty time to the database", () => {
    expect(
      activitySchema.parse({ typ: "anruf", company_id: companyId, zeitpunkt: "2026-07-01T10:00" }),
    ).toMatchObject({ zeitpunkt: "2026-07-01T08:00:00.000Z", inhalt: null, deal_id: null });
    expect(activitySchema.parse({ typ: "notiz", company_id: companyId }).zeitpunkt).toBeUndefined();
  });

  it("requires a link", () => {
    const result = activitySchema.safeParse({ typ: "anruf", company_id: "" });
    expect(result.error?.issues[0]?.message).toBe("Bitte eine Firma oder einen Deal zuordnen.");
  });

  it("rejects unknown types", () => {
    expect(activitySchema.safeParse({ typ: "fax", company_id: companyId }).success).toBe(false);
  });
});

describe("taskSchema", () => {
  it("defaults the priority and accepts unlinked tasks", () => {
    expect(taskSchema.parse({ titel: "Angebot nachfassen" })).toMatchObject({
      prioritaet: "mittel",
      faellig_am: null,
      company_id: null,
    });
  });

  it("validates dates", () => {
    expect(taskSchema.safeParse({ titel: "x", faellig_am: "30.09.2026" }).success).toBe(false);
    expect(taskSchema.parse({ titel: "x", faellig_am: "2026-09-30" }).faellig_am).toBe("2026-09-30");
  });
});
