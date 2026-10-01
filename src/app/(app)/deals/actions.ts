"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVerifiedSession } from "@/lib/auth/session";
import { failure, success, type FormState } from "@/lib/form-state";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { dealSchema, stageChangeSchema } from "@/lib/validation/deal";
import { firstIssue } from "@/lib/validation/fields";

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
  const { supabase } = await requireVerifiedSession();
  const result = await changeStage(supabase, id, parsed.data.stage_id, parsed.data.verlustgrund);
  if (result.ok) refresh();
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
  const { supabase } = await requireVerifiedSession();
  const result = await changeStage(supabase, id, parsed.data.stage_id, parsed.data.verlustgrund);
  if (!result.ok) {
    return failure(result.error, formData);
  }
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

  const { supabase } = await requireVerifiedSession();
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
  redirect("/deals");
}
