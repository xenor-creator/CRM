import "server-only";

import { formatDate } from "@/lib/format";
import { duePeriods, nextBillingDate, retainerNotices, type BillingPeriod } from "@/lib/retainers";
import type { Tables } from "@/lib/supabase/database.types";
import type { ServiceClient } from "@/lib/supabase/service";

type Retainer = Tables<"retainers"> & { companies: { id: string; name: string; kundennummer: string } | null };

export type RetainerRunResult = { drafts: number; ended: number; notices: number };

export function retainerLineItem(titel: string, monatsbetrag: number, period: BillingPeriod) {
  return {
    beschreibung: `${titel}, Leistungszeitraum ${formatDate(period.from)}–${formatDate(period.to)}`,
    menge: 1,
    einheit: "Monat",
    einzelpreis: monatsbetrag,
  };
}

async function createDrafts(db: ServiceClient, r: Retainer, periods: BillingPeriod[], vatRate: number): Promise<number> {
  let created = 0;
  for (const period of periods) {
    const { error } = await db.from("invoices").insert({
      owner_id: r.owner_id,
      company_id: r.company_id,
      retainer_id: r.id,
      positionen: [retainerLineItem(r.titel, r.monatsbetrag, period)],
      ust_satz: vatRate,
      leistung_von: period.from,
      leistung_bis: period.to,
    });
    // 23505: the draft for this period already exists (cron ran twice).
    if (error && error.code !== "23505") throw new Error(`retainer draft failed: ${error.message}`);
    if (!error) created++;
  }
  return created;
}

async function sendNotices(db: ServiceClient, r: Retainer, today: string): Promise<number> {
  let sent = 0;
  for (const notice of retainerNotices(r, today)) {
    const column = notice.kind === "laufzeitende" ? "laufzeitende_gemeldet" : "kuendigungsfrist_gemeldet";
    if (r[column] === notice.date) continue;
    const { error } = await db.rpc("enqueue_webhook", {
      p_owner: r.owner_id,
      p_event: "retainer.ending_soon",
      p_data: {
        hinweis: notice,
        retainer: { id: r.id, titel: r.titel, monatsbetrag: r.monatsbetrag, status: r.status, start: r.start, gekuendigt_zum: r.gekuendigt_zum },
        company: r.companies,
      },
    });
    if (error) throw new Error(`retainer notice failed: ${error.message}`);
    const marker = notice.kind === "laufzeitende" ? { laufzeitende_gemeldet: notice.date } : { kuendigungsfrist_gemeldet: notice.date };
    await db.from("retainers").update(marker).eq("id", r.id);
    sent++;
  }
  return sent;
}

// Daily: monthly invoice drafts on the billing day (catching up missed months), end of
// cancelled retainers and retainer.ending_soon notices (once per deadline).
export async function runRetainerBilling(db: ServiceClient, today: string): Promise<RetainerRunResult> {
  const { data: retainers, error } = await db
    .from("retainers")
    .select("*, companies(id, name, kundennummer)")
    .in("status", ["aktiv", "gekuendigt"]);
  if (error) throw new Error(`load retainers failed: ${error.message}`);

  const { data: settings } = await db.from("settings").select("owner_id, standard_ust_satz");
  const vatByOwner = new Map((settings ?? []).map((s) => [s.owner_id, s.standard_ust_satz]));
  const result: RetainerRunResult = { drafts: 0, ended: 0, notices: 0 };

  for (const r of retainers) {
    const periods = duePeriods(r, today);
    result.drafts += await createDrafts(db, r, periods, vatByOwner.get(r.owner_id) ?? 19);
    const last = periods.at(-1);
    const update: Partial<Tables<"retainers">> = {};
    if (last) update.naechste_abrechnung = nextBillingDate(r, last.from);
    if (r.status === "gekuendigt" && r.gekuendigt_zum && today > r.gekuendigt_zum) {
      update.status = "beendet";
      result.ended++;
    }
    if (Object.keys(update).length) await db.from("retainers").update(update).eq("id", r.id);
    if (update.status !== "beendet") result.notices += await sendNotices(db, r, today);
  }
  return result;
}
