import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";

import { createCompany } from "../actions";
import { CompanyForm } from "../company-form";

export const metadata: Metadata = { title: "Neue Firma" };

export default function NewCompanyPage() {
  return (
    <>
      <PageHeader title="Neue Firma" description="Die Kundennummer wird automatisch vergeben." />
      <CompanyForm action={createCompany} withFirstContact submitLabel="Firma anlegen" />
    </>
  );
}
