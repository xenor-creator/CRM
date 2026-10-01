import { z } from "zod";

import { UNITS } from "@/lib/invoices/line-items";

import { optionalDate, optionalText, requiredDate } from "./fields";

const decimals = (value: number, places: number) => Math.abs(value * 10 ** places - Math.round(value * 10 ** places)) < 1e-6;

export const lineItemSchema = z.object({
  beschreibung: z.string().trim().min(1, "Jede Position braucht eine Beschreibung.").max(500, "Beschreibung zu lang (max. 500 Zeichen)."),
  menge: z
    .number({ message: "Bitte eine Menge angeben." })
    .refine((v) => v !== 0, "Die Menge darf nicht 0 sein.")
    .refine((v) => decimals(v, 3), "Menge mit höchstens drei Nachkommastellen."),
  einheit: z.enum(UNITS, "Unbekannte Einheit."),
  einzelpreis: z
    .number({ message: "Bitte einen Einzelpreis angeben." })
    .refine((v) => decimals(v, 2), "Einzelpreis mit höchstens zwei Nachkommastellen.")
    .refine((v) => Math.abs(v) <= 9_999_999_999.99, "Einzelpreis zu groß."),
});

const lineItems = z
  .preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }, z.array(lineItemSchema, "Die Positionen sind ungültig."))
  .refine((items) => items.length <= 100, "Höchstens 100 Positionen.");

const vatRate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN),
  z.number({ message: "Bitte einen USt-Satz angeben." }).min(0, "Ungültiger USt-Satz.").max(100, "Ungültiger USt-Satz."),
);

export const invoiceDraftSchema = z
  .object({
    positionen: lineItems,
    ust_satz: vatRate,
    leistung_von: requiredDate("Bitte das Leistungsdatum bzw. den Beginn des Leistungszeitraums angeben."),
    leistung_bis: optionalDate,
    hinweis: optionalText,
  })
  .refine((d) => !d.leistung_bis || d.leistung_bis >= d.leistung_von, {
    message: "Das Ende des Leistungszeitraums liegt vor dem Beginn.",
  });

export const quoteDraftSchema = z.object({
  positionen: lineItems,
  ust_satz: vatRate,
  gueltig_bis: optionalDate,
  hinweis: optionalText,
});
