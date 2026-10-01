import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { getCompanyOptions } from "@/lib/queries";

import { updateRetainer } from "../../actions";
import { RetainerForm } from "../../retainer-form";

export const metadata: Metadata = { title: "Retainer bearbeiten" };

export default async function EditRetainerPage(props: PageProps<"/retainer/[id]/bearbeiten">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const [{ data: retainer }, companyOptions] = await Promise.all([
    supabase.from("retainers").select("*").eq("id", id).maybeSingle(),
    getCompanyOptions(supabase),
  ]);
  if (!retainer) notFound();
  return (
    <>
      <PageHeader title={`${retainer.titel} bearbeiten`} />
      <RetainerForm action={updateRetainer.bind(null, id)} retainer={retainer} companyOptions={companyOptions} submitLabel="Speichern" />
    </>
  );
}
