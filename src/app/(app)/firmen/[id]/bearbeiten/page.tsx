import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";

import { updateCompany } from "../../actions";
import { CompanyForm } from "../../company-form";

export const metadata: Metadata = { title: "Firma bearbeiten" };

export default async function EditCompanyPage(props: PageProps<"/firmen/[id]/bearbeiten">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!company) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`${company.name} bearbeiten`} description={company.kundennummer} />
      <CompanyForm action={updateCompany.bind(null, id)} company={company} submitLabel="Speichern" />
    </>
  );
}
