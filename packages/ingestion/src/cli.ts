import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { makeDefiscanAdapter } from "./adapters/defiscan.js";
import type { FeedAdapter } from "./adapter.js";
import { writeCellSuccess, writeCellFailure } from "./writeCell.js";

// Default data root: <repo>/data (this file lives at packages/ingestion/src/cli.ts).
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_ROOT = resolve(__dirname, "../../../data");

const ADAPTERS: Record<string, () => FeedAdapter> = {
  defiscan: () => makeDefiscanAdapter(),
};

// All POC protocols the matrix covers (the adapter decides which it supports).
const ALL_PROTOCOLS = ["aave", "spark", "morpho", "uniswap", "lido"];

interface Args {
  feed?: string;
  protocol?: string;
  dataRoot: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dataRoot: DEFAULT_DATA_ROOT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--feed") args.feed = argv[++i];
    else if (a === "--protocol") args.protocol = argv[++i];
    else if (a === "--data-root") args.dataRoot = resolve(argv[++i] ?? "");
  }
  return args;
}

export async function runIngest(args: Args): Promise<number> {
  if (!args.feed) {
    console.error("usage: ingest --feed <feedId> [--protocol <protocolId>]");
    return 2;
  }
  const make = ADAPTERS[args.feed];
  if (!make) {
    console.error(`unknown feed adapter: ${args.feed} (known: ${Object.keys(ADAPTERS).join(", ")})`);
    return 2;
  }
  const adapter = make();
  const protocols = (args.protocol ? [args.protocol] : ALL_PROTOCOLS).filter((p) =>
    adapter.supports(p),
  );

  let failures = 0;
  const now = new Date();
  for (const protocolId of protocols) {
    try {
      const cell = await adapter.fetchCell(protocolId);
      writeCellSuccess({ dataRoot: args.dataRoot, protocolId, feedId: adapter.id, cell, now });
      console.log(`ok    ${args.feed}/${protocolId} → ${cell.coverage} "${cell.rating?.verbatim ?? ""}"`);
    } catch (err) {
      failures++;
      // Loud failure: stamp the cell as fetch-error (keeping last good data) and report.
      writeCellFailure({ dataRoot: args.dataRoot, protocolId, feedId: adapter.id, now });
      console.error(`FAIL  ${args.feed}/${protocolId}: ${(err as Error).message}`);
    }
  }

  console.log(`\n${args.feed}: ${protocols.length - failures} ok, ${failures} failed.`);
  // Files are always written first → provenance changes are committable, then we
  // exit non-zero so CI surfaces the failure (the workflow owns PR creation).
  return failures > 0 ? 1 : 0;
}

// Only run when invoked directly (not when imported by a test).
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runIngest(parseArgs(process.argv.slice(2))).then((code) => process.exit(code));
}
