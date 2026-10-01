import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";

import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "CSV-Import" };

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Firmen importieren" description="CSV-Datei mit Semikolon, Komma oder Tab als Trennzeichen." />
      <ImportWizard />
    </>
  );
}
