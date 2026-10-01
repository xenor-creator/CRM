import type { z } from "zod";

import { withApiKey, type ApiContext } from "@/lib/api/context";
import { apiData, apiError, databaseError, parseBody } from "@/lib/api/http";
import { pickCompanyMatch } from "@/lib/api/lead-matching";
import { apiLeadCreate } from "@/lib/validation/api";
import { scheduleWebhookDelivery } from "@/lib/webhooks/dispatcher";

type Lead = z.infer<typeof apiLeadCreate>;
type Outcome = "created" | "matched";

class LeadError extends Error {
  constructor(readonly response: Response) {
    super("lead failed");
  }
}

// Unwraps a Supabase result or aborts the lead with a matching error response.
function check<T>(result: { data: T; error: { code?: string; message: string } | null }, message: string): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new LeadError(result.error ? databaseError(result.error, message) : apiError(500, message));
  }
  return result.data;
}

async function findOrCreateCompany(ctx: ApiContext, lead: Lead) {
  const duplicates = check(
    await ctx.db.rpc("find_duplicates_for_owner", {
      p_owner: ctx.ownerId,
      p_email: lead.contact.email ?? undefined,
      p_website: lead.company.website ?? undefined,
    }),
    "Der Dublettenabgleich ist fehlgeschlagen.",
  );
  const match = pickCompanyMatch(duplicates);
  if (match) {
    const company = check(
      await ctx.db.from("companies").select("id, name, kundennummer").eq("id", match.companyId).eq("owner_id", ctx.ownerId).single(),
      "Die Firma konnte nicht geladen werden.",
    );
    return { company, outcome: "matched" as Outcome, matchedBy: match.by };
  }
  const company = check(
    await ctx.db
      .from("companies")
      .insert({ ...lead.company, owner_id: ctx.ownerId })
      .select("id, name, kundennummer")
      .single(),
    "Die Firma konnte nicht angelegt werden.",
  );
  return { company, outcome: "created" as Outcome, matchedBy: null };
}

async function findOrCreateContact(ctx: ApiContext, companyId: string, lead: Lead) {
  if (lead.contact.email) {
    const { data: existing } = await ctx.db
      .from("contacts")
      .select("id")
      .eq("owner_id", ctx.ownerId)
      .eq("company_id", companyId)
      .eq("email", lead.contact.email)
      .maybeSingle();
    if (existing) return { contact: existing, outcome: "matched" as Outcome };
  }
  const { count } = await ctx.db
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("ist_hauptkontakt", true);
  const contact = check(
    await ctx.db
      .from("contacts")
      .insert({ ...lead.contact, company_id: companyId, owner_id: ctx.ownerId, ist_hauptkontakt: !count })
      .select("id")
      .single(),
    "Der Kontakt konnte nicht angelegt werden.",
  );
  return { contact, outcome: "created" as Outcome };
}

async function findOrCreateDeal(ctx: ApiContext, company: { id: string; name: string }, contactId: string, lead: Lead) {
  const { data: openDeal } = await ctx.db
    .from("deals")
    .select("id, deal_stages!inner(art)")
    .eq("owner_id", ctx.ownerId)
    .eq("company_id", company.id)
    .eq("deal_stages.art", "offen")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openDeal) {
    return { deal: { id: openDeal.id }, outcome: "existing" as const };
  }

  const stage = check(
    await ctx.db
      .from("deal_stages")
      .select("id")
      .eq("owner_id", ctx.ownerId)
      .eq("art", "offen")
      .order("position")
      .limit(1)
      .single(),
    "Es ist keine offene Vertriebsphase angelegt.",
  );
  const deal = check(
    await ctx.db
      .from("deals")
      .insert({
        ...lead.deal,
        titel: lead.deal?.titel ?? `Anfrage ${company.name}`,
        company_id: company.id,
        contact_id: contactId,
        stage_id: stage.id,
        owner_id: ctx.ownerId,
      })
      .select("id")
      .single(),
    "Der Deal konnte nicht angelegt werden.",
  );
  return { deal, outcome: "created" as const };
}

// Creates a lead (company + contact + deal in stage "Neu") with duplicate matching:
// e-mail match reuses company and contact, domain match reuses the company, and an
// existing open deal only gets an activity instead of a second deal.
export const POST = withApiKey(async (ctx, request) => {
  const body = await parseBody(request, apiLeadCreate);
  if (!body.ok) return body.response;
  const lead = body.data;

  try {
    const { company, outcome: companyOutcome, matchedBy } = await findOrCreateCompany(ctx, lead);
    const { contact, outcome: contactOutcome } = await findOrCreateContact(ctx, company.id, lead);
    const { deal, outcome: dealOutcome } = await findOrCreateDeal(ctx, company, contact.id, lead);

    if (dealOutcome === "existing" || lead.notiz) {
      check(
        await ctx.db
          .from("activities")
          .insert({
            owner_id: ctx.ownerId,
            typ: "notiz",
            inhalt: lead.notiz ?? "Neue Anfrage über die API.",
            company_id: company.id,
            contact_id: contact.id,
            deal_id: deal.id,
          })
          .select("id")
          .single(),
        "Die Aktivität konnte nicht angelegt werden.",
      );
    }
    if (dealOutcome === "created") scheduleWebhookDelivery(ctx.ownerId);

    return apiData(
      {
        company: { id: company.id, kundennummer: company.kundennummer, status: companyOutcome, matched_by: matchedBy },
        contact: { id: contact.id, status: contactOutcome },
        deal: { id: deal.id, status: dealOutcome },
      },
      dealOutcome === "created" ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof LeadError) return error.response;
    throw error;
  }
});
