import { addDays } from "@/lib/dates";
import type { Enums } from "@/lib/supabase/database.types";

// Billing is monthly in advance. Period k starts on the start date's day of month, k months
// after the start (clamped to the month's last day), and ends the day before period k+1.
// After the minimum term (laufzeit_monate) the retainer renews month by month.

export type RetainerTerms = {
  start: string;
  laufzeit_monate: number | null;
  kuendigungsfrist_tage: number;
};

export const NOTICE_WARNING_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, "0");

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function periodStart(start: string, k: number): string {
  const [y, m, d] = start.split("-").map(Number);
  const monthIndex = m - 1 + k;
  const year = y + Math.floor(monthIndex / 12);
  const month = (((monthIndex % 12) + 12) % 12) + 1;
  return `${year}-${pad(month)}-${pad(Math.min(d, daysInMonth(year, month)))}`;
}

export function periodEnd(start: string, k: number): string {
  return addDays(periodStart(start, k + 1), -1);
}

// Index of the period containing `date` (date must not be before the start).
export function periodIndex(start: string, date: string): number {
  const [sy, sm] = start.split("-").map(Number);
  const [y, m] = date.split("-").map(Number);
  let k = (y - sy) * 12 + (m - sm);
  if (periodStart(start, k) > date) k -= 1;
  return Math.max(0, k);
}

export function minimumTermEnd(terms: RetainerTerms): string | null {
  return terms.laufzeit_monate ? periodEnd(terms.start, terms.laufzeit_monate - 1) : null;
}

// Possible end dates (period ends) if notice is given on `today`, earliest first.
export function possibleEndDates(terms: RetainerTerms, today: string, count = 6): string[] {
  const firstK = Math.max(terms.laufzeit_monate ? terms.laufzeit_monate - 1 : 0, today < terms.start ? 0 : periodIndex(terms.start, today));
  const ends: string[] = [];
  for (let k = firstK; ends.length < count; k++) {
    const end = periodEnd(terms.start, k);
    if (addDays(end, -terms.kuendigungsfrist_tage) >= today) ends.push(end);
  }
  return ends;
}

export type RetainerNotice =
  | { kind: "laufzeitende"; date: string; days: number }
  | { kind: "kuendigungsfrist"; date: string; days: number; endDate: string };

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

// Hints 30 days ahead: end of a cancelled retainer or of the minimum term, and the last day to
// give notice before the minimum term renews. After the minimum term no notice hint is shown,
// because the retainer can then be cancelled every month.
export function retainerNotices(
  terms: RetainerTerms & { status: Enums<"retainer_status">; gekuendigt_zum: string | null },
  today: string,
): RetainerNotice[] {
  if (terms.status === "beendet") return [];
  const within = (date: string) => {
    const days = daysBetween(today, date);
    return days >= 0 && days <= NOTICE_WARNING_DAYS ? days : null;
  };

  if (terms.status === "gekuendigt" && terms.gekuendigt_zum) {
    const days = within(terms.gekuendigt_zum);
    return days === null ? [] : [{ kind: "laufzeitende", date: terms.gekuendigt_zum, days }];
  }

  const termEnd = minimumTermEnd(terms);
  if (!termEnd || today > termEnd) return [];
  const notices: RetainerNotice[] = [];
  const deadline = addDays(termEnd, -terms.kuendigungsfrist_tage);
  const deadlineDays = within(deadline);
  if (deadlineDays !== null) notices.push({ kind: "kuendigungsfrist", date: deadline, days: deadlineDays, endDate: termEnd });
  const endDays = within(termEnd);
  if (endDays !== null) notices.push({ kind: "laufzeitende", date: termEnd, days: endDays });
  return notices;
}

export type BillingPeriod = { from: string; to: string };

// Periods to invoice: from `naechste_abrechnung` up to today, not beyond a cancellation date.
export function duePeriods(
  terms: RetainerTerms & { naechste_abrechnung: string | null; gekuendigt_zum: string | null },
  today: string,
): BillingPeriod[] {
  const next = terms.naechste_abrechnung ?? terms.start;
  const periods: BillingPeriod[] = [];
  for (let k = next < terms.start ? 0 : periodIndex(terms.start, next); ; k++) {
    const from = periodStart(terms.start, k);
    if (from > today || (terms.gekuendigt_zum && from > terms.gekuendigt_zum)) break;
    if (from >= next) periods.push({ from, to: periodEnd(terms.start, k) });
  }
  return periods;
}

export function nextBillingDate(terms: RetainerTerms, lastPeriodFrom: string): string {
  return periodStart(terms.start, periodIndex(terms.start, lastPeriodFrom) + 1);
}

// Monthly recurring revenue of active (incl. cancelled but still running) retainers, in cents.
export function monthlyRecurringRevenue(retainers: readonly { status: Enums<"retainer_status">; monatsbetrag: number }[]): number {
  return (
    retainers
      .filter((r) => r.status !== "beendet")
      .reduce((cents, r) => cents + Math.round(r.monatsbetrag * 100), 0) / 100
  );
}
