# REST-API und Webhooks für n8n

Basis-URL: `https://<deine-domain>/api/v1`. Alle Anfragen und Antworten sind JSON (UTF-8).

## Authentifizierung

API-Keys erzeugst du unter **Einstellungen → API-Keys für n8n**. Der Key wird genau einmal angezeigt und im CRM nur als SHA-256-Hash gespeichert. Für jede n8n-Instanz ist ein eigener Key sinnvoll, denn Keys lassen sich einzeln widerrufen.

```
Authorization: Bearer crm_…
```

In n8n: HTTP-Request-Node → Authentication „Generic Credential Type“ → „Header Auth“ mit Name `Authorization` und Wert `Bearer crm_…`.

## Konventionen

- **Erfolg:** `{ "data": … }`. Listen haben zusätzlich `"pagination": { "limit", "offset", "total" }`.
- **Fehler:** `{ "error": { "message": "…", "details": [{ "path": "contact.email", "message": "…" }] } }`.

| Status | Bedeutung |
| --- | --- |
| 400 | Ungültige Eingabe (Details in `details`), z. B. fehlender Verlustgrund |
| 401 | API-Key fehlt, ist falsch oder widerrufen |
| 404 | Datensatz nicht gefunden |
| 409 | Datensatz existiert bereits |
| 500 | Interner Fehler |

- Unbekannte Felder werden mit `400` abgelehnt, damit Tippfehler in Workflows sofort auffallen.
- Beträge sind Zahlen in EUR netto mit höchstens zwei Nachkommastellen (`4800.5`).
- Ein Datum hat die Form `JJJJ-MM-TT`, ein Zeitpunkt ISO 8601 mit Zeitzone (`2026-10-01T09:30:00+02:00`).
- Listen: `limit` (1–200, Standard 50) und `offset` (Standard 0). Mit `updated_since` (ISO-Zeitpunkt) holst du nur geänderte Datensätze.
- Leere Strings und `null` leeren optionale Felder.

## Endpunkte

### `POST /leads`: Lead anlegen mit Dublettenabgleich

```json
{
  "company": { "name": "Beispiel GmbH", "website": "https://beispiel.de", "branche": "Handwerk", "tool_stack": ["Excel"] },
  "contact": { "vorname": "Erika", "nachname": "Muster", "email": "erika@beispiel.de", "telefon": "+49 30 123456" },
  "deal": { "titel": "Angebotsautomatisierung", "wert_einmalig": 4800, "quelle": "Website-Formular" },
  "notiz": "Kontaktformular: Angebote dauern zu lange"
}
```

Pflicht sind nur `company.name` und `contact.nachname`. `deal` ist optional, der Titel lautet sonst „Anfrage <Firma>“.

**Abgleich:**
1. Passt die E-Mail zu einem vorhandenen Kontakt, werden dessen Firma und der Kontakt übernommen.
2. Sonst wird eine Firma mit derselben Domain übernommen (Website oder E-Mail-Domain, Freemailer wie gmail.com ausgenommen), und der Kontakt wird neu angelegt.
3. Sonst entstehen Firma (Status „Lead“, neue Kundennummer) und Kontakt (als Hauptkontakt) neu.
4. Hat die Firma bereits einen offenen Deal, entsteht kein zweiter. Am bestehenden Deal wird eine Notiz-Aktivität protokolliert. Sonst entsteht ein Deal in der Phase „Neu“.
5. `notiz` wird immer als Aktivität am Deal gespeichert.

Antwort `201` (neuer Deal) oder `200` (bestehender Deal):

```json
{
  "data": {
    "company": { "id": "…", "kundennummer": "K1004", "status": "matched", "matched_by": "email" },
    "contact": { "id": "…", "status": "matched" },
    "deal": { "id": "…", "status": "existing" }
  }
}
```

`status` ist `created`, `matched` bzw. beim Deal `created` oder `existing`. `matched_by` ist `email`, `domain` oder `null`.

### Firmen

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| GET | `/companies` | Filter: `q` (Name, Kundennummer, Domain, Ort), `domain`, `kundennummer`, `status` (`lead`, `kunde`, `ehemalig`), `updated_since` |
| POST | `/companies` | Firma anlegen; Pflicht: `name`. Die Kundennummer vergibt das CRM. |
| GET | `/companies/{id}` | Eine Firma |
| PATCH | `/companies/{id}` | Felder ändern, z. B. `{ "status": "kunde" }` |

Felder: `name`, `website`, `branche`, `groesse`, `strasse`, `plz`, `ort`, `land` (z. B. `DE`), `ust_id`, `mitarbeiterzahl`, `tool_stack` (Liste), `schmerzpunkte`, `automatisierungspotenzial` (`niedrig`, `mittel`, `hoch`), `notizen`, `status`.

### Kontakte

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| GET | `/contacts` | Filter: `email`, `company_id`, `updated_since` |
| POST | `/contacts` | Pflicht: `company_id`, `nachname` |
| GET | `/contacts/{id}` | Ein Kontakt |
| PATCH | `/contacts/{id}` | Felder ändern |

Felder: `vorname`, `nachname`, `email`, `telefon`, `position`, `linkedin`, `ist_hauptkontakt`, `einwilligung_marketing`. Das Einwilligungsdatum setzt das CRM automatisch.

### Deals

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| GET | `/deals` | Filter: `status` (`offen`, `gewonnen`, `verloren`), `stage` (Phasenname), `company_id`, `updated_since` |
| GET | `/deals/{id}` | Ein Deal mit `stage` und `company` |
| PATCH | `/deals/{id}` | Felder ändern oder die Phase wechseln |

Phasenwechsel per Name (Groß-/Kleinschreibung egal) oder per `stage_id`:

```json
{ "stage": "Verloren", "verlustgrund": "Budget erst im nächsten Jahr" }
```

Ohne Verlustgrund lehnt die API den Wechsel auf „Verloren“ mit `400` ab. Weitere Felder: `titel`, `wert_einmalig`, `wert_monatlich`, `wahrscheinlichkeit` (0–100), `erwarteter_abschluss`, `quelle`, `contact_id`.

### `POST /activities`: Aktivität protokollieren

```json
{ "typ": "mail", "inhalt": "Angebot per Mail versendet", "email": "erika@beispiel.de" }
```

- `typ`: `anruf`, `mail`, `meeting` oder `notiz`. `zeitpunkt` ist optional, Standard ist jetzt.
- Verknüpfung über mindestens eines der Felder `company_id`, `contact_id`, `deal_id`, `project_id` oder `email`. Bei `email` sucht das CRM den Kontakt, ohne Treffer kommt `404`.
- Die Firma wird aus Deal oder Kontakt übernommen.

### `POST /tasks`: Aufgabe anlegen

```json
{ "titel": "Angebot nachfassen", "faellig_am": "2026-10-08", "prioritaet": "hoch", "deal_id": "…" }
```

### `GET /invoices?status=overdue`: überfällige Rechnungen

`status` akzeptiert `entwurf`, `versendet`, `bezahlt`, `ueberfaellig`, `storniert` oder englisch `draft`, `sent`, `paid`, `overdue`, `cancelled`. Jede Rechnung enthält `company` samt Kontakten, für die Zahlungserinnerung per n8n. `zahlbetrag` ist der offene Betrag nach Abzug geleisteter Abschläge.

Rechnungen werden täglich ab dem Tag nach `faellig_am` automatisch auf `ueberfaellig` gesetzt. Stornorechnungen (`art = "stornorechnung"`) werden nie überfällig.

### `GET /invoices/{id}/pdf`: Rechnungs-PDF

Liefert das PDF (PDF/A-3 mit eingebetteter E-Rechnung `factur-x.xml`, ZUGFeRD-Profil EN 16931) einer abgeschlossenen Rechnung als `application/pdf`. Für Entwürfe und fremde Rechnungen antwortet die API mit `404`. In n8n den HTTP-Request-Knoten auf „Response Format: File“ stellen, um das PDF z. B. an eine E-Mail anzuhängen.

## Webhooks

Die Ziel-URL je Ereignis trägst du unter **Einstellungen → Webhooks an n8n** ein. Ohne URL wird das Ereignis nicht gesendet. Mit dem Button „Test“ schickst du ein Test-Ereignis (`"test": true`).

| Ereignis | Auslöser |
| --- | --- |
| `deal.created` | Neuer Deal (Oberfläche, API, Lead) |
| `deal.stage_changed` | Phasenwechsel, enthält `previous_stage` |
| `deal.won` / `deal.lost` | Wechsel auf „Gewonnen“ bzw. „Verloren“ (zusätzlich zu `deal.stage_changed`) |
| `task.overdue` | Täglich, einmal je überfälliger Aufgabe |
| `invoice.created` | Rechnung abgeschlossen (Nummer vergeben, PDF erzeugt), auch Stornorechnungen |
| `invoice.overdue` | Täglich, wenn eine versendete Rechnung die Fälligkeit überschritten hat |
| `invoice.paid` | Rechnung als bezahlt markiert |
| `retainer.ending_soon` | Täglich, einmal je Frist: 30 Tage vor Ablauf der Kündigungsfrist (`hinweis.kind = "kuendigungsfrist"`) und vor dem Laufzeitende (`"laufzeitende"`) |

Die `invoice.*`-Ereignisse enthalten `data.invoice` (alle Rechnungsfelder inklusive `nummer`, `zahlbetrag`, `positionen`) und `data.company`. Das PDF holst du über `GET /invoices/{id}/pdf`. `retainer.ending_soon` enthält `data.hinweis` (`kind`, `date`, `days`), `data.retainer` und `data.company`.

### Anfrage

```
POST <deine n8n-URL>
Content-Type: application/json
X-CRM-Event: deal.stage_changed
X-CRM-Delivery: 7c0e…        (eindeutige ID, bei Wiederholungen gleich)
X-CRM-Timestamp: 1790841600   (Unix-Sekunden)
X-CRM-Signature: sha256=<hex>
```

```json
{
  "id": "7c0e…",
  "event": "deal.stage_changed",
  "occurred_at": "2026-10-01T09:30:00.123+00:00",
  "data": {
    "deal": { "id": "…", "titel": "Angebotsautomatisierung", "wert_einmalig": 4800, "stage_id": "…" },
    "stage": { "id": "…", "name": "Erstgespräch", "art": "offen" },
    "previous_stage": { "id": "…", "name": "Qualifiziert", "art": "offen" },
    "company": { "id": "…", "name": "Beispiel GmbH", "kundennummer": "K1001", "website": "…" },
    "contact": { "id": "…", "vorname": "Erika", "nachname": "Muster", "email": "…" }
  }
}
```

### Zustellung und Wiederholung

- Jede Antwort mit 2xx gilt als zugestellt. Alles andere zählt als Fehlschlag, auch Weiterleitungen und Zeitüberschreitungen nach 8 Sekunden.
- Bei einem Fehlschlag folgen bis zu drei Wiederholungen nach 10 s, 60 s und 150 s.
- Was danach noch offen ist, stellt der tägliche Cron (`/api/cron/daily`, 05:00 UTC) erneut zu.
- Alle Versuche stehen unter **Einstellungen → Letzte Zustellungen** und in der Tabelle `webhook_events`.
- Nutze `X-CRM-Delivery`, um doppelte Zustellungen in n8n zu erkennen.

### Signatur in n8n prüfen

Die Signatur ist HMAC-SHA256 mit deinem Webhook-Geheimnis über `<X-CRM-Timestamp>.<Body>`.

1. Im Webhook-Node unter Options **Raw Body** aktivieren.
2. Danach ein Code-Node. Bei selbst gehostetem n8n muss `crypto` erlaubt sein: `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.

```js
const crypto = require("crypto");
const secret = $env.CRM_WEBHOOK_SECRET; // oder als Credential hinterlegen
const item = $input.first();
const headers = item.json.headers;
const rawBody = Buffer.from(item.binary.data.data, "base64").toString("utf8");

const timestamp = Number(headers["x-crm-timestamp"]);
if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
  throw new Error("Webhook zu alt oder ohne Zeitstempel");
}

const expected = "sha256=" + crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
const given = String(headers["x-crm-signature"] ?? "");
if (given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
  throw new Error("Ungültige Signatur");
}

return [{ json: JSON.parse(rawBody) }];
```

Ohne Raw Body funktioniert auch `JSON.stringify(item.json.body)` als `rawBody`, weil das CRM den Body mit `JSON.stringify` ohne Leerzeichen erzeugt. Raw Body ist aber robuster.
