import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Deals" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Deals"
      phase={2}
      scope="Kanban-Board über alle Vertriebsphasen mit Summe je Spalte, Verlustgrund und Gewonnen-Dialog."
    />
  );
}
