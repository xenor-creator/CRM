import { TASK_COLUMNS } from "@/lib/api/columns";
import { withApiKey } from "@/lib/api/context";
import { apiData, apiError, databaseError, parseBody } from "@/lib/api/http";
import { resolveLinks } from "@/lib/api/links";
import { apiTaskCreate } from "@/lib/validation/api";

export const POST = withApiKey(async (ctx, request) => {
  const body = await parseBody(request, apiTaskCreate);
  if (!body.ok) return body.response;

  const links = await resolveLinks(ctx, body.data);
  if (!links.ok) return apiError(400, links.error);

  const { data, error } = await ctx.db
    .from("tasks")
    .insert({ ...body.data, company_id: links.companyId, owner_id: ctx.ownerId })
    .select(TASK_COLUMNS)
    .single();
  if (error) return databaseError(error, "Die Aufgabe konnte nicht angelegt werden.");
  return apiData(data, 201);
});
