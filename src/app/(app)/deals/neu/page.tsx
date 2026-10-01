import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { getCompanyOptions, getContactOptions } from "@/lib/queries";
import { firstParam } from "@/lib/search";

import { createDeal } from "../actions";
import { DealForm } from "../deal-form";

export const metadata: Metadata = { title: "Neuer Deal" };

export default async function NewDealPage(props: PageProps<"/deals/neu">) {
  const companyId = firstParam((await props.searchParams).firma);
  const { supabase } = await requireVerifiedSession();
  const [companyOptions, contactOptions] = await Promise.all([
    getCompanyOptions(supabase),
    getContactOptions(supabase),
  ]);

  return (
    <>
      <PageHeader title="Neuer Deal" description="Neue Deals starten in der ersten Phase („Neu“)." />
      <DealForm
        action={createDeal}
        deal={{ company_id: companyId }}
        companyOptions={companyOptions}
        contactOptions={contactOptions}
        submitLabel="Deal anlegen"
      />
    </>
  );
}
