import { z } from "zod";

import { CONTACT_COLUMNS } from "@/lib/api/columns";
import { ownsRow, withApiKey } from "@/lib/api/context";
import { apiData, apiError, databaseError, parseBody } from "@/lib/api/http";
import { apiContactUpdate } from "@/lib/validation/api";

type Context = RouteContext<"/api/v1/contacts/[id]">;

const NOT_FOUND = "Kontakt nicht gefunden.";

export const GET = withApiKey(async (ctx, _request, { params }: Context) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(404, NOT_FOUND);
  const { data, error } = await ctx.db
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", id)
    .eq("owner_id", ctx.ownerId)
    .maybeSingle();
  if (error) return databaseError(error, "Der Kontakt konnte nicht geladen werden.");
  return data ? apiData(data) : apiError(404, NOT_FOUND);
});

export const PATCH = withApiKey(async (ctx, request, { params }: Context) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(404, NOT_FOUND);
  const body = await parseBody(request, apiContactUpdate);
  if (!body.ok) return body.response;
  if (body.data.company_id && !(await ownsRow(ctx, "companies", body.data.company_id))) {
    return apiError(400, "Unbekannte company_id.");
  }
  const { data, error } = await ctx.db
    .from("contacts")
    .update(body.data)
    .eq("id", id)
    .eq("owner_id", ctx.ownerId)
    .select(CONTACT_COLUMNS)
    .maybeSingle();
  if (error) return databaseError(error, "Der Kontakt konnte nicht geändert werden.");
  return data ? apiData(data) : apiError(404, NOT_FOUND);
});
