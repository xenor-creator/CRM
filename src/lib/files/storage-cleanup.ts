import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const BUCKET = "dokumente";
const BATCH = 500;

// Removes storage objects of deleted file rows (queued by a trigger, because database cascades
// cannot reach Supabase Storage). With the user client RLS limits it to the user's own queue.
export async function purgeDeletedFiles(db: SupabaseClient<Database>): Promise<number> {
  let removed = 0;
  for (;;) {
    const { data: queued, error } = await db.from("storage_deletions").select("id, pfad").limit(BATCH);
    if (error) throw new Error(`load storage deletions failed: ${error.message}`);
    if (!queued.length) return removed;
    const { error: removeError } = await db.storage.from(BUCKET).remove(queued.map((q) => q.pfad));
    if (removeError) throw new Error(`remove storage objects failed: ${removeError.message}`);
    const { error: deleteError } = await db.from("storage_deletions").delete().in("id", queued.map((q) => q.id));
    if (deleteError) throw new Error(`clear storage deletions failed: ${deleteError.message}`);
    removed += queued.length;
    if (queued.length < BATCH) return removed;
  }
}

// After a deletion in the UI: remove storage objects right away; the daily cron retries failures.
export async function removeDeletedFiles(db: SupabaseClient<Database>): Promise<void> {
  await purgeDeletedFiles(db).catch((error: unknown) => console.error("storage cleanup failed", error));
}
