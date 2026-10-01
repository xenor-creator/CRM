import "server-only";

import type { SupabaseServerClient } from "@/lib/supabase/server";

// Art. 15 GDPR: everything stored about one contact, readable without the CRM.
export async function contactDataExport(supabase: SupabaseServerClient, id: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, vorname, nachname, email, telefon, position, linkedin, ist_hauptkontakt, einwilligung_marketing, einwilligung_datum, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!contact) return null;

  const [company, deals, activities, invoices, quotes] = await Promise.all([
    supabase.from("contacts").select("companies(name, kundennummer, strasse, plz, ort, land, website)").eq("id", id).single(),
    supabase.from("deals").select("titel, wert_einmalig, wert_monatlich, created_at, deal_stages(name)").eq("contact_id", id),
    supabase.from("activities").select("typ, inhalt, zeitpunkt").eq("contact_id", id).order("zeitpunkt"),
    contact.email
      ? supabase.from("invoices").select("nummer, art, datum, summe_brutto, status, empfaenger").eq("empfaenger->kontakt->>email", contact.email)
      : Promise.resolve({ data: [] }),
    contact.email
      ? supabase.from("quotes").select("nummer, datum, summe_brutto, status, empfaenger").eq("empfaenger->kontakt->>email", contact.email)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    hinweis:
      "Auskunft nach Art. 15 DSGVO. Rechnungen und Angebote werden wegen gesetzlicher Aufbewahrungspflichten (§ 147 AO, § 257 HGB) aufbewahrt.",
    erstellt_am: new Date().toISOString(),
    kontakt: contact,
    firma: company.data?.companies ?? null,
    deals: (deals.data ?? []).map(({ deal_stages, ...deal }) => ({ ...deal, phase: deal_stages?.name ?? null })),
    aktivitaeten: activities.data ?? [],
    rechnungen: invoices.data ?? [],
    angebote: quotes.data ?? [],
  };
}
