import "server-only";

import type { SupabaseServerClient } from "@/lib/supabase/server";

import { deletionConfirmText } from "./deletion-text";

type Count = PromiseLike<{ count: number | null }>;
const count = async (query: Count) => (await query).count ?? 0;

// What deleting a company removes (database cascades) and what stays for retention duties.
export async function companyDeletionText(supabase: SupabaseServerClient, id: string, name: string): Promise<string> {
  const head = { count: "exact", head: true } as const;
  const [kontakte, deals, projekte, retainer, aktivitaeten, aufgaben, dateien, angebotsentwuerfe, rechnungen, angebote] = await Promise.all([
    count(supabase.from("contacts").select("id", head).eq("company_id", id)),
    count(supabase.from("deals").select("id", head).eq("company_id", id)),
    count(supabase.from("projects").select("id", head).eq("company_id", id)),
    count(supabase.from("retainers").select("id", head).eq("company_id", id)),
    count(supabase.from("activities").select("id", head).eq("company_id", id)),
    count(supabase.from("tasks").select("id", head).eq("company_id", id)),
    count(supabase.from("files").select("id", head).eq("company_id", id)),
    count(supabase.from("quotes").select("id, deals!inner(company_id)", head).eq("deals.company_id", id).eq("status", "entwurf")),
    count(supabase.from("invoices").select("id", head).eq("company_id", id).neq("status", "entwurf")),
    count(supabase.from("quotes").select("id, deals!inner(company_id)", head).eq("deals.company_id", id).neq("status", "entwurf")),
  ]);
  return deletionConfirmText(
    name,
    { kontakte, deals, projekte, retainer, aktivitaeten, aufgaben, dateien, angebotsentwuerfe },
    { rechnungen, angebote },
  );
}

export async function contactDeletionText(
  supabase: SupabaseServerClient,
  contact: { id: string; email: string | null },
  name: string,
): Promise<string> {
  const head = { count: "exact", head: true } as const;
  const [aktivitaeten, deals_ohne_kontakt, rechnungen] = await Promise.all([
    count(supabase.from("activities").select("id", head).eq("contact_id", contact.id)),
    count(supabase.from("deals").select("id", head).eq("contact_id", contact.id)),
    contact.email
      ? count(supabase.from("invoices").select("id", head).eq("empfaenger->kontakt->>email", contact.email))
      : Promise.resolve(0),
  ]);
  return deletionConfirmText(name, { aktivitaeten }, { deals_ohne_kontakt, rechnungen });
}
