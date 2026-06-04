// Build-time TVL snapshot. Sums every protocol's DefiLlama slugs from
// https://api.llama.fi/tvl/<slug> (which returns a bare number) and writes
// data/tvl-snapshots.yaml as { asOf, protocols: { <id>: <number> } }.
//
// Failure policy (per the plan):
//   • 404 / non-number response  → THROW (unknown slug must fail the build).
//   • transient network / 5xx    → keep the previous snapshot value + warn.
//                                    If there is no previous value, THROW.
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { parse, stringify } from "yaml";

const dataRoot = join(process.cwd(), "..", "..", "data");
const protocolsDir = join(dataRoot, "protocols");
const snapshotFile = join(dataRoot, "tvl-snapshots.yaml");

interface ProtocolFile {
  id: string;
  defillamaSlugs: string[];
}
interface Snapshot {
  asOf: string;
  protocols: Record<string, number>;
}

function loadPrevious(): Snapshot {
  if (!existsSync(snapshotFile)) return { asOf: "", protocols: {} };
  try {
    const parsed = parse(readFileSync(snapshotFile, "utf8")) as Snapshot | null;
    return parsed ?? { asOf: "", protocols: {} };
  } catch {
    return { asOf: "", protocols: {} };
  }
}

async function fetchSlug(slug: string): Promise<number> {
  const res = await fetch(`https://api.llama.fi/tvl/${slug}`, { cache: "no-store" });
  // 404 = unknown slug → hard failure.
  if (res.status === 404) {
    throw new Error(`DefiLlama TVL: unknown slug "${slug}" (404).`);
  }
  // 5xx / other non-ok = transient → signal so caller can keep prior value.
  if (!res.ok) {
    throw new TransientError(`DefiLlama TVL: transient ${res.status} for slug "${slug}".`);
  }
  const v: unknown = await res.json();
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new Error(`DefiLlama TVL: non-number response for slug "${slug}": ${JSON.stringify(v)}`);
  }
  return v;
}

class TransientError extends Error {}

async function main(): Promise<void> {
  const previous = loadPrevious();
  const files = readdirSync(protocolsDir).filter((f) => f.endsWith(".yaml"));
  const protocols: Record<string, number> = {};

  for (const file of files) {
    const p = parse(readFileSync(join(protocolsDir, file), "utf8")) as ProtocolFile;
    let sum = 0;
    let transient = false;
    try {
      for (const slug of p.defillamaSlugs) {
        sum += await fetchSlug(slug);
      }
    } catch (err) {
      if (err instanceof TransientError) {
        transient = true;
        console.warn(`[snapshot-tvl] ${err.message}`);
      } else {
        throw err; // 404 / non-number → fail the build loudly.
      }
    }

    if (transient) {
      const prior = previous.protocols[p.id];
      if (typeof prior === "number") {
        console.warn(`[snapshot-tvl] keeping previous snapshot for "${p.id}": ${prior}`);
        protocols[p.id] = prior;
      } else {
        throw new Error(
          `[snapshot-tvl] transient TVL failure for "${p.id}" and no previous snapshot to fall back on.`,
        );
      }
    } else {
      protocols[p.id] = sum;
    }
  }

  const snapshot: Snapshot = { asOf: new Date().toISOString(), protocols };
  // Deterministic, sorted keys for clean diffs.
  writeFileSync(snapshotFile, stringify(snapshot, { sortMapEntries: true }), "utf8");
  console.log(`[snapshot-tvl] wrote ${snapshotFile} (${Object.keys(protocols).length} protocols).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
