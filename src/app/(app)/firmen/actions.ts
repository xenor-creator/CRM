"use server";

import { redirect } from "next/navigation";

import { requireVerifiedSession } from "@/lib/auth/session";
import { removeDeletedFiles } from "@/lib/files/storage-cleanup";
import { failure, type FormState } from "@/lib/form-state";
import { companySchema, firstContactSchema } from "@/lib/validation/company";
import { checkbox, firstIssue } from "@/lib/validation/fields";

const SAVE_ERROR = "Die Firma konnte nicht gespeichert werden. Bitte erneut versuchen.";

function parseCompany(formData: FormData) {
  return companySchema.safeParse(Object.fromEntries(formData));
}

export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const company = parseCompany(formData);
  if (!company.success) {
    return failure(firstIssue(company.error), formData);
  }
  const contact = firstContactSchema.safeParse(Object.fromEntries(formData));
  if (!contact.success) {
    return failure(firstIssue(contact.error), formData);
  }

  const { supabase } = await requireVerifiedSession();

  if (!checkbox.parse(formData.get("duplikat_bestaetigt"))) {
    const { data: duplicates, error } = await supabase.rpc("find_duplicates", {
      p_email: contact.data.kontakt_email ?? undefined,
      p_website: company.data.website ?? undefined,
    });
    if (error) {
      console.error("find_duplicates failed", error);
      return failure(SAVE_ERROR, formData);
    }
    if (duplicates.length > 0) {
      return failure(
        "Mögliche Dublette gefunden. Bitte prüfen oder bewusst trotzdem anlegen.",
        formData,
        { duplicates },
      );
    }
  }

  const { data: created, error } = await supabase
    .from("companies")
    .insert(company.data)
    .select("id")
    .single();
  if (error) {
    console.error("insert company failed", error);
    return failure(SAVE_ERROR, formData);
  }

  if (contact.data.kontakt_nachname) {
    const { error: contactError } = await supabase.from("contacts").insert({
      company_id: created.id,
      vorname: contact.data.kontakt_vorname,
      nachname: contact.data.kontakt_nachname,
      email: contact.data.kontakt_email,
      ist_hauptkontakt: true,
    });
    if (contactError) {
      console.error("insert first contact failed", contactError);
    }
  }

  redirect(`/firmen/${created.id}`);
}

export async function updateCompany(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = parseCompany(formData);
  if (!company.success) {
    return failure(firstIssue(company.error), formData);
  }

  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("companies").update(company.data).eq("id", id);
  if (error) {
    console.error("update company failed", error);
    return failure(SAVE_ERROR, formData);
  }

  redirect(`/firmen/${id}`);
}

// Deletes the company with its contacts, deals, activities, tasks and file records.
// Invoices are kept (retention duty); their company reference is cleared.
export async function deleteCompany(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) {
    console.error("delete company failed", error);
    throw new Error("Die Firma konnte nicht gelöscht werden.");
  }
  await removeDeletedFiles(supabase);
  redirect("/firmen");
}
