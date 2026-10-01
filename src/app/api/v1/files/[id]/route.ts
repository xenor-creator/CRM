import { z } from "zod";

import { withApiKey } from "@/lib/api/context";
import { apiError } from "@/lib/api/http";
import { attachmentDisposition } from "@/lib/files/rules";

export const maxDuration = 60;

const NOT_FOUND = "Datei nicht gefunden.";

// Uploaded file (e.g. for the n8n backup of Storage contents).
export const GET = withApiKey(async (ctx, _request, { params }: RouteContext<"/api/v1/files/[id]">) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(404, NOT_FOUND);
  const { data: file } = await ctx.db.from("files").select("name, pfad, typ").eq("id", id).eq("owner_id", ctx.ownerId).maybeSingle();
  if (!file) return apiError(404, NOT_FOUND);
  const { data, error } = await ctx.db.storage.from("dokumente").download(file.pfad);
  if (error || !data) return apiError(404, NOT_FOUND);
  return new Response(data, {
    headers: {
      "Content-Type": file.typ ?? "application/octet-stream",
      "Content-Disposition": attachmentDisposition(file.name),
      "Cache-Control": "no-store",
    },
  });
});
