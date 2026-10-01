import type { z } from "zod";

export type ApiErrorDetail = { path: string; message: string };

export function apiError(status: number, message: string, details?: ApiErrorDetail[]): Response {
  return Response.json({ error: { message, ...(details ? { details } : {}) } }, { status });
}

export function apiData(data: unknown, status = 200): Response {
  return Response.json({ data }, { status });
}

export function apiList(data: unknown[], pagination: { limit: number; offset: number; total: number }): Response {
  return Response.json({ data, pagination });
}

export function validationDetails(error: z.ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({ path: issue.path.join(".") || "(body)", message: issue.message }));
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<Parsed<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: apiError(400, "Der Request-Body ist kein gültiges JSON.") };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, response: apiError(400, "Ungültige Eingabe.", validationDetails(result.error)) };
  }
  return { ok: true, data: result.data };
}

export function parseQuery<T>(request: Request, schema: z.ZodType<T>): Parsed<T> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    return { ok: false, response: apiError(400, "Ungültige Parameter.", validationDetails(result.error)) };
  }
  return { ok: true, data: result.data };
}

// Maps Postgres errors raised by constraints and triggers to client errors.
export function databaseError(error: { code?: string; message: string }, fallback: string): Response {
  switch (error.code) {
    case "23514":
    case "P0001":
      return apiError(400, error.message);
    case "23503":
      return apiError(400, "Ein verknüpfter Datensatz existiert nicht.");
    case "23505":
      return apiError(409, "Der Datensatz existiert bereits.");
    default:
      console.error(fallback, error);
      return apiError(500, fallback);
  }
}
