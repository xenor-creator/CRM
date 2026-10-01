"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVerifiedSession } from "@/lib/auth/session";
import { removeDeletedFiles } from "@/lib/files/storage-cleanup";
import { failure, success, type FormState } from "@/lib/form-state";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { dealSchema, stageChangeSchema } from "@/lib/validation/deal";
import { checkbox, firstIssue } from "@/lib/validation/fields";
import { projectSchema, retainerSchema } from "@/lib/validation/project";
import { scheduleWebhookDelivery } from "@/lib/webhooks/dispatcher";

const SAVE_ERROR = "Der Deal konnte nicht gespeichert werden. Bitte erneut versuchen.";
const LOSS_REASON_REQUIRED = "Beim Wechsel auf „Verloren“ ist ein Verlustgrund Pflicht.";

export type MoveResult = { ok: true } | { ok: false; error: string };

async function changeStage(
  supabase: SupabaseServerClient,
  id: string,
  stageId: string,
  verlustgrund: string | null,
): Promise<MoveResult> {
  const { error } = await supabase
    .from("deals")
    .update({ stage_id: stageId, verlustgrund })
    .eq("id", id);
  if (!error) return { ok: true };
  if (error.code === "23514") return { ok: false, error: LOSS_REASON_REQUIRED };
  console.error("stage change failed", error);
  return { ok: false, error: "Die Phase konnte nicht geändert werden." };
}

// Used by the Kanban board.
export async function moveDeal(
  id: string,
  stageId: string,
  verlustgrund: string | null = null,
): Promise<MoveResult> {
  const parsed = stageChangeSchema.safeParse({ stage_id: stageId, verlustgrund });
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "Unbekannter Deal." };
  }
  const { supabase, userId } = await requireVerifiedSession();
  const result = await changeStage(supabase, id, parsed.data.stage_id, parsed.data.verlustgrund);
  if (result.ok) {
    scheduleWebhookDelivery(userId);
    refresh();
  }
  return result;
}

// Used by the stage form on the deal page.
export async function changeDealStage(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = stageChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure(firstIssue(parsed.error), formData);
  }
  const { supabase, userId } = await requireVerifiedSession();
  const result = await changeStage(supabase, id, parsed.data.stage_id, parsed.data.verlustgrund);
  if (!result.ok) {
    return failure(result.error, formData);
  }
  scheduleWebhookDelivery(userId);
  refresh();
  return success();
}

async function firstStageId(supabase: SupabaseServerClient) {
  const { data } = await supabase
    .from("deal_stages")
    .select("id")
    .eq("art", "offen")
    .order("position")
    .limit(1)
    .single();
  return data?.id;
}

export async function createDeal(_prev: FormState, formData: FormData): Promise<FormState> {
  const deal = dealSchema.safeParse(Object.fromEntries(formData));
  if (!deal.success) {
    return failure(firstIssue(deal.error), formData);
  }

  const { supabase, userId } = await requireVerifiedSession();
  const stageId = await firstStageId(supabase);
  if (!stageId) {
    return failure("Es ist keine offene Vertriebsphase angelegt.", formData);
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({ ...deal.data, stage_id: stageId })
    .select("id")
    .single();
  if (error) {
    console.error("insert deal failed", error);
    return failure(SAVE_ERROR, formData);
  }
  scheduleWebhookDelivery(userId);
  redirect(`/deals/${data.id}`);
}

export async function updateDeal(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const deal = dealSchema.safeParse(Object.fromEntries(formData));
  if (!deal.success) {
    return failure(firstIssue(deal.error), formData);
  }

  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("deals").update(deal.data).eq("id", id);
  if (error) {
    console.error("update deal failed", error);
    return failure(SAVE_ERROR, formData);
  }
  redirect(`/deals/${id}`);
}

export async function deleteDeal(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) {
    console.error("delete deal failed", error);
    throw new Error("Der Deal konnte nicht gelöscht werden.");
  }
  await removeDeletedFiles(supabase);
  redirect("/deals");
}

// Fields of the "won" follow-up form carry a prefix per target (projekt_ / retainer_).
function prefixed(formData: FormData, prefix: string): Record<string, FormDataEntryValue> {
  return Object.fromEntries(
    [...formData.entries()].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]),
  );
}

// Creates a project and/or retainer from a won deal with the values taken over from the deal.
export async function createFromWonDeal(dealId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const wantsProject = checkbox.parse(formData.get("projekt_anlegen"));
  const wantsRetainer = checkbox.parse(formData.get("retainer_anlegen"));
  if (!wantsProject && !wantsRetainer) {
    return failure("Bitte Projekt, Retainer oder beides auswählen.", formData);
  }

  const { supabase } = await requireVerifiedSession();
  const { data: deal } = await supabase.from("deals").select("company_id").eq("id", dealId).single();
  if (!deal) return failure("Deal nicht gefunden.", formData);
  const links = { company_id: deal.company_id, deal_id: dealId };

  const project = wantsProject
    ? projectSchema.safeParse({ ...prefixed(formData, "projekt_"), ...links, status: "geplant" })
    : null;
  if (project && !project.success) return failure(`Projekt: ${firstIssue(project.error)}`, formData);
  const retainer = wantsRetainer ? retainerSchema.safeParse({ ...prefixed(formData, "retainer_"), ...links }) : null;
  if (retainer && !retainer.success) return failure(`Retainer: ${firstIssue(retainer.error)}`, formData);

  let target = `/deals/${dealId}`;
  if (retainer?.success) {
    const { data, error } = await supabase
      .from("retainers")
      .insert({ ...retainer.data, naechste_abrechnung: retainer.data.start })
      .select("id")
      .single();
    if (error) return failure("Der Retainer konnte nicht angelegt werden.", formData);
    target = `/retainer/${data.id}`;
  }
  if (project?.success) {
    const { data, error } = await supabase.from("projects").insert(project.data).select("id").single();
    if (error) return failure("Das Projekt konnte nicht angelegt werden.", formData);
    target = `/projekte/${data.id}`;
  }
  redirect(target);
}
