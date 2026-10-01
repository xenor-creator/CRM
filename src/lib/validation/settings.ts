import { z } from "zod";

import { isValidIban, normalizeIban } from "@/lib/iban";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

import { optionalEmail, optionalText, requiredText } from "./fields";

export const apiKeySchema = z.object({
  name: requiredText("Bitte einen Namen für den Key eingeben.").pipe(z.string().max(100, "Höchstens 100 Zeichen.")),
});

const webhookUrl = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.union([
    z.literal(""),
    z.url({ protocol: /^https?$/, message: "Bitte eine gültige http(s)-URL eingeben." }).max(2000),
  ]),
);

// One URL field per event, named "url:<event>"; empty fields are dropped.
export const webhookUrlsSchema = z
  .object(Object.fromEntries(WEBHOOK_EVENTS.map((e) => [`url:${e.name}`, webhookUrl])))
  .transform((fields) =>
    Object.fromEntries(
      Object.entries(fields)
        .filter(([, url]) => url !== "")
        .map(([key, url]) => [key.slice(4), url as string]),
    ),
  );

const percent = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN),
  z.number({ message: "Bitte einen Steuersatz angeben." }).min(0).max(100),
);
const days = (message: string) =>
  z.preprocess((v) => (typeof v === "string" ? Number(v) : NaN), z.number({ message }).int(message).min(1, message).max(365, message));

export const companySettingsSchema = z
  .object({
    firmenname: requiredText("Bitte den Firmennamen angeben."),
    inhaber: optionalText,
    strasse: requiredText("Bitte die Straße angeben."),
    plz: requiredText("Bitte die PLZ angeben."),
    ort: requiredText("Bitte den Ort angeben."),
    land: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v : "DE"),
      z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Bitte das Land als zweistelligen Code angeben."),
    ),
    email: optionalEmail,
    telefon: optionalText,
    website: optionalText,
    ust_id: optionalText,
    steuernummer: optionalText,
    bank_name: optionalText,
    iban: requiredText("Bitte die IBAN angeben.")
      .transform(normalizeIban)
      .refine(isValidIban, "Die IBAN ist ungültig (Prüfsumme)."),
    bic: optionalText,
    standard_ust_satz: percent,
    zahlungsziel_tage: days("Bitte das Zahlungsziel in Tagen (1–365) angeben."),
    angebot_gueltig_tage: days("Bitte die Angebotsgültigkeit in Tagen (1–365) angeben."),
  })
  .refine((s) => s.ust_id || s.steuernummer, {
    message: "Für Rechnungen ist die Steuernummer oder die USt-IdNr. Pflicht (§ 14 UStG).",
  });
