import { LogOut } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireVerifiedSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { email } = await requireVerifiedSession();

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="bg-sidebar border-sidebar-border flex flex-col border-b md:sticky md:top-0 md:h-svh md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:py-5">
          <span className="font-semibold">Agentur-CRM</span>
          <form action={signOut} className="md:hidden">
            <Button type="submit" variant="ghost" size="icon" aria-label="Abmelden">
              <LogOut />
            </Button>
          </form>
        </div>
        <AppNav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-visible md:pb-0" />
        <div className="hidden border-t p-3 md:block">
          <p className="text-muted-foreground mb-2 truncate px-1 text-xs">{email}</p>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              <LogOut />
              Abmelden
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
