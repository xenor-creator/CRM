import { COMPANY_COLUMNS } from "@/lib/api/columns";
import { withApiKey } from "@/lib/api/context";
import { apiData, apiList, databaseError, parseBody, parseQuery } from "@/lib/api/http";
import { pageRange } from "@/lib/api/pagination";
import { ilikeAny, sanitizeSearchTerm } from "@/lib/search";
import { apiCompanyCreate, apiCompanyQuery } from "@/lib/validation/api";

export const GET = withApiKey(async (ctx, request) => {
  const query = parseQuery(request, apiCompanyQuery);
  if (!query.ok) return query.response;
  const { q, domain, kundennummer, status, updated_since } = query.data;

  let select = ctx.db
    .from("companies")
    .select(COMPANY_COLUMNS, { count: "exact" })
    .eq("owner_id", ctx.ownerId)
    .order("created_at", { ascending: false })
    .range(...pageRange(query.data));
  const term = sanitizeSearchTerm(q);
  if (term) select = select.or(ilikeAny(["name", "kundennummer", "domain", "ort"], term));
  if (domain) select = select.eq("domain", domain.toLowerCase().replace(/^www\./, ""));
  if (kundennummer) select = select.eq("kundennummer", kundennummer.toUpperCase());
  if (status) select = select.eq("status", status);
  if (updated_since) select = select.gte("updated_at", updated_since);

  const { data, count, error } = await select;
  if (error) return databaseError(error, "Die Firmen konnten nicht geladen werden.");
  return apiList(data, { ...query.data, total: count ?? 0 });
});

export const POST = withApiKey(async (ctx, request) => {
  const body = await parseBody(request, apiCompanyCreate);
  if (!body.ok) return body.response;
  const { data, error } = await ctx.db
    .from("companies")
    .insert({ ...body.data, owner_id: ctx.ownerId })
    .select(COMPANY_COLUMNS)
    .single();
  if (error) return databaseError(error, "Die Firma konnte nicht angelegt werden.");
  return apiData(data, 201);
});
