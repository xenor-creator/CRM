const BOM = "﻿";
const DELIMITERS = [";", ",", "\t"] as const;

export type Delimiter = (typeof DELIMITERS)[number];

// Picks the delimiter that occurs most often outside quotes in the first line.
export function detectDelimiter(text: string): Delimiter {
  const counts = new Map<Delimiter, number>(DELIMITERS.map((d) => [d, 0]));
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (char === "\n" || char === "\r")) break;
    else if (!inQuotes && counts.has(char as Delimiter)) {
      counts.set(char as Delimiter, (counts.get(char as Delimiter) ?? 0) + 1);
    }
  }
  return [...counts.entries()].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

// RFC 4180 parser: quoted fields, escaped quotes (""), CRLF/LF and line breaks inside quotes.
// Completely empty lines are skipped.
export function parseCsv(input: string, delimiter: Delimiter = detectDelimiter(input.replace(/^﻿/, ""))): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    field = "";
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

// Neutralizes values that spreadsheet programs would evaluate as formulas.
// Phone numbers and plain signed numbers ("+49 30 123", "-5") stay untouched.
function neutralizeFormula(value: string): string {
  if (/^[=@\t\r]/.test(value) || (/^[+-]/.test(value) && !/^[+-][\d\s()/.,-]*$/.test(value))) {
    return `'${value}`;
  }
  return value;
}

function quote(value: string, delimiter: string): string {
  const safe = neutralizeFormula(value);
  return /["\r\n]|^\s|\s$/.test(safe) || safe.includes(delimiter) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// Excel-friendly CSV: semicolon delimiter, CRLF line endings, UTF-8 BOM.
export function toCsv(rows: readonly (readonly string[])[], delimiter = ";"): string {
  return BOM + rows.map((row) => row.map((value) => quote(value, delimiter)).join(delimiter)).join("\r\n") + "\r\n";
}
