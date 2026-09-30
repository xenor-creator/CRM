import type { SupabaseServerClient } from "@/lib/supabase/server";

export type Option = { value: string; label: string };

export async function getCompanyOptions(supabase: SupabaseServerClient): Promise<Option[]> {
  const { data } = await supabase.from("companies").select("id, name, kundennummer").order("name");
  return (data ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.kundennummer})` }));
}
