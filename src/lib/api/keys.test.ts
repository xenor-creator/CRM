import { describe, expect, it } from "vitest";

import { bearerToken, displayPrefix, generateApiKey, hashApiKey } from "./keys";

describe("api keys", () => {
  it("generates unique, prefixed keys with enough entropy", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a).toMatch(/^crm_[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hashes deterministically with SHA-256", () => {
    expect(hashApiKey("crm_test")).toBe(hashApiKey("crm_test"));
    expect(hashApiKey("crm_test")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey("crm_test")).not.toBe(hashApiKey("crm_tesT"));
  });

  it("shows only a short prefix", () => {
    expect(displayPrefix("crm_ABCDEFGHIJKLMNOP")).toBe("crm_ABCDEFGH");
  });

  it("extracts bearer tokens", () => {
    expect(bearerToken("Bearer crm_abc")).toBe("crm_abc");
    expect(bearerToken("bearer   crm_abc")).toBe("crm_abc");
    expect(bearerToken("Basic xyz")).toBeNull();
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
  });
});
