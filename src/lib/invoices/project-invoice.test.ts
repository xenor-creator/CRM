import { describe, expect, it } from "vitest";

import { computeTotals } from "./line-items";
import { projectInvoiceDraft, type PriorInvoice } from "./project-invoice";

const project = { titel: "Chatbot", festpreis: 10000 };
const downPayment = (overrides: Partial<PriorInvoice>): PriorInvoice => ({
  id: "a1",
  nummer: "RE-2026-0001-K1001",
  datum: "2026-09-01",
  art: "abschlagsrechnung",
  status: "bezahlt",
  summe_netto: 3000,
  summe_ust: 570,
  summe_brutto: 3570,
  ...overrides,
});

describe("projectInvoiceDraft", () => {
  it("bills the full fixed price", () => {
    const draft = projectInvoiceDraft(project, "rechnung", []);
    expect(draft).toMatchObject({ ok: true, positionen: [{ menge: 1, einheit: "Pauschal", einzelpreis: 10000 }] });
  });

  it("creates down payments by amount or percent and caps them at the fixed price", () => {
    expect(projectInvoiceDraft(project, "abschlagsrechnung", [], { prozent: 30 })).toMatchObject({
      ok: true,
      positionen: [{ einzelpreis: 3000, beschreibung: expect.stringContaining("Abschlag 30 % auf Chatbot") }],
    });
    expect(projectInvoiceDraft(project, "abschlagsrechnung", [downPayment({})], { betrag: 7000 }).ok).toBe(true);
    expect(projectInvoiceDraft(project, "abschlagsrechnung", [downPayment({})], { betrag: 7000.01 }).ok).toBe(false);
    expect(projectInvoiceDraft(project, "abschlagsrechnung", [], { betrag: 0 }).ok).toBe(false);
  });

  it("deducts only settled, not cancelled down payments on the final invoice", () => {
    const draft = projectInvoiceDraft(project, "schlussrechnung", [
      downPayment({}),
      downPayment({ id: "a2", nummer: "RE-2026-0002-K1001", status: "storniert" }),
      downPayment({ id: "a3", nummer: null, datum: null, status: "entwurf" }),
    ]);
    if (!draft.ok) throw new Error(draft.error);
    expect(draft.abschlaege.map((a) => a.nummer)).toEqual(["RE-2026-0001-K1001"]);
    expect(computeTotals(draft.positionen, 19, draft.abschlaege)).toMatchObject({ brutto: 11900, bereitsGezahlt: 3570, zahlbetrag: 8330 });
  });

  it("refuses a plain invoice after down payments and projects without fixed price", () => {
    expect(projectInvoiceDraft(project, "rechnung", [downPayment({})]).ok).toBe(false);
    expect(projectInvoiceDraft({ titel: "x", festpreis: null }, "rechnung", []).ok).toBe(false);
  });
});
