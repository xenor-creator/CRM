"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireVerifiedSession } from "@/lib/auth/session";
import { checkUpload, storageFileName } from "@/lib/files/rules";
import { FILE_LINK_TABLES, fileLinkColumns, fileLinkSchema, type FileLink } from "@/lib/files/links";
import { removeDeletedFiles } from "@/lib/files/storage-cleanup";

const BUCKET = "dokumente";

export type PreparedUpload = { ok: true; path: string; signedUrl: string; contentType: string } | { ok: false; error: string };

// RLS: the linked company, deal or project must be visible to the user.
async function linkExists(supabase: Awaited<ReturnType<typeof requireVerifiedSession>>["supabase"], link: FileLink) {
  const { data } = await supabase.from(FILE_LINK_TABLES[link.kind]).select("id").eq("id", link.id).maybeSingle();
  return data !== null;
}

// Step 1: signed upload URL for <uid>/dateien/<uuid>/<name>; the browser uploads directly to
// Storage because Vercel functions accept at most 4.5 MB per request.
export async function prepareFileUpload(rawLink: FileLink, name: string, size: number): Promise<PreparedUpload> {
  const link = fileLinkSchema.safeParse(rawLink);
  if (!link.success) return { ok: false, error: "Ungültige Verknüpfung." };
  const check = checkUpload(name, size);
  if (!check.ok) return check;

  const { supabase, userId } = await requireVerifiedSession();
  if (!(await linkExists(supabase, link.data))) return { ok: false, error: "Datensatz nicht gefunden." };
  const path = `${userId}/dateien/${crypto.randomUUID()}/${storageFileName(name)}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) {
    console.error("create signed upload url failed", error);
    return { ok: false, error: "Der Upload konnte nicht vorbereitet werden." };
  }
  return { ok: true, path, signedUrl: data.signedUrl, contentType: check.contentType };
}

const completeSchema = z.object({ path: z.string().min(1), name: z.string().min(1).max(200) });

// Step 2: checks the stored object (size, type) and records it; invalid objects are removed.
export async function completeFileUpload(rawLink: FileLink, path: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const link = fileLinkSchema.safeParse(rawLink);
  const input = completeSchema.safeParse({ path, name });
  if (!link.success || !input.success) return { ok: false, error: "Ungültige Anfrage." };

  const { supabase, userId } = await requireVerifiedSession();
  if (!input.data.path.startsWith(`${userId}/dateien/`)) return { ok: false, error: "Ungültiger Pfad." };
  const { data: info, error: infoError } = await supabase.storage.from(BUCKET).info(input.data.path);
  if (infoError || !info) return { ok: false, error: "Die hochgeladene Datei wurde nicht gefunden." };

  const check = checkUpload(input.data.name, info.size ?? 0);
  if (!check.ok) {
    await supabase.storage.from(BUCKET).remove([input.data.path]);
    return check;
  }
  const { error } = await supabase.from("files").insert({
    ...fileLinkColumns(link.data),
    name: input.data.name,
    pfad: input.data.path,
    typ: check.contentType,
    groesse: info.size,
  });
  if (error) {
    console.error("insert file failed", error);
    await supabase.storage.from(BUCKET).remove([input.data.path]);
    return { ok: false, error: "Die Datei konnte nicht gespeichert werden." };
  }
  refresh();
  return { ok: true };
}

export async function deleteFile(id: string) {
  const { supabase } = await requireVerifiedSession();
  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) throw new Error("Die Datei konnte nicht gelöscht werden.");
  await removeDeletedFiles(supabase);
  refresh();
}
