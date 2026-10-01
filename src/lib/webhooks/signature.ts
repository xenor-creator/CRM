import { createHmac } from "node:crypto";

// Signature over "<timestamp>.<body>" so receivers can reject replayed requests.
// Header format: X-CRM-Signature: sha256=<hex>, X-CRM-Timestamp: <unix seconds>.
export function signWebhook(secret: string, timestamp: number, body: string): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `sha256=${digest}`;
}
