import { inactivityCutoff } from "@/lib/dates";
import type { SupabaseServerClient } from "@/lib/supabase/server";

export type Option = { value: string; label: string };

export async function getCompanyOptions(supabase: SupabaseServerClient): Promise<Option[]> {
  const { data } = await supabase.from("companies").select("id, name, kundennummer").order("name");
  return (data ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.kundennummer})` }));
}

export async function getOpenDealOptions(supabase: SupabaseServerClient): Promise<Option[]> {
  const { data } = await supabase
    .from("deals")
    .select("id, titel, companies(name), deal_stages!inner(art)")
    .eq("deal_stages.art", "offen")
    .order("titel");
  return (data ?? []).map((d) => ({
    value: d.id,
    label: d.companies ? `${d.titel} – ${d.companies.name}` : d.titel,
  }));
}

// Last activity per deal older than the inactivity cutoff (14 days), keyed by deal id.
export async function getInactiveDealActivity(
  supabase: SupabaseServerClient,
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("deal_activity_status")
    .select("deal_id, letzte_aktivitaet")
    .lt("letzte_aktivitaet", inactivityCutoff());
  return new Map(
    (data ?? []).flatMap((row) =>
      row.deal_id && row.letzte_aktivitaet ? [[row.deal_id, row.letzte_aktivitaet] as const] : [],
    ),
  );
}

export async function getContactOptions(supabase: SupabaseServerClient) {
  const { data } = await supabase.from("contacts").select("id, vorname, nachname, company_id").order("nachname");
  return (data ?? []).map((c) => ({
    value: c.id,
    label: [c.vorname, c.nachname].filter(Boolean).join(" "),
    companyId: c.company_id,
  }));
}
