import { requireVerifiedSession } from "@/lib/auth/session";
import { attachmentDisposition } from "@/lib/files/rules";

// Downloads an uploaded file with the user's session (RLS on files and Storage).
export async function GET(_request: Request, { params }: RouteContext<"/dateien/[id]">) {
  const { id } = await params;
  const { supabase } = await requireVerifiedSession();
  const { data: file } = await supabase.from("files").select("name, pfad, typ").eq("id", id).maybeSingle();
  if (!file) return new Response("Nicht gefunden.", { status: 404 });
  const { data, error } = await supabase.storage.from("dokumente").download(file.pfad);
  if (error || !data) return new Response("Die Datei ist nicht verfügbar.", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": file.typ ?? "application/octet-stream",
      "Content-Disposition": attachmentDisposition(file.name),
      "Cache-Control": "private, no-store",
    },
  });
}
