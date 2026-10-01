import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { getCompanyOptions } from "@/lib/queries";

import { updateProject } from "../../actions";
import { ProjectForm } from "../../project-form";

export const metadata: Metadata = { title: "Projekt bearbeiten" };

export default async function EditProjectPage(props: PageProps<"/projekte/[id]/bearbeiten">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const [{ data: project }, companyOptions] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    getCompanyOptions(supabase),
  ]);
  if (!project) notFound();
  return (
    <>
      <PageHeader title={`${project.titel} bearbeiten`} />
      <ProjectForm action={updateProject.bind(null, id)} project={project} companyOptions={companyOptions} submitLabel="Speichern" />
    </>
  );
}
