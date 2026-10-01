"use client";

import { Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { completeFileUpload, prepareFileUpload } from "@/app/(app)/dateien/actions";
import { Button } from "@/components/ui/button";
import { checkUpload, FILE_ACCEPT } from "@/lib/files/rules";
import type { FileLink } from "@/lib/files/links";

// Three steps: signed URL from the server, PUT straight to Storage, then the server checks and records it.
async function uploadFile(link: FileLink, file: File): Promise<string | null> {
  const prepared = await prepareFileUpload(link, file.name, file.size);
  if (!prepared.ok) return prepared.error;
  const response = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": prepared.contentType, "x-upsert": "false" },
    body: file,
  });
  if (!response.ok) return response.status === 413 ? "Die Datei ist größer als 10 MB." : "Der Upload ist fehlgeschlagen.";
  const completed = await completeFileUpload(link, prepared.path, file.name);
  return completed.ok ? null : (completed.error ?? "Die Datei konnte nicht gespeichert werden.");
}

export function FileUpload({ link }: { link: FileLink }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  function onSelect(files: FileList | null) {
    const selected = [...(files ?? [])];
    if (!selected.length) return;
    startTransition(async () => {
      const errors: string[] = [];
      for (const file of selected) {
        const check = checkUpload(file.name, file.size);
        const error = check.ok ? await uploadFile(link, file) : check.error;
        if (error) errors.push(`${file.name}: ${error}`);
      }
      setMessage(errors.length ? { error: true, text: errors.join(" ") } : { error: false, text: "Hochgeladen." });
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="grid gap-2">
      <input
        ref={input}
        type="file"
        multiple
        accept={FILE_ACCEPT}
        className="sr-only"
        aria-label="Dateien auswählen"
        onChange={(e) => onSelect(e.target.files)}
      />
      <div>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
          <Upload />
          {pending ? "Wird hochgeladen …" : "Datei hochladen"}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">PDF, Bilder oder Office-Dokumente, max. 10 MB.</p>
      {message && (
        <p role={message.error ? "alert" : "status"} className={message.error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
