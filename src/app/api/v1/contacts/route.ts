import { CONTACT_COLUMNS } from "@/lib/api/columns";
import { ownsRow, withApiKey } from "@/lib/api/context";
import { apiData, apiError, apiList, databaseError, parseBody, parseQuery } from "@/lib/api/http";
import { pageRange } from "@/lib/api/pagination";
import { apiContactCreate, apiContactQuery } from "@/lib/validation/api";

export const GET = withApiKey(async (ctx, request) => {
  const query = parseQuery(request, apiContactQuery);
  if (!query.ok) return query.response;
  const { email, company_id, updated_since } = query.data;

  let select = ctx.db
    .from("contacts")
    .select(CONTACT_COLUMNS, { count: "exact" })
    .eq("owner_id", ctx.ownerId)
    .order("created_at", { ascending: false })
    .range(...pageRange(query.data));
  if (email) select = select.eq("email", email);
  if (company_id) select = select.eq("company_id", company_id);
  if (updated_since) select = select.gte("updated_at", updated_since);

  const { data, count, error } = await select;
  if (error) return databaseError(error, "Die Kontakte konnten nicht geladen werden.");
  return apiList(data, { ...query.data, total: count ?? 0 });
});

export const POST = withApiKey(async (ctx, request) => {
  const body = await parseBody(request, apiContactCreate);
  if (!body.ok) return body.response;
  if (!(await ownsRow(ctx, "companies", body.data.company_id))) {
    return apiError(400, "Unbekannte company_id.");
  }
  const { data, error } = await ctx.db
    .from("contacts")
    .insert({ ...body.data, owner_id: ctx.ownerId })
    .select(CONTACT_COLUMNS)
    .single();
  if (error) return databaseError(error, "Der Kontakt konnte nicht angelegt werden.");
  return apiData(data, 201);
});
