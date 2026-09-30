import { z } from "zod";

import { berlinLocalToIso } from "@/lib/dates";
import { Constants } from "@/lib/supabase/database.types";

import { optionalDate, optionalText, optionalUuid, requiredText } from "./fields";

const enums = Constants.public.Enums;

// datetime-local input in Berlin time; empty means "now" (database default).
const optionalLocalDateTime = z
  .preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string())
  .transform((value, ctx) => {
    if (value === "") return undefined;
    try {
      return berlinLocalToIso(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "Bitte einen gültigen Zeitpunkt eingeben." });
      return z.NEVER;
    }
  });

export const activitySchema = z
  .object({
    typ: z.enum(enums.activity_typ, "Bitte eine Art wählen."),
    inhalt: optionalText,
    zeitpunkt: optionalLocalDateTime,
    company_id: optionalUuid,
    contact_id: optionalUuid,
    deal_id: optionalUuid,
    project_id: optionalUuid,
  })
  .refine((a) => a.company_id || a.contact_id || a.deal_id || a.project_id, {
    message: "Bitte eine Firma oder einen Deal zuordnen.",
  });

export type ActivityInput = z.infer<typeof activitySchema>;

export const taskSchema = z.object({
  titel: requiredText("Bitte einen Titel eingeben."),
  faellig_am: optionalDate,
  prioritaet: z.preprocess(
    (value) => (value === "" || value == null ? "mittel" : value),
    z.enum(enums.task_prioritaet, "Bitte eine Priorität wählen."),
  ),
  company_id: optionalUuid,
  deal_id: optionalUuid,
  project_id: optionalUuid,
});

export type TaskInput = z.infer<typeof taskSchema>;
