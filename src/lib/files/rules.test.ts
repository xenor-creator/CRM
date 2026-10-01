import { describe, expect, it } from "vitest";

import { attachmentDisposition, checkUpload, formatBytes, MAX_FILE_BYTES, storageFileName } from "./rules";

describe("checkUpload", () => {
  it("accepts PDF, images and Office files up to 10 MB and derives the type", () => {
    expect(checkUpload("Vertrag.PDF", 1000)).toEqual({ ok: true, contentType: "application/pdf" });
    expect(checkUpload("Angebot.docx", MAX_FILE_BYTES)).toMatchObject({ ok: true });
    expect(checkUpload("foto.jpeg", 10)).toEqual({ ok: true, contentType: "image/jpeg" });
  });

  it("rejects other types, empty and too large files", () => {
    expect(checkUpload("skript.html", 10)).toMatchObject({ ok: false });
    expect(checkUpload("ohne-endung", 10)).toMatchObject({ ok: false });
    expect(checkUpload("bild.svg", 10)).toMatchObject({ ok: false });
    expect(checkUpload("leer.pdf", 0)).toMatchObject({ ok: false, error: "Die Datei ist leer." });
    expect(checkUpload("gross.pdf", MAX_FILE_BYTES + 1)).toMatchObject({ ok: false, error: "Die Datei ist größer als 10 MB." });
  });
});

describe("storageFileName", () => {
  it("keeps a safe ASCII version of the name", () => {
    expect(storageFileName("Größenplan Müller & Söhne (final).pdf")).toBe("Grossenplan-Muller-Sohne-final.pdf");
    expect(storageFileName("../../etc/passwd.pdf")).toBe("etc-passwd.pdf");
    expect(storageFileName("äöü.png")).toBe("aou.png");
    expect(storageFileName("€€€.pdf")).toBe("datei.pdf");
  });
});

describe("formatBytes", () => {
  it("formats sizes in German", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1,5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });
});

describe("attachmentDisposition", () => {
  it("encodes non-ASCII names", () => {
    expect(attachmentDisposition('Prüfung "A".pdf')).toBe(`attachment; filename="Pr_fung _A_.pdf"; filename*=UTF-8''Pr%C3%BCfung%20%22A%22.pdf`);
  });
});
