import { ownerBackup } from "@/lib/api/backup";
import { withApiKey } from "@/lib/api/context";

export const maxDuration = 60;

// Full JSON backup of the key owner's data, fetched daily by n8n and stored outside Supabase.
export const GET = withApiKey(async (ctx) => {
  const backup = await ownerBackup(ctx.db, ctx.ownerId);
  return new Response(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="crm-backup-${backup.erstellt_am.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
