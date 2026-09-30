import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Projekte" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Projekte"
      phase={4}
      scope="Projekte aus gewonnenen Deals, Zeiterfassung mit Timer und Rentabilität."
    />
  );
}
