import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";

import { commaList, optionalCount, optionalEmail, optionalText, requiredText } from "./fields";

const enums = Constants.public.Enums;

export const companySchema = z.object({
  name: requiredText("Bitte einen Firmennamen eingeben."),
  website: optionalText,
  branche: optionalText,
  groesse: optionalText,
  strasse: optionalText,
  plz: optionalText,
  ort: optionalText,
  land: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? value : "DE"),
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Bitte das Land als zweistelligen Code angeben, z. B. DE."),
  ),
  ust_id: optionalText,
  mitarbeiterzahl: optionalCount,
  tool_stack: commaList,
  schmerzpunkte: optionalText,
  automatisierungspotenzial: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.enum(enums.automatisierungspotenzial).nullable(),
  ),
  notizen: optionalText,
  status: z.enum(enums.company_status, "Bitte einen gültigen Status wählen."),
});

export type CompanyInput = z.infer<typeof companySchema>;

// Optional first contact captured together with a new company.
export const firstContactSchema = z
  .object({
    kontakt_vorname: optionalText,
    kontakt_nachname: optionalText,
    kontakt_email: optionalEmail,
  })
  .refine((c) => c.kontakt_nachname !== null || (c.kontakt_vorname === null && c.kontakt_email === null), {
    message: "Für den Kontakt bitte mindestens den Nachnamen angeben.",
  });
