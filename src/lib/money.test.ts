import { describe, expect, it } from "vitest";

import { formatEuroInput, parseEuroInput, sumAmounts, weightAmount } from "./money";

describe("parseEuroInput", () => {
  it.each([
    ["4800", 4800],
    ["1.234,56", 1234.56],
    ["1234,5", 1234.5],
    ["1234.56", 1234.56],
    ["1.234.567", 1234567],
    ["12.000 €", 12000],
    ["0,99", 0.99],
    ["0", 0],
  ])("parses %s", (input, expected) => {
    expect(parseEuroInput(input)).toEqual({ ok: true, value: expected });
  });

  it.each(["", "abc", "-5", "1,234", "12,345,67", "1.5.0", "12,999"])("rejects %s", (input) => {
    expect(parseEuroInput(input).ok).toBe(false);
  });

  it("rejects amounts beyond numeric(12,2)", () => {
    expect(parseEuroInput("10000000000").ok).toBe(false);
    expect(parseEuroInput("9999999999,99").ok).toBe(true);
  });
});

describe("sumAmounts", () => {
  it("sums without floating-point drift", () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([1999.99, 0.01, 1500])).toBe(3500);
    expect(sumAmounts([])).toBe(0);
  });
});

describe("weightAmount", () => {
  it("weights by probability and rounds to cents", () => {
    expect(weightAmount(4800, 25)).toBe(1200);
    expect(weightAmount(999.99, 33)).toBe(330);
    expect(weightAmount(1000, 0)).toBe(0);
    expect(weightAmount(1000, 100)).toBe(1000);
  });
});

describe("formatEuroInput", () => {
  it("uses a decimal comma", () => {
    expect(formatEuroInput(1234.5)).toBe("1234,50");
  });
});
