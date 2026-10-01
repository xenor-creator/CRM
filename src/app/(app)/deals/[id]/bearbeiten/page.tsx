import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { getCompanyOptions, getContactOptions } from "@/lib/queries";

import { updateDeal } from "../../actions";
import { DealForm } from "../../deal-form";

export const metadata: Metadata = { title: "Deal bearbeiten" };

export default async function EditDealPage(props: PageProps<"/deals/[id]/bearbeiten">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const [{ data: deal }, companyOptions, contactOptions] = await Promise.all([
    supabase.from("deals").select("*").eq("id", id).maybeSingle(),
    getCompanyOptions(supabase),
    getContactOptions(supabase),
  ]);
  if (!deal) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`${deal.titel} bearbeiten`} />
      <DealForm
        action={updateDeal.bind(null, id)}
        deal={deal}
        companyOptions={companyOptions}
        contactOptions={contactOptions}
        submitLabel="Speichern"
      />
    </>
  );
}
