import "server-only";

import type { ServiceClient } from "@/lib/supabase/service";

// Tables in restore order (parents first). Secrets (webhook secret, API key hashes) and the
// webhook log are not part of the backup.
const TABLES = [
  "settings",
  "deal_stages",
  "number_counters",
  "companies",
  "contacts",
  "deals",
  "projects",
  "time_entries",
  "retainers",
  "activities",
  "tasks",
  "files",
  "quotes",
  "invoices",
] as const;

type Table = (typeof TABLES)[number];

const PAGE = 1000;
const OMIT: Partial<Record<Table, string[]>> = { settings: ["webhook_secret"] };

async function allRows(db: ServiceClient, table: Table, ownerId: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .eq("owner_id", ownerId)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`export ${table} failed: ${error.message}`);
    const omit = OMIT[table] ?? [];
    rows.push(...(data as Record<string, unknown>[]).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !omit.includes(key)))));
    if (data.length < PAGE) return rows;
  }
}

export async function ownerBackup(db: ServiceClient, ownerId: string) {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const table of TABLES) tables[table] = await allRows(db, table, ownerId);
  return {
    format: "agentur-crm-backup",
    version: 1,
    erstellt_am: new Date().toISOString(),
    hinweis:
      "Dateiinhalte liegen in Supabase Storage: hochgeladene Dateien über GET /api/v1/files/{id}, Rechnungs-PDFs über GET /api/v1/invoices/{id}/pdf.",
    tables,
  };
}
