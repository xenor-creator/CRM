import { requireVerifiedSession } from "@/lib/auth/session";
import { documentResponse, invoiceDocument } from "@/lib/invoices/documents";

export const maxDuration = 60;

export async function GET(_request: Request, { params }: RouteContext<"/rechnungen/[id]/pdf">) {
  const { id } = await params;
  const { supabase } = await requireVerifiedSession();
  const doc = await invoiceDocument(supabase, id, "pdf");
  return doc ? documentResponse(doc, "application/pdf") : new Response("Nicht gefunden.", { status: 404 });
}
