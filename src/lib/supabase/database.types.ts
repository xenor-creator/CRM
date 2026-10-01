export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          inhalt: string | null
          owner_id: string
          project_id: string | null
          typ: Database["public"]["Enums"]["activity_typ"]
          updated_at: string
          zeitpunkt: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          inhalt?: string | null
          owner_id?: string
          project_id?: string | null
          typ: Database["public"]["Enums"]["activity_typ"]
          updated_at?: string
          zeitpunkt?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          inhalt?: string | null
          owner_id?: string
          project_id?: string | null
          typ?: Database["public"]["Enums"]["activity_typ"]
          updated_at?: string
          zeitpunkt?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_praefix: string
          name: string
          owner_id: string
          updated_at: string
          widerrufen_am: string | null
          zuletzt_genutzt_am: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_praefix: string
          name: string
          owner_id?: string
          updated_at?: string
          widerrufen_am?: string | null
          zuletzt_genutzt_am?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_praefix?: string
          name?: string
          owner_id?: string
          updated_at?: string
          widerrufen_am?: string | null
          zuletzt_genutzt_am?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          automatisierungspotenzial: Database["public"]["Enums"]["automatisierungspotenzial"] | null
          branche: string | null
          created_at: string
          domain: string | null
          groesse: string | null
          id: string
          kundennummer: string
          land: string
          mitarbeiterzahl: number | null
          name: string
          notizen: string | null
          ort: string | null
          owner_id: string
          plz: string | null
          schmerzpunkte: string | null
          status: Database["public"]["Enums"]["company_status"]
          strasse: string | null
          tool_stack: string[]
          updated_at: string
          ust_id: string | null
          website: string | null
        }
        Insert: {
          automatisierungspotenzial?: Database["public"]["Enums"]["automatisierungspotenzial"] | null
          branche?: string | null
          created_at?: string
          domain?: never
          groesse?: string | null
          id?: string
          kundennummer?: string
          land?: string
          mitarbeiterzahl?: number | null
          name: string
          notizen?: string | null
          ort?: string | null
          owner_id?: string
          plz?: string | null
          schmerzpunkte?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          strasse?: string | null
          tool_stack?: string[]
          updated_at?: string
          ust_id?: string | null
          website?: string | null
        }
        Update: {
          automatisierungspotenzial?: Database["public"]["Enums"]["automatisierungspotenzial"] | null
          branche?: string | null
          created_at?: string
          domain?: never
          groesse?: string | null
          id?: string
          kundennummer?: string
          land?: string
          mitarbeiterzahl?: number | null
          name?: string
          notizen?: string | null
          ort?: string | null
          owner_id?: string
          plz?: string | null
          schmerzpunkte?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          strasse?: string | null
          tool_stack?: string[]
          updated_at?: string
          ust_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string
          created_at: string
          einwilligung_datum: string | null
          einwilligung_marketing: boolean
          email: string | null
          id: string
          ist_hauptkontakt: boolean
          linkedin: string | null
          nachname: string
          owner_id: string
          position: string | null
          telefon: string | null
          updated_at: string
          vorname: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          einwilligung_datum?: string | null
          einwilligung_marketing?: boolean
          email?: string | null
          id?: string
          ist_hauptkontakt?: boolean
          linkedin?: string | null
          nachname: string
          owner_id?: string
          position?: string | null
          telefon?: string | null
          updated_at?: string
          vorname?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          einwilligung_datum?: string | null
          einwilligung_marketing?: boolean
          email?: string | null
          id?: string
          ist_hauptkontakt?: boolean
          linkedin?: string | null
          nachname?: string
          owner_id?: string
          position?: string | null
          telefon?: string | null
          updated_at?: string
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          art: Database["public"]["Enums"]["deal_stage_art"]
          created_at: string
          id: string
          name: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          art?: Database["public"]["Enums"]["deal_stage_art"]
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          position: number
          updated_at?: string
        }
        Update: {
          art?: Database["public"]["Enums"]["deal_stage_art"]
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          abgeschlossen_am: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          erwarteter_abschluss: string | null
          id: string
          owner_id: string
          quelle: string | null
          stage_id: string
          titel: string
          updated_at: string
          verlustgrund: string | null
          wahrscheinlichkeit: number | null
          wert_einmalig: number
          wert_monatlich: number
        }
        Insert: {
          abgeschlossen_am?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          erwarteter_abschluss?: string | null
          id?: string
          owner_id?: string
          quelle?: string | null
          stage_id: string
          titel: string
          updated_at?: string
          verlustgrund?: string | null
          wahrscheinlichkeit?: number | null
          wert_einmalig?: number
          wert_monatlich?: number
        }
        Update: {
          abgeschlossen_am?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          erwarteter_abschluss?: string | null
          id?: string
          owner_id?: string
          quelle?: string | null
          stage_id?: string
          titel?: string
          updated_at?: string
          verlustgrund?: string | null
          wahrscheinlichkeit?: number | null
          wert_einmalig?: number
          wert_monatlich?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          company_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          name: string
          owner_id: string
          pfad: string
          project_id: string | null
          typ: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          name: string
          owner_id?: string
          pfad: string
          project_id?: string | null
          typ?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          pfad?: string
          project_id?: string | null
          typ?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          art: Database["public"]["Enums"]["invoice_art"]
          company_id: string | null
          created_at: string
          datum: string | null
          faellig_am: string | null
          id: string
          nummer: string | null
          owner_id: string
          pdf_pfad: string | null
          positionen: Json
          project_id: string | null
          retainer_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          storno_von_id: string | null
          summe_brutto: number
          summe_netto: number
          updated_at: string
          ust_satz: number
          xml_pfad: string | null
        }
        Insert: {
          art?: Database["public"]["Enums"]["invoice_art"]
          company_id?: string | null
          created_at?: string
          datum?: string | null
          faellig_am?: string | null
          id?: string
          nummer?: string | null
          owner_id?: string
          pdf_pfad?: string | null
          positionen?: Json
          project_id?: string | null
          retainer_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          storno_von_id?: string | null
          summe_brutto?: number
          summe_netto?: number
          updated_at?: string
          ust_satz?: number
          xml_pfad?: string | null
        }
        Update: {
          art?: Database["public"]["Enums"]["invoice_art"]
          company_id?: string | null
          created_at?: string
          datum?: string | null
          faellig_am?: string | null
          id?: string
          nummer?: string | null
          owner_id?: string
          pdf_pfad?: string | null
          positionen?: Json
          project_id?: string | null
          retainer_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          storno_von_id?: string | null
          summe_brutto?: number
          summe_netto?: number
          updated_at?: string
          ust_satz?: number
          xml_pfad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "retainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_storno_von_id_fkey"
            columns: ["storno_von_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      number_counters: {
        Row: {
          bereich: string
          created_at: string
          id: string
          jahr: number
          letzter_wert: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          bereich: string
          created_at?: string
          id?: string
          jahr?: number
          letzter_wert?: number
          owner_id?: string
          updated_at?: string
        }
        Update: {
          bereich?: string
          created_at?: string
          id?: string
          jahr?: number
          letzter_wert?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          deadline: string | null
          deal_id: string | null
          festpreis: number | null
          id: string
          interner_stundensatz: number | null
          owner_id: string
          start: string | null
          status: Database["public"]["Enums"]["project_status"]
          titel: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deadline?: string | null
          deal_id?: string | null
          festpreis?: number | null
          id?: string
          interner_stundensatz?: number | null
          owner_id?: string
          start?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          titel: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deadline?: string | null
          deal_id?: string | null
          festpreis?: number | null
          id?: string
          interner_stundensatz?: number | null
          owner_id?: string
          start?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          deal_id: string
          gueltig_bis: string | null
          id: string
          nummer: string | null
          owner_id: string
          pdf_pfad: string | null
          positionen: Json
          status: Database["public"]["Enums"]["quote_status"]
          summe_netto: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          gueltig_bis?: string | null
          id?: string
          nummer?: string | null
          owner_id?: string
          pdf_pfad?: string | null
          positionen?: Json
          status?: Database["public"]["Enums"]["quote_status"]
          summe_netto?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          gueltig_bis?: string | null
          id?: string
          nummer?: string | null
          owner_id?: string
          pdf_pfad?: string | null
          positionen?: Json
          status?: Database["public"]["Enums"]["quote_status"]
          summe_netto?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      retainers: {
        Row: {
          company_id: string
          created_at: string
          deal_id: string | null
          id: string
          kuendigungsfrist_tage: number
          laufzeit_monate: number | null
          leistungsumfang: string | null
          monatsbetrag: number
          naechste_abrechnung: string | null
          owner_id: string
          start: string
          status: Database["public"]["Enums"]["retainer_status"]
          titel: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          kuendigungsfrist_tage?: number
          laufzeit_monate?: number | null
          leistungsumfang?: string | null
          monatsbetrag: number
          naechste_abrechnung?: string | null
          owner_id?: string
          start: string
          status?: Database["public"]["Enums"]["retainer_status"]
          titel: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          kuendigungsfrist_tage?: number
          laufzeit_monate?: number | null
          leistungsumfang?: string | null
          monatsbetrag?: number
          naechste_abrechnung?: string | null
          owner_id?: string
          start?: string
          status?: Database["public"]["Enums"]["retainer_status"]
          titel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retainers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          angebot_praefix: string
          bank_name: string | null
          bic: string | null
          created_at: string
          email: string | null
          firmenname: string | null
          iban: string | null
          id: string
          inhaber: string | null
          land: string
          ort: string | null
          owner_id: string
          plz: string | null
          rechnung_praefix: string
          standard_ust_satz: number
          steuernummer: string | null
          strasse: string | null
          telefon: string | null
          updated_at: string
          ust_id: string | null
          webhook_secret: string
          webhook_urls: Json
          website: string | null
          zahlungsziel_tage: number
        }
        Insert: {
          angebot_praefix?: string
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          email?: string | null
          firmenname?: string | null
          iban?: string | null
          id?: string
          inhaber?: string | null
          land?: string
          ort?: string | null
          owner_id?: string
          plz?: string | null
          rechnung_praefix?: string
          standard_ust_satz?: number
          steuernummer?: string | null
          strasse?: string | null
          telefon?: string | null
          updated_at?: string
          ust_id?: string | null
          webhook_secret?: string
          webhook_urls?: Json
          website?: string | null
          zahlungsziel_tage?: number
        }
        Update: {
          angebot_praefix?: string
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          email?: string | null
          firmenname?: string | null
          iban?: string | null
          id?: string
          inhaber?: string | null
          land?: string
          ort?: string | null
          owner_id?: string
          plz?: string | null
          rechnung_praefix?: string
          standard_ust_satz?: number
          steuernummer?: string | null
          strasse?: string | null
          telefon?: string | null
          updated_at?: string
          ust_id?: string | null
          webhook_secret?: string
          webhook_urls?: Json
          website?: string | null
          zahlungsziel_tage?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          company_id: string | null
          created_at: string
          deal_id: string | null
          erledigt: boolean
          faellig_am: string | null
          id: string
          owner_id: string
          prioritaet: Database["public"]["Enums"]["task_prioritaet"]
          project_id: string | null
          titel: string
          ueberfaellig_gemeldet_am: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          erledigt?: boolean
          faellig_am?: string | null
          id?: string
          owner_id?: string
          prioritaet?: Database["public"]["Enums"]["task_prioritaet"]
          project_id?: string | null
          titel: string
          ueberfaellig_gemeldet_am?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          erledigt?: boolean
          faellig_am?: string | null
          id?: string
          owner_id?: string
          prioritaet?: Database["public"]["Enums"]["task_prioritaet"]
          project_id?: string | null
          titel?: string
          ueberfaellig_gemeldet_am?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          beschreibung: string | null
          created_at: string
          datum: string
          id: string
          minuten: number
          owner_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string
          datum?: string
          id?: string
          minuten: number
          owner_id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string
          datum?: string
          id?: string
          minuten?: number
          owner_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          antwort_status: number | null
          created_at: string
          event: string
          fehler: string | null
          gesendet_am: string | null
          gesperrt_bis: string | null
          id: string
          naechster_versuch_am: string | null
          owner_id: string
          payload: Json
          status: Database["public"]["Enums"]["webhook_event_status"]
          updated_at: string
          versuche: number
          ziel_url: string | null
        }
        Insert: {
          antwort_status?: number | null
          created_at?: string
          event: string
          fehler?: string | null
          gesendet_am?: string | null
          gesperrt_bis?: string | null
          id?: string
          naechster_versuch_am?: string | null
          owner_id?: string
          payload: Json
          status?: Database["public"]["Enums"]["webhook_event_status"]
          updated_at?: string
          versuche?: number
          ziel_url?: string | null
        }
        Update: {
          antwort_status?: number | null
          created_at?: string
          event?: string
          fehler?: string | null
          gesendet_am?: string | null
          gesperrt_bis?: string | null
          id?: string
          naechster_versuch_am?: string | null
          owner_id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["webhook_event_status"]
          updated_at?: string
          versuche?: number
          ziel_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      deal_activity_status: {
        Row: {
          deal_id: string | null
          letzte_aktivitaet: string | null
          owner_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_webhook_events: {
        Args: {
          p_owner?: string
          p_limit?: number
        }
        Returns: Database["public"]["Tables"]["webhook_events"]["Row"][]
      }
      create_owner_defaults: {
        Args: {
          p_owner: string
        }
        Returns: undefined
      }
      deal_webhook_data: {
        Args: {
          p_deal: Database["public"]["Tables"]["deals"]["Row"]
        }
        Returns: Json
      }
      enqueue_overdue_task_webhooks: {
        Args: {
          p_today: string
        }
        Returns: number
      }
      enqueue_webhook: {
        Args: {
          p_owner: string
          p_event: string
          p_data: Json
        }
        Returns: undefined
      }
      find_duplicates: {
        Args: {
          p_email?: string
          p_website?: string
        }
        Returns: {
          company_id: string
          company_name: string
          kundennummer: string
          grund: string
        }[]
      }
      find_duplicates_for_owner: {
        Args: {
          p_owner: string
          p_email?: string
          p_website?: string
        }
        Returns: {
          company_id: string
          company_name: string
          kundennummer: string
          grund: string
        }[]
      }
      is_freemail_domain: {
        Args: {
          domain: string
        }
        Returns: boolean
      }
      is_owner: {
        Args: {
          row_owner: string
        }
        Returns: boolean
      }
      next_number: {
        Args: {
          p_owner: string
          p_bereich: string
          p_jahr?: number
        }
        Returns: number
      }
      next_webhook_retry: {
        Args: {
          p_owner: string
        }
        Returns: string
      }
      normalize_domain: {
        Args: {
          url: string
        }
        Returns: string
      }
    }
    Enums: {
      activity_typ: "anruf" | "mail" | "meeting" | "notiz"
      automatisierungspotenzial: "niedrig" | "mittel" | "hoch"
      company_status: "lead" | "kunde" | "ehemalig"
      deal_stage_art: "offen" | "gewonnen" | "verloren"
      invoice_art: "rechnung" | "abschlagsrechnung" | "schlussrechnung" | "stornorechnung"
      invoice_status: "entwurf" | "versendet" | "bezahlt" | "ueberfaellig"
      project_status: "geplant" | "in_arbeit" | "abnahme" | "abgeschlossen"
      quote_status: "entwurf" | "versendet" | "angenommen" | "abgelehnt"
      retainer_status: "aktiv" | "gekuendigt" | "beendet"
      task_prioritaet: "niedrig" | "mittel" | "hoch"
      webhook_event_status: "ausstehend" | "gesendet" | "fehlgeschlagen"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_typ: ["anruf", "mail", "meeting", "notiz"],
      automatisierungspotenzial: ["niedrig", "mittel", "hoch"],
      company_status: ["lead", "kunde", "ehemalig"],
      deal_stage_art: ["offen", "gewonnen", "verloren"],
      invoice_art: ["rechnung", "abschlagsrechnung", "schlussrechnung", "stornorechnung"],
      invoice_status: ["entwurf", "versendet", "bezahlt", "ueberfaellig"],
      project_status: ["geplant", "in_arbeit", "abnahme", "abgeschlossen"],
      quote_status: ["entwurf", "versendet", "angenommen", "abgelehnt"],
      retainer_status: ["aktiv", "gekuendigt", "beendet"],
      task_prioritaet: ["niedrig", "mittel", "hoch"],
      webhook_event_status: ["ausstehend", "gesendet", "fehlgeschlagen"],
    },
  },
} as const
