# Agentur-CRM

Selbstgebautes CRM für eine Ein-Personen-KI-Automatisierungsagentur. Deckt den gesamten Kundenweg ab: Lead → Deal → Projekt und/oder Retainer → Rechnung. Vollständig per REST-API und Webhooks in n8n eingebunden.

Die vollständige Spezifikation steht in `docs/pflichtenheft.md`. Lies sie vor jeder größeren Aufgabe. Bei Widersprüchen gilt das Pflichtenheft, nicht deine Annahme. Wenn etwas im Pflichtenheft fehlt oder unklar ist: nachfragen, nicht raten.

## Aktueller Stand

- Aktuelle Phase: **Phase 1 – Fundament** (Code fertig, Abnahme offen)
- Erledigt:
  - Next.js-16-Projekt mit TypeScript strict, Tailwind v4, shadcn/ui-Basis (Button, Input, Label, Card), Vitest
  - Migration `20260930120000_initial_schema.sql`: alle Tabellen aus dem Pflichtenheft plus `settings`, `deal_stages`, `number_counters`, `api_keys`; RLS überall mit `owner_id = auth.uid()` und Pflicht auf `aal2`; Storage-Bucket `dokumente`; Kundennummer per Trigger; Schutz versendeter Rechnungen per Trigger; Standardphasen je Nutzer
  - SQL-Tests in `supabase/sql-tests/` (`pnpm test:db`)
  - Login mit E-Mail und Passwort, erzwungene TOTP-Einrichtung und -Abfrage, Routenschutz in `src/proxy.ts` (Next 16: `proxy` statt `middleware`)
  - Geschützte Oberfläche mit Navigation; Module späterer Phasen als Platzhalter
  - `vercel.json` mit Region `fra1`
- Offen für die Abnahme von Phase 1 (manuell): Supabase-Projekt anlegen, `supabase db push` und `supabase config push`, Nutzer anlegen, Vercel verbinden, Typen mit `supabase gen types` neu erzeugen (die aktuelle Datei wurde aus einem lokalen Postgres mit identischem Format erzeugt)
- Abweichungen und Ergänzungen zum Pflichtenheft:
  - Adresse bei `companies` und `settings` strukturiert (`strasse`, `plz`, `ort`, `land`), weil ZUGFeRD sie getrennt verlangt
  - `deals.stage_id` verweist auf `deal_stages`, statt die Phase als Text zu speichern
  - `invoices` zusätzlich mit `art` (Rechnung, Abschlag, Schluss, Storno) und `storno_von_id`; `company_id` wird beim Löschen einer Firma auf `null` gesetzt, damit Rechnungen erhalten bleiben
  - `invoices.nummer` und `quotes.nummer` bleiben bis zur Vergabe leer; die Vergabe erfolgt in Phase 4 beim Versenden, damit keine Lücken durch gelöschte Entwürfe entstehen
  - `tasks` dürfen ohne Verknüpfung existieren (Schnellerfassung); `activities` und `files` brauchen mindestens eine Verknüpfung
  - Werte für `tasks.prioritaet` (niedrig, mittel, hoch) sind nicht im Pflichtenheft festgelegt
  - `service.ts` und der Browser-Client folgen erst, wenn sie gebraucht werden (Phase 2 bzw. 3)
- Nächster Schritt: Phase 2 – Vertrieb

Aktualisiere diesen Abschnitt am Ende jeder Phase.

## Tech-Stack

- Next.js (App Router, aktuelle stabile Version), TypeScript im strict mode
- Tailwind CSS + shadcn/ui
- Supabase: Postgres (Region Frankfurt), Auth, Storage, Client über `@supabase/ssr`
- PDF-Erzeugung: `@react-pdf/renderer`; E-Rechnung im ZUGFeRD-Format (Profil EN 16931) ab Phase 4
- Hosting: Vercel, Funktionsregion `fra1`, Cron über Vercel Cron
- Paketmanager: pnpm
- Validierung: zod (Formulare, API-Eingaben, Umgebungsvariablen)

Neue Abhängigkeiten nur nach Rückfrage. Keine zusätzlichen Frameworks für State-Management, ORM oder UI-Bibliotheken ohne ausdrückliche Zustimmung.

## Befehle

```bash
pnpm dev                 # Entwicklungsserver
pnpm build               # Produktions-Build (muss vor jedem Commit fehlerfrei laufen)
pnpm lint                # ESLint
pnpm typecheck           # tsc --noEmit
pnpm test                # Tests (Vitest)
pnpm test:db             # SQL-Tests (RLS, Nummern, Rechnungsschutz) gegen DATABASE_URL
supabase migration new <name>   # neue Migration anlegen
supabase db push                # Migrationen auf das verknüpfte Projekt anwenden
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## Projektstruktur

```
src/
  app/
    (auth)/            # Login, 2FA
    (app)/             # geschützte Oberfläche: dashboard, firmen, kontakte, deals, projekte, retainer, rechnungen, einstellungen
    api/v1/            # öffentliche REST-API für n8n (API-Key-geschützt)
    api/cron/          # Vercel-Cron-Endpunkte
  components/          # eigene Komponenten
  components/ui/       # shadcn/ui (nicht manuell umbauen)
  lib/
    supabase/          # Clients (server, browser, service), generierte Typen
    validation/        # zod-Schemas
    webhooks/          # Versand, Signatur, Wiederholung
    pdf/               # Angebots- und Rechnungsvorlagen
supabase/
  migrations/          # einzige Quelle für das Datenbankschema
docs/
  pflichtenheft.md
```

## Konventionen

- Oberfläche komplett auf Deutsch. Code, Kommentare und Commit-Messages auf Englisch.
- Datenbank: Tabellen und Spalten in snake_case, Namen wie im Pflichtenheft, keine Umlaute in Bezeichnern (`gekuendigt`, nicht `gekündigt`).
- Jede Tabelle hat `id uuid primary key default gen_random_uuid()`, `created_at` und `updated_at` (per Trigger gepflegt).
- Geldbeträge als `numeric(12,2)` in EUR, nie als float. Anzeige mit `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.
- Datumsanzeige im deutschen Format (TT.MM.JJJJ), Speicherung als `date` bzw. `timestamptz`.
- Server Components und Server Actions bevorzugen. Client Components nur, wo Interaktivität nötig ist (Kanban, Timer, Dialoge).
- Datenzugriff aus der Oberfläche immer mit der Session des eingeloggten Nutzers, damit RLS greift.
- Kleine, gut benannte Funktionen. Keine toten Codepfade, keine auskommentierten Blöcke.

## Datenbank-Regeln (nicht verhandelbar)

1. Schemaänderungen ausschließlich über Dateien in `supabase/migrations/`. Nie Änderungen direkt im Supabase-Dashboard vorschlagen.
2. Row-Level-Security ist auf **jeder** Tabelle aktiviert, ab der ersten Migration. Jede Zeile hat eine `owner_id uuid references auth.users` mit Default `auth.uid()`; Policies erlauben Zugriff nur, wenn `owner_id = auth.uid()`.
3. Nach jeder Migration die TypeScript-Typen neu generieren.
4. Rechnungsnummern werden in der Datenbank vergeben (Sequenz bzw. Zählertabelle mit Sperre), nie im Client. Eine versendete Rechnung ist unveränderlich; Korrektur nur über Stornorechnung.
5. Nummernschema: `RE-JJJJ-NNNN-Kxxxx` bzw. `AN-JJJJ-NNNN-Kxxxx`. Der fortlaufende Teil `NNNN` ist pro Jahr eindeutig und läuft jährlich neu; die Kundennummer (`K1001`, fortlaufend) ist nur Zusatzinfo.

## Sicherheit

- Der Supabase Service-Role-Key wird nur serverseitig in `src/lib/supabase/service.ts` verwendet, nie in Client Components und nie mit dem Präfix `NEXT_PUBLIC_`.
- Öffentliche Registrierung ist deaktiviert; es gibt genau einen Nutzer. Zwei-Faktor-Authentifizierung (TOTP) ist Pflicht.
- API-Keys für n8n werden nur als Hash gespeichert und als `Authorization: Bearer <key>` geprüft.
- Ausgehende Webhooks werden mit HMAC-SHA256 signiert (Header `X-CRM-Signature`).
- Alle API-Eingaben mit zod validieren; bei Fehlern `400` mit verständlicher Meldung.
- Keine echten Kundendaten in Tests, Seeds oder Beispielen.
- Umgebungsvariablen nur in `.env.local` (nicht eingecheckt) und in Vercel; `.env.example` pflegen.

## Arbeitsweise

- Vor größeren Aufgaben zuerst einen kurzen Plan vorlegen und auf Freigabe warten.
- Eine Aufgabe nach der anderen. Keine Funktionen bauen, die nicht zur aktuellen Aufgabe gehören.
- Nach jedem abgeschlossenen, funktionierenden Schritt: `pnpm lint`, `pnpm typecheck`, `pnpm build` ausführen, dann einen Commit mit aussagekräftiger Message vorschlagen.
- Für Geschäftslogik mit Geld, Nummern und Fristen (Rechnungssummen, Nummernvergabe, Retainer-Fristen) Tests schreiben.
- Wenn eine Anforderung aus dem Pflichtenheft technisch ungünstig ist, das offen sagen und eine Alternative vorschlagen, statt sie stillschweigend anders umzusetzen.
- Am Ende jeder Sitzung kurz zusammenfassen: was erledigt ist, was offen ist, was als Nächstes kommt.

@AGENTS.md
