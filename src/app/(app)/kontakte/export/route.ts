import { requireVerifiedSession } from "@/lib/auth/session";
import { contactsCsv, csvResponse } from "@/lib/csv-export";

export async function GET() {
  const { supabase } = await requireVerifiedSession();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(name, kundennummer)")
    .order("nachname");
  if (error) {
    console.error("export contacts failed", error);
    return new Response("Export fehlgeschlagen.", { status: 500 });
  }
  return csvResponse(contactsCsv(data), "kontakte");
}
