import { describe, expect, it } from "vitest";

import { normalizeHeader, parseCompanyImport } from "./csv-import";

describe("normalizeHeader", () => {
  it("normalizes umlauts, case and punctuation", () => {
    expect(normalizeHeader(" Straße ")).toBe("strasse");
    expect(normalizeHeader("USt-IdNr.")).toBe("ustidnr");
    expect(normalizeHeader("E-Mail")).toBe("email");
    expect(normalizeHeader("Größe")).toBe("groesse");
  });
});

describe("parseCompanyImport", () => {
  it("maps German headers and builds company + contact", () => {
    const csv =
      "Firma;Website;Status;Potenzial;Tools;Mitarbeiterzahl;Vorname;Nachname;E-Mail;Telefon;Kundennummer\n" +
      "Beispiel GmbH;beispiel.de;Kunde;Hoch;Excel, Outlook;12;Max;Muster;MAX@beispiel.de;+49 30 1;K1001\n";
    const result = parseCompanyImport(csv);
    expect(result.error).toBeNull();
    expect(result.unknownHeaders).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      line: 2,
      error: null,
      company: {
        name: "Beispiel GmbH",
        website: "beispiel.de",
        status: "kunde",
        automatisierungspotenzial: "hoch",
        tool_stack: ["Excel", "Outlook"],
        mitarbeiterzahl: 12,
        land: "DE",
      },
      contact: { vorname: "Max", nachname: "Muster", email: "max@beispiel.de", telefon: "+49 30 1" },
    });
  });

  it("defaults the status, reports unknown columns and row errors", () => {
    const result = parseCompanyImport("Firma,Fax,Mitarbeiterzahl\nA GmbH,123,\n,456,\nB AG,,viele\n");
    expect(result.unknownHeaders).toEqual(["Fax"]);
    expect(result.rows.map((r) => [r.line, r.company?.status ?? null, r.error])).toEqual([
      [2, "lead", null],
      [3, null, "Bitte einen Firmennamen eingeben."],
      [4, null, "Bitte eine ganze Zahl eingeben."],
    ]);
  });

  it("requires a company column and a last name for contacts", () => {
    expect(parseCompanyImport("Ort;PLZ\nBerlin;10115").error).toBe("Die Spalte „Firma“ fehlt in der ersten Zeile.");
    expect(parseCompanyImport("Firma;E-Mail\nA;a@b.de").rows[0]?.error).toBe(
      "Für den Kontakt bitte mindestens den Nachnamen angeben.",
    );
    expect(parseCompanyImport("").error).toBe("Die Datei ist leer.");
  });
});
