import { ACTIVITY_COLUMNS } from "@/lib/api/columns";
import { withApiKey } from "@/lib/api/context";
import { apiData, apiError, databaseError, parseBody } from "@/lib/api/http";
import { resolveLinks } from "@/lib/api/links";
import { apiActivityCreate } from "@/lib/validation/api";

// Logs an activity, e.g. a mail sent by n8n. `email` links the contact with that address.
export const POST = withApiKey(async (ctx, request) => {
  const body = await parseBody(request, apiActivityCreate);
  if (!body.ok) return body.response;
  const { email, ...activity } = body.data;

  if (email && !activity.contact_id) {
    const { data: contact } = await ctx.db
      .from("contacts")
      .select("id")
      .eq("owner_id", ctx.ownerId)
      .eq("email", email)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!contact) return apiError(404, `Kein Kontakt mit der E-Mail ${email}.`);
    activity.contact_id = contact.id;
  }

  const links = await resolveLinks(ctx, activity);
  if (!links.ok) return apiError(400, links.error);

  const { data, error } = await ctx.db
    .from("activities")
    .insert({ ...activity, company_id: links.companyId, owner_id: ctx.ownerId })
    .select(ACTIVITY_COLUMNS)
    .single();
  if (error) return databaseError(error, "Die Aktivität konnte nicht angelegt werden.");
  return apiData(data, 201);
});
