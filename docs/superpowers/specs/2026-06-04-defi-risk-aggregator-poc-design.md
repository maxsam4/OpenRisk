# Neutral DeFi Risk Intelligence Aggregator — POC Design

**Status:** Draft for review
**Date:** 2026-06-04
**Scope:** Proof-of-concept (not the full 20-protocol production product)
**Working title:** OpenRisk Aggregator (name TBD; not blocking)

---

## 1. Problem

DeFi risk intelligence is fragmented across many independent feeds (DeFiScan,
BlockAnalitica, LlamaRisk, DeFiPunk'd, Credora, and others), each with its own
focus and methodology. There is no neutral layer that shows, side by side, what
every feed says about a given protocol.

The mental model is **oracle diversity**: no single feed should be canonical for
something this important, and the aggregation itself is the value. Coverage gaps
are treated as *data* (explicitly labeled), not smoothed away.

## 2. What this POC proves

This is a free, open-source build. The POC exists to prove the model end to end
on a small slice, with an architecture that scales cleanly to the full product
(20 protocols × full feed registry) without redesign.

The POC will demonstrate:

1. A **typed, validated data layer** where every protocol×feed cell is explicitly
   labeled `covered | partial | not-yet-covered`, stores the feed's rating
   **verbatim** plus a source link and provenance, and **structurally cannot hold
   a composite/synthesized score**.
2. A **community-correctable workflow**: the data is version-controlled files, so
   corrections are ordinary pull requests with visible diffs and provenance.
3. **Automated ingestion** for at least one feed, proving the automation path,
   with the remaining feeds seeded by manual curation.
4. A **data-dense, legible UI** (L2Beat / DeFiScan in spirit): a sortable,
   filterable summary matrix, per-protocol detail pages, and a methodology page.
5. **Live TVL** sourced from DefiLlama without requiring an always-on backend.

### Explicitly out of scope for the POC

- All 20 seed protocols (POC uses 5).
- Full feed registry (POC uses 4).
- Cross-chain / L2 coverage.
- Any composite scoring, ranking, or editorial synthesis — **permanently** out of
  scope by charter, not just deferred.
- Heavy governance automation (POC surfaces governance with provenance tags;
  deep onchain governance indexing is a later phase). No `viem`/RPC dependency in
  the POC — governance is curated manually with source links.
- IPFS mirroring — documented as future work, not implementation scope.

**In scope (note):** governance, **audit history**, and **incident history** are all
included on the protocol detail page. Each has its own schema, seed data, and
validation — they are records of facts (auditors, reports, events) with sources, not
synthesized risk judgments, so they are consistent with the no-composite principle.

## 3. Core design principles (these are product invariants, not grant rules)

- **Verbatim only.** The app displays what each feed says, in the feed's own
  words/labels, with a link to the source. It never rewrites, normalizes, or
  combines ratings.
- **No composite scoring — enforced in code, defense in depth.** This is the
  product's reason to exist, so a single `.strict()` is not enough (it only blocks
  unknown fields under *today's* schema; it wouldn't stop someone adding a
  `riskTier`/`rank`/`normalizedRating` field later, nor stop UI code from computing
  a ranking). Three layers enforce it: (1) the data schema has no aggregate field;
  (2) `validateDataset()` runs a **recursive forbidden-key-name denylist scan** over
  all raw data (`score`, `rank`, `rating` (numeric), `tier`, `grade`, `composite`,
  `normalized*`, `aggregate*`, `weight*`, `index`), with nested negative fixtures in
  tests; (3) a **web test** asserts the UI renders no aggregate/ranking/sort-by-score
  element. A `CHARTER.md` documents the constraint and the process to change it.
- **Coverage gaps are data, with evidence.** Every cell is assessed and labeled;
  `not-yet-covered` is a first-class value, never a blank — and it still carries a
  `checkedUrl` showing *where* the absence was verified. `partial` carries a required
  `coverageScope` saying what is and isn't covered.
- **Provenance on everything.** Each cell records source URL, fetch method
  (`auto` | `manual`), `checkedUrl`, `lastChecked`, `lastAttemptedFetchAt` /
  `lastSuccessfulFetchAt` (for auto feeds), `sourceStatus` (`ok|stale|fetch-error`),
  and curator. The site shows a global "data last checked" status so stale data is
  never hidden behind a green build.
- **Neutral & transparent.** Open source (AGPL-3.0), open data, conflicts (if any)
  declared in-repo. Data lives in git so it is auditable and forkable.

## 4. Architecture (Option A: data-as-code, static-first)

The defining property of this domain is that **the data changes slowly** (ratings,
governance, audits, incidents change infrequently; only TVL is continuous, and
that is one well-known API). The architecture follows from that fact.

```
   GitHub Action (cron): runs ingestion CLI ─► writes data/ files ─► Action opens PR
   feed sources ──► packages/ingestion ──────────────────────────► data/ (files)
   (APIs / pages)      (TS adapters; CLI writes files, never PRs)      │
                                                                      │ build-time read
   DefiLlama ──► build-time snapshot (data/tvl-snapshots.yaml) ──┐     ▼
            └─► client-side live-TVL upgrade (no server) ◄───────┴ packages/web (Next.js
                                                            static export) ──► CDN (Cloudflare)
   packages/core: Zod schema + TS types + validateDataset()  (shared by all)
```

- **Separation of concerns without separation of deployment.** Data, ingestion,
  and presentation are distinct packages sharing TypeScript types — but there is
  no always-on backend service or database to operate.
- **The data layer *is* the git repo.** Corrections = PRs. No DB to lose, corrupt,
  or migrate. The dataset is forkable and auditable by anyone.
- **The frontend is statically generated.** It reads `data/` + `core` types at
  build time. Live TVL is fetched client-side from DefiLlama, so the deployed site
  needs no server runtime and is nearly un-down-able (static hosting + optional
  IPFS mirror).

### Why not the alternatives

- **DB-backed Next.js monolith with live scraping:** always-on server + DB to
  maintain, request-time scraping is slow/flaky, and the data layer stops being
  transparent/correctable-by-PR. More fragile for a small-team public good.
- **Fully separated backend service + SPA:** over-engineered for slowly-changing
  data; two deploys, CORS, API versioning, infra cost — all to serve near-static
  data.

## 5. Repository layout (pnpm + Turborepo monorepo)

```
defi-risk-agg/
├─ packages/
│  ├─ core/         # Zod schemas, TS types, validateDataset(); NO score field
│  ├─ ingestion/    # FeedAdapter interface, DeFiScan adapter, CLI runner, fixtures
│  └─ web/          # Next.js (App Router) static export — the site
├─ data/            # source-of-truth data files (the "data layer")
│  ├─ protocols/    # <protocol>.yaml — identity, category, family, links, defillama slug(s)
│  ├─ feeds/        # <feed>.yaml — registry entry: name, type, focus one-liner, URL, access method, conflicts
│  ├─ ratings/      # <protocol>/<feed>.yaml — one file per cell (status + verbatim rating + provenance)
│  ├─ governance/   # <protocol>.yaml — governance items + provenance
│  ├─ audits/       # <protocol>.yaml — audit history (auditor, date, report link)
│  └─ incidents/    # <protocol>.yaml — incident history (date, title, summary, source)
├─ docs/            # methodology source, contribution guide, this spec
├─ CHARTER.md       # the no-composite-scoring constraint + change process
├─ LICENSE          # AGPL-3.0
└─ .github/workflows/  # ci.yml (lint/typecheck/validate/test/build) + ingest.yml (scheduled)
```

**Rating file granularity:** one file per cell (`ratings/<protocol>/<feed>.yaml`).
For the POC that is 5×4 = 20 small files. This makes "every cell is assessed and
labeled" literal, keeps PR diffs tiny and reviewable, and matches how L2Beat-style
projects manage data at scale. (Tradeoff: many files; acceptable — git handles
thousands.)

## 6. Data model (`packages/core`)

All schemas defined in Zod; TS types inferred from them. `validateDataset()`
loads every file, validates it, and cross-checks: (a) referential integrity (every
protocol×feed combination has exactly one rating cell; every ref resolves);
(b) **file-path ↔ id consistency** (`ratings/<protocolId>/<feedId>.yaml` must match
the cell's fields) and **orphan rejection** (no stray files/dirs); (c) the recursive
no-composite denylist scan. Loaders emit deterministic, sorted YAML so diffs are clean.

**Protocol**
```
id            string (kebab, stable)        e.g. "aave"
name          string                         e.g. "Aave"
category      enum(Lending|DEX_AMM|Swap_Aggregator|Yield_Vault|Liquid_Staking|...)
family        string?                        grouping key for versions, e.g. "aave"
versions      string[]?                      e.g. ["v3","v4"]
links         { website, docs, github? }
defillamaSlugs string[]                       for TVL lookup
```

**Feed**
```
id            string (kebab)                 e.g. "defiscan"
name          string                         e.g. "DeFiScan"
type          enum(Rating|Dashboard|Monitoring|Research)
focus         string                         one-line methodology summary (verbatim-friendly)
url           string                         homepage / methodology
access        enum(auto|manual)              how this feed's data is obtained
conflicts     string | null                  REQUIRED-nullable: `null` = "none declared",
                                              never omitted (transparency is an invariant)
```

**RatingCell** (the heart of the model)
```
protocolId    string  (ref)
feedId        string  (ref)
coverage      enum(covered|partial|not-yet-covered)
rating        {                              // present iff coverage != not-yet-covered
                 verbatim: string            // the feed's own headline label/text, unchanged
                 dimensions?: [{ label: string, value: string }]  // optional, source-native
                                              // sub-scores VERBATIM (e.g. DeFiPunk'd's
                                              // Control/Exit/Autonomy). NEVER project-normalized.
                 sourceUrl: string           // direct link to the feed's page for this protocol
              } | null
coverageScope string?                        // REQUIRED iff coverage == "partial":
                                              // what is/ isn't covered, source-backed
provenance    {
                 method: enum(auto|manual)
                 checkedUrl: string           // where coverage was verified — REQUIRED for
                                              // not-yet-covered (its only source link)
                 lastChecked: ISODate         // when a human/CI last verified
                 lastAttemptedFetchAt: ISODateTime?   // auto feeds
                 lastSuccessfulFetchAt: ISODateTime?  // auto feeds
                 curator: string              // handle or "ingestion-bot"
                 sourceStatus: enum(ok|stale|fetch-error)?  // loud signal, not silent
              }
coverageNote  string?                        // factual, source-backed context ONLY (was `notes`);
                                              // must not editorialize or synthesize
```

**Hard schema invariant (defense in depth):** no field anywhere holds a derived/
aggregate/composite/normalized score. Enforced by (1) `.strict()` schemas, (2) a
**recursive forbidden-key-name denylist** in `validateDataset()` scanning the raw
parsed data (denylist: `score`, `rank`, `tier`, `grade`, `composite`,
`normalized*`, `aggregate*`, `weight*`, `index`, numeric `rating`), and (3) a web
test asserting no ranking/score UI. `validateDataset()` fails the build on any hit.

**Governance / Audit / Incident** (manually curated, validated like everything else;
one file per protocol; all `protocolId`s must resolve). These are factual records with
sources — never synthesized risk judgments.
```
Governance   { protocolId, items: [{ label, value, sourceUrl, provenance }] }
             // e.g. "Upgradeability", "Timelock", "Admin multisig"

AuditHistory { protocolId, audits: [{ auditor, date, scope?, reportUrl, provenance }] }
             // auditor name + report link, verbatim; no pass/fail grade of our own

IncidentHistory { protocolId, incidents: [{
               date, title, summary, lossUsd?, severityLabel?, sourceUrl, provenance }] }
             // factual event record. `severityLabel` is VERBATIM from the cited source
             // ONLY (e.g. "Critical" as the source classified it) — never assigned by us.
```
`validateDataset()` loads and validates governance, audit, and incident files too.
POC sources these manually with source links; later phases may automate. No `viem`/RPC
in the POC.

## 7. POC content selection

**Protocols (5)** — chosen to span categories and exercise family grouping + cross-listing:

| Protocol | Category | Why |
|----------|----------|-----|
| Aave | Lending | v3/v4 → exercises family/version grouping |
| Spark | Lending | Sky sub-protocol → relationship modeling |
| Morpho | Lending | also relates to Morpho Vaults (Yield) → cross-reference |
| Uniswap | DEX/AMM | v3/v4/UniswapX → family grouping; non-lending category |
| Lido | Liquid Staking | stETH, the dominant collateral; different risk profile |

**Feeds (4)** — chosen to span types and access methods, and to *naturally* produce
coverage gaps (which proves the "gaps are data" point):

| Feed | Type | Access | Why |
|------|------|--------|-----|
| DeFiScan | Rating | auto | Structured public data → the automated-adapter exemplar |
| BlockAnalitica | Dashboard | manual | Lending-focused → will be `partial`/`not-yet-covered` for non-lending (Uniswap/Lido) |
| LlamaRisk | Research | manual | Research reports → manual-curation exemplar |
| DeFiPunk'd | Rating | manual | Multi-dimension rating registry → another verbatim-rating shape |

This 5×4 matrix deliberately contains `covered`, `partial`, and `not-yet-covered`
cells so the UI's coverage-gap handling is exercised for real.

## 8. Ingestion (`packages/ingestion`)

- **`FeedAdapter` interface:** `{ id; supports(protocol): boolean; fetchCell(protocol): Promise<RatingCellInput> }`.
- **DeFiScan adapter:** the one automated feed for the POC. Fetches the protocol's
  DeFiScan data and maps it to a `RatingCell` with `provenance.method = "auto"`,
  `fetchedAt = now`, verbatim label + source URL.
- **CLI runner (writes files only — does NOT open PRs):** `pnpm ingest [--feed
  defiscan] [--protocol aave]` runs adapters, writes/updates `data/ratings/...`
  files, stamps provenance, prints a diff summary, and exits non-zero if any fetch
  failed. PR creation is owned entirely by the GitHub Action (separation of
  concerns; the CLI stays runnable locally without git/PR side effects).
- **Loud failure (anti-silent-failure):** an adapter distinguishes three states and
  never conflates them:
  - source genuinely doesn't cover the protocol → write `not-yet-covered` with a
    `checkedUrl` (legitimate data),
  - fetch/parse succeeded → write/update `covered|partial` with fresh provenance
    (`lastSuccessfulFetchAt = now`, `sourceStatus = ok`),
  - fetch/parse **failed or the source's structure changed** → do **not** overwrite
    good data; keep the last rating, set `sourceStatus = "fetch-error"` and
    `lastAttemptedFetchAt = now`, and exit non-zero. Crucially the workflow still
    commits these provenance changes and opens the PR (see §10) so the failure is
    *visible and reviewable*, then a final step marks the job failed/notifies. Stale
    data is shown as stale, never silently dropped or silently served as fresh.
- **Fixture tests:** adapter tested against recorded source responses so an upstream
  format change is caught by a failing test, not by silently emitting empty cells.

## 9. Frontend (`packages/web`, Next.js static export)

Static-first: `output: "export"`, all data read at build time. No server runtime
required; deployable to Cloudflare Pages / GitHub Pages / Vercel + optional IPFS mirror.

**Pages:**

1. **Summary matrix** (`/`): rows = protocols, columns = feeds; cells show coverage
   status (color/label) + a peek at the verbatim rating. Sortable & filterable
   (by category, coverage, feed) — but **never sortable/rankable by any synthesized
   score** (there is none). Family grouping for versioned protocols. A live TVL
   column. A global "data last checked" status line. Sorting/filtering can use a
   small client island; a lightweight table is sufficient at POC size (TanStack
   Table optional, not required).
2. **Protocol detail** (`/protocol/[id]`): header with live TVL + category +
   family/versions; one **feed card** per feed showing the feed's methodology
   one-liner, the **verbatim** rating (and any source-native `dimensions`), source
   link, `coverageScope` for partial cells, and provenance (method + last checked +
   stale flag); a **governance** section with provenance tags; an **audit history**
   section (auditor + report link + date per audit); and an **incident history**
   section (date, title, summary, loss if reported, source-verbatim severity if any,
   source link). Built for all 5 protocols. Audit/incident entries are factual,
   source-linked records — not project-assigned risk grades.
3. **Methodology** (`/methodology`): what the project does and does **not** do
   (no composite scoring — links `CHARTER.md`), the feed registry with one-liners +
   types, and an explanation of provenance tags + coverage states.
4. **Contribute** (`/contribute` + `CONTRIBUTING.md`): how to submit a correction
   (open a PR editing a `data/ratings/...` file), add a protocol, or propose a feed.

**Live TVL (with a real fallback):** a build-time step writes `data/tvl-snapshots.yaml`
— for each protocol it sums all `defillamaSlugs`, records the value + `asOf`
timestamp, and validates every slug resolves (fails the build on an unknown slug).
The page renders the snapshot immediately (labelled "as of <date/age>"); a small
client component then fetches live DefiLlama and upgrades the number if successful.
If the live fetch fails, the snapshot stands — never a bare dash, never a blank.
Multi-slug protocols are summed consistently in both paths.

## 10. Quality, CI, and hosting

- **CI (`ci.yml`):** lint → typecheck → `validateDataset()` (fails on schema
  violations, missing/orphan cells, path↔id mismatch, or any composite/denylisted
  field) → unit/component tests → `next build` (static export). A PR cannot merge
  with invalid data.
- **Scheduled ingestion (`ingest.yml`):** runs the DeFiScan adapter on a cron. The
  ingest step uses `continue-on-error` so that even on a `fetch-error` the changed
  provenance is committed and a PR is **always** opened when files changed (the
  failure becomes reviewable, not swallowed); a final step then marks the job
  failed/notifies if any fetch errored. PR creation lives only here, not in the CLI.
- **Tests:**
  - `core`: schema validation incl. **nested** negative fixtures that add a
    composite/denylisted field at root and deep paths → must fail; path↔id and
    orphan checks; governance validation.
  - `ingestion`: DeFiScan adapter against recorded fixtures; the loud-failure path
    (fetch error preserves rating, sets `fetch-error`, exits non-zero) is tested.
  - `web`: filter/sort behavior; a **no-synthesis UI guard** asserting no
    score/rank/composite element is rendered; build smoke test; basic a11y check.
- **Hosting:** static export to a CDN (Cloudflare Pages recommended). No database,
  no app server. (IPFS mirror = documented future work, not POC scope.)
- **License:** AGPL-3.0. `CHARTER.md` commits the no-composite-scoring constraint.

## 11. Build sequence (phases)

0. **Scaffold:** monorepo (pnpm + Turborepo), TS config, lint, `git init`, license,
   CHARTER.md, CI skeleton.
1. **Data layer (`core`):** schemas, types, `validateDataset()`, the no-composite
   guard + negative test.
2. **Seed data:** author the 5 protocols, 4 feeds, 20 rating cells (mix of
   covered/partial/not-yet-covered, with `coverageScope`/`checkedUrl` as required),
   and the governance/audit/incident files, by hand. Validate green.
3. **Web — summary matrix:** static read of data, lightweight sort/filter island,
   build-time TVL snapshot + live-TVL upgrade, "data last checked" status.
4. **Web — protocol detail (feeds + governance + audit + incident history) +
   methodology + contribute pages.**
5. **Ingestion:** `FeedAdapter` + DeFiScan adapter + CLI (writes files only) +
   fixtures + loud-failure handling; wire the scheduled PR workflow (continue-on-error
   + always-PR-if-changed + final fail/notify).
6. **Polish & deploy:** a11y/density pass, README + CONTRIBUTING, deploy static site.

Each phase ends green (typecheck + validate + tests + build).

## 12. Open questions / risks

- **Feed data shapes vary widely.** "Verbatim rating" must accommodate a letter
  grade, a category label, a paragraph, or a dashboard metric. The `rating.verbatim`
  string + per-feed `focus` one-liner handles this, but the detail-page feed card
  must render gracefully for all shapes. (Mitigated by choosing 4 differently-shaped
  feeds in the POC.)
- **DeFiScan automation feasibility.** If DeFiScan exposes no clean machine-readable
  surface, the "one automated adapter" exemplar may switch to whichever registry
  feed has the cleanest public data; the adapter interface is unchanged.
- **Governance provenance.** POC keeps governance lightweight + manually sourced
  with links; deep onchain indexing is deferred.
- **TVL for non-TVL protocols** (e.g., swap aggregators in the full product): use a
  volume metric instead; not needed for the 5 POC protocols but the schema allows it.

---

## Addendum (2026-06-04): Approved design integrated

The Claude Design prototype in `defi-risk-agg-poc-design/` is the approved visual design and is now the source the implementation **ports** (see the plan). **This addendum supersedes §5–6 (repo layout + data model) wherever they differ** — the authoritative, current schema is in the plan's Task 2. Deltas vs. the body above:

- **Name:** the product is **OpenRisk** ("every feed, one view"). Repo links use placeholder `https://github.com/OWNER/openrisk` until the real URL is supplied.
- **Styling:** **CSS Modules per component + one global token stylesheet** (CSS custom properties; dark default + light), ported verbatim from `styles.css`. No Tailwind. All-monospace (JetBrains Mono), hairline borders, tabular numerals; coverage encoded by shape+label (not color alone).
- **Data-model additions (authoritative shapes in plan Task 2):** `Protocol` gains `chain`/`site`/`blurb`. `Feed` gains `displayOrder` (deterministic matrix column order). `Governance` becomes `{ summary?, safeApiStatus, safe{address,chainId}?, items:[{key?,label,value,tag,sourceUrl,link?}], provenance }` where `tag` ∈ `onchain|feed|curated|self-reported` (a new provenance source-type taxonomy) and item `key` is a stable id the Safe service updates by. `Audit` = `{firm,date,url,scope?}`; `Incident` = `{date,title,summary,severity?,url}` (date may be `YYYY-MM`; `severity` is source-verbatim, shown "(per source)"). Schemas use no Zod `.default()`/`.transform()` so raw loaded data === typed data. **Seed only real, verified, schema-valid values — never placeholders** (`data.js` is a structural template only).
- **Matrix additions:** Gov column (`summary`), a density **CoverageBar** (covered+partial fill — explicitly *not* a score), a ⇄ spread mark, family expander sub-rows, search + category/coverage/feed filters, deep-linkable URL filters, and a legend.
- **Governance freshness = a Safe service, not a live frontend call.** The site stays static; a scheduled `ingest:safe` service fetches the Safe Transaction API and refreshes the multisig fields in `data/governance/*.yaml` (loud failure → `safeApiStatus: failed`, last good data kept), opening a PR via the Action. No `viem`/RPC.
- **Execution:** implement with parallel agents — sequential spine (scaffold → core → validate → seed), then Web ∥ Ingestion, final sync at CI. See the plan's Parallel Execution section.
