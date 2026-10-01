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
2. Umgebungsvariablen für Production und Preview setzen (siehe `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Secret Key, nur serverseitig) und `CRON_SECRET` (zufällige Zeichenkette, mindestens 16 Zeichen).
3. Jeder Push auf den Produktionsbranch löst ein Deployment aus. Der tägliche Cron (`/api/cron/daily`, 05:00 UTC) ist in `vercel.json` hinterlegt.

### 4. n8n anbinden

API-Key und Webhook-Ziele richtest du unter **Einstellungen** ein. Alle Endpunkte, das Webhook-Format und ein fertiges Snippet zur Signaturprüfung stehen in [`docs/api.md`](docs/api.md).

### 5. Rechnungen und E-Rechnung

Vor dem ersten Angebot bzw. der ersten Rechnung unter **Einstellungen → Firmendaten** Name, Adresse, Steuernummer oder USt-IdNr., IBAN und Zahlungsziel eintragen. Ohne diese Angaben lässt sich nichts abschließen.

- Rechnungen entstehen aus Projekten (Festpreis, Abschlag, Schlussrechnung mit Abzug der Abschläge) und als Monatsentwurf aus Retainern (täglicher Cron am Abrechnungstag, im Voraus).
- „Abschließen“ vergibt die Nummer (`RE-JJJJ-NNNN-Kxxxx`) in der Datenbank, friert Absender- und Empfängerdaten ein und erzeugt ein PDF/A-3 mit eingebetteter E-Rechnung (ZUGFeRD, Profil EN 16931). PDF und XML liegen im Storage-Bucket `dokumente`.
- Korrekturen nur über „Stornorechnung erstellen“.
- Prüfen lässt sich eine Rechnung z. B. mit dem [Mustang-Validator](https://www.mustangproject.org/commandline/): `java -jar Mustang-CLI.jar --action validate --source RE-….pdf`.

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
- Versendete Rechnungen sind per Trigger unveränderlich. Es sind nur noch die Statuswechsel auf Bezahlt, Überfällig oder Storniert möglich, Korrekturen laufen über eine Stornorechnung.
- Kundennummern (`K1001` ff.) vergibt die Datenbank über eine gesperrte Zählertabelle.
- Die REST-API (`/api/v1`) prüft API-Keys per SHA-256-Hash und arbeitet mit dem Service-Role-Key (nur in `src/lib/supabase/service.ts`). Jede Abfrage ist fest auf den Eigentümer des Keys begrenzt, auch verknüpfte IDs in Anfragen werden geprüft.
- Webhooks entstehen per Datenbank-Trigger in derselben Transaktion wie die Änderung (Outbox) und werden mit HMAC-SHA256 signiert.

## Drittanbieter-Dateien

- Schrift **Inter** (`src/lib/pdf/assets/Inter-*.ttf`) unter der SIL Open Font License 1.1, siehe `src/lib/pdf/assets/Inter-OFL.txt`.
- Farbprofil **sRGB** (`src/lib/pdf/assets/sRGB.icc`) des International Color Consortium, frei verwendbar; nötig für PDF/A.
