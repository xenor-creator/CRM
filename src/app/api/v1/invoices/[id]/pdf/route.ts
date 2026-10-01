import { z } from "zod";

import { ownsRow, withApiKey } from "@/lib/api/context";
import { apiError } from "@/lib/api/http";
import { documentResponse, invoiceDocument } from "@/lib/invoices/documents";

export const maxDuration = 60;

const NOT_FOUND = "Rechnung nicht gefunden oder noch nicht abgeschlossen.";

// PDF/A-3 with embedded ZUGFeRD XML, e.g. to attach it to an e-mail in n8n.
export const GET = withApiKey(async (ctx, _request, { params }: RouteContext<"/api/v1/invoices/[id]/pdf">) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !(await ownsRow(ctx, "invoices", id))) return apiError(404, NOT_FOUND);
  const doc = await invoiceDocument(ctx.db, id, "pdf");
  return doc ? documentResponse(doc, "application/pdf") : apiError(404, NOT_FOUND);
});
