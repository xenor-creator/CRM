"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { importRows, previewImport, type ImportResult, type PreviewResult } from "./actions";

// Server Actions accept request bodies up to 1 MB.
const MAX_FILE_BYTES = 900 * 1024;

// Excel often saves CSV as Windows-1252; fall back to it when the file is not valid UTF-8.
function decode(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function ImportWizard() {
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setResult(null);
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Die Datei ist größer als 900 KB. Bitte in mehrere Dateien aufteilen.");
      return;
    }
    const content = decode(await file.arrayBuffer());
    setText(content);
    startTransition(async () => {
      const next = await previewImport(content);
      setPreview(next);
      setSelected(new Set(next.rows.filter((r) => !r.error && r.duplicates.length === 0).map((r) => r.line)));
    });
  };

  const toggle = (line: number, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(line);
      else next.delete(line);
      return next;
    });

  const runImport = () => {
    if (!text) return;
    startTransition(async () => setResult(await importRows(text, [...selected])));
  };

  if (result && !result.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{result.imported} Firmen importiert</CardTitle>
          <CardDescription>Kundennummern wurden automatisch vergeben.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/firmen">Zu den Firmen</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const errorCount = preview?.rows.filter((r) => r.error).length ?? 0;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>CSV-Datei wählen</CardTitle>
          <CardDescription>
            Eine Zeile pro Firma, optional mit Hauptkontakt. Erkannte Spalten: Firma, Website, Branche, Größe,
            Mitarbeiterzahl, Straße, PLZ, Ort, Land, USt-IdNr., Tools, Potenzial, Schmerzpunkte, Notizen, Status,
            Vorname, Nachname, E-Mail, Telefon, Position. Der Firmen-Export hat genau dieses Format.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Label htmlFor="csv-file">Datei</Label>
          <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
          {pending && !preview && <p className="text-muted-foreground text-sm">Datei wird geprüft …</p>}
          {(fileError ?? preview?.error) && (
            <p role="alert" className="text-destructive text-sm">
              {fileError ?? preview?.error}
            </p>
          )}
        </CardContent>
      </Card>

      {preview && !preview.error && (
        <Card>
          <CardHeader>
            <CardTitle>Vorschau</CardTitle>
            <CardDescription>
              {preview.rows.length} Zeilen, {errorCount} mit Fehlern. Mögliche Dubletten sind nicht vorausgewählt.
              {preview.unknownHeaders.length > 0 && <> Ignorierte Spalten: {preview.unknownHeaders.join(", ")}.</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Importieren</span>
                  </TableHead>
                  <TableHead>Zeile</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Hinweis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row) => (
                  <TableRow key={row.line}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Zeile ${row.line} importieren`}
                        checked={selected.has(row.line)}
                        disabled={Boolean(row.error)}
                        onChange={(e) => toggle(row.line, e.target.checked)}
                        className="accent-primary size-4"
                      />
                    </TableCell>
                    <TableCell>{row.line}</TableCell>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.website && <span className="text-muted-foreground block text-xs">{row.website}</span>}
                    </TableCell>
                    <TableCell>
                      {row.contact}
                      {row.email && <span className="text-muted-foreground block text-xs">{row.email}</span>}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {row.error ? (
                        <span className="text-destructive text-xs">{row.error}</span>
                      ) : row.duplicates.length > 0 ? (
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          Mögliche Dublette: {row.duplicates.join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runImport} disabled={pending || selected.size === 0}>
                {pending ? "Importiere …" : `${selected.size} Firmen importieren`}
              </Button>
              {result?.error && (
                <p role="alert" className="text-destructive text-sm">
                  {result.error}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
