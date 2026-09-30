import { redirect } from "next/navigation";

import { HOME_PATH } from "@/lib/auth/routing";

export default function RootPage() {
  redirect(HOME_PATH);
}
