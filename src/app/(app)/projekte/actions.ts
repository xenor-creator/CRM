"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireVerifiedSession } from "@/lib/auth/session";
import { removeDeletedFiles } from "@/lib/files/storage-cleanup";
import { berlinDate } from "@/lib/dates";
import { failure, success, type FormState } from "@/lib/form-state";
import { timerMinutes } from "@/lib/projects";
import { firstIssue } from "@/lib/validation/fields";
import { projectSchema, timeEntrySchema } from "@/lib/validation/project";

const SAVE_ERROR = "Das Projekt konnte nicht gespeichert werden. Bitte erneut versuchen.";

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);

  const { supabase } = await requireVerifiedSession();
  const { data, error } = await supabase.from("projects").insert(parsed.data).select("id").single();
  if (error) {
    console.error("insert project failed", error);
    return failure(SAVE_ERROR, formData);
  }
  redirect(`/projekte/${data.id}`);
}

export async function updateProject(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);

  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("projects").update(parsed.data).eq("id", id);
  if (error) {
    console.error("update project failed", error);
    return failure(SAVE_ERROR, formData);
  }
  redirect(`/projekte/${id}`);
}

export async function deleteProject(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    console.error("delete project failed", error);
    throw new Error("Das Projekt konnte nicht gelöscht werden.");
  }
  await removeDeletedFiles(supabase);
  redirect("/projekte");
}

export async function startTimer(projectId: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase
    .from("projects")
    .update({ timer_gestartet_am: new Date().toISOString() })
    .eq("id", projectId)
    .is("timer_gestartet_am", null);
  if (error) throw new Error("Der Timer konnte nicht gestartet werden.");
  refresh();
}

// Stops the timer and books the elapsed time (rounded up to full minutes) for today.
export async function stopTimer(projectId: string, beschreibung: string) {
  const { supabase } = await requireVerifiedSession();
  const { data: project } = await supabase
    .from("projects")
    .select("timer_gestartet_am")
    .eq("id", projectId)
    .single();
  if (!project?.timer_gestartet_am) return;

  const { error: entryError } = await supabase.from("time_entries").insert({
    project_id: projectId,
    datum: berlinDate(new Date(project.timer_gestartet_am)),
    minuten: timerMinutes(project.timer_gestartet_am),
    beschreibung: beschreibung.trim() || null,
  });
  if (entryError) throw new Error("Die Zeit konnte nicht gebucht werden.");
  await supabase.from("projects").update({ timer_gestartet_am: null }).eq("id", projectId);
  refresh();
}

export async function addTimeEntry(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = timeEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);

  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("time_entries").insert({
    project_id: projectId,
    datum: parsed.data.datum,
    minuten: parsed.data.dauer,
    beschreibung: parsed.data.beschreibung,
  });
  if (error) {
    console.error("insert time entry failed", error);
    return failure("Die Zeit konnte nicht gespeichert werden.", formData);
  }
  refresh();
  return success();
}

export async function deleteTimeEntry(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) throw new Error("Der Zeiteintrag konnte nicht gelöscht werden.");
  refresh();
}
