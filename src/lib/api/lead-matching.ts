import type { Duplicate } from "@/lib/form-state";

export type CompanyMatch = { companyId: string; by: "email" | "domain" } | null;

// An exact e-mail match identifies the company best; otherwise the first domain match.
export function pickCompanyMatch(duplicates: readonly Duplicate[]): CompanyMatch {
  const reasons = (d: Duplicate) => d.grund.split(",");
  const byEmail = duplicates.find((d) => reasons(d).includes("email"));
  if (byEmail) return { companyId: byEmail.company_id, by: "email" };
  const byDomain = duplicates.find((d) => reasons(d).includes("domain"));
  return byDomain ? { companyId: byDomain.company_id, by: "domain" } : null;
}
