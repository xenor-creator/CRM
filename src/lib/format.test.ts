import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatEuro } from "./format";

// Intl uses a narrow no-break space between amount and currency sign.
const normalizeSpaces = (value: string) => value.replace(/\s/g, " ");

describe("formatEuro", () => {
  it("formats amounts in German notation", () => {
    expect(normalizeSpaces(formatEuro(1234.5))).toBe("1.234,50 €");
    expect(normalizeSpaces(formatEuro(0))).toBe("0,00 €");
    expect(normalizeSpaces(formatEuro(-19.99))).toBe("-19,99 €");
  });
});

describe("formatDate", () => {
  it("formats ISO dates as TT.MM.JJJJ", () => {
    expect(formatDate("2026-01-05")).toBe("05.01.2026");
    expect(formatDate("2026-12-31")).toBe("31.12.2026");
  });

  it("rejects invalid input", () => {
    expect(() => formatDate("05.01.2026")).toThrow();
  });
});

describe("formatDateTime", () => {
  it("formats timestamps in Berlin time", () => {
    expect(formatDateTime("2026-09-30T12:05:00Z")).toBe("30.09.2026, 14:05");
    expect(formatDateTime("2026-01-15T23:30:00Z")).toBe("16.01.2026, 00:30");
  });
});
