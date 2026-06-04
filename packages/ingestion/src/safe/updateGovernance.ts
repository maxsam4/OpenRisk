import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as YAML from "yaml";
import type { YAMLMap, YAMLSeq } from "yaml";
import type { SafeConfig } from "./fetchSafe.js";

// `lineWidth: 0` matches the committed serialization (no URL folding) → idempotent.
const SERIALIZE_OPTS = { lineWidth: 0 } as const;

const todayIso = (now: Date): string => now.toISOString().slice(0, 10);

export interface UpdateGovernanceArgs {
  dataRoot: string;
  protocolId: string;
  now?: Date;
}

function governancePath(dataRoot: string, protocolId: string): string {
  return join(dataRoot, "governance", `${protocolId}.yaml`);
}

// Find the items[] entry whose `key` scalar matches. Returns the YAMLMap node so
// callers mutate it in place (preserving key order / quoting of untouched fields).
function findItemByKey(doc: YAML.Document, key: string): YAMLMap | undefined {
  const items = doc.get("items") as YAMLSeq | undefined;
  if (!items) return undefined;
  for (const node of items.items as YAMLMap[]) {
    if (node?.get?.("key") === key) return node;
  }
  return undefined;
}

// Recompute the set-level `summary`, preserving the curated segment AFTER the
// "·" separator (e.g. the timelock note). Format: "<m>/<n> · <note>". If there
// is no existing "·" segment, the summary becomes just "<m>/<n>".
function recomputeSummary(existing: unknown, threshold: number, owners: number): string {
  const mn = `${threshold}/${owners}`;
  if (typeof existing === "string" && existing.includes("·")) {
    const note = existing.split("·").slice(1).join("·").trim();
    return note ? `${mn} · ${note}` : mn;
  }
  return mn;
}

// Whether this governance file is one the Safe service should touch: it must have
// a `safe` block and not be flagged "n/a". (Uniswap/Spark have no `safe` block.)
export function governanceTracksSafe(dataRoot: string, protocolId: string): boolean {
  const doc = YAML.parseDocument(readFileSync(governancePath(dataRoot, protocolId), "utf8"));
  if (doc.get("safeApiStatus") === "n/a") return false;
  return doc.has("safe");
}

// Read the {address, chainId} the Safe service should query for this protocol.
export function readSafeTarget(
  dataRoot: string,
  protocolId: string,
): { address: string; chainId: number } | undefined {
  const doc = YAML.parseDocument(readFileSync(governancePath(dataRoot, protocolId), "utf8"));
  const safe = doc.get("safe") as YAMLMap | undefined;
  if (!safe) return undefined;
  const address = safe.get("address");
  const chainId = safe.get("chainId");
  if (typeof address !== "string" || typeof chainId !== "number") return undefined;
  return { address, chainId };
}

// SUCCESS: update only the Safe-derived fields, by stable `key`:
//   - `threshold` item value  → "<m> / <n>"
//   - `admin-multisig` value + link → the Safe address (link = explorer URL)
//   - set-level `summary` recomputed (curated note after "·" preserved)
//   - safeApiStatus = "ok", provenance.lastSuccessfulFetchAt/lastAttemptedFetchAt/lastChecked
// All other items (Type, Timelock, Upgrade capability, second multisig rows, …) untouched.
// Idempotent: identical inputs → byte-identical file.
export function updateGovernanceSuccess(
  args: UpdateGovernanceArgs & { config: SafeConfig },
): void {
  const { dataRoot, protocolId, config } = args;
  const now = args.now ?? new Date();
  const path = governancePath(dataRoot, protocolId);
  const doc = YAML.parseDocument(readFileSync(path, "utf8"));

  if (doc.get("safeApiStatus") === "n/a" || !doc.has("safe")) return; // skip untracked

  const ownersCount = config.owners.length;

  // A tracked Safe MUST have the stable-key items the service updates. If they're
  // absent, refuse loudly rather than write a fresh-looking `ok` that changed nothing
  // (the CLI catches this and records `safeApiStatus: failed`, preserving curated data).
  const thresholdItem = findItemByKey(doc, "threshold");
  const adminItem = findItemByKey(doc, "admin-multisig");
  if (!thresholdItem || !adminItem) {
    throw new Error(
      `governance ${protocolId}: tracked Safe is missing required keyed item(s) ` +
        `(${!thresholdItem ? "threshold " : ""}${!adminItem ? "admin-multisig" : ""}).`,
    );
  }

  thresholdItem.set("value", `${config.threshold} / ${ownersCount}`);

  const safe = doc.get("safe") as YAMLMap;
  const safeAddress = safe.get("address") as string;
  adminItem.set("value", safeAddress);
  if (adminItem.has("link")) {
    adminItem.set("link", `https://etherscan.io/address/${safeAddress}`);
  }

  doc.set("summary", recomputeSummary(doc.get("summary"), config.threshold, ownersCount));
  doc.set("safeApiStatus", "ok");

  const nowIso = now.toISOString();
  doc.setIn(["provenance", "lastAttemptedFetchAt"], nowIso);
  doc.setIn(["provenance", "lastSuccessfulFetchAt"], nowIso);
  doc.setIn(["provenance", "lastChecked"], todayIso(now));

  writeFileSync(path, doc.toString(SERIALIZE_OPTS));
}

// FAILURE: never overwrite a curated value. Flag the set-level status + record the
// attempt only. Drives the detail page's loud "Safe API fetch failed" footer.
export function updateGovernanceFailure(args: UpdateGovernanceArgs): void {
  const { dataRoot, protocolId } = args;
  const now = args.now ?? new Date();
  const path = governancePath(dataRoot, protocolId);
  const doc = YAML.parseDocument(readFileSync(path, "utf8"));

  if (doc.get("safeApiStatus") === "n/a" || !doc.has("safe")) return; // skip untracked

  doc.set("safeApiStatus", "failed");
  doc.setIn(["provenance", "lastAttemptedFetchAt"], now.toISOString());

  writeFileSync(path, doc.toString(SERIALIZE_OPTS));
}
