const MAX_MINUTES = 24 * 60;

export type ParsedDuration = { ok: true; minutes: number } | { ok: false; error: string };

// Accepts "1:30" (h:mm), "1,5" or "1.5" (hours) and "90" or "90m" (minutes).
export function parseDuration(input: string): ParsedDuration {
  const raw = input.trim().toLowerCase().replace(/\s+/g, "");
  let minutes: number | null = null;
  const hm = /^(\d{1,2}):([0-5]\d)$/.exec(raw);
  if (hm) {
    minutes = Number(hm[1]) * 60 + Number(hm[2]);
  } else if (/^\d+([.,]\d{1,2})?h$/.test(raw) || /^\d+[.,]\d{1,2}$/.test(raw)) {
    minutes = Math.round(Number(raw.replace("h", "").replace(",", ".")) * 60);
  } else if (/^\d+m?$/.test(raw)) {
    minutes = Number(raw.replace("m", ""));
  }
  if (minutes === null) {
    return { ok: false, error: "Bitte die Dauer als 1:30, 1,5 oder 90 (Minuten) angeben." };
  }
  if (minutes <= 0 || minutes > MAX_MINUTES) {
    return { ok: false, error: "Die Dauer muss zwischen 1 Minute und 24 Stunden liegen." };
  }
  return { ok: true, minutes };
}

// Running timer -> booked minutes, rounded up to the started minute.
export function timerMinutes(startedAt: string, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((now.getTime() - new Date(startedAt).getTime()) / 60_000));
}

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")} h`;
}

export type Profitability = {
  minutes: number;
  internalCost: number | null;
  margin: number | null;
  marginPercent: number | null;
};

// Booked time × internal hourly rate against the fixed price (all money in cents internally).
export function profitability(
  minutes: number,
  hourlyRate: number | null,
  fixedPrice: number | null,
): Profitability {
  if (hourlyRate === null) {
    return { minutes, internalCost: null, margin: null, marginPercent: null };
  }
  const costCents = Math.round((minutes * Math.round(hourlyRate * 100)) / 60);
  const internalCost = costCents / 100;
  if (fixedPrice === null) {
    return { minutes, internalCost, margin: null, marginPercent: null };
  }
  const priceCents = Math.round(fixedPrice * 100);
  const marginCents = priceCents - costCents;
  return {
    minutes,
    internalCost,
    margin: marginCents / 100,
    marginPercent: priceCents === 0 ? null : Math.round((marginCents / priceCents) * 1000) / 10,
  };
}
