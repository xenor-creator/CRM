import { secretsMatch } from "@/lib/api/secret";
import { berlinDate } from "@/lib/dates";
import { getServerEnv } from "@/lib/env.server";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatchDueWebhooks } from "@/lib/webhooks/dispatcher";

export const maxDuration = 300;

const MAX_BATCHES = 20;

// Daily job (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"): queues task.overdue
// and delivers every due webhook, including retries left over from earlier requests.
export async function GET(request: Request) {
  const presented = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secretsMatch(presented, getServerEnv().CRON_SECRET)) {
    return Response.json({ error: { message: "Nicht autorisiert." } }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: overdueTasks, error } = await db.rpc("enqueue_overdue_task_webhooks", { p_today: berlinDate() });
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

  return Response.json({ overdue_tasks_queued: overdueTasks, webhook_attempts: attempts });
}
