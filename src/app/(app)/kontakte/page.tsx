import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Kontakte" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Kontakte"
      phase={2}
      scope="Kontakte je Firma mit Hauptkontakt und Marketing-Einwilligung."
    />
  );
}
