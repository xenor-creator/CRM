const NOUNS = {
  kontakte: ["Kontakt", "Kontakte"],
  deals: ["Deal", "Deals"],
  projekte: ["Projekt", "Projekte"],
  retainer: ["Retainer", "Retainer"],
  aktivitaeten: ["Aktivität", "Aktivitäten"],
  aufgaben: ["Aufgabe", "Aufgaben"],
  dateien: ["Datei", "Dateien"],
  angebotsentwuerfe: ["Angebotsentwurf", "Angebotsentwürfe"],
  rechnungen: ["Rechnung", "Rechnungen"],
  angebote: ["versendetes Angebot", "versendete Angebote"],
  deals_ohne_kontakt: ["Deal (ohne Ansprechpartner)", "Deals (ohne Ansprechpartner)"],
} as const;

export type DeletionItem = keyof typeof NOUNS;
export type DeletionCounts = Partial<Record<DeletionItem, number>>;

function list(counts: DeletionCounts): string {
  return (Object.entries(counts) as [DeletionItem, number][])
    .filter(([, n]) => n > 0)
    .map(([item, n]) => `${n} ${NOUNS[item][n === 1 ? 0 : 1]}`)
    .join(", ");
}

// Confirmation text for an Art. 17 deletion: what is deleted, what is kept for retention duties.
export function deletionConfirmText(name: string, deleted: DeletionCounts, kept: DeletionCounts): string {
  const removed = list(deleted);
  const retained = list(kept);
  return [
    `„${name}“ endgültig löschen?`,
    removed ? `Mit gelöscht werden: ${removed}.` : null,
    retained ? `Erhalten bleiben: ${retained} (Aufbewahrungspflicht, mit eingefrorenen Empfängerdaten).` : null,
    "Das lässt sich nicht rückgängig machen.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
