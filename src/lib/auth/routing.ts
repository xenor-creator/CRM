export const LOGIN_PATH = "/login";
export const TWO_FACTOR_PATH = "/2fa";
export const HOME_PATH = "/dashboard";

export type SessionState =
  | { status: "anonymous" }
  | { status: "password_only" }
  | { status: "two_factor_verified" };

export function sessionStateFromClaims(claims: { sub?: string; aal?: string } | null): SessionState {
  if (!claims?.sub) {
    return { status: "anonymous" };
  }
  return claims.aal === "aal2" ? { status: "two_factor_verified" } : { status: "password_only" };
}

// Returns the path to redirect to, or null if the request may proceed.
export function resolveAuthRedirect(pathname: string, session: SessionState): string | null {
  const onLogin = pathname === LOGIN_PATH;
  const onTwoFactor = pathname === TWO_FACTOR_PATH;

  switch (session.status) {
    case "anonymous":
      return onLogin ? null : LOGIN_PATH;
    case "password_only":
      return onTwoFactor ? null : TWO_FACTOR_PATH;
    case "two_factor_verified":
      return onLogin || onTwoFactor ? HOME_PATH : null;
  }
}
