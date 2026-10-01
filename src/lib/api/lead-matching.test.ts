import { describe, expect, it } from "vitest";

import { pickCompanyMatch } from "./lead-matching";

const dup = (company_id: string, grund: string) => ({ company_id, company_name: "F", kundennummer: "K1001", grund });

describe("pickCompanyMatch", () => {
  it("prefers the e-mail match over domain matches", () => {
    expect(pickCompanyMatch([dup("a", "domain"), dup("b", "domain,email")])).toEqual({ companyId: "b", by: "email" });
  });

  it("falls back to the first domain match", () => {
    expect(pickCompanyMatch([dup("a", "domain"), dup("b", "domain")])).toEqual({ companyId: "a", by: "domain" });
  });

  it("returns null without matches", () => {
    expect(pickCompanyMatch([])).toBeNull();
  });
});
