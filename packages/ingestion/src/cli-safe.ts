import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { fetchSafeConfig } from "./safe/fetchSafe.js";
import {
  updateGovernanceSuccess,
  updateGovernanceFailure,
  governanceTracksSafe,
  readSafeTarget,
} from "./safe/updateGovernance.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_ROOT = resolve(__dirname, "../../../data");

const ALL_PROTOCOLS = ["aave", "spark", "morpho", "uniswap", "lido"];

interface Args {
  protocol?: string;
  dataRoot: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dataRoot: DEFAULT_DATA_ROOT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--protocol") args.protocol = argv[++i];
    else if (a === "--data-root") args.dataRoot = resolve(argv[++i] ?? "");
  }
  return args;
}

export async function runIngestSafe(args: Args): Promise<number> {
  const candidates = args.protocol ? [args.protocol] : ALL_PROTOCOLS;
  // Only protocols with a `safe` block + non-"n/a" status are refreshed; the rest
  // (uniswap, spark) are skipped.
  const tracked = candidates.filter((p) => governanceTracksSafe(args.dataRoot, p));

  let failures = 0;
  const now = new Date();
  for (const protocolId of tracked) {
    const target = readSafeTarget(args.dataRoot, protocolId);
    if (!target) {
      console.log(`skip  ${protocolId}: no Safe target`);
      continue;
    }
    try {
      const config = await fetchSafeConfig({ address: target.address, chainId: target.chainId });
      updateGovernanceSuccess({ dataRoot: args.dataRoot, protocolId, config, now });
      console.log(`ok    ${protocolId} → ${config.threshold}/${config.owners.length}`);
    } catch (err) {
      failures++;
      // Loud failure: flag safeApiStatus=failed, keep curated data, report.
      updateGovernanceFailure({ dataRoot: args.dataRoot, protocolId, now });
      console.error(`FAIL  ${protocolId}: ${(err as Error).message}`);
    }
  }

  console.log(`\nsafe: ${tracked.length - failures} ok, ${failures} failed (${tracked.length} tracked).`);
  return failures > 0 ? 1 : 0;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runIngestSafe(parseArgs(process.argv.slice(2))).then((code) => process.exit(code));
}
