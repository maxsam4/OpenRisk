import type { FeedAdapter, RatingCellInput } from "../adapter.js";

interface Deps {
  fetchFn?: typeof fetch;
}

// Our protocolId → DeFiScan content-repo id (the path segment under
// src/content/protocols/<id>/ and the slug in www.defiscan.info/protocols/<id>).
const ID_MAP: Record<string, string> = {
  aave: "aave",
  spark: "spark",
  morpho: "morpho",
  uniswap: "uniswap-v3",
  lido: "lido-v2",
};

const SUPPORTED = new Set(Object.keys(ID_MAP));

const RAW_BASE =
  "https://raw.githubusercontent.com/deficollective/defiscan/main/src/content/protocols";
const SITE_BASE = "https://www.defiscan.info/protocols";

// DeFiScan exposes no JSON API. The machine-readable source is the open-source
// content repo: each protocol's `<chain>.md` review has a YAML frontmatter with a
// `stage:` field — a number 0/1/2 or the string "R" (Review). We fetch the raw
// markdown, read `stage:`, and map it to DeFiScan's own verbatim label.
function mapStage(stage: string): string {
  switch (stage) {
    case "0":
      return "Stage 0";
    case "1":
      return "Stage 1";
    case "2":
      return "Stage 2";
    case "R":
      return "Review";
    default:
      throw new Error(`defiscan: unrecognized stage value "${stage}"`);
  }
}

// Extract the `stage:` value from the leading YAML frontmatter block. We only
// read the single scalar we need (rather than a full YAML parse) because the
// frontmatter contains complex nested structures (stage_requirements) that are
// irrelevant here. Throws if there is no frontmatter or no `stage:` field — a
// shape change must fail loudly, not silently degrade to not-yet-covered.
function extractStage(markdown: string): string {
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!fmMatch?.[1]) {
    throw new Error("defiscan: no YAML frontmatter found in review markdown");
  }
  const frontmatter = fmMatch[1];
  // `stage:` at the start of a line, value is a bare number or quoted/bare "R".
  const stageMatch = /^stage:\s*"?([0-2R])"?\s*$/m.exec(frontmatter);
  if (!stageMatch?.[1]) {
    throw new Error("defiscan: no `stage:` field in review frontmatter (shape changed)");
  }
  return stageMatch[1];
}

export function makeDefiscanAdapter({ fetchFn = fetch }: Deps = {}): FeedAdapter {
  return {
    id: "defiscan",
    supports: (id) => SUPPORTED.has(id),
    async fetchCell(protocolId): Promise<RatingCellInput> {
      const defiscanId = ID_MAP[protocolId];
      if (!defiscanId) {
        throw new Error(`defiscan: unsupported protocol ${protocolId}`);
      }
      const url = `${RAW_BASE}/${defiscanId}/ethereum.md`;
      const res = await fetchFn(url);
      if (!("ok" in res) || !res.ok) {
        const status = "status" in res ? res.status : "no status";
        throw new Error(`defiscan fetch failed for ${protocolId}: ${status}`);
      }
      const markdown = await res.text();
      const verbatim = mapStage(extractStage(markdown));
      return {
        coverage: "covered",
        rating: {
          verbatim,
          sourceUrl: `${SITE_BASE}/${defiscanId}/ethereum`,
        },
      };
    },
  };
}
