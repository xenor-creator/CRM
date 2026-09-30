import { describe, expect, it } from "vitest";

import { resolveAuthRedirect, sessionStateFromClaims } from "./routing";

const anonymous = { status: "anonymous" } as const;
const passwordOnly = { status: "password_only" } as const;
const verified = { status: "two_factor_verified" } as const;

describe("sessionStateFromClaims", () => {
  it("treats missing claims as anonymous", () => {
    expect(sessionStateFromClaims(null)).toEqual(anonymous);
    expect(sessionStateFromClaims({})).toEqual(anonymous);
  });

  it("requires aal2 for a verified session", () => {
    expect(sessionStateFromClaims({ sub: "u1", aal: "aal1" })).toEqual(passwordOnly);
    expect(sessionStateFromClaims({ sub: "u1" })).toEqual(passwordOnly);
    expect(sessionStateFromClaims({ sub: "u1", aal: "aal2" })).toEqual(verified);
  });
});

describe("resolveAuthRedirect", () => {
  it("sends anonymous visitors to the login page", () => {
    expect(resolveAuthRedirect("/dashboard", anonymous)).toBe("/login");
    expect(resolveAuthRedirect("/2fa", anonymous)).toBe("/login");
    expect(resolveAuthRedirect("/", anonymous)).toBe("/login");
    expect(resolveAuthRedirect("/login", anonymous)).toBeNull();
  });

  it("keeps password-only sessions on the 2FA step", () => {
    expect(resolveAuthRedirect("/dashboard", passwordOnly)).toBe("/2fa");
    expect(resolveAuthRedirect("/login", passwordOnly)).toBe("/2fa");
    expect(resolveAuthRedirect("/2fa", passwordOnly)).toBeNull();
  });

  it("lets verified sessions into the app and away from auth pages", () => {
    expect(resolveAuthRedirect("/dashboard", verified)).toBeNull();
    expect(resolveAuthRedirect("/firmen", verified)).toBeNull();
    expect(resolveAuthRedirect("/login", verified)).toBe("/dashboard");
    expect(resolveAuthRedirect("/2fa", verified)).toBe("/dashboard");
  });
});
