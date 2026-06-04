import { describe, it, expect } from "vitest";
import { RatingCellSchema, findForbiddenKeys } from "../src/schema.js";

const prov = { method: "manual", checkedUrl: "https://defiscan.info/protocol/aave",
  lastChecked: "2026-06-04", curator: "alice" };

describe("RatingCellSchema", () => {
  it("accepts a covered cell with a verbatim rating", () => {
    const cell = { protocolId: "aave", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 1", sourceUrl: "https://defiscan.info/protocol/aave" }, provenance: prov };
    expect(RatingCellSchema.parse(cell)).toMatchObject({ coverage: "covered" });
  });

  it("requires rating to be null when not-yet-covered", () => {
    const ok = { protocolId: "lido", feedId: "blockanalitica", coverage: "not-yet-covered",
      rating: null, provenance: prov };
    expect(() => RatingCellSchema.parse(ok)).not.toThrow();
    expect(() => RatingCellSchema.parse({ ...ok, coverage: "covered", rating: null })).toThrow();
  });

  it("requires coverageScope when partial", () => {
    const base = { protocolId: "aave", feedId: "blockanalitica", coverage: "partial",
      rating: { verbatim: "WETH market only", sourceUrl: "https://x.io/a" }, provenance: prov };
    expect(() => RatingCellSchema.parse(base)).toThrow();                       // missing scope
    expect(() => RatingCellSchema.parse({ ...base, coverageScope: "WETH market only" })).not.toThrow();
  });

  it("rejects a top-level composite/score field via .strict()", () => {
    const cell = { protocolId: "aave", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 1", sourceUrl: "https://x.io" }, provenance: prov, score: 87 };
    expect(() => RatingCellSchema.parse(cell)).toThrow();
  });
});

describe("findForbiddenKeys (recursive no-composite guard)", () => {
  it("catches a denylisted key nested deep in otherwise-valid data", () => {
    const data = { feeds: [{ id: "x", meta: { normalizedScore: 0.9 } }] };
    expect(findForbiddenKeys(data)).toContain(".feeds[0].meta.normalizedScore");
  });
  it("returns nothing for clean data", () => {
    expect(findForbiddenKeys({ verbatim: "Stage 1", dimensions: [{ label: "Control", value: "High" }] })).toEqual([]);
  });
});
