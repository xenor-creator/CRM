import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(1, "Bitte das Passwort eingeben."),
});

export const totpVerifySchema = z.object({
  factorId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Der Code besteht aus 6 Ziffern."),
});

export type FormState = { error: string | null };
