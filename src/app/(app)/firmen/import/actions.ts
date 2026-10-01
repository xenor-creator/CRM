"use server";

import { refresh } from "next/cache";

import { requireVerifiedSession } from "@/lib/auth/session";
import { parseCompanyImport, type ImportRow } from "@/lib/csv-import";
import { contactName } from "@/lib/names";
import type { SupabaseServerClient } from "@/lib/supabase/server";

export type PreviewRow = {
  line: number;
  name: string | null;
  website: string | null;
  contact: string | null;
  email: string | null;
  error: string | null;
  duplicates: string[];
};

export type PreviewResult = { error: string | null; unknownHeaders: string[]; rows: PreviewRow[] };

export type ImportResult = { error: string | null; imported: number };

const CHECK_CONCURRENCY = 10;

async function existingDuplicates(supabase: SupabaseServerClient, row: ImportRow): Promise<string[]> {
  if (!row.company) return [];
  const { data } = await supabase.rpc("find_duplicates", {
    p_email: row.contact?.email ?? undefined,
    p_website: row.company.website ?? undefined,
  });
  return (data ?? []).map((d) => `${d.company_name} (${d.kundennummer})`);
}

// Earlier lines in the same file with the same company name or contact e-mail.
function duplicatesWithinFile(rows: ImportRow[]): Map<number, string[]> {
  const seen = new Map<string, number>();
  const result = new Map<number, string[]>();
  for (const row of rows) {
    if (!row.company) continue;
    const keys = [`name:${row.company.name.toLowerCase()}`, row.contact?.email && `email:${row.contact.email}`];
    for (const key of keys.filter((k): k is string => Boolean(k))) {
      const earlier = seen.get(key);
      if (earlier !== undefined) {
        result.set(row.line, [...(result.get(row.line) ?? []), `Zeile ${earlier} dieser Datei`]);
      } else {
        seen.set(key, row.line);
      }
    }
  }
  return result;
}

export async function previewImport(text: string): Promise<PreviewResult> {
  const parsed = parseCompanyImport(text);
  if (parsed.error) {
    return { error: parsed.error, unknownHeaders: parsed.unknownHeaders, rows: [] };
  }

  const { supabase } = await requireVerifiedSession();
  const inFile = duplicatesWithinFile(parsed.rows);
  const rows: PreviewRow[] = [];
  for (let i = 0; i < parsed.rows.length; i += CHECK_CONCURRENCY) {
    const chunk = parsed.rows.slice(i, i + CHECK_CONCURRENCY);
    const found = await Promise.all(chunk.map((row) => existingDuplicates(supabase, row)));
    chunk.forEach((row, j) => {
      rows.push({
        line: row.line,
        name: row.company?.name ?? null,
        website: row.company?.website ?? null,
        contact: row.contact ? contactName(row.contact) : null,
        email: row.contact?.email ?? null,
        error: row.error,
        duplicates: [...(found[j] ?? []), ...(inFile.get(row.line) ?? [])],
      });
    });
  }
  return { error: null, unknownHeaders: parsed.unknownHeaders, rows };
}

// Imports the selected lines; invalid lines are skipped even if selected.
export async function importRows(text: string, lines: number[]): Promise<ImportResult> {
  const parsed = parseCompanyImport(text);
  if (parsed.error) {
    return { error: parsed.error, imported: 0 };
  }
  const selected = new Set(lines);
  const rows = parsed.rows.filter((r) => selected.has(r.line) && r.company && !r.error);
  if (rows.length === 0) {
    return { error: "Keine gültigen Zeilen ausgewählt.", imported: 0 };
  }

  const { supabase } = await requireVerifiedSession();
  const { data: companies, error } = await supabase
    .from("companies")
    .insert(rows.map((r) => r.company!))
    .select("id");
  if (error || companies.length !== rows.length) {
    console.error("import companies failed", error);
    return { error: "Der Import ist fehlgeschlagen. Es wurden keine Firmen angelegt.", imported: 0 };
  }

  const contacts = rows.flatMap((row, i) =>
    row.contact ? [{ ...row.contact, company_id: companies[i]!.id, ist_hauptkontakt: true }] : [],
  );
  if (contacts.length > 0) {
    const { error: contactError } = await supabase.from("contacts").insert(contacts);
    if (contactError) {
      console.error("import contacts failed", contactError);
      refresh();
      return {
        error: `${companies.length} Firmen angelegt, die Kontakte konnten aber nicht importiert werden.`,
        imported: companies.length,
      };
    }
  }

  refresh();
  return { error: null, imported: companies.length };
}
