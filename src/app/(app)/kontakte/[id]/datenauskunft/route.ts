import { requireVerifiedSession } from "@/lib/auth/session";
import { attachmentDisposition } from "@/lib/files/rules";
import { berlinDate } from "@/lib/dates";
import { contactDataExport } from "@/lib/privacy/contact-export";

export async function GET(_request: Request, { params }: RouteContext<"/kontakte/[id]/datenauskunft">) {
  const { id } = await params;
  const { supabase } = await requireVerifiedSession();
  const data = await contactDataExport(supabase, id);
  if (!data) return new Response("Nicht gefunden.", { status: 404 });
  const name = [data.kontakt.vorname, data.kontakt.nachname].filter(Boolean).join("-") || "kontakt";
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": attachmentDisposition(`Datenauskunft-${name}-${berlinDate()}.json`),
      "Cache-Control": "private, no-store",
    },
  });
}
