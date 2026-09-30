const TIME_ZONE = "Europe/Berlin";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Calendar date in Berlin as YYYY-MM-DD, independent of the server time zone.
export function berlinDate(instant: Date = new Date()): string {
  return dateFormatter.format(instant);
}

function berlinParts(instant: Date) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// Offset of Berlin local time from UTC in minutes at the given instant (60 or 120).
function berlinOffsetMinutes(instant: Date): number {
  const p = berlinParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

const localPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

// Converts a datetime-local value ("2026-09-30T14:05") entered in Berlin time to an ISO instant.
export function berlinLocalToIso(local: string): string {
  const match = localPattern.exec(local);
  if (!match) {
    throw new Error(`Invalid local date-time: ${local}`);
  }
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallClockAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let instant = wallClockAsUtc - berlinOffsetMinutes(new Date(wallClockAsUtc)) * 60000;
  instant = wallClockAsUtc - berlinOffsetMinutes(new Date(instant)) * 60000;
  return new Date(instant).toISOString();
}

// ISO instant -> datetime-local value in Berlin time.
export function isoToBerlinLocal(iso: string): string {
  const p = berlinParts(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export const INACTIVITY_DAYS = 14;

export function inactivityCutoff(now: Date = new Date(), days = INACTIVITY_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

// Whole days between an instant and now (for "seit X Tagen").
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

export type DueState = "ueberfaellig" | "heute" | "spaeter" | "ohne";

export function dueState(dueDate: string | null, today: string = berlinDate()): DueState {
  if (!dueDate) return "ohne";
  if (dueDate < today) return "ueberfaellig";
  return dueDate === today ? "heute" : "spaeter";
}
