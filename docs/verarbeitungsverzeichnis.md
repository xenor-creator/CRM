# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) – Entwurf

> Entwurf aus dem Funktionsumfang des CRM. Bitte prüfen, die Platzhalter `[…]` ausfüllen und das Verzeichnis außerhalb des Repos führen (es enthält Angaben zu deiner Person). Keine Rechtsberatung.

## Verantwortlicher

- Name, Anschrift: `[Firmenname, Inhaber, Anschrift]`
- Kontakt: `[E-Mail, Telefon]`
- Datenschutzbeauftragter: nicht erforderlich (weniger als 20 Personen ständig mit der Verarbeitung beschäftigt, § 38 BDSG)

## Verarbeitungstätigkeit: Kundenbeziehungsmanagement (CRM)

| Angabe | Inhalt |
| --- | --- |
| Zwecke | Anbahnung und Pflege von Geschäftsbeziehungen (Leads, Deals, Angebote), Durchführung von Projekten und Betreuungsverträgen (Retainer), Rechnungsstellung, Erfüllung steuer- und handelsrechtlicher Aufbewahrungspflichten |
| Rechtsgrundlagen | Art. 6 Abs. 1 lit. b DSGVO (Vertrag und vorvertragliche Maßnahmen), lit. c (Aufbewahrungspflichten nach AO und HGB), lit. f (berechtigtes Interesse an der Kundenansprache im B2B-Bereich), lit. a (Einwilligung für Marketing, mit Datum gespeichert) |
| Betroffene | Ansprechpartner von Interessenten und Kunden (Unternehmen) |
| Datenkategorien | Name, geschäftliche E-Mail, Telefon, Position, LinkedIn-Profil; Firmenstammdaten und Adresse; Gesprächsnotizen und Aktivitäten; Angebots- und Rechnungsdaten; Einwilligung mit Datum; hochgeladene Dokumente (z. B. Verträge) |
| Besondere Kategorien (Art. 9) | Keine; in Notizen und Dateien keine aufnehmen |
| Empfänger | Auftragsverarbeiter: Supabase Inc. (Datenbank, Authentifizierung, Dateien; Region Frankfurt), Vercel Inc. (Hosting, Funktionen in Frankfurt), `[Hoster der n8n-Instanz]`, `[Backup-Speicher]`. Weitere Empfänger: `[Steuerberater]` (Rechnungen) |
| Drittlandübermittlung | USA (Supabase Inc., Vercel Inc. als Unternehmen mit Sitz in den USA; Daten in der EU gespeichert): EU-US Data Privacy Framework bzw. Standardvertragsklauseln im jeweiligen DPA. `[Zertifizierung im DPF-Register prüfen]` |
| Löschfristen | Rechnungen 8 Jahre, versendete Angebote 6 Jahre (jeweils ab Ende des Kalenderjahres); Leads ohne Vertrag `[z. B. 2 Jahre nach letzter Aktivität]`; Webhook-Protokoll 30 Tage; externe Backups `[z. B. 30 Tage]`; im Übrigen Löschung auf Verlangen oder bei Wegfall des Zwecks |

## Technische und organisatorische Maßnahmen (Art. 32)

- **Zugang:** genau ein Nutzer; Passwort und Zwei-Faktor-Authentifizierung (TOTP) sind Pflicht; keine öffentliche Registrierung.
- **Zugriff:** Row-Level-Security auf allen Tabellen. Zugriff nur auf eigene Datensätze und nur mit 2FA-Sitzung. Der Service-Schlüssel wird nur serverseitig verwendet.
- **Schnittstellen:** API-Keys nur als Hash gespeichert und widerrufbar; ausgehende Webhooks mit HMAC-SHA256 signiert; Eingaben serverseitig validiert.
- **Übertragung und Speicherung:** TLS (HTTPS mit HSTS), Verschlüsselung der Datenbank und Dateien beim Anbieter, privater Datei-Speicher.
- **Verfügbarkeit:** tägliche Backups bei Supabase und zusätzlicher Export per n8n an einen getrennten Speicher; Wiederherstellung `[Datum des letzten Tests]`.
- **Datensparsamkeit:** Webhook-Protokoll nach 30 Tagen gelöscht; Löschfunktion je Firma und Kontakt inklusive Dateien; Datenauskunft je Kontakt als JSON.
- **Integrität:** fortlaufende Rechnungsnummern in der Datenbank vergeben; versendete Rechnungen und Angebote unveränderlich, Korrektur nur per Storno.

## Betroffenenrechte

- Auskunft (Art. 15): „Datenauskunft (JSON)“ auf der Kontaktseite.
- Löschung (Art. 17): „Löschen“ bei Kontakt bzw. Firma. Rechnungen und Angebote bleiben wegen Art. 17 Abs. 3 lit. b erhalten.
- Berichtigung (Art. 16): „Bearbeiten“.
- Widerspruch gegen Werbung (Art. 21): Einwilligung am Kontakt entfernen.
