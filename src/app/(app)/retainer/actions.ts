"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { failure, type FormState } from "@/lib/form-state";
import { possibleEndDates } from "@/lib/retainers";
import { firstIssue } from "@/lib/validation/fields";
import { retainerSchema } from "@/lib/validation/project";

const SAVE_ERROR = "Der Retainer konnte nicht gespeichert werden. Bitte erneut versuchen.";

export async function createRetainer(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = retainerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);

  const { supabase } = await requireVerifiedSession();
  const { data, error } = await supabase
    .from("retainers")
    .insert({ ...parsed.data, naechste_abrechnung: parsed.data.start })
    .select("id")
    .single();
  if (error) {
    console.error("insert retainer failed", error);
    return failure(SAVE_ERROR, formData);
  }
  redirect(`/retainer/${data.id}`);
}

export async function updateRetainer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = retainerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);

  const { supabase } = await requireVerifiedSession();
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("retainer_id", id);
  // Before the first invoice the billing schedule follows the (possibly changed) start date.
  const update = count ? parsed.data : { ...parsed.data, naechste_abrechnung: parsed.data.start };
  const { error } = await supabase.from("retainers").update(update).eq("id", id);
  if (error) {
    console.error("update retainer failed", error);
    return failure(SAVE_ERROR, formData);
  }
  redirect(`/retainer/${id}`);
}

// Cancels the retainer to one of the possible end dates (end of a monthly period after notice).
export async function cancelRetainer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const endDate = String(formData.get("gekuendigt_zum") ?? "");
  const { supabase } = await requireVerifiedSession();
  const { data: retainer } = await supabase
    .from("retainers")
    .select("start, laufzeit_monate, kuendigungsfrist_tage")
    .eq("id", id)
    .single();
  if (!retainer || !possibleEndDates(retainer, berlinDate(), 12).includes(endDate)) {
    return failure("Bitte ein gültiges Vertragsende wählen.", formData);
  }
  const { error } = await supabase.from("retainers").update({ status: "gekuendigt", gekuendigt_zum: endDate }).eq("id", id);
  if (error) {
    console.error("cancel retainer failed", error);
    return failure(SAVE_ERROR, formData);
  }
  refresh();
  return { error: null, ok: true };
}

export async function withdrawCancellation(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase
    .from("retainers")
    .update({ status: "aktiv", gekuendigt_zum: null, laufzeitende_gemeldet: null })
    .eq("id", id)
    .eq("status", "gekuendigt");
  if (error) throw new Error("Die Kündigung konnte nicht zurückgenommen werden.");
  refresh();
}

export async function deleteRetainer(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("retainers").delete().eq("id", id);
  if (error) {
    console.error("delete retainer failed", error);
    throw new Error("Der Retainer konnte nicht gelöscht werden.");
  }
  redirect("/retainer");
}
