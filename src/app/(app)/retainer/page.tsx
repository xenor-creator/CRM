import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Retainer" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Retainer"
      phase={4}
      scope="Aktive Retainer mit MRR, Fristen-Hinweisen und automatischen Rechnungsentwürfen."
    />
  );
}
