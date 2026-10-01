// Columns returned by the API (owner_id is never exposed).
export const COMPANY_COLUMNS =
  "id, kundennummer, name, website, domain, branche, groesse, strasse, plz, ort, land, ust_id, mitarbeiterzahl, tool_stack, schmerzpunkte, automatisierungspotenzial, notizen, status, created_at, updated_at" as const;

export const CONTACT_COLUMNS =
  "id, company_id, vorname, nachname, email, telefon, position, linkedin, ist_hauptkontakt, einwilligung_marketing, einwilligung_datum, created_at, updated_at" as const;

export const DEAL_COLUMNS =
  "id, company_id, contact_id, titel, wert_einmalig, wert_monatlich, wahrscheinlichkeit, erwarteter_abschluss, quelle, verlustgrund, abgeschlossen_am, created_at, updated_at, stage:deal_stages!inner(id, name, art), company:companies(id, name, kundennummer)" as const;

export const ACTIVITY_COLUMNS =
  "id, typ, inhalt, zeitpunkt, company_id, contact_id, deal_id, project_id, created_at" as const;

export const TASK_COLUMNS =
  "id, titel, faellig_am, erledigt, prioritaet, company_id, deal_id, project_id, created_at, updated_at" as const;

export const INVOICE_COLUMNS =
  "id, nummer, art, datum, faellig_am, summe_netto, ust_satz, summe_brutto, status, project_id, retainer_id, created_at, updated_at, company:companies(id, name, kundennummer, contacts(vorname, nachname, email, ist_hauptkontakt))" as const;
