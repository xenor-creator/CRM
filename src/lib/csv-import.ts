import { parseCsv } from "@/lib/csv";
import { companySchema, firstContactSchema, type CompanyInput } from "@/lib/validation/company";
import { firstIssue } from "@/lib/validation/fields";

export const MAX_IMPORT_ROWS = 1000;

type Field =
  | keyof Omit<CompanyInput, "tool_stack">
  | "tool_stack"
  | "kontakt_vorname"
  | "kontakt_nachname"
  | "kontakt_email"
  | "kontakt_telefon"
  | "kontakt_position"
  | "ignore";

// Normalized header -> field. Matches the export headers and common German variants.
const HEADER_FIELDS: Record<string, Field> = {
  firma: "name",
  firmenname: "name",
  name: "name",
  unternehmen: "name",
  website: "website",
  webseite: "website",
  domain: "website",
  branche: "branche",
  groesse: "groesse",
  mitarbeiterzahl: "mitarbeiterzahl",
  mitarbeiter: "mitarbeiterzahl",
  strasse: "strasse",
  adresse: "strasse",
  plz: "plz",
  postleitzahl: "plz",
  ort: "ort",
  stadt: "ort",
  land: "land",
  ustidnr: "ust_id",
  ustid: "ust_id",
  tools: "tool_stack",
  toolstack: "tool_stack",
  genutztetools: "tool_stack",
  potenzial: "automatisierungspotenzial",
  automatisierungspotenzial: "automatisierungspotenzial",
  schmerzpunkte: "schmerzpunkte",
  notizen: "notizen",
  status: "status",
  vorname: "kontakt_vorname",
  nachname: "kontakt_nachname",
  email: "kontakt_email",
  mail: "kontakt_email",
  telefon: "kontakt_telefon",
  tel: "kontakt_telefon",
  position: "kontakt_position",
  kundennummer: "ignore",
};

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

export type ImportRow = {
  line: number;
  company: CompanyInput | null;
  contact: { vorname: string | null; nachname: string; email: string | null; telefon: string | null; position: string | null } | null;
  error: string | null;
};

export type ParsedImport = { rows: ImportRow[]; unknownHeaders: string[]; error: string | null };

const lower = (value: string | undefined) => value?.trim().toLowerCase() ?? "";

function validateRecord(record: Partial<Record<Field, string>>, line: number): ImportRow {
  const company = companySchema.safeParse({
    ...record,
    status: lower(record.status) || "lead",
    automatisierungspotenzial: lower(record.automatisierungspotenzial),
  });
  if (!company.success) {
    return { line, company: null, contact: null, error: firstIssue(company.error) };
  }

  const contact = firstContactSchema.safeParse(record);
  if (!contact.success) {
    return { line, company: company.data, contact: null, error: firstIssue(contact.error) };
  }

  const { kontakt_vorname, kontakt_nachname, kontakt_email } = contact.data;
  return {
    line,
    company: company.data,
    contact: kontakt_nachname
      ? {
          vorname: kontakt_vorname,
          nachname: kontakt_nachname,
          email: kontakt_email,
          telefon: record.kontakt_telefon?.trim() || null,
          position: record.kontakt_position?.trim() || null,
        }
      : null,
    error: null,
  };
}

// Parses a CSV with one company (and optionally its main contact) per line.
export function parseCompanyImport(text: string): ParsedImport {
  const [header, ...lines] = parseCsv(text);
  if (!header) {
    return { rows: [], unknownHeaders: [], error: "Die Datei ist leer." };
  }

  const fields = header.map((h) => HEADER_FIELDS[normalizeHeader(h)]);
  const unknownHeaders = header.filter((_, i) => !fields[i]);
  if (!fields.includes("name")) {
    return { rows: [], unknownHeaders, error: "Die Spalte „Firma“ fehlt in der ersten Zeile." };
  }
  if (lines.length > MAX_IMPORT_ROWS) {
    return { rows: [], unknownHeaders, error: `Höchstens ${MAX_IMPORT_ROWS} Zeilen pro Import.` };
  }

  const rows = lines.map((cells, index) => {
    const record: Partial<Record<Field, string>> = {};
    fields.forEach((field, i) => {
      if (field && field !== "ignore") record[field] = cells[i] ?? "";
    });
    return validateRecord(record, index + 2);
  });
  return { rows, unknownHeaders, error: null };
}
