import { describe, expect, it } from "vitest";

import { formatIban, isValidIban, normalizeIban } from "./iban";

describe("iban", () => {
  it("validates checksums", () => {
    expect(isValidIban("DE02 1203 0000 0000 2020 51")).toBe(true);
    expect(isValidIban("de02120300000000202051")).toBe(true);
    expect(isValidIban("DE02120300000000202052")).toBe(false);
    expect(isValidIban("DE0212030000000020205")).toBe(false);
    expect(isValidIban("AT611904300234573201")).toBe(true);
    expect(isValidIban("keine iban")).toBe(false);
  });

  it("normalizes and formats", () => {
    expect(normalizeIban(" de02 1203 0000 0000 2020 51 ")).toBe("DE02120300000000202051");
    expect(formatIban("DE02120300000000202051")).toBe("DE02 1203 0000 0000 2020 51");
  });
});
