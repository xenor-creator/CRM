import { DEAL_COLUMNS } from "@/lib/api/columns";
import { escapeLike } from "@/lib/search";
import { withApiKey } from "@/lib/api/context";
import { apiList, databaseError, parseQuery } from "@/lib/api/http";
import { pageRange } from "@/lib/api/pagination";
import { apiDealQuery } from "@/lib/validation/api";

export const GET = withApiKey(async (ctx, request) => {
  const query = parseQuery(request, apiDealQuery);
  if (!query.ok) return query.response;
  const { status, stage, company_id, updated_since } = query.data;

  let select = ctx.db
    .from("deals")
    .select(DEAL_COLUMNS, { count: "exact" })
    .eq("owner_id", ctx.ownerId)
    .order("created_at", { ascending: false })
    .range(...pageRange(query.data));
  if (status) select = select.eq("stage.art", status);
  if (stage) select = select.ilike("stage.name", escapeLike(stage));
  if (company_id) select = select.eq("company_id", company_id);
  if (updated_since) select = select.gte("updated_at", updated_since);

  const { data, count, error } = await select;
  if (error) return databaseError(error, "Die Deals konnten nicht geladen werden.");
  return apiList(data, { ...query.data, total: count ?? 0 });
});
