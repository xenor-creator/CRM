import { z } from "zod";

import {
  euroAmount,
  optionalDate,
  optionalPercent,
  optionalText,
  optionalUuid,
  requiredText,
  requiredUuid,
} from "./fields";

export const dealSchema = z.object({
  company_id: requiredUuid("Bitte eine Firma wählen."),
  contact_id: optionalUuid,
  titel: requiredText("Bitte einen Titel eingeben."),
  wert_einmalig: euroAmount,
  wert_monatlich: euroAmount,
  wahrscheinlichkeit: optionalPercent,
  erwarteter_abschluss: optionalDate,
  quelle: optionalText,
});

export type DealInput = z.infer<typeof dealSchema>;

export const stageChangeSchema = z.object({
  stage_id: requiredUuid("Bitte eine Phase wählen."),
  verlustgrund: optionalText,
});
