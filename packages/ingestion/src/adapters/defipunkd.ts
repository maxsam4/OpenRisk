import type { FeedAdapter, RatingCellInput } from "../adapter.js";

interface Deps {
  fetchFn?: typeof fetch;
}

// Our protocolId → DeFiPunk'd URL slug (https://defipunkd.com/protocol/<slug>).
// All five POC protocols use their plain id as the slug.
const ID_MAP: Record<string, string> = {
  aave: "aave",
  spark: "spark",
  morpho: "morpho",
  uniswap: "uniswap",
  lido: "lido",
};
const SUPPORTED = new Set(Object.keys(ID_MAP));
const SITE_BASE = "https://defipunkd.com/protocol";

// DeFiPunk'd has no JSON API, but every per-protocol page is server-rendered (Astro)
// and encodes the rating in the HTML: a tier "medal" (Wood/Bronze/Silver/Gold + a
// consensus phrase) and five dimension "pizza slices", each an SVG <title> of the
// form "<Dimension> — <status>" (e.g. "Autonomy — tentative orange") anchored to a
// protocol instance (e.g. #aave-v3-autonomy). We read the tier headline verbatim and
// the five dimensions of the PRIMARY (first-listed) instance verbatim. A structure
// change must fail loudly — never silently degrade.

const DIM_ORDER = ["control", "ability-to-exit", "autonomy", "open-access", "verifiability"] as const;
const DIM_LABEL: Record<string, string> = {
  control: "Control",
  "ability-to-exit": "Ability to Exit",
  autonomy: "Autonomy",
  "open-access": "Open Access",
  verifiability: "Verifiability",
};

const TIER_RE = /(Wood|Bronze|Silver|Gold) tier ·\s*([^"<]+)/;
const SLICE_RE =
  /href="#([a-z0-9-]+?)-(control|ability-to-exit|autonomy|open-access|verifiability)"[^>]*data-pizza-slice="[^"]*"[^>]*>\s*<path[^>]*>\s*<title>([\s\S]*?)<\/title>/gi;

interface ParsedRating {
  verbatim: string;
  dimensions: { label: string; value: string }[];
}

// Returns the parsed rating, or `null` when the protocol is present on DeFiPunk'd
// but genuinely carries NO rating yet (no tier medal and no dimension slices) — the
// caller maps that to `not-yet-covered`, NOT a fetch error. A page that has SOME of
// the rating structure but not all of it is a real shape change and throws.
export function parseDefipunkd(html: string): ParsedRating | null {
  const tierMatch = TIER_RE.exec(html);
  const slices = [...html.matchAll(SLICE_RE)];
  if (!tierMatch && slices.length === 0) return null; // not rated on DeFiPunk'd
  if (!tierMatch) {
    throw new Error("defipunkd: dimension slices present but no tier headline (shape changed)");
  }
  const verbatim = `${tierMatch[1]} tier · ${tierMatch[2]!.trim()}`;

  // Collect dimension statuses for the FIRST instance encountered (the primary
  // deployment the page leads with). Slices appear in document order.
  let primary: string | undefined;
  const found: Record<string, string> = {};
  for (const m of slices) {
    const [, instance, dim, title] = m;
    if (primary === undefined) primary = instance;
    if (instance !== primary) continue;
    // Title is "<Dimension> — <status>"; keep the source's own status verbatim.
    const parts = title!.split("—");
    if (parts.length < 2) {
      throw new Error(`defipunkd: malformed slice title "${title!.trim()}" (shape changed)`);
    }
    found[dim!.toLowerCase()] = parts.slice(1).join("—").trim();
  }

  const dimensions = DIM_ORDER.map((key) => {
    const value = found[key];
    if (!value) {
      throw new Error(`defipunkd: missing "${key}" dimension for the primary instance (shape changed)`);
    }
    return { label: DIM_LABEL[key]!, value };
  });

  return { verbatim, dimensions };
}

export function makeDefipunkdAdapter({ fetchFn = fetch }: Deps = {}): FeedAdapter {
  return {
    id: "defipunkd",
    supports: (id) => SUPPORTED.has(id),
    async fetchCell(protocolId): Promise<RatingCellInput> {
      const slug = ID_MAP[protocolId];
      if (!slug) {
        throw new Error(`defipunkd: unsupported protocol ${protocolId}`);
      }
      const url = `${SITE_BASE}/${slug}`;
      const res = await fetchFn(url);
      if (!("ok" in res) || !res.ok) {
        const status = "status" in res ? res.status : "no status";
        throw new Error(`defipunkd fetch failed for ${protocolId}: ${status}`);
      }
      const html = await res.text();
      const parsed = parseDefipunkd(html);
      if (!parsed) {
        // Page loaded but the protocol carries no DeFiPunk'd rating yet → a real,
        // evidenced coverage gap (not a fetch error). writeCell keeps the existing
        // provenance.checkedUrl; narrative coverageNote stays human-curated.
        return { coverage: "not-yet-covered", rating: null };
      }
      return {
        coverage: "covered",
        rating: { verbatim: parsed.verbatim, dimensions: parsed.dimensions, sourceUrl: url },
      };
    },
  };
}
