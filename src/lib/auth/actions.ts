"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { LOGIN_PATH } from "./routing";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
