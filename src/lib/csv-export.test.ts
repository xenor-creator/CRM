import { describe, expect, it } from "vitest";

import { parseCsv } from "./csv";
import { companiesCsv, contactsCsv, type CompanyExportRow, type ContactExportRow } from "./csv-export";
import { parseCompanyImport } from "./csv-import";

const company: CompanyExportRow = {
  id: "c1",
  owner_id: "o1",
  name: "Beispiel; Automatisierung GmbH",
  website: "https://beispiel.de",
  domain: "beispiel.de",
  branche: "Handwerk",
  groesse: "KMU",
  strasse: "Musterweg 1",
  plz: "12345",
  ort: "Musterstadt",
  land: "DE",
  ust_id: "DE123456789",
  kundennummer: "K1001",
  mitarbeiterzahl: 25,
  tool_stack: ["Excel", "Outlook"],
  schmerzpunkte: "Manuelle Angebote\nDoppelte Datenpflege",
  automatisierungspotenzial: "hoch",
  notizen: null,
  status: "kunde",
  created_at: "2026-09-30T10:00:00Z",
  updated_at: "2026-09-30T10:00:00Z",
  contacts: [
    { vorname: "Zweit", nachname: "Kontakt", email: null, telefon: null, position: null, ist_hauptkontakt: false },
    { vorname: "Erika", nachname: "Muster", email: "erika@beispiel.de", telefon: "+49 30 123", position: "GF", ist_hauptkontakt: true },
  ],
};

describe("companiesCsv", () => {
  it("exports the main contact and re-imports to the same data", () => {
    const csv = companiesCsv([company]);
    const [header, row] = parseCsv(csv);
    expect(header?.[0]).toBe("Kundennummer");
    expect(row?.[1]).toBe("Beispiel; Automatisierung GmbH");
    expect(row?.[17]).toBe("Muster");

    const [imported] = parseCompanyImport(csv).rows;
    expect(imported?.error).toBeNull();
    expect(imported?.company).toMatchObject({
      name: company.name,
      status: "kunde",
      automatisierungspotenzial: "hoch",
      tool_stack: ["Excel", "Outlook"],
      mitarbeiterzahl: 25,
      schmerzpunkte: company.schmerzpunkte,
      ust_id: "DE123456789",
    });
    expect(imported?.contact).toMatchObject({ vorname: "Erika", nachname: "Muster", email: "erika@beispiel.de" });
  });
});

describe("contactsCsv", () => {
  it("exports consent as ja/nein with German date", () => {
    const contact: ContactExportRow = {
      id: "k1",
      owner_id: "o1",
      company_id: "c1",
      vorname: "Erika",
      nachname: "Muster",
      email: "erika@beispiel.de",
      telefon: null,
      position: null,
      linkedin: null,
      ist_hauptkontakt: true,
      einwilligung_marketing: true,
      einwilligung_datum: "2026-09-30T12:05:00Z",
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
      companies: { name: "Beispiel GmbH", kundennummer: "K1001" },
    };
    const [, row] = parseCsv(contactsCsv([contact]));
    expect(row).toEqual([
      "Erika", "Muster", "erika@beispiel.de", "", "", "", "ja", "ja", "30.09.2026, 14:05", "Beispiel GmbH", "K1001",
    ]);
  });
});
