import { z } from "zod";

import { parseEuroInput } from "@/lib/money";

// FormData yields null for missing fields; treat them like empty strings.
const asString = (value: unknown) => (typeof value === "string" ? value : "");

export const requiredText = (message: string) =>
  z.preprocess(asString, z.string().trim().min(1, message));

export const optionalText = z.preprocess(
  asString,
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value)),
);

export const optionalEmail = z.preprocess(
  asString,
  z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Bitte eine gültige E-Mail-Adresse eingeben.",
    })
    .transform((value) => (value === "" ? null : value)),
);

export const optionalCount = z.preprocess(
  (value) => {
    const text = asString(value).trim();
    return text === "" ? null : Number(text);
  },
  z.number({ message: "Bitte eine ganze Zahl eingeben." }).int("Bitte eine ganze Zahl eingeben.").min(0, "Die Zahl darf nicht negativ sein.").nullable(),
);

export const optionalPercent = z.preprocess(
  (value) => {
    const text = asString(value).trim();
    return text === "" ? null : Number(text);
  },
  z
    .number({ message: "Bitte eine Zahl zwischen 0 und 100 eingeben." })
    .int("Bitte eine ganze Zahl eingeben.")
    .min(0, "Bitte eine Zahl zwischen 0 und 100 eingeben.")
    .max(100, "Bitte eine Zahl zwischen 0 und 100 eingeben.")
    .nullable(),
);

export const optionalDate = z.preprocess(
  asString,
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Bitte ein gültiges Datum eingeben.",
    })
    .transform((value) => (value === "" ? null : value)),
);

export const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const optionalUuid = z.preprocess(
  asString,
  z.union([z.literal("").transform(() => null), z.uuid()]),
);

export const requiredUuid = (message: string) => z.preprocess(asString, z.uuid(message));

// Euro amount in German or international notation; empty input becomes 0.
export const euroAmount = z.preprocess(asString, z.string()).transform((value, ctx) => {
  if (value.trim() === "") {
    return 0;
  }
  const parsed = parseEuroInput(value);
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", message: parsed.error });
    return z.NEVER;
  }
  return parsed.value;
});

// "Make, n8n, HubSpot" -> ["Make", "n8n", "HubSpot"] without duplicates.
export const commaList = z.preprocess(asString, z.string()).transform((value) => [
  ...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
]);

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Ungültige Eingabe.";
}

// Optional euro amount; empty input becomes null.
export const optionalEuroAmount = z.preprocess(asString, z.string()).transform((value, ctx) => {
  if (value.trim() === "") {
    return null;
  }
  const parsed = parseEuroInput(value);
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", message: parsed.error });
    return z.NEVER;
  }
  return parsed.value;
});

export const requiredDate = (message: string) =>
  z.preprocess(asString, z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, message));
