// Removes characters with special meaning in PostgREST filter strings (or=, ilike patterns).
export function sanitizeSearchTerm(term: string | undefined): string {
  return (term ?? "").replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

// PostgREST `or` filter matching the term in any of the given columns.
export function ilikeAny(columns: readonly string[], term: string): string {
  return columns.map((column) => `${column}.ilike.*${term}*`).join(",");
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Case-insensitive exact match with ilike: escapes the wildcards % and _.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
