"use server";

import { refresh } from "next/cache";

import { requireVerifiedSession } from "@/lib/auth/session";
import { failure, success, type FormState } from "@/lib/form-state";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { activitySchema, taskSchema } from "@/lib/validation/activity";
import { firstIssue } from "@/lib/validation/fields";

type Links = {
  company_id: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  project_id?: string | null;
};

// The company of a linked deal, contact or project wins, so every entry shows up
// in the company timeline.
async function resolveCompanyId(supabase: SupabaseServerClient, links: Links) {
  const lookups = [
    ["deals", links.deal_id],
    ["projects", links.project_id],
    ["contacts", links.contact_id],
  ] as const;
  for (const [table, id] of lookups) {
    if (id) {
      const { data } = await supabase.from(table).select("company_id").eq("id", id).maybeSingle();
      if (data) return data.company_id;
    }
  }
  return links.company_id;
}

export async function createActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure(firstIssue(parsed.error), formData);
  }

  const { supabase } = await requireVerifiedSession();
  const company_id = await resolveCompanyId(supabase, parsed.data);
  const { error } = await supabase.from("activities").insert({ ...parsed.data, company_id });
  if (error) {
    console.error("insert activity failed", error);
    return failure("Die Aktivität konnte nicht gespeichert werden.", formData);
  }

  refresh();
  return success();
}

export async function deleteActivity(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) {
    console.error("delete activity failed", error);
    throw new Error("Die Aktivität konnte nicht gelöscht werden.");
  }
  refresh();
}

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure(firstIssue(parsed.error), formData);
  }

  const { supabase } = await requireVerifiedSession();
  const company_id = await resolveCompanyId(supabase, parsed.data);
  const { error } = await supabase.from("tasks").insert({ ...parsed.data, company_id });
  if (error) {
    console.error("insert task failed", error);
    return failure("Die Aufgabe konnte nicht gespeichert werden.", formData);
  }

  refresh();
  return success();
}

export async function setTaskDone(id: string, erledigt: boolean) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("tasks").update({ erledigt }).eq("id", id);
  if (error) {
    console.error("update task failed", error);
    throw new Error("Die Aufgabe konnte nicht aktualisiert werden.");
  }
  refresh();
}

export async function deleteTask(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    console.error("delete task failed", error);
    throw new Error("Die Aufgabe konnte nicht gelöscht werden.");
  }
  refresh();
}
