import { Download, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireVerifiedSession } from "@/lib/auth/session";
import { contactName } from "@/lib/names";
import { firstParam, ilikeAny, sanitizeSearchTerm } from "@/lib/search";

export const metadata: Metadata = { title: "Kontakte" };

export default async function ContactsPage(props: PageProps<"/kontakte">) {
  const q = sanitizeSearchTerm(firstParam((await props.searchParams).q));
  const { supabase } = await requireVerifiedSession();

  let query = supabase
    .from("contacts")
    .select("id, vorname, nachname, email, telefon, position, ist_hauptkontakt, companies(id, name)")
    .order("nachname")
    .limit(500);
  if (q) query = query.or(ilikeAny(["vorname", "nachname", "email", "position"], q));
  const { data: contacts, error } = await query;

  return (
    <>
      <PageHeader
        title="Kontakte"
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/kontakte/export" download>
                <Download />
                Export
              </a>
            </Button>
            <Button asChild>
              <Link href="/kontakte/neu">
                <Plus />
                Neuer Kontakt
              </Link>
            </Button>
          </>
        }
      />

      <form className="mb-4 flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Suche nach Name, E-Mail, Position" aria-label="Suche" />
        <Button type="submit" variant="secondary">
          Suchen
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Die Kontakte konnten nicht geladen werden.
        </p>
      ) : contacts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Kontakte gefunden.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead className="hidden md:table-cell">E-Mail</TableHead>
              <TableHead className="hidden md:table-cell">Telefon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/kontakte/${c.id}`} className="hover:underline">
                    {contactName(c)}
                  </Link>
                  {c.ist_hauptkontakt && (
                    <Badge variant="secondary" className="ml-2">
                      Hauptkontakt
                    </Badge>
                  )}
                  {c.position && <span className="text-muted-foreground block text-xs">{c.position}</span>}
                </TableCell>
                <TableCell>
                  {c.companies && (
                    <Link href={`/firmen/${c.companies.id}`} className="hover:underline">
                      {c.companies.name}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">{c.email}</TableCell>
                <TableCell className="hidden md:table-cell">{c.telefon}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
