import { describe, expect, it } from "vitest";

import { escapeLike, firstParam, ilikeAny, sanitizeSearchTerm } from "./search";

describe("sanitizeSearchTerm", () => {
  it("strips filter syntax characters", () => {
    expect(sanitizeSearchTerm("a,b(c)*d%e")).toBe("a b c d e");
    expect(sanitizeSearchTerm("name.eq.x")).toBe("name eq x");
    expect(sanitizeSearchTerm(undefined)).toBe("");
  });

  it("limits the length", () => {
    expect(sanitizeSearchTerm("x".repeat(500))).toHaveLength(100);
  });
});

describe("ilikeAny", () => {
  it("builds an or filter", () => {
    expect(ilikeAny(["name", "ort"], "muster")).toBe("name.ilike.*muster*,ort.ilike.*muster*");
  });
});

describe("firstParam", () => {
  it("returns the first value of repeated params", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("a")).toBe("a");
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("escapeLike", () => {
  it("escapes ilike wildcards", () => {
    expect(escapeLike("100%_neu")).toBe("100\\%\\_neu");
    expect(escapeLike("Verloren")).toBe("Verloren");
  });
});
