"use client";

import {
  Building2,
  CalendarCheck,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  Repeat,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/heute", label: "Heute", icon: CalendarCheck },
  { href: "/firmen", label: "Firmen", icon: Building2 },
  { href: "/kontakte", label: "Kontakte", icon: Users },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/projekte", label: "Projekte", icon: FolderKanban },
  { href: "/retainer", label: "Retainer", icon: Repeat },
  { href: "/rechnungen", label: "Rechnungen", icon: FileText },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors pointer-coarse:min-h-11",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
