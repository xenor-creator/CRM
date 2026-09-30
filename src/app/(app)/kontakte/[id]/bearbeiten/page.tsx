import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireVerifiedSession } from "@/lib/auth/session";
import { contactName } from "@/lib/names";
import { getCompanyOptions } from "@/lib/queries";

import { updateContact } from "../../actions";
import { ContactForm } from "../../contact-form";

export const metadata: Metadata = { title: "Kontakt bearbeiten" };

export default async function EditContactPage(props: PageProps<"/kontakte/[id]/bearbeiten">) {
  const { id } = await props.params;
  const { supabase } = await requireVerifiedSession();
  const [{ data: contact }, companyOptions] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
    getCompanyOptions(supabase),
  ]);
  if (!contact) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`${contactName(contact)} bearbeiten`} />
      <ContactForm
        action={updateContact.bind(null, id)}
        contact={contact}
        companyOptions={companyOptions}
        submitLabel="Speichern"
      />
    </>
  );
}
