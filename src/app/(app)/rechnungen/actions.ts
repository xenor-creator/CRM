"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { failure, success, type FormState } from "@/lib/form-state";
import { storeInvoiceDocuments } from "@/lib/invoices/documents";
import { projectInvoiceDraft, type ProjectInvoiceKind } from "@/lib/invoices/project-invoice";
import { parseEuroInput } from "@/lib/money";
import { firstIssue, requiredDate } from "@/lib/validation/fields";
import { invoiceDraftSchema } from "@/lib/validation/invoice";
import { scheduleWebhookDelivery } from "@/lib/webhooks/dispatcher";

const kindSchema = z.enum(["rechnung", "abschlagsrechnung", "schlussrechnung"], "Bitte die Rechnungsart wählen.");

function downPaymentInput(formData: FormData): { betrag: number } | { prozent: number } | undefined | string {
  const raw = String(formData.get("abschlag") ?? "").trim();
  if (!raw) return undefined;
  if (raw.endsWith("%")) {
    const percent = Number(raw.slice(0, -1).trim().replace(",", "."));
    return Number.isFinite(percent) && percent > 0 && percent <= 100 ? { prozent: percent } : "Bitte einen Prozentsatz zwischen 0 und 100 angeben.";
  }
  const amount = parseEuroInput(raw);
  return amount.ok ? { betrag: amount.value } : amount.error;
}

export async function createProjectInvoice(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const kind = kindSchema.safeParse(formData.get("art"));
  if (!kind.success) return failure(firstIssue(kind.error), formData);
  const downPayment = downPaymentInput(formData);
  if (typeof downPayment === "string") return failure(downPayment, formData);

  const { supabase } = await requireVerifiedSession();
  const [{ data: project }, { data: prior }, { data: settings }] = await Promise.all([
    supabase.from("projects").select("titel, festpreis, start, company_id").eq("id", projectId).single(),
    supabase.from("invoices").select("id, nummer, datum, art, status, summe_netto, summe_ust, summe_brutto").eq("project_id", projectId),
    supabase.from("settings").select("standard_ust_satz").single(),
  ]);
  if (!project) return failure("Projekt nicht gefunden.", formData);

  const draft = projectInvoiceDraft(project, kind.data as ProjectInvoiceKind, prior ?? [], downPayment);
  if (!draft.ok) return failure(draft.error, formData);

  const today = berlinDate();
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      company_id: project.company_id,
      project_id: projectId,
      art: kind.data,
      positionen: draft.positionen,
      abschlaege: draft.abschlaege,
      ust_satz: settings?.standard_ust_satz ?? 19,
      leistung_von: kind.data === "abschlagsrechnung" ? today : (project.start ?? today),
      leistung_bis: kind.data === "abschlagsrechnung" ? null : today,
    })
    .select("id")
    .single();
  if (error) {
    console.error("insert project invoice failed", error);
    return failure("Der Rechnungsentwurf konnte nicht angelegt werden.", formData);
  }
  redirect(`/rechnungen/${data.id}`);
}

export async function updateInvoiceDraft(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = invoiceDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);

  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("invoices").update(parsed.data).eq("id", id).eq("status", "entwurf");
  if (error) {
    console.error("update invoice draft failed", error);
    return failure(error.code === "23514" ? error.message : "Der Entwurf konnte nicht gespeichert werden.", formData);
  }
  refresh();
  return success();
}

export async function deleteInvoiceDraft(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("status", "entwurf");
  if (error) throw new Error("Der Entwurf konnte nicht gelöscht werden.");
  redirect("/rechnungen");
}

// Assigns the number (database), freezes the invoice, renders PDF/A-3 + ZUGFeRD and stores both.
export async function finalizeInvoice(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireVerifiedSession();
  const { error } = await supabase.rpc("finalize_invoice", { p_invoice: id, p_datum: berlinDate() });
  if (error) {
    return failure(error.code === "23514" ? error.message : "Die Rechnung konnte nicht abgeschlossen werden.", formData);
  }
  try {
    await storeInvoiceDocuments(supabase, id);
  } catch (documentError) {
    // The invoice is final; the PDF is generated on first download instead.
    console.error("invoice documents failed", documentError);
  }
  scheduleWebhookDelivery(userId);
  refresh();
  return success();
}

const paidSchema = z.object({ bezahlt_am: requiredDate("Bitte das Zahlungsdatum angeben.") });

export async function markInvoicePaid(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = paidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);
  const { supabase, userId } = await requireVerifiedSession();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "bezahlt", bezahlt_am: parsed.data.bezahlt_am })
    .eq("id", id)
    .in("status", ["versendet", "ueberfaellig"]);
  if (error) return failure("Die Zahlung konnte nicht gespeichert werden.", formData);
  scheduleWebhookDelivery(userId);
  refresh();
  return success();
}

export async function createCancellation(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { data, error } = await supabase.rpc("create_storno_draft", { p_invoice: id });
  if (error) throw new Error(error.code === "23505" ? "Für diese Rechnung gibt es bereits eine Stornorechnung." : error.message);
  redirect(`/rechnungen/${data.id}`);
}
