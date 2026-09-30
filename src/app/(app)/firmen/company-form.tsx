"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  CheckboxField,
  FormError,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
  valueOf,
} from "@/components/form/fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialFormState, type FormState } from "@/lib/form-state";
import { companyStatusLabels, labelOptions, potenzialLabels } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

type CompanyDefaults = Partial<Tables<"companies">>;

const duplicateReasons: Record<string, string> = {
  email: "gleiche E-Mail",
  domain: "gleiche Domain",
};

export function CompanyForm({
  action,
  company = {},
  withFirstContact = false,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  company?: CompanyDefaults;
  withFirstContact?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = (name: keyof CompanyDefaults) => valueOf(state, name, company[name] as string | number | null);

  return (
    <form action={formAction} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name *" name="name" defaultValue={v("name")} required className="sm:col-span-2" />
          <TextField label="Website" name="website" defaultValue={v("website")} placeholder="beispiel.de" />
          <SelectField
            label="Status"
            name="status"
            defaultValue={v("status") || "lead"}
            options={labelOptions(companyStatusLabels)}
          />
          <TextField label="Branche" name="branche" defaultValue={v("branche")} />
          <TextField label="Größe" name="groesse" defaultValue={v("groesse")} placeholder="z. B. KMU" />
          <TextField
            label="Mitarbeiterzahl"
            name="mitarbeiterzahl"
            defaultValue={v("mitarbeiterzahl")}
            inputMode="numeric"
          />
          <TextField label="USt-IdNr." name="ust_id" defaultValue={v("ust_id")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-6">
          <TextField label="Straße" name="strasse" defaultValue={v("strasse")} className="sm:col-span-6" />
          <TextField label="PLZ" name="plz" defaultValue={v("plz")} className="sm:col-span-2" />
          <TextField label="Ort" name="ort" defaultValue={v("ort")} className="sm:col-span-3" />
          <TextField label="Land" name="land" defaultValue={v("land") || "DE"} maxLength={2} className="sm:col-span-1" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automatisierung</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Genutzte Tools"
            name="tool_stack"
            defaultValue={state.values?.tool_stack ?? (company.tool_stack ?? []).join(", ")}
            placeholder="Kommagetrennt, z. B. HubSpot, Excel, Outlook"
          />
          <SelectField
            label="Automatisierungspotenzial"
            name="automatisierungspotenzial"
            defaultValue={v("automatisierungspotenzial")}
            options={labelOptions(potenzialLabels)}
            emptyLabel="Nicht bewertet"
          />
          <TextAreaField label="Schmerzpunkte" name="schmerzpunkte" defaultValue={v("schmerzpunkte")} className="sm:col-span-2" />
          <TextAreaField label="Notizen" name="notizen" defaultValue={v("notizen")} className="sm:col-span-2" />
        </CardContent>
      </Card>

      {withFirstContact && (
        <Card>
          <CardHeader>
            <CardTitle>Hauptkontakt (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <TextField label="Vorname" name="kontakt_vorname" defaultValue={valueOf(state, "kontakt_vorname", "")} />
            <TextField label="Nachname" name="kontakt_nachname" defaultValue={valueOf(state, "kontakt_nachname", "")} />
            <TextField
              label="E-Mail"
              name="kontakt_email"
              type="email"
              defaultValue={valueOf(state, "kontakt_email", "")}
            />
          </CardContent>
        </Card>
      )}

      {state.duplicates && state.duplicates.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle>Mögliche Dubletten</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ul className="grid gap-1 text-sm">
              {state.duplicates.map((d) => (
                <li key={d.company_id}>
                  <Link href={`/firmen/${d.company_id}`} className="font-medium underline" target="_blank">
                    {d.company_name}
                  </Link>{" "}
                  ({d.kundennummer}, {d.grund.split(",").map((g) => duplicateReasons[g] ?? g).join(" und ")})
                </li>
              ))}
            </ul>
            <CheckboxField
              label="Ist keine Dublette, trotzdem anlegen"
              name="duplikat_bestaetigt"
              defaultChecked={false}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
