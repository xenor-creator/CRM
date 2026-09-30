import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { LOGIN_PATH, TWO_FACTOR_PATH } from "./routing";

// Second line of defence behind the proxy: every protected layout calls this.
export async function requireVerifiedSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    redirect(LOGIN_PATH);
  }
  if (claims.aal !== "aal2") {
    redirect(TWO_FACTOR_PATH);
  }

  return { supabase, userId: claims.sub, email: claims.email ?? null };
}
