import type { RatingCell } from "@dra/core";

// The slice of a RatingCell that an adapter is responsible for producing.
// Provenance is stamped by `writeCell` (it owns timestamps / sourceStatus),
// so adapters only return the coverage verdict + the verbatim rating.
export type RatingCellInput = Pick<RatingCell, "coverage" | "rating">;

export interface FeedAdapter {
  id: string;
  supports(protocolId: string): boolean;
  // Returns the cell data, or THROWS on fetch/parse failure (caller handles loudly).
  // Never returns an empty/"not-yet-covered" cell to mask a fetch error.
  fetchCell(protocolId: string): Promise<RatingCellInput>;
}
