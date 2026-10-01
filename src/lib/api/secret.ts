import { timingSafeEqual } from "node:crypto";

// Constant-time comparison of a presented secret with the expected one.
export function secretsMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
