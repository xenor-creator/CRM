import { z } from "zod";

import { parseDuration } from "@/lib/projects";
import { Constants } from "@/lib/supabase/database.types";

import {
  euroAmount,
  optionalDate,
  optionalEuroAmount,
  optionalText,
  optionalUuid,
  requiredDate,
  requiredText,
  requiredUuid,
} from "./fields";

const enums = Constants.public.Enums;

export const projectSchema = z.object({
  company_id: requiredUuid("Bitte eine Firma wählen."),
  deal_id: optionalUuid,
  titel: requiredText("Bitte einen Titel eingeben."),
  status: z.enum(enums.project_status, "Bitte einen gültigen Status wählen."),
  start: optionalDate,
  deadline: optionalDate,
  festpreis: optionalEuroAmount,
  interner_stundensatz: optionalEuroAmount,
});

export const timeEntrySchema = z.object({
  datum: requiredDate("Bitte ein Datum angeben."),
  dauer: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()).transform((value, ctx) => {
    const parsed = parseDuration(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.error });
      return z.NEVER;
    }
    return parsed.minutes;
  }),
  beschreibung: optionalText,
});

const positiveInt = (message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : null),
    z.number({ message }).int(message).min(0, message).nullable(),
  );

export const retainerSchema = z.object({
  company_id: requiredUuid("Bitte eine Firma wählen."),
  deal_id: optionalUuid,
  titel: requiredText("Bitte einen Titel eingeben."),
  monatsbetrag: euroAmount,
  leistungsumfang: optionalText,
  start: requiredDate("Bitte ein Startdatum angeben."),
  laufzeit_monate: positiveInt("Bitte die Mindestlaufzeit in ganzen Monaten angeben.").refine((v) => v !== 0, {
    message: "Die Mindestlaufzeit muss mindestens 1 Monat sein (leer = monatlich kündbar).",
  }),
  kuendigungsfrist_tage: positiveInt("Bitte die Kündigungsfrist in Tagen angeben.").transform((v) => v ?? 30),
});
