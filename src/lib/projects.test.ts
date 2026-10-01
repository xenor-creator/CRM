import { describe, expect, it } from "vitest";

import { formatMinutes, parseDuration, profitability, timerMinutes } from "./projects";

describe("parseDuration", () => {
  it.each([
    ["1:30", 90],
    ["0:05", 5],
    ["1,5", 90],
    ["2.25", 135],
    ["1,5h", 90],
    ["3h", 180],
    ["45", 45],
    ["45m", 45],
    [" 2:00 ", 120],
  ])("parses %s", (input, minutes) => {
    expect(parseDuration(input)).toEqual({ ok: true, minutes });
  });

  it.each(["", "abc", "1:75", "0", "0:00", "25:00", "-1", "1,555"])("rejects %s", (input) => {
    expect(parseDuration(input).ok).toBe(false);
  });
});

describe("timerMinutes", () => {
  const start = "2026-10-01T09:00:00Z";
  it("rounds up started minutes, at least 1", () => {
    expect(timerMinutes(start, new Date("2026-10-01T09:00:10Z"))).toBe(1);
    expect(timerMinutes(start, new Date("2026-10-01T10:30:00Z"))).toBe(90);
    expect(timerMinutes(start, new Date("2026-10-01T10:30:01Z"))).toBe(91);
  });
});

describe("formatMinutes", () => {
  it("formats as h:mm", () => {
    expect(formatMinutes(0)).toBe("0:00 h");
    expect(formatMinutes(605)).toBe("10:05 h");
  });
});

describe("profitability", () => {
  it("compares internal cost with the fixed price", () => {
    expect(profitability(600, 80, 2000)).toEqual({ minutes: 600, internalCost: 800, margin: 1200, marginPercent: 60 });
    expect(profitability(100, 95.5, 100)).toEqual({ minutes: 100, internalCost: 159.17, margin: -59.17, marginPercent: -59.2 });
  });

  it("handles missing rate or price", () => {
    expect(profitability(60, null, 1000)).toMatchObject({ internalCost: null, margin: null });
    expect(profitability(60, 50, null)).toMatchObject({ internalCost: 50, margin: null });
    expect(profitability(60, 50, 0)).toMatchObject({ margin: -50, marginPercent: null });
  });
});
