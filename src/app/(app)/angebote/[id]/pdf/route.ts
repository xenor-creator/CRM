import { requireVerifiedSession } from "@/lib/auth/session";
import { documentResponse, quoteDocument } from "@/lib/invoices/documents";

export const maxDuration = 60;

export async function GET(_request: Request, { params }: RouteContext<"/angebote/[id]/pdf">) {
  const { id } = await params;
  const { supabase } = await requireVerifiedSession();
  const doc = await quoteDocument(supabase, id);
  return doc ? documentResponse(doc, "application/pdf") : new Response("Nicht gefunden.", { status: 404 });
}
