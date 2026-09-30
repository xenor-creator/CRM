import { describe, expect, it } from "vitest";

import { loginSchema, totpVerifySchema } from "./auth";

describe("loginSchema", () => {
  it("accepts e-mail and password", () => {
    expect(loginSchema.safeParse({ email: "nutzer@example.test", password: "x" }).success).toBe(
      true,
    );
  });

  it("rejects an invalid e-mail with a German message", () => {
    const result = loginSchema.safeParse({ email: "keine-mail", password: "x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Bitte eine gültige E-Mail-Adresse eingeben.");
  });
});

describe("totpVerifySchema", () => {
  it("accepts six digits and trims whitespace", () => {
    const result = totpVerifySchema.safeParse({ factorId: "f1", code: " 123456 " });
    expect(result.success).toBe(true);
    expect(result.data?.code).toBe("123456");
  });

  it("rejects codes that are not six digits", () => {
    expect(totpVerifySchema.safeParse({ factorId: "f1", code: "12345" }).success).toBe(false);
    expect(totpVerifySchema.safeParse({ factorId: "f1", code: "12345a" }).success).toBe(false);
  });
});
