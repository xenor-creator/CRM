import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Rechnungen" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Rechnungen"
      phase={4}
      scope="Angebote und Rechnungen als PDF und ZUGFeRD mit fortlaufenden Nummern."
    />
  );
}
