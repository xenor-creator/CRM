import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { getCompanyOptions } from "@/lib/queries";
import { firstParam } from "@/lib/search";

import { createProject } from "../actions";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "Neues Projekt" };

export default async function NewProjectPage(props: PageProps<"/projekte/neu">) {
  const companyId = firstParam((await props.searchParams).firma);
  const { supabase } = await requireVerifiedSession();
  const companyOptions = await getCompanyOptions(supabase);
  return (
    <>
      <PageHeader title="Neues Projekt" />
      <ProjectForm action={createProject} project={{ company_id: companyId }} companyOptions={companyOptions} submitLabel="Projekt anlegen" />
    </>
  );
}
