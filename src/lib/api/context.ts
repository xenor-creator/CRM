import "server-only";

import { after } from "next/server";

import { createServiceClient, type ServiceClient } from "@/lib/supabase/service";

import { apiError } from "./http";
import { bearerToken, hashApiKey } from "./keys";

// Every API query runs with the service role and must be scoped to `ownerId`.
export type ApiContext = { db: ServiceClient; ownerId: string };

type Handler<A extends unknown[]> = (ctx: ApiContext, request: Request, ...args: A) => Promise<Response>;

const LAST_USED_GRANULARITY_MS = 60_000;

async function authenticate(request: Request): Promise<ApiContext | Response> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return apiError(401, "API-Key fehlt. Erwartet wird der Header „Authorization: Bearer <key>“.");
  }
  const db = createServiceClient();
  const { data: key, error } = await db
    .from("api_keys")
    .select("id, owner_id, zuletzt_genutzt_am")
    .eq("key_hash", hashApiKey(token))
    .is("widerrufen_am", null)
    .maybeSingle();
  if (error) {
    console.error("api key lookup failed", error);
    return apiError(500, "Die Anmeldung konnte nicht geprüft werden.");
  }
  if (!key) {
    return apiError(401, "Ungültiger oder widerrufener API-Key.");
  }

  const lastUsed = key.zuletzt_genutzt_am ? new Date(key.zuletzt_genutzt_am).getTime() : 0;
  if (Date.now() - lastUsed > LAST_USED_GRANULARITY_MS) {
    after(async () => {
      await db.from("api_keys").update({ zuletzt_genutzt_am: new Date().toISOString() }).eq("id", key.id);
    });
  }
  return { db, ownerId: key.owner_id };
}

// Wraps a route handler with API-key authentication and a generic error response.
export function withApiKey<A extends unknown[]>(handler: Handler<A>) {
  return async (request: Request, ...args: A): Promise<Response> => {
    try {
      const ctx = await authenticate(request);
      if (ctx instanceof Response) return ctx;
      return await handler(ctx, request, ...args);
    } catch (error) {
      console.error("api handler failed", error);
      return apiError(500, "Interner Fehler.");
    }
  };
}

// True if the row exists and belongs to the API key's owner (guards foreign keys in requests).
export async function ownsRow(
  ctx: ApiContext,
  table: "companies" | "contacts" | "deals" | "projects" | "invoices",
  id: string,
): Promise<boolean> {
  const { data } = await ctx.db.from(table).select("id").eq("id", id).eq("owner_id", ctx.ownerId).maybeSingle();
  return data !== null;
}
