import { describe, expect, it } from "vitest";

import { secretsMatch } from "./secret";

describe("secretsMatch", () => {
  it("compares exactly", () => {
    expect(secretsMatch("abc123", "abc123")).toBe(true);
    expect(secretsMatch("abc124", "abc123")).toBe(false);
    expect(secretsMatch("", "abc123")).toBe(false);
    expect(secretsMatch("abc1234", "abc123")).toBe(false);
  });
});
