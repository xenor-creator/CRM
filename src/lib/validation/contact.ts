import { z } from "zod";

import { checkbox, optionalEmail, optionalText, requiredText, requiredUuid } from "./fields";

export const contactSchema = z.object({
  company_id: requiredUuid("Bitte eine Firma wählen."),
  vorname: optionalText,
  nachname: requiredText("Bitte einen Nachnamen eingeben."),
  email: optionalEmail,
  telefon: optionalText,
  position: optionalText,
  linkedin: optionalText,
  ist_hauptkontakt: checkbox,
  einwilligung_marketing: checkbox,
});

export type ContactInput = z.infer<typeof contactSchema>;
