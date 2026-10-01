import { requireVerifiedSession } from "@/lib/auth/session";
import { documentResponse, invoiceDocument } from "@/lib/invoices/documents";

export const maxDuration = 60;

export async function GET(_request: Request, { params }: RouteContext<"/rechnungen/[id]/xml">) {
  const { id } = await params;
  const { supabase } = await requireVerifiedSession();
  const doc = await invoiceDocument(supabase, id, "xml");
  return doc ? documentResponse(doc, "application/xml") : new Response("Nicht gefunden.", { status: 404 });
}
