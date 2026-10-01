import "server-only";

import type { ApiContext } from "./context";

export type Links = {
  company_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  project_id?: string | null;
};

type LinkTable = "contacts" | "deals" | "projects";

async function companyOf(ctx: ApiContext, table: LinkTable, id: string): Promise<string | null> {
  const { data } = await ctx.db.from(table).select("company_id").eq("id", id).eq("owner_id", ctx.ownerId).maybeSingle();
  return data?.company_id ?? null;
}

// Verifies that every linked row belongs to the owner and derives the company from the
// deal, project or contact. Returns an error message for unknown links.
export async function resolveLinks(
  ctx: ApiContext,
  links: Links,
): Promise<{ ok: true; companyId: string | null } | { ok: false; error: string }> {
  const lookups: [LinkTable, string | null | undefined, string][] = [
    ["deals", links.deal_id, "deal_id"],
    ["projects", links.project_id, "project_id"],
    ["contacts", links.contact_id, "contact_id"],
  ];
  let companyId: string | null = null;
  for (const [table, id, field] of lookups) {
    if (!id) continue;
    const owner = await companyOf(ctx, table, id);
    if (!owner) return { ok: false, error: `Unbekannte ${field}.` };
    companyId ??= owner;
  }
  if (links.company_id) {
    const { data } = await ctx.db
      .from("companies")
      .select("id")
      .eq("id", links.company_id)
      .eq("owner_id", ctx.ownerId)
      .maybeSingle();
    if (!data) return { ok: false, error: "Unbekannte company_id." };
    companyId ??= data.id;
  }
  return { ok: true, companyId };
}
