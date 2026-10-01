# Datenschutz-Checkliste

Stand: Phase 5. Die Checkliste stammt aus dem Pflichtenheft. „Im Code erledigt“ heißt: umgesetzt und getestet. „Manuell“ heißt: Das musst du selbst erledigen, die Software kann es nicht.

| # | Punkt | Stand | Wo / wie |
| --- | --- | --- | --- |
| 1 | AVV mit Supabase und Vercel abschließen, bevor echte Kundendaten importiert werden | **Manuell** | Supabase: DPA über [supabase.com/legal/dpa](https://supabase.com/legal/dpa) anfordern und unterschreiben (im Dashboard unter *Organization → Legal Documents*). Vercel: DPA unter [vercel.com/legal/dpa](https://vercel.com/legal/dpa), gilt mit den Nutzungsbedingungen; PDF ablegen. Beide Anbieter sind US-Unternehmen: Übermittlung auf Basis des EU-US Data Privacy Framework bzw. Standardvertragsklauseln (im DPA enthalten). Gilt ebenso für den Hoster deiner n8n-Instanz und den Backup-Speicher. |
| 2 | Supabase-Projekt in der Region Frankfurt, Vercel-Funktionen auf fra1 | Im Code erledigt (fra1) / **manuell** (Supabase-Region) | `vercel.json` setzt `fra1`. Region *Frankfurt (eu-central-1)* beim Anlegen des Supabase-Projekts wählen, siehe README. |
| 3 | Row-Level-Security auf allen Tabellen ab der ersten Migration, Zugriff nur für die eigene User-ID | Im Code erledigt | Jede Tabelle in `supabase/migrations/` mit `owner_id = auth.uid()` **und** 2FA-Sitzung (`aal2`); geprüft in `supabase/sql-tests/`. |
| 4 | Zwei-Faktor-Login aktivieren, öffentliche Registrierung abschalten | Im Code erledigt / **manuell** (`supabase config push`) | TOTP wird beim ersten Login erzwungen (`src/proxy.ts`, `(auth)/2fa`). `supabase/config.toml` schaltet die Registrierung ab; mit `supabase config push` übernehmen. |
| 5 | Service-Role-Key nur serverseitig, niemals im Browser-Code | Im Code erledigt | Nur in `src/lib/supabase/service.ts` (`server-only`), ohne `NEXT_PUBLIC_`-Präfix. Genutzt von REST-API, Webhooks und Cron. |
| 6 | Löschfunktion je Kontakt und Firma inkl. Aktivitäten und Dateien (Art. 17); Rechnungen bleiben erhalten | Im Code erledigt | Button „Löschen“ auf Firma und Kontakt. Der Dialog zeigt, was gelöscht wird und was bleibt. Gelöscht werden Kontakte, Deals, Projekte, Retainer, Aktivitäten, Aufgaben, Dateien samt Speicherobjekten und Einträge im Webhook-Protokoll. Rechnungen und versendete Angebote bleiben mit eingefrorenen Empfängerdaten erhalten (Aufbewahrungspflicht). |
| 7 | Datenexport je Kontakt als JSON (Art. 15) | Im Code erledigt | Button „Datenauskunft (JSON)“ auf der Kontaktseite: Stammdaten, Einwilligung, Firma, Deals, Aktivitäten, Rechnungen und Angebote mit diesem Kontakt. |
| 8 | Einwilligung für Marketing mit Datum speichern | Im Code erledigt | `contacts.einwilligung_marketing` und `einwilligung_datum`, Datum per Trigger beim Setzen, beim Widerruf entfernt. |
| 9 | Tägliches Backup | Im Code erledigt / **manuell** | Supabase: tägliche Backups ab dem Pro-Plan (7 Tage), Point-in-Time-Recovery als Add-on. Zusätzlich `GET /api/v1/export` und `GET /api/v1/files/{id}`; den täglichen n8n-Workflow beschreibt `docs/api.md`. Backup-Speicher in der EU wählen, Wiederherstellung einmal testen. |
| 10 | Eintrag ins Verzeichnis der Verarbeitungstätigkeiten | Entwurf erstellt / **manuell** | [`verarbeitungsverzeichnis.md`](verarbeitungsverzeichnis.md) prüfen, Platzhalter ausfüllen und das Verzeichnis außerhalb des Repos führen. |

## Weitere Maßnahmen im Code

- Das Webhook-Protokoll (`webhook_events`) enthält personenbezogene Daten. Abgeschlossene Einträge löscht der tägliche Cron nach 30 Tagen.
- API-Keys liegen nur als SHA-256-Hash vor. Webhooks sind mit HMAC-SHA256 signiert.
- Dateien: nur PDF, Bilder und Office-Dokumente bis 10 MB, privater Bucket, Zugriff nur mit 2FA-Sitzung im eigenen Ordner.
- Keine echten Kundendaten in Tests, Seeds oder Beispielen.

## Aufbewahrung (mit Steuerberater bestätigen)

| Daten | Frist | Umsetzung |
| --- | --- | --- |
| Rechnungen (Buchungsbelege) | 8 Jahre (§ 147 AO, seit 2025) | Nicht löschbar, bleiben beim Löschen der Firma erhalten |
| Versendete Angebote (Handelsbriefe) | 6 Jahre (§ 257 HGB) | Nicht löschbar, bleiben beim Löschen von Deal und Firma erhalten |
| Leads ohne Vertrag | Solange zweckdienlich; Vorschlag: nach 2 Jahren ohne Aktivität löschen | Manuell über „Löschen“ |
| Webhook-Protokoll | 30 Tage | Automatisch per Cron |
| Externe Backups | Vorschlag: 30 Tage | Im n8n-Workflow |

Nach Ablauf der Fristen gibt es noch keine Löschfunktion für Rechnungen. Sie werden frühestens 2034 fällig und können bis dahin ergänzt werden.
