import type { Duplicate } from "@/lib/form-state";

// Duplicates relevant for a contact at `companyId`: an existing identical e-mail always,
// a domain match only when it points to another company.
export function contactDuplicates(duplicates: readonly Duplicate[], companyId: string): Duplicate[] {
  return duplicates.filter(
    (d) => d.grund.split(",").includes("email") || d.company_id !== companyId,
  );
}
