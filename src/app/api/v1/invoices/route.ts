import { INVOICE_COLUMNS } from "@/lib/api/columns";
import { withApiKey } from "@/lib/api/context";
import { apiList, databaseError, parseQuery } from "@/lib/api/http";
import { pageRange } from "@/lib/api/pagination";
import { apiInvoiceQuery } from "@/lib/validation/api";

// Invoices for n8n workflows, e.g. ?status=overdue for payment reminders.
export const GET = withApiKey(async (ctx, request) => {
  const query = parseQuery(request, apiInvoiceQuery);
  if (!query.ok) return query.response;
  const { status, company_id } = query.data;

  let select = ctx.db
    .from("invoices")
    .select(INVOICE_COLUMNS, { count: "exact" })
    .eq("owner_id", ctx.ownerId)
    .order("faellig_am", { ascending: true, nullsFirst: false })
    .range(...pageRange(query.data));
  if (status) select = select.eq("status", status);
  if (company_id) select = select.eq("company_id", company_id);

  const { data, count, error } = await select;
  if (error) return databaseError(error, "Die Rechnungen konnten nicht geladen werden.");
  return apiList(data, { ...query.data, total: count ?? 0 });
});
