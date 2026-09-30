import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Firmen" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Firmen"
      phase={2}
      scope="Liste mit Suche, Filter und Sortierung, Detailseite mit Aktivitätenleiste, Dublettenprüfung, CSV-Import und -Export."
    />
  );
}
