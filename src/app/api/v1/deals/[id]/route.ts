import { z } from "zod";

import { DEAL_COLUMNS } from "@/lib/api/columns";
import { ownsRow, withApiKey, type ApiContext } from "@/lib/api/context";
import { apiData, apiError, databaseError, parseBody } from "@/lib/api/http";
import { escapeLike } from "@/lib/search";
import { apiDealUpdate } from "@/lib/validation/api";
import { scheduleWebhookDelivery } from "@/lib/webhooks/dispatcher";

type Context = RouteContext<"/api/v1/deals/[id]">;

const NOT_FOUND = "Deal nicht gefunden.";

async function stageIdByName(ctx: ApiContext, name: string): Promise<string | null> {
  const { data } = await ctx.db
    .from("deal_stages")
    .select("id")
    .eq("owner_id", ctx.ownerId)
    .ilike("name", escapeLike(name))
    .maybeSingle();
  return data?.id ?? null;
}

export const GET = withApiKey(async (ctx, _request, { params }: Context) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(404, NOT_FOUND);
  const { data, error } = await ctx.db
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("id", id)
    .eq("owner_id", ctx.ownerId)
    .maybeSingle();
  if (error) return databaseError(error, "Der Deal konnte nicht geladen werden.");
  return data ? apiData(data) : apiError(404, NOT_FOUND);
});

export const PATCH = withApiKey(async (ctx, request, { params }: Context) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(404, NOT_FOUND);
  const body = await parseBody(request, apiDealUpdate);
  if (!body.ok) return body.response;
  const { stage, ...fields } = body.data;

  const update = { ...fields };
  if (stage) {
    const stageId = await stageIdByName(ctx, stage);
    if (!stageId) return apiError(400, `Unbekannte Phase „${stage}“.`);
    update.stage_id = stageId;
  }
  if (update.contact_id && !(await ownsRow(ctx, "contacts", update.contact_id))) {
    return apiError(400, "Unbekannte contact_id.");
  }

  const { data, error } = await ctx.db
    .from("deals")
    .update(update)
    .eq("id", id)
    .eq("owner_id", ctx.ownerId)
    .select(DEAL_COLUMNS)
    .maybeSingle();
  if (error) return databaseError(error, "Der Deal konnte nicht geändert werden.");
  if (!data) return apiError(404, NOT_FOUND);
  if (update.stage_id) scheduleWebhookDelivery(ctx.ownerId);
  return apiData(data);
});
