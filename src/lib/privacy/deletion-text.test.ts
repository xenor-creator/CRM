import { describe, expect, it } from "vitest";

import { deletionConfirmText } from "./deletion-text";

describe("deletionConfirmText", () => {
  it("lists deleted and retained records with singular and plural", () => {
    expect(deletionConfirmText("Beispiel GmbH", { kontakte: 2, deals: 1, aktivitaeten: 0, dateien: 3 }, { rechnungen: 1, angebote: 2 })).toBe(
      "„Beispiel GmbH“ endgültig löschen?\n\nMit gelöscht werden: 2 Kontakte, 1 Deal, 3 Dateien.\n\n" +
        "Erhalten bleiben: 1 Rechnung, 2 versendete Angebote (Aufbewahrungspflicht, mit eingefrorenen Empfängerdaten).\n\n" +
        "Das lässt sich nicht rückgängig machen.",
    );
  });

  it("omits empty sections", () => {
    expect(deletionConfirmText("Erika Muster", {}, { rechnungen: 0 })).toBe("„Erika Muster“ endgültig löschen?\n\nDas lässt sich nicht rückgängig machen.");
  });
});
