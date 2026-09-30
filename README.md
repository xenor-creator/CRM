# Agentur-CRM

Selbstgebautes CRM für eine Ein-Personen-KI-Automatisierungsagentur: Lead → Deal → Projekt und/oder Retainer → Rechnung, angebunden an n8n. Spezifikation: [`docs/pflichtenheft.md`](docs/pflichtenheft.md), Arbeitsregeln: [`CLAUDE.md`](CLAUDE.md).

## Einrichtung

Voraussetzungen: Node.js 22, pnpm 10, [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

### 1. Supabase-Projekt (Region Frankfurt)

1. Im Supabase-Dashboard ein Projekt in der Region **Frankfurt (eu-central-1)** anlegen.
2. Repo verknüpfen und Schema anwenden:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push                # wendet supabase/migrations an
   supabase config push            # übernimmt [auth] aus supabase/config.toml: Registrierung aus, TOTP an
   ```
3. Unter **Authentication → URL Configuration** die Site-URL auf die Vercel-Domain setzen.
4. Den einzigen Nutzer anlegen: **Authentication → Users → Add user → Create new user** (E-Mail + starkes Passwort, „Auto Confirm User“ aktivieren). Beim ersten Login wird die Zwei-Faktor-Einrichtung erzwungen.

### 2. Lokale Entwicklung

```bash
pnpm install
cp .env.example .env.local      # Werte aus Supabase → Project Settings → API Keys eintragen
pnpm dev
```

### 3. Vercel

1. Repo in Vercel importieren (Framework: Next.js). Die Funktionsregion `fra1` ist in `vercel.json` festgelegt.
2. Umgebungsvariablen `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` für Production und Preview setzen.
3. Jeder Push auf den Produktionsbranch löst ein Deployment aus.

## Befehle

```bash
pnpm dev          # Entwicklungsserver
pnpm build        # Produktions-Build
pnpm lint         # ESLint
pnpm typecheck    # Routentypen erzeugen + tsc --noEmit
pnpm test         # Unit-Tests (Vitest)
pnpm test:db      # SQL-Tests für RLS, 2FA-Pflicht, Nummern, Rechnungsschutz (braucht DATABASE_URL, z. B. nach `supabase start`)
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## Sicherheitsmodell

- Die Proxy-Schicht (`src/proxy.ts`) leitet ohne Sitzung auf `/login` um und ohne bestandene 2FA auf `/2fa`. Das geschützte Layout prüft beides zusätzlich serverseitig.
- In der Datenbank greifen alle Policies nur mit `owner_id = auth.uid()` **und** einer 2FA-bestätigten Sitzung (`aal2`). Ein gestohlenes Passwort allein öffnet also keine Tabelle.
- Versendete Rechnungen sind per Trigger unveränderlich. Es ist nur noch der Statuswechsel auf Bezahlt oder Überfällig möglich, Korrekturen laufen über eine Stornorechnung.
- Kundennummern (`K1001` ff.) vergibt die Datenbank über eine gesperrte Zählertabelle.
