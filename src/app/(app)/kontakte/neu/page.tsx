import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { getCompanyOptions } from "@/lib/queries";
import { firstParam } from "@/lib/search";

import { createContact } from "../actions";
import { ContactForm } from "../contact-form";

export const metadata: Metadata = { title: "Neuer Kontakt" };

export default async function NewContactPage(props: PageProps<"/kontakte/neu">) {
  const companyId = firstParam((await props.searchParams).firma);
  const { supabase } = await requireVerifiedSession();
  const companyOptions = await getCompanyOptions(supabase);

  return (
    <>
      <PageHeader title="Neuer Kontakt" />
      <ContactForm
        action={createContact}
        contact={{ company_id: companyId }}
        companyOptions={companyOptions}
        submitLabel="Kontakt anlegen"
      />
    </>
  );
}
