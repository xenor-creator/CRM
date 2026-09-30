"use server";

import { redirect } from "next/navigation";

import { HOME_PATH } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";
import { totpVerifySchema, type FormState } from "@/lib/validation/auth";

export type EnrollmentResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

// Starts TOTP enrollment. Leftover unverified factors from aborted attempts are removed first.
export async function startTotpEnrollment(): Promise<EnrollmentResult> {
  const supabase = await createClient();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    return { ok: false, error: "Die Zwei-Faktor-Einrichtung konnte nicht gestartet werden." };
  }
  if (factors.totp.length > 0) {
    return { ok: false, error: "Die Zwei-Faktor-Authentifizierung ist bereits eingerichtet." };
  }
  for (const factor of factors.all.filter((f) => f.status === "unverified")) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Agentur-CRM",
    issuer: "Agentur-CRM",
  });
  if (error) {
    return { ok: false, error: "Die Zwei-Faktor-Einrichtung konnte nicht gestartet werden." };
  }

  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = totpVerifySchema.safeParse({
    factorId: formData.get("factorId"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
  if (error) {
    return { error: "Der Code ist ungültig oder abgelaufen. Bitte erneut versuchen." };
  }

  redirect(HOME_PATH);
}
