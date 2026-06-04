// Server-only build-time loading (uses node:fs / node:path). Pages import these.
// Pure selectors + shared types live in ./select so client components can use them
// without pulling Node modules into the browser bundle; we re-export them here for
// convenience on the server side.
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { loadDataset, checkDataLayout, validateDataset } from "@dra/core";
import type { Dataset, TvlSnapshot } from "./select";

export type { Dataset, TvlSnapshot } from "./select";
export { cellFor, governanceFor, auditsFor, incidentsFor } from "./select";

const dataRoot = join(process.cwd(), "..", "..", "data");

export function getDataset(): Dataset {
  const raw = loadDataset(dataRoot);
  const errors = [...checkDataLayout(dataRoot), ...validateDataset(raw).errors];
  if (errors.length) throw new Error("Invalid dataset at build:\n" + errors.join("\n"));
  return raw as Dataset;
}

export function getTvlSnapshot(): TvlSnapshot {
  const f = join(dataRoot, "tvl-snapshots.yaml");
  return existsSync(f)
    ? (parse(readFileSync(f, "utf8")) as TvlSnapshot)
    : { asOf: "", protocols: {} };
}
