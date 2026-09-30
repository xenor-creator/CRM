"use server";

import { redirect } from "next/navigation";

import { TWO_FACTOR_PATH } from "@/lib/auth/routing";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen." };
  }

  redirect(TWO_FACTOR_PATH);
}
