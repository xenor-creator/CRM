"use server";

import { redirect } from "next/navigation";

import { requireVerifiedSession } from "@/lib/auth/session";
import { removeDeletedFiles } from "@/lib/files/storage-cleanup";
import { contactDuplicates } from "@/lib/duplicates";
import { failure, type FormState } from "@/lib/form-state";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { checkbox, firstIssue } from "@/lib/validation/fields";

const SAVE_ERROR = "Der Kontakt konnte nicht gespeichert werden. Bitte erneut versuchen.";

async function checkDuplicates(
  supabase: SupabaseServerClient,
  contact: ContactInput,
  formData: FormData,
): Promise<FormState | null> {
  if (!contact.email || checkbox.parse(formData.get("duplikat_bestaetigt"))) {
    return null;
  }
  const { data, error } = await supabase.rpc("find_duplicates", { p_email: contact.email });
  if (error) {
    console.error("find_duplicates failed", error);
    return failure(SAVE_ERROR, formData);
  }
  const duplicates = contactDuplicates(data, contact.company_id);
  return duplicates.length > 0
    ? failure("Mögliche Dublette gefunden. Bitte prüfen oder bewusst trotzdem speichern.", formData, {
        duplicates,
      })
    : null;
}

export async function createContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const contact = contactSchema.safeParse(Object.fromEntries(formData));
  if (!contact.success) {
    return failure(firstIssue(contact.error), formData);
  }

  const { supabase } = await requireVerifiedSession();
  const duplicateState = await checkDuplicates(supabase, contact.data, formData);
  if (duplicateState) {
    return duplicateState;
  }

  const { data, error } = await supabase.from("contacts").insert(contact.data).select("id").single();
  if (error) {
    console.error("insert contact failed", error);
    return failure(SAVE_ERROR, formData);
  }
  redirect(`/kontakte/${data.id}`);
}

export async function updateContact(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const contact = contactSchema.safeParse(Object.fromEntries(formData));
  if (!contact.success) {
    return failure(firstIssue(contact.error), formData);
  }

  const { supabase } = await requireVerifiedSession();
  const { data: current } = await supabase.from("contacts").select("email").eq("id", id).maybeSingle();
  if (current?.email !== contact.data.email) {
    const duplicateState = await checkDuplicates(supabase, contact.data, formData);
    if (duplicateState) {
      return duplicateState;
    }
  }

  const { error } = await supabase.from("contacts").update(contact.data).eq("id", id);
  if (error) {
    console.error("update contact failed", error);
    return failure(SAVE_ERROR, formData);
  }
  redirect(`/kontakte/${id}`);
}

// Deletes the contact and its activities; deals keep existing without contact.
export async function deleteContact(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { data, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .select("company_id")
    .single();
  if (error) {
    console.error("delete contact failed", error);
    throw new Error("Der Kontakt konnte nicht gelöscht werden.");
  }
  await removeDeletedFiles(supabase);
  redirect(`/firmen/${data.company_id}`);
}
