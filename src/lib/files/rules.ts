export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Allowed uploads: PDF, images and Office documents, by extension with their MIME type.
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
  ppt: "application/vnd.ms-powerpoint",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
};

export const FILE_ACCEPT = Object.keys(ALLOWED_FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export type UploadCheck = { ok: true; contentType: string } | { ok: false; error: string };

// The MIME type is derived from the extension; browsers report Office types inconsistently.
export function checkUpload(name: string, size: number): UploadCheck {
  const contentType = ALLOWED_FILE_TYPES[extension(name)];
  if (!name.trim() || name.length > 200) return { ok: false, error: "Ungültiger Dateiname (max. 200 Zeichen)." };
  if (!contentType) return { ok: false, error: "Erlaubt sind PDF, Bilder (PNG, JPG, WebP) und Office-Dokumente." };
  if (size <= 0) return { ok: false, error: "Die Datei ist leer." };
  if (size > MAX_FILE_BYTES) return { ok: false, error: "Die Datei ist größer als 10 MB." };
  return { ok: true, contentType };
}

// Storage keys allow only a safe subset of characters; the original name is kept in the database.
export function storageFileName(name: string): string {
  const ext = extension(name);
  const base = name
    .slice(0, name.length - ext.length - 1)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "datei"}.${ext}`;
}

const SIZE = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${SIZE.format(bytes / 1024)} KB`;
  return `${SIZE.format(bytes / 1024 / 1024)} MB`;
}

// RFC 6266 header so umlauts in file names survive the download.
export function attachmentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
