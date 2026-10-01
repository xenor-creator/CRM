import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "crm_";

// 32 random bytes; only the SHA-256 hash is stored, the key itself is shown once.
export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(32).toString("base64url");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// Visible part for the key list, e.g. "crm_AbC1dE2f…".
export function displayPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX.length + 8);
}

export function bearerToken(authorization: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  return match?.[1] ?? null;
}
