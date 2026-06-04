import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as YAML from "yaml";
import type { YAMLMap } from "yaml";
import type { RatingCellInput } from "./adapter.js";

// `lineWidth: 0` disables line wrapping so long URLs are never folded with `\`
// continuations — this matches how the committed data files were serialized and
// keeps re-serialization byte-identical (idempotent, clean diffs).
const SERIALIZE_OPTS = { lineWidth: 0 } as const;

const todayIso = (now: Date): string => now.toISOString().slice(0, 10);

// Build a double-quoted scalar so new string values match the committed data
// convention (verbatim/sourceUrl are double-quoted in every data file).
function dq(doc: YAML.Document, value: string): YAML.Scalar {
  const node = doc.createNode(value) as YAML.Scalar;
  node.type = "QUOTE_DOUBLE";
  return node;
}

export interface WriteCellArgs {
  dataRoot: string;
  protocolId: string;
  feedId: string;
  now?: Date;
  curator?: string;
}

export interface WriteCellSuccess extends WriteCellArgs {
  cell: RatingCellInput;
}

function ratingPath(dataRoot: string, protocolId: string, feedId: string): string {
  return join(dataRoot, "ratings", protocolId, `${feedId}.yaml`);
}

// Stamp a successful fetch: replace coverage + rating, set method=auto and the
// provenance timestamps/status. Mutates the parsed Document in place so existing
// key order / quoting / curated fields are preserved.
export function writeCellSuccess(args: WriteCellSuccess): void {
  const { dataRoot, protocolId, feedId, cell } = args;
  const now = args.now ?? new Date();
  const path = ratingPath(dataRoot, protocolId, feedId);
  const doc = YAML.parseDocument(readFileSync(path, "utf8"));

  doc.set("coverage", cell.coverage);
  if (cell.rating === null) {
    doc.set("rating", null);
  } else {
    // Mutate the existing rating map in place when present (preserves the file's
    // double-quote scalar style for clean, idempotent diffs); otherwise create one.
    const existing = doc.get("rating") as YAMLMap | null | undefined;
    const dims = cell.rating.dimensions;
    if (existing && typeof existing.set === "function") {
      existing.set("verbatim", dq(doc, cell.rating.verbatim));
      existing.set("sourceUrl", dq(doc, cell.rating.sourceUrl));
      // Write the adapter's rating EXACTLY — never leave a stale dimensions block
      // from a previous shape (the adapter is the source of truth for this cell).
      if (dims && dims.length) existing.set("dimensions", doc.createNode(dims));
      else if (existing.has("dimensions")) existing.delete("dimensions");
    } else {
      const rating = doc.createNode({}) as YAMLMap;
      rating.set("verbatim", dq(doc, cell.rating.verbatim));
      rating.set("sourceUrl", dq(doc, cell.rating.sourceUrl));
      if (dims && dims.length) rating.set("dimensions", doc.createNode(dims));
      doc.set("rating", rating);
    }
  }
  // `coverageScope` is only meaningful (and only schema-valid as required) for
  // `partial`; clear a stale one if the refreshed cell is no longer partial.
  if (cell.coverage !== "partial" && doc.has("coverageScope")) doc.delete("coverageScope");

  const nowIso = now.toISOString();
  doc.setIn(["provenance", "method"], "auto");
  doc.setIn(["provenance", "lastChecked"], todayIso(now));
  doc.setIn(["provenance", "lastAttemptedFetchAt"], nowIso);
  doc.setIn(["provenance", "lastSuccessfulFetchAt"], nowIso);
  doc.setIn(["provenance", "sourceStatus"], "ok");
  const existingCurator = doc.getIn(["provenance", "curator"]);
  if (!existingCurator) {
    doc.setIn(["provenance", "curator"], args.curator ?? "ingestion-bot");
  }

  writeFileSync(path, doc.toString(SERIALIZE_OPTS));
}

// Stamp a failed fetch: do NOT touch coverage/rating (keep last good data); only
// flag the source as errored + record the attempt timestamp. Fails loudly via the
// provenance signal, never by silently blanking the cell.
export function writeCellFailure(args: WriteCellArgs): void {
  const { dataRoot, protocolId, feedId } = args;
  const now = args.now ?? new Date();
  const path = ratingPath(dataRoot, protocolId, feedId);
  const doc = YAML.parseDocument(readFileSync(path, "utf8"));

  doc.setIn(["provenance", "lastAttemptedFetchAt"], now.toISOString());
  doc.setIn(["provenance", "sourceStatus"], "fetch-error");

  writeFileSync(path, doc.toString(SERIALIZE_OPTS));
}
