import { describe, expect, it } from "vitest";

import {
  berlinDate,
  berlinLocalToIso,
  daysSince,
  dueState,
  inactivityCutoff,
  isoToBerlinLocal,
} from "./dates";

describe("berlinDate", () => {
  it("uses the Berlin calendar day", () => {
    expect(berlinDate(new Date("2026-09-30T21:59:00Z"))).toBe("2026-09-30");
    expect(berlinDate(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10-01");
    expect(berlinDate(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});

describe("berlinLocalToIso", () => {
  it("handles winter and summer time", () => {
    expect(berlinLocalToIso("2026-01-15T10:00")).toBe("2026-01-15T09:00:00.000Z");
    expect(berlinLocalToIso("2026-07-01T10:00")).toBe("2026-07-01T08:00:00.000Z");
  });

  it("handles the days of the clock change", () => {
    expect(berlinLocalToIso("2026-03-29T12:00")).toBe("2026-03-29T10:00:00.000Z");
    expect(berlinLocalToIso("2026-10-25T12:00")).toBe("2026-10-25T11:00:00.000Z");
  });

  it("round-trips with isoToBerlinLocal", () => {
    expect(isoToBerlinLocal(berlinLocalToIso("2026-09-30T14:05"))).toBe("2026-09-30T14:05");
  });

  it("rejects malformed input", () => {
    expect(() => berlinLocalToIso("30.09.2026 14:05")).toThrow();
  });
});

describe("inactivity", () => {
  const now = new Date("2026-09-30T12:00:00Z");

  it("computes the 14-day cutoff", () => {
    expect(inactivityCutoff(now)).toBe("2026-09-16T12:00:00.000Z");
  });

  it("counts whole days", () => {
    expect(daysSince("2026-09-16T12:00:00Z", now)).toBe(14);
    expect(daysSince("2026-09-16T12:00:01Z", now)).toBe(13);
  });
});

describe("dueState", () => {
  it("classifies due dates relative to today", () => {
    expect(dueState("2026-09-29", "2026-09-30")).toBe("ueberfaellig");
    expect(dueState("2026-09-30", "2026-09-30")).toBe("heute");
    expect(dueState("2026-10-01", "2026-09-30")).toBe("spaeter");
    expect(dueState(null, "2026-09-30")).toBe("ohne");
  });
});
