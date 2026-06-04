import type { RatingCell } from "@dra/core";

export const categoryLabels: Record<string, string> = {
  Lending: "Lending",
  DEX_AMM: "DEX / AMM",
  Swap_Aggregator: "Swap Aggregator",
  Yield_Vault: "Yield Vault",
  Liquid_Staking: "Liquid Staking",
  Other: "Other",
};

export interface CoverageCount {
  covered: number;
  partial: number;
  none: number;
  total: number;
}

export function coverageCount(ratings: RatingCell[], protocolId: string): CoverageCount {
  const cs = ratings.filter((r) => r.protocolId === protocolId);
  return {
    covered: cs.filter((c) => c.coverage === "covered").length,
    partial: cs.filter((c) => c.coverage === "partial").length,
    none: cs.filter((c) => c.coverage === "not-yet-covered").length,
    total: cs.length,
  };
}

// coverageSpread — FACTUAL classification of how coverage is distributed,
// never a quality judgment. Returns null when there's nothing notable.
export function coverageSpread(
  ratings: RatingCell[],
  protocolId: string,
): { kind: "gap"; label: string } | { kind: "depth"; label: string } | null {
  const c = coverageCount(ratings, protocolId);
  if (c.covered > 0 && c.none > 0) return { kind: "gap" as const, label: "coverage varies" };
  if (c.covered > 0 && c.partial > 0) return { kind: "depth" as const, label: "depth varies" };
  return null;
}

export interface DataStatus {
  oldestCheck: string;
  tvlSnapshotAge: string;
  feedCount: number;
  protocolCount: number;
  cellCount: number;
}

export function computeDataStatus(
  ratings: RatingCell[],
  snapshotAsOf: string,
  counts: { protocols: number; feeds: number },
): DataStatus {
  const oldestCheck = ratings.map((r) => r.provenance.lastChecked).sort()[0] ?? "";
  return {
    oldestCheck,
    tvlSnapshotAge: snapshotAsOf ? "as of " + snapshotAsOf.slice(0, 10) : "",
    feedCount: counts.feeds,
    protocolCount: counts.protocols,
    cellCount: ratings.length,
  };
}
