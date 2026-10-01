import { secretsMatch } from "@/lib/api/secret";
import { berlinDate } from "@/lib/dates";
import { getServerEnv } from "@/lib/env.server";
import { runRetainerBilling } from "@/lib/billing/retainer-billing";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatchDueWebhooks } from "@/lib/webhooks/dispatcher";

export const maxDuration = 300;

const MAX_BATCHES = 20;

// Daily job (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"): marks overdue invoices,
// creates retainer invoice drafts and deadline notices, queues task.overdue and delivers every
// due webhook, including retries left over from earlier requests.
export async function GET(request: Request) {
  const presented = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secretsMatch(presented, getServerEnv().CRON_SECRET)) {
    return Response.json({ error: { message: "Nicht autorisiert." } }, { status: 401 });
  }

  const db = createServiceClient();
  const today = berlinDate();
  const { data: overdueInvoices, error: overdueError } = await db.rpc("mark_overdue_invoices", { p_today: today });
  if (overdueError) {
    console.error("mark_overdue_invoices failed", overdueError);
    return Response.json({ error: { message: "Überfällige Rechnungen konnten nicht geprüft werden." } }, { status: 500 });
  }
  const retainers = await runRetainerBilling(db, today);
  const { data: overdueTasks, error } = await db.rpc("enqueue_overdue_task_webhooks", { p_today: today });
  if (error) {
    console.error("enqueue_overdue_task_webhooks failed", error);
    return Response.json({ error: { message: "Überfällige Aufgaben konnten nicht geprüft werden." } }, { status: 500 });
  }

  let attempts = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const sent = await dispatchDueWebhooks(db);
    attempts += sent;
    if (sent === 0) break;
  }

  return Response.json({
    overdue_invoices: overdueInvoices,
    retainer_drafts: retainers.drafts,
    retainers_ended: retainers.ended,
    retainer_notices: retainers.notices,
    overdue_tasks_queued: overdueTasks,
    webhook_attempts: attempts,
  });
}
