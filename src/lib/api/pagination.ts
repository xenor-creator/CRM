export function pageRange({ limit, offset }: { limit: number; offset: number }): [number, number] {
  return [offset, offset + limit - 1];
}
