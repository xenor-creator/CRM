"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVerifiedSession } from "@/lib/auth/session";
import { berlinDate } from "@/lib/dates";
import { failure, success, type FormState } from "@/lib/form-state";
import { storeQuoteDocument } from "@/lib/invoices/documents";
import type { LineItem } from "@/lib/invoices/line-items";
import { firstIssue } from "@/lib/validation/fields";
import { quoteDraftSchema } from "@/lib/validation/invoice";

// Starting positions from the deal values: one-off fee and monthly fee.
function dealLineItems(deal: { titel: string; wert_einmalig: number; wert_monatlich: number }): LineItem[] {
  const items: LineItem[] = [];
  if (deal.wert_einmalig > 0) items.push({ beschreibung: deal.titel, menge: 1, einheit: "Pauschal", einzelpreis: deal.wert_einmalig });
  if (deal.wert_monatlich > 0)
    items.push({ beschreibung: `${deal.titel} – monatliche Betreuung`, menge: 1, einheit: "Monat", einzelpreis: deal.wert_monatlich });
  return items;
}

export async function createQuoteForDeal(dealId: string) {
  const { supabase } = await requireVerifiedSession();
  const [{ data: deal }, { data: settings }] = await Promise.all([
    supabase.from("deals").select("titel, wert_einmalig, wert_monatlich").eq("id", dealId).single(),
    supabase.from("settings").select("standard_ust_satz").single(),
  ]);
  if (!deal) throw new Error("Deal nicht gefunden.");
  const { data, error } = await supabase
    .from("quotes")
    .insert({ deal_id: dealId, positionen: dealLineItems(deal), ust_satz: settings?.standard_ust_satz ?? 19 })
    .select("id")
    .single();
  if (error) {
    console.error("insert quote failed", error);
    throw new Error("Das Angebot konnte nicht angelegt werden.");
  }
  redirect(`/angebote/${data.id}`);
}

export async function updateQuoteDraft(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = quoteDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(firstIssue(parsed.error), formData);
  if (parsed.data.gueltig_bis && parsed.data.gueltig_bis < berlinDate()) {
    return failure("Das Gültigkeitsdatum liegt in der Vergangenheit.", formData);
  }
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("quotes").update(parsed.data).eq("id", id).eq("status", "entwurf");
  if (error) {
    console.error("update quote draft failed", error);
    return failure(error.code === "23514" ? error.message : "Der Entwurf konnte nicht gespeichert werden.", formData);
  }
  refresh();
  return success();
}

export async function deleteQuoteDraft(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { data } = await supabase.from("quotes").select("deal_id").eq("id", id).single();
  const { error } = await supabase.from("quotes").delete().eq("id", id).eq("status", "entwurf");
  if (error) throw new Error("Der Entwurf konnte nicht gelöscht werden.");
  redirect(data?.deal_id ? `/deals/${data.deal_id}` : "/deals");
}

// Assigns the number (database), freezes the quote and stores the PDF.
export async function finalizeQuote(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.rpc("finalize_quote", { p_quote: id, p_datum: berlinDate() });
  if (error) {
    return failure(error.code === "23514" ? error.message : "Das Angebot konnte nicht abgeschlossen werden.", formData);
  }
  try {
    await storeQuoteDocument(supabase, id);
  } catch (documentError) {
    console.error("quote document failed", documentError);
  }
  refresh();
  return success();
}

const decisionSchema = z.enum(["angenommen", "abgelehnt"]);

export async function setQuoteDecision(id: string, decision: string) {
  const status = decisionSchema.parse(decision);
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id).eq("status", "versendet");
  if (error) throw new Error("Der Status konnte nicht gespeichert werden.");
  refresh();
}
