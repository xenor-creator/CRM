import { describe, expect, it } from "vitest";

import { contactDuplicates } from "./duplicates";

const dup = (company_id: string, grund: string) => ({
  company_id,
  company_name: "Firma",
  kundennummer: "K1001",
  grund,
});

describe("contactDuplicates", () => {
  it("ignores a domain match with the contact's own company", () => {
    expect(contactDuplicates([dup("own", "domain")], "own")).toEqual([]);
  });

  it("keeps identical e-mails and matches with other companies", () => {
    expect(contactDuplicates([dup("own", "domain,email")], "own")).toHaveLength(1);
    expect(contactDuplicates([dup("other", "domain")], "own")).toHaveLength(1);
  });
});
