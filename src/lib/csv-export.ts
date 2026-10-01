import { toCsv } from "@/lib/csv";
import { berlinDate } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import { companyStatusLabels, potenzialLabels } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

type ContactColumns = Pick<
  Tables<"contacts">,
  "vorname" | "nachname" | "email" | "telefon" | "position" | "ist_hauptkontakt"
>;

export type CompanyExportRow = Tables<"companies"> & { contacts: ContactColumns[] };

export type ContactExportRow = Tables<"contacts"> & {
  companies: { name: string; kundennummer: string } | null;
};

const text = (value: string | number | null) => (value === null ? "" : String(value));
const yesNo = (value: boolean) => (value ? "ja" : "nein");

// Headers match the import mapping, so an exported file can be re-imported.
export const COMPANY_EXPORT_HEADERS = [
  "Kundennummer", "Firma", "Status", "Website", "Branche", "Größe", "Mitarbeiterzahl", "Straße", "PLZ",
  "Ort", "Land", "USt-IdNr.", "Tools", "Potenzial", "Schmerzpunkte", "Notizen", "Vorname", "Nachname",
  "E-Mail", "Telefon", "Position",
];

export function companiesCsv(companies: readonly CompanyExportRow[]): string {
  return toCsv([
    COMPANY_EXPORT_HEADERS,
    ...companies.map((c) => {
      const main = c.contacts.find((k) => k.ist_hauptkontakt) ?? c.contacts[0];
      return [
        c.kundennummer, c.name, companyStatusLabels[c.status], text(c.website), text(c.branche),
        text(c.groesse), text(c.mitarbeiterzahl), text(c.strasse), text(c.plz), text(c.ort), c.land,
        text(c.ust_id), c.tool_stack.join(", "),
        c.automatisierungspotenzial ? potenzialLabels[c.automatisierungspotenzial] : "",
        text(c.schmerzpunkte), text(c.notizen), text(main?.vorname ?? null), text(main?.nachname ?? null),
        text(main?.email ?? null), text(main?.telefon ?? null), text(main?.position ?? null),
      ];
    }),
  ]);
}

export const CONTACT_EXPORT_HEADERS = [
  "Vorname", "Nachname", "E-Mail", "Telefon", "Position", "LinkedIn", "Hauptkontakt",
  "Einwilligung Marketing", "Einwilligung am", "Firma", "Kundennummer",
];

export function contactsCsv(contacts: readonly ContactExportRow[]): string {
  return toCsv([
    CONTACT_EXPORT_HEADERS,
    ...contacts.map((c) => [
      text(c.vorname), c.nachname, text(c.email), text(c.telefon), text(c.position), text(c.linkedin),
      yesNo(c.ist_hauptkontakt), yesNo(c.einwilligung_marketing),
      c.einwilligung_datum ? formatDateTime(c.einwilligung_datum) : "",
      c.companies?.name ?? "", c.companies?.kundennummer ?? "",
    ]),
  ]);
}

export function csvResponse(csv: string, baseName: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}-${berlinDate()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
