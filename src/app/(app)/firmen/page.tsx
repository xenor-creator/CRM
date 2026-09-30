import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CompanyStatusBadge } from "@/components/company-status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireVerifiedSession } from "@/lib/auth/session";
import { companyStatusLabels, labelOptions } from "@/lib/labels";
import { firstParam, ilikeAny, sanitizeSearchTerm } from "@/lib/search";
import { Constants, type Enums } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Firmen" };

const sortOptions = {
  name: { label: "Name A–Z", column: "name", ascending: true },
  neueste: { label: "Neueste zuerst", column: "created_at", ascending: false },
  kundennummer: { label: "Kundennummer", column: "kundennummer", ascending: true },
} as const;

type SortKey = keyof typeof sortOptions;

const isStatus = (value: string | undefined): value is Enums<"company_status"> =>
  (Constants.public.Enums.company_status as readonly string[]).includes(value ?? "");

export default async function CompaniesPage(props: PageProps<"/firmen">) {
  const params = await props.searchParams;
  const q = sanitizeSearchTerm(firstParam(params.q));
  const status = firstParam(params.status);
  const branche = firstParam(params.branche) ?? "";
  const sortParam = firstParam(params.sort);
  const sort: SortKey = sortParam && sortParam in sortOptions ? (sortParam as SortKey) : "name";

  const { supabase } = await requireVerifiedSession();

  let query = supabase
    .from("companies")
    .select("id, name, kundennummer, branche, ort, domain, status")
    .order(sortOptions[sort].column, { ascending: sortOptions[sort].ascending })
    .limit(500);
  if (q) query = query.or(ilikeAny(["name", "kundennummer", "domain", "ort"], q));
  if (isStatus(status)) query = query.eq("status", status);
  if (branche) query = query.eq("branche", branche);

  const [{ data: companies, error }, { data: branchen }] = await Promise.all([
    query,
    supabase.from("companies").select("branche").not("branche", "is", null),
  ]);

  const branchOptions = [...new Set((branchen ?? []).map((b) => b.branche as string))].sort((a, b) =>
    a.localeCompare(b, "de"),
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Firmen" description="Leads, Kunden und ehemalige Kunden." />
        <Button asChild>
          <Link href="/firmen/neu">
            <Plus />
            Neue Firma
          </Link>
        </Button>
      </div>

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <Input name="q" defaultValue={q} placeholder="Suche nach Name, Kundennummer, Domain, Ort" aria-label="Suche" />
        <NativeSelect name="status" defaultValue={isStatus(status) ? status : ""} aria-label="Status">
          <option value="">Alle Status</option>
          {labelOptions(companyStatusLabels).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="branche" defaultValue={branche} aria-label="Branche">
          <option value="">Alle Branchen</option>
          {branchOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="sort" defaultValue={sort} aria-label="Sortierung">
          {Object.entries(sortOptions).map(([key, option]) => (
            <option key={key} value={key}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Anwenden
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Die Firmen konnten nicht geladen werden.
        </p>
      ) : companies.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Firmen gefunden.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Nr.</TableHead>
              <TableHead className="hidden md:table-cell">Branche</TableHead>
              <TableHead className="hidden md:table-cell">Ort</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/firmen/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                  {c.domain && <span className="text-muted-foreground block text-xs">{c.domain}</span>}
                </TableCell>
                <TableCell>{c.kundennummer}</TableCell>
                <TableCell className="hidden md:table-cell">{c.branche}</TableCell>
                <TableCell className="hidden md:table-cell">{c.ort}</TableCell>
                <TableCell>
                  <CompanyStatusBadge status={c.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
