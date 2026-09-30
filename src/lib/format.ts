const euroFormatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

export function formatEuro(amount: number): string {
  return euroFormatter.format(amount);
}

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

// Formats a Postgres `date` (YYYY-MM-DD) as TT.MM.JJJJ without any time zone shift.
export function formatDate(isoDate: string): string {
  const match = isoDatePattern.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

// Formats a Postgres `timestamptz` in German local time, e.g. 30.09.2026, 14:05.
export function formatDateTime(timestamp: string): string {
  return dateTimeFormatter.format(new Date(timestamp));
}
