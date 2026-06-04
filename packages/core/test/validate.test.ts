import { describe, it, expect } from "vitest";
import { validateDataset } from "../src/validate.js";

const protocols = [{ id: "aave", name: "Aave", category: "Lending",
  chain: "Ethereum", site: "aave.com", blurb: "Lending protocol.",
  links: { website: "https://aave.com" }, defillamaSlugs: ["aave"] }];
const feeds = [{ id: "defiscan", name: "DeFiScan", type: "Rating",
  focus: "Decentralization maturity", url: "https://defiscan.info", access: "auto",
  conflicts: null, displayOrder: 0 }];
const cell = { protocolId: "aave", feedId: "defiscan", coverage: "covered",
  rating: { verbatim: "Stage 1", sourceUrl: "https://defiscan.info/protocol/aave" },
  provenance: { method: "manual", checkedUrl: "https://defiscan.info/protocol/aave",
    lastChecked: "2026-06-04", curator: "a" } };
const full = { protocols, feeds, ratings: [cell], governance: [], audits: [], incidents: [] };

describe("validateDataset", () => {
  it("passes when every protocol×feed has exactly one cell", () => {
    expect(validateDataset(full).ok).toBe(true);
  });
  it("fails when a protocol×feed cell is missing", () => {
    const r = validateDataset({ ...full, ratings: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/missing cell.*aave.*defiscan/i);
  });
  it("fails when a cell references an unknown protocol", () => {
    const r = validateDataset({ ...full, ratings: [cell, { ...cell, protocolId: "ghost" }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/unknown protocol.*ghost/i);
  });
  it("fails on a duplicate protocol id (would otherwise be silently deduped)", () => {
    const r = validateDataset({ ...full, protocols: [protocols[0], { ...protocols[0] }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/duplicate protocol id.*aave/i);
  });
  it("fails on a denylisted composite key nested anywhere in the data", () => {
    const r = validateDataset({ ...full, governance: [{ protocolId: "aave", items: [], rank: 1 }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/forbidden \(composite\) key/i);
  });
});
