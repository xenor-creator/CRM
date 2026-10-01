import { z } from "zod";

import { COMPANY_COLUMNS } from "@/lib/api/columns";
import { withApiKey } from "@/lib/api/context";
import { apiData, apiError, databaseError, parseBody } from "@/lib/api/http";
import { apiCompanyUpdate } from "@/lib/validation/api";

type Context = RouteContext<"/api/v1/companies/[id]">;

const NOT_FOUND = "Firma nicht gefunden.";

export const GET = withApiKey(async (ctx, _request, { params }: Context) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(404, NOT_FOUND);
  const { data, error } = await ctx.db
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("id", id)
    .eq("owner_id", ctx.ownerId)
    .maybeSingle();
  if (error) return databaseError(error, "Die Firma konnte nicht geladen werden.");
  return data ? apiData(data) : apiError(404, NOT_FOUND);
});

export const PATCH = withApiKey(async (ctx, request, { params }: Context) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(404, NOT_FOUND);
  const body = await parseBody(request, apiCompanyUpdate);
  if (!body.ok) return body.response;
  const { data, error } = await ctx.db
    .from("companies")
    .update(body.data)
    .eq("id", id)
    .eq("owner_id", ctx.ownerId)
    .select(COMPANY_COLUMNS)
    .maybeSingle();
  if (error) return databaseError(error, "Die Firma konnte nicht geändert werden.");
  return data ? apiData(data) : apiError(404, NOT_FOUND);
});
