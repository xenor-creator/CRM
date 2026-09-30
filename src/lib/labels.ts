import type { Enums } from "@/lib/supabase/database.types";

export const companyStatusLabels: Record<Enums<"company_status">, string> = {
  lead: "Lead",
  kunde: "Kunde",
  ehemalig: "Ehemalig",
};

export const potenzialLabels: Record<Enums<"automatisierungspotenzial">, string> = {
  niedrig: "Niedrig",
  mittel: "Mittel",
  hoch: "Hoch",
};

export const activityTypLabels: Record<Enums<"activity_typ">, string> = {
  anruf: "Anruf",
  mail: "Mail",
  meeting: "Meeting",
  notiz: "Notiz",
};

export const prioritaetLabels: Record<Enums<"task_prioritaet">, string> = {
  niedrig: "Niedrig",
  mittel: "Mittel",
  hoch: "Hoch",
};

export const projectStatusLabels: Record<Enums<"project_status">, string> = {
  geplant: "Geplant",
  in_arbeit: "In Arbeit",
  abnahme: "Abnahme",
  abgeschlossen: "Abgeschlossen",
};

export const retainerStatusLabels: Record<Enums<"retainer_status">, string> = {
  aktiv: "Aktiv",
  gekuendigt: "Gekündigt",
  beendet: "Beendet",
};

export const invoiceStatusLabels: Record<Enums<"invoice_status">, string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  bezahlt: "Bezahlt",
  ueberfaellig: "Überfällig",
};

export function labelOptions<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}
