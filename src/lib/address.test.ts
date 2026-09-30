import { describe, expect, it } from "vitest";

import { formatAddress } from "./address";

describe("formatAddress", () => {
  it("formats German addresses without country", () => {
    expect(formatAddress({ strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt", land: "DE" })).toBe(
      "Musterweg 1\n12345 Musterstadt",
    );
  });

  it("adds the country outside Germany", () => {
    expect(formatAddress({ strasse: null, plz: "1010", ort: "Wien", land: "AT" })).toBe("1010 Wien\nAT");
  });

  it("returns an empty string without street and city", () => {
    expect(formatAddress({ strasse: null, plz: null, ort: null, land: "AT" })).toBe("");
  });
});
