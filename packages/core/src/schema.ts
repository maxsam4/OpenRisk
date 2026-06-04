import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const isoMonthOrDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "expected YYYY-MM or YYYY-MM-DD");
const isoDateTime = z.string().datetime();
// Provenance source-type tag (matches the design's 4-value taxonomy).
export const ProvenanceTagEnum = z.enum(["onchain", "feed", "curated", "self-reported"]);

export const ProtocolCategory = z.enum([
  "Lending", "DEX_AMM", "Swap_Aggregator", "Yield_Vault", "Liquid_Staking", "Other",
]);

// .strict() is what forbids stray fields like a composite `score`.
export const ProtocolSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: ProtocolCategory,
  family: z.string().optional(),
  versions: z.array(z.string()).optional(),
  chain: z.string().min(1),              // e.g. "Ethereum + 11 chains" (display, factual)
  site: z.string().min(1),               // display domain, e.g. "aave.com"
  blurb: z.string().min(1),              // factual one-paragraph description
  links: z.object({ website: z.string().url(), docs: z.string().url().optional(), github: z.string().url().optional() }),
  defillamaSlugs: z.array(z.string().min(1)).min(1),
}).strict();

export const FeedSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  type: z.enum(["Rating", "Dashboard", "Monitoring", "Research"]),
  focus: z.string().min(1),
  url: z.string().url(),
  access: z.enum(["auto", "manual"]),
  conflicts: z.string().min(1).nullable(),   // REQUIRED-nullable: null = "none declared"
  displayOrder: z.number().int().nonnegative(), // deterministic matrix column order
}).strict();

// NOTE: schemas use NO Zod `.default()`/`.transform()` so that parsed YAML === typed data.
// (The web reads `loadDataset()` raw and casts to these types; validation is a separate
// gate. If you ever add a default, the loader must return the Zod-parsed output instead.)

const Dimension = z.object({ label: z.string().min(1), value: z.string().min(1) }).strict();
const Rating = z.object({
  verbatim: z.string().min(1),
  dimensions: z.array(Dimension).optional(),  // source-native sub-values, VERBATIM only
  sourceUrl: z.string().url(),
}).strict();

const Provenance = z.object({
  method: z.enum(["auto", "manual"]),
  checkedUrl: z.string().url(),               // where coverage was verified
  lastChecked: isoDate,
  lastAttemptedFetchAt: isoDateTime.optional(),
  lastSuccessfulFetchAt: isoDateTime.optional(),
  curator: z.string().min(1),
  sourceStatus: z.enum(["ok", "stale", "fetch-error"]).optional(),
}).strict();

export const RatingCellSchema = z.object({
  protocolId: z.string().regex(/^[a-z0-9-]+$/),
  feedId: z.string().regex(/^[a-z0-9-]+$/),
  coverage: z.enum(["covered", "partial", "not-yet-covered"]),
  rating: Rating.nullable(),
  coverageScope: z.string().min(1).optional(), // required iff coverage === "partial"
  provenance: Provenance,
  coverageNote: z.string().min(1).optional(),  // factual, source-backed context only
}).strict().superRefine((cell, ctx) => {
  if (cell.coverage === "not-yet-covered" && cell.rating !== null) {
    ctx.addIssue({ code: "custom", message: "not-yet-covered cells must have rating: null" });
  }
  if (cell.coverage !== "not-yet-covered" && cell.rating === null) {
    ctx.addIssue({ code: "custom", message: "covered/partial cells require a rating" });
  }
  if (cell.coverage === "partial" && !cell.coverageScope) {
    ctx.addIssue({ code: "custom", message: "partial cells require coverageScope" });
  }
});

// Defense-in-depth no-composite guard: a recursive scan rejects any key whose name
// implies a derived/aggregate/normalized score, anywhere in the parsed data — PLUS a
// value-aware rule: a key named `rating` is fine for the verbatim string, but a *numeric*
// `rating` (a project-style score) is forbidden.
//
// Matching is TOKEN-based (not substring) so camelCase / snake_case / kebab-case
// composites are caught too — `overallScore`, `riskTier`, `protocolRank`,
// `weightedRank`, `composite_score` all tokenize to a forbidden stem. A substring
// denylist would miss these; an over-broad substring match would false-positive
// (e.g. "scope" contains no forbidden token, but "score" does).
export const FORBIDDEN_KEY_STEMS = [
  "score", "rank", "ranking", "tier", "grade", "composite",
  "normalized", "normalised", "aggregate", "weight", "weighted", "index", "overall",
];
// Split a key into lowercase word tokens across camelCase, snake_case, kebab-case.
function tokenizeKey(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}
function isForbiddenKey(key: string): boolean {
  return tokenizeKey(key).some((tok) => FORBIDDEN_KEY_STEMS.some((stem) => tok === stem || tok.startsWith(stem)));
}
export function findForbiddenKeys(value: unknown, path = ""): string[] {
  const hits: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findForbiddenKeys(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (isForbiddenKey(k)) hits.push(`${path}.${k}`);
      // value-aware: a `rating` key is allowed (verbatim string/object) but a NUMERIC
      // rating is a project-style score → forbidden.
      if (/^rating$/i.test(k) && typeof v === "number") hits.push(`${path}.${k} (numeric rating)`);
      hits.push(...findForbiddenKeys(v, `${path}.${k}`));
    }
  }
  return hits;
}

// Governance (matches the design): a per-item source `tag`, an optional explorer
// `link` distinct from `sourceUrl`, plus a set-level `summary` + `safeApiStatus`
// (refreshed by the Safe service in Task 7) and one set-level provenance.
export const GovernanceItem = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/).optional(), // stable machine key (e.g. "threshold",
                                               // "admin-multisig") so the Safe service updates
                                               // the right item without matching display labels
  label: z.string().min(1),
  value: z.string().min(1),
  tag: ProvenanceTagEnum,                      // onchain | feed | curated | self-reported
  sourceUrl: z.string().url(),
  link: z.string().url().optional(),           // e.g. block-explorer address link
}).strict();
export const GovernanceSchema = z.object({
  protocolId: z.string().regex(/^[a-z0-9-]+$/),
  summary: z.string().min(1).optional(),       // e.g. "5/9 · 2d" (threshold · timelock), factual
  safeApiStatus: z.enum(["ok", "stale", "failed", "n/a"]),  // REQUIRED (no default): "n/a" =
                                               // protocol has no tracked Safe. Seed explicitly so
                                               // raw loaded data === typed data (no Zod defaults).
  safe: z.object({                             // multisig the Safe service tracks (Task 7); omit if none
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    chainId: z.number().int().positive(),
  }).optional(),
  items: z.array(GovernanceItem),
  provenance: Provenance,                      // set-level: method/checkedUrl/lastChecked/...
}).strict().superRefine((g, ctx) => {
  // A tracked Safe and the "no tracked Safe" flag are mutually exclusive: `n/a`
  // must NOT carry a `safe` block, and a live status (ok/stale/failed) requires one.
  if (g.safeApiStatus === "n/a" && g.safe) {
    ctx.addIssue({ code: "custom", message: "safeApiStatus 'n/a' must not include a safe block" });
  }
  if (g.safeApiStatus !== "n/a" && !g.safe) {
    ctx.addIssue({ code: "custom", message: "safeApiStatus ok/stale/failed requires a safe block" });
  }
});

// Factual histories — records with sources, NOT project-assigned risk grades.
// Field names match the design (firm/url; severity/url). `date` allows YYYY-MM.
const Audit = z.object({
  firm: z.string().min(1),
  date: isoMonthOrDate,
  scope: z.string().min(1).optional(),
  url: z.string().url(),
}).strict();
export const AuditHistorySchema = z.object({
  protocolId: z.string().regex(/^[a-z0-9-]+$/), audits: z.array(Audit),
}).strict();

const Incident = z.object({
  date: isoMonthOrDate,
  title: z.string().min(1),                    // verbatim headline
  summary: z.string().min(1),                  // factual description (loss, if any, stated here)
  severity: z.string().min(1).optional(),      // VERBATIM from the cited source only (e.g. "moderate")
  url: z.string().url(),
}).strict();
export const IncidentHistorySchema = z.object({
  protocolId: z.string().regex(/^[a-z0-9-]+$/), incidents: z.array(Incident),
}).strict();
