import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { getCompanyOptions } from "@/lib/queries";
import { firstParam } from "@/lib/search";

import { createRetainer } from "../actions";
import { RetainerForm } from "../retainer-form";

export const metadata: Metadata = { title: "Neuer Retainer" };

export default async function NewRetainerPage(props: PageProps<"/retainer/neu">) {
  const companyId = firstParam((await props.searchParams).firma);
  const { supabase } = await requireVerifiedSession();
  const companyOptions = await getCompanyOptions(supabase);
  return (
    <>
      <PageHeader title="Neuer Retainer" />
      <RetainerForm action={createRetainer} retainer={{ company_id: companyId }} companyOptions={companyOptions} submitLabel="Retainer anlegen" />
    </>
  );
}
