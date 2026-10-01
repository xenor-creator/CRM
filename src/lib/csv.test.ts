import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv, toCsv } from "./csv";

describe("detectDelimiter", () => {
  it("detects semicolon, comma and tab", () => {
    expect(detectDelimiter("Firma;Ort\nA;B")).toBe(";");
    expect(detectDelimiter("Firma,Ort,PLZ\nA,B,C")).toBe(",");
    expect(detectDelimiter("Firma\tOrt")).toBe("\t");
  });

  it("ignores delimiters inside quotes", () => {
    expect(detectDelimiter('"A, B, C";D\n')).toBe(";");
  });
});

describe("parseCsv", () => {
  it("parses quoted fields with delimiters, quotes and line breaks", () => {
    const text = 'Firma;Notizen\r\n"Muster; GmbH";"Sagt ""Hallo""\nZweite Zeile"\r\n';
    expect(parseCsv(text)).toEqual([
      ["Firma", "Notizen"],
      ["Muster; GmbH", 'Sagt "Hallo"\nZweite Zeile'],
    ]);
  });

  it("strips the BOM, skips empty lines and keeps empty fields", () => {
    expect(parseCsv("﻿a;b;c\n\n1;;3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("handles a last line without newline and comma files", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("toCsv", () => {
  it("writes BOM, semicolons and CRLF, quoting where needed", () => {
    expect(toCsv([["Firma", "Notiz"], ["A; B", 'x "y"'], ["mehr\nzeilig", " rand "]])).toBe(
      '﻿Firma;Notiz\r\n"A; B";"x ""y"""\r\n"mehr\nzeilig";" rand "\r\n',
    );
  });

  it("neutralizes formulas but keeps phone numbers", () => {
    expect(toCsv([["=HYPERLINK(1)", "+49 30 1234567", "-5", "@SUM(A1)", "+cmd|x"]])).toBe(
      "﻿'=HYPERLINK(1);+49 30 1234567;-5;'@SUM(A1);'+cmd|x\r\n",
    );
  });

  it("round-trips through the parser", () => {
    const rows = [
      ["Name", "Text"],
      ["Ä Ö Ü ß", 'a;b "c"\nd'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
