const MAX_AMOUNT = 9_999_999_999.99; // numeric(12, 2)

export type ParsedAmount = { ok: true; value: number } | { ok: false; error: string };

// Parses user input such as "1.234,56", "1234,5", "1234.56" or "4800" into euros.
export function parseEuroInput(input: string): ParsedAmount {
  const raw = input.replace(/[\s€]/g, "");
  if (raw === "") {
    return { ok: false, error: "Bitte einen Betrag eingeben." };
  }

  let normalized: string;
  if (raw.includes(",")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, "");
  } else {
    normalized = raw;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { ok: false, error: "Bitte einen gültigen Betrag mit höchstens zwei Nachkommastellen eingeben." };
  }

  const value = Number(normalized);
  if (value > MAX_AMOUNT) {
    return { ok: false, error: "Der Betrag ist zu groß." };
  }
  return { ok: true, value };
}

const toCents = (amount: number) => Math.round(amount * 100);

// Sums euro amounts in integer cents to avoid floating-point drift.
export function sumAmounts(amounts: readonly number[]): number {
  return amounts.reduce((cents, amount) => cents + toCents(amount), 0) / 100;
}

// Weighted value: amount × probability (0–100 %), rounded to cents.
export function weightAmount(amount: number, probabilityPercent: number): number {
  return Math.round((toCents(amount) * probabilityPercent) / 100) / 100;
}

// Formats an amount for an input field in German notation without currency sign.
export function formatEuroInput(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}
