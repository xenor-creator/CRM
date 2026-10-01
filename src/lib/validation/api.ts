import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";

// API error messages in German, also for zod's built-in checks.
z.config(z.locales.de());

const enums = Constants.public.Enums;

const MAX_AMOUNT = 9_999_999_999.99;

const text = (max = 5000) => z.string().trim().max(max);
const required = (max: number, message: string) => text(max).min(1, message);

// Optional text: empty strings become null; null clears the field on PATCH.
const nullableText = (max = 5000) =>
  text(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

const amount = z
  .number()
  .min(0)
  .max(MAX_AMOUNT)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: "Höchstens zwei Nachkommastellen.",
  });

const email = z.string().trim().toLowerCase().pipe(z.email());

const companyFields = {
  name: required(300, "Bitte einen Firmennamen angeben."),
  website: nullableText(500),
  branche: nullableText(200),
  groesse: nullableText(200),
  strasse: nullableText(300),
  plz: nullableText(20),
  ort: nullableText(200),
  land: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Zweistelliger Ländercode, z. B. DE.")
    .transform((v) => v.toUpperCase())
    .optional(),
  ust_id: nullableText(50),
  mitarbeiterzahl: z.number().int().min(0).nullable().optional(),
  tool_stack: z.array(text(100).min(1)).max(50).optional(),
  schmerzpunkte: nullableText(),
  automatisierungspotenzial: z.enum(enums.automatisierungspotenzial).nullable().optional(),
  notizen: nullableText(),
  status: z.enum(enums.company_status).optional(),
};

export const apiCompanyCreate = z.strictObject(companyFields);
export const apiCompanyUpdate = z
  .strictObject(companyFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Mindestens ein Feld angeben.");

const contactFields = {
  vorname: nullableText(200),
  nachname: required(200, "Bitte einen Nachnamen angeben."),
  email: email.nullable().optional(),
  telefon: nullableText(100),
  position: nullableText(200),
  linkedin: nullableText(500),
  einwilligung_marketing: z.boolean().optional(),
};

export const apiContactCreate = z.strictObject({
  ...contactFields,
  company_id: z.uuid(),
  ist_hauptkontakt: z.boolean().optional(),
});
export const apiContactUpdate = z
  .strictObject({ ...contactFields, company_id: z.uuid(), ist_hauptkontakt: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Mindestens ein Feld angeben.");

const dealFields = {
  titel: required(300, "Bitte einen Titel angeben."),
  wert_einmalig: amount,
  wert_monatlich: amount,
  wahrscheinlichkeit: z.number().int().min(0).max(100).nullable(),
  erwarteter_abschluss: z.iso.date().nullable(),
  quelle: nullableText(200),
};

export const apiDealUpdate = z
  .strictObject({
    ...dealFields,
    contact_id: z.uuid().nullable(),
    stage: text(100).min(1),
    stage_id: z.uuid(),
    verlustgrund: nullableText(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Mindestens ein Feld angeben.")
  .refine((v) => !(v.stage && v.stage_id), "Entweder „stage“ oder „stage_id“ angeben, nicht beides.");

export const apiLeadCreate = z.strictObject({
  company: apiCompanyCreate,
  contact: z.strictObject(contactFields),
  deal: z.strictObject(dealFields).partial().optional(),
  notiz: text().min(1).optional(),
});

export const apiActivityCreate = z
  .strictObject({
    typ: z.enum(enums.activity_typ),
    inhalt: nullableText(20000),
    zeitpunkt: z.iso.datetime({ offset: true }).optional(),
    company_id: z.uuid().optional(),
    contact_id: z.uuid().optional(),
    deal_id: z.uuid().optional(),
    project_id: z.uuid().optional(),
    email: email.optional(),
  })
  .refine((a) => a.company_id || a.contact_id || a.deal_id || a.project_id || a.email, {
    message: "Mindestens eine Verknüpfung angeben: company_id, contact_id, deal_id, project_id oder email.",
  });

export const apiTaskCreate = z.strictObject({
  titel: required(300, "Bitte einen Titel angeben."),
  faellig_am: z.iso.date().nullable().optional(),
  prioritaet: z.enum(enums.task_prioritaet).optional(),
  company_id: z.uuid().optional(),
  deal_id: z.uuid().optional(),
  project_id: z.uuid().optional(),
});

const limit = z.coerce.number().int().min(1).max(200).default(50);
const offset = z.coerce.number().int().min(0).default(0);
const updatedSince = z.iso.datetime({ offset: true }).optional();

export const apiCompanyQuery = z.strictObject({
  limit,
  offset,
  q: text(100).optional(),
  domain: text(200).optional(),
  kundennummer: text(20).optional(),
  status: z.enum(enums.company_status).optional(),
  updated_since: updatedSince,
});

export const apiContactQuery = z.strictObject({
  limit,
  offset,
  email: email.optional(),
  company_id: z.uuid().optional(),
  updated_since: updatedSince,
});

export const apiDealQuery = z.strictObject({
  limit,
  offset,
  status: z.enum(enums.deal_stage_art).optional(),
  stage: text(100).optional(),
  company_id: z.uuid().optional(),
  updated_since: updatedSince,
});

// English aliases are accepted for n8n workflows (e.g. ?status=overdue).
const invoiceStatusAliases: Record<string, (typeof enums.invoice_status)[number]> = {
  draft: "entwurf",
  sent: "versendet",
  paid: "bezahlt",
  overdue: "ueberfaellig",
  cancelled: "storniert",
};

export const apiInvoiceQuery = z.strictObject({
  limit,
  offset,
  status: z
    .string()
    .transform((v) => invoiceStatusAliases[v] ?? v)
    .pipe(z.enum(enums.invoice_status))
    .optional(),
  company_id: z.uuid().optional(),
});
