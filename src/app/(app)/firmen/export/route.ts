import { requireVerifiedSession } from "@/lib/auth/session";
import { companiesCsv, csvResponse } from "@/lib/csv-export";

export async function GET() {
  const { supabase } = await requireVerifiedSession();
  const { data, error } = await supabase
    .from("companies")
    .select("*, contacts(vorname, nachname, email, telefon, position, ist_hauptkontakt)")
    .order("kundennummer");
  if (error) {
    console.error("export companies failed", error);
    return new Response("Export fehlgeschlagen.", { status: 500 });
  }
  return csvResponse(companiesCsv(data), "firmen");
}
