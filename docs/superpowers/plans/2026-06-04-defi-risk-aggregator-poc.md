# OpenRisk — DeFi Risk Intelligence Aggregator (POC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Several task GROUPS are independent and SHOULD be run as parallel agents — see **Parallel Execution** below.

**Goal:** Build "OpenRisk", a proof-of-concept, open-source web app that aggregates what multiple DeFi risk feeds say about 5 protocols, side by side, verbatim — with a typed/validated data-as-code layer, automated ingestion (a feed adapter + a Safe-multisig governance service), and a static Next.js UI that faithfully implements the approved Claude Design.

**Architecture:** A pnpm + Turborepo monorepo. `packages/core` holds Zod schemas + types + `validateDataset()` (which structurally forbids any composite score). `data/` holds version-controlled YAML files (the data layer; corrections = PRs). `packages/ingestion` holds per-source adapters + a CLI that writes data files (a GitHub Action, not the CLI, opens PRs); this includes a **Safe Transaction API service** that refreshes governance multisig data into `data/governance/`. `packages/web` is a Next.js static-export site reading data at build time, with client-side live TVL from DefiLlama. No database, no always-on server.

**Tech Stack:** TypeScript, pnpm workspaces, Turborepo, Zod, Vitest, Next.js (App Router, `output: "export"`), React, **CSS Modules (per-component, scoped) + one small global token stylesheet (CSS custom properties / theme) — NO Tailwind, NO component lib**, JetBrains Mono, `yaml`, GitHub Actions, AGPL-3.0.

**Styling approach (CSS Modules):** The design's `styles.css` is split into (a) `app/globals.css` for true globals that must NOT be scoped — the `:root` + `[data-theme="light"]` CSS-variable token sets, the `@import` for JetBrains Mono, `html/body` base, `a`, `::selection`, `:focus-visible`, and the reduced-motion keyframes; and (b) per-component `*.module.css` files holding that component's classes, all referencing the global CSS variables. Class *names* and *declarations* are copied verbatim from the design (only the delivery mechanism changes) so the result is pixel-identical with near-zero drift.

**Design source (PORT FROM THIS):** The approved Claude Design prototype lives in `defi-risk-agg-poc-design/` (`styles.css`, `data.js`, and JSX: `app/matrix/detail/methodology/contribute/components`). It is a standalone React+Babel prototype. The web tasks below **port** it into typed Next.js/TSX with real data — preserve its markup/classes/declarations so the result is visually identical. `tweaks-panel.jsx` is a design-time tool and is **NOT** ported (but the dark/light theme toggle it drives **is** kept). Replace all `github.com/cpstl/openrisk` links with the placeholder `https://github.com/OWNER/openrisk` (owner TBD — user will supply).

**Spec:** `docs/superpowers/specs/2026-06-04-defi-risk-aggregator-poc-design.md`

---

## Parallel Execution

Run this plan with **parallel agents** (superpowers:dispatching-parallel-agents) wherever tasks are independent, with a review checkpoint at each sync barrier. Dependency graph:

```
Task 1 (scaffold) ─┬─► Task 2 (core: schema) ──► Task 3 (core: validate/load) ──► Task 4 (seed data)
                   │                                                                    │
                   │                          ┌─────────────────────────────────────────┤  (Task 4 = data barrier)
                   │                          ▼                                          ▼
                   │              Task 5 (web: shell+matrix)            Task 7 (ingestion: DeFiScan + Safe service)
                   │                          │                                          │
                   │                          ▼                                          │
                   │              Task 6 (web: detail/method/contribute)                 │
                   │                          └──────────────┬───────────────────────────┘
                   └─────────────────────────────────────────▼
                                                     Task 8 (CI / workflows / deploy)  ← final sync
```

- **Sequential spine:** Task 1 → 2 → 3 → 4 (each builds on the prior; the schema/types are the shared contract).
- **After Task 4, fan out in parallel:**
  - **Agent A — Web:** Task 5 then Task 6 (6 depends on 5's shared components/CSS; same agent, sequential).
  - **Agent B — Ingestion:** Task 7 (DeFiScan adapter **and** the Safe governance service — its two adapters are independent and may themselves be split across two sub-agents).
  - Agents A and B share only the `@dra/core` types and the `data/` schema (frozen at Task 4), so they don't collide.
- **Final sync — Task 8:** wire CI + both scheduled workflows + deploy after A and B land. Review/integration checkpoint here.
- Within a task, keep TDD steps in one agent (they're tightly coupled). Across the A/B split, give each agent the frozen `@dra/core` types and the design folder, and have them open separate PRs.

---

## Repository context & reference docs

Before starting, read these (every implementing agent should be pointed at them):

| Path | What it is | How to use it |
|------|-----------|---------------|
| `defi-risk-agg-poc-design/` | **The approved Claude Design prototype** (standalone React+Babel + `styles.css` + `data.js`). | The visual + structural source of truth for the web tasks. **Port** it (don't redesign). `data.js` is a *structural template* for the seed — values are placeholders, re-verify. `tweaks-panel.jsx` is design-tooling, not ported. |
| `docs/superpowers/specs/2026-06-04-defi-risk-aggregator-poc-design.md` | The design spec (problem, principles, architecture) + a design-integration addendum at the end. | The "why" and the invariants. Read the addendum for the deltas this plan implements. |
| `CHARTER.md` | The binding **no-composite-scoring** constraint + the process to ever change it. | Non-negotiable product invariant. Enforced in code (Task 2) + CI. |
| `CLAUDE.md` | Repo guidance for Claude Code / humans: invariants, architecture, commands, conventions, **data-integrity rule (real + valid data only)**. | Read first; keep it current (see note below). |
| `README.md` / `CONTRIBUTING.md` | Public-facing overview + contribution/correction workflow. | Keep in sync as the build evolves. |
| `OpenRisk_RFP_v0.md` | The original EF RFP that inspired the concept (context only — **we are not applying for the grant**). | Background. Not a build requirement. |

> **Keep `CLAUDE.md` and `README.md` updated.** If, while implementing, you change a command,
> a directory, a convention, the data model, the tech stack, or a workflow, **update `CLAUDE.md`
> and `README.md` in the same PR** so they never drift from reality. Each task's "commit" step
> should include any doc edits the task made necessary. (Task 8 has an explicit docs-sync step.)

---

## File Structure

```
defi-risk-agg/
├─ package.json                 # root: pnpm workspace + turbo scripts
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ .eslintrc.cjs / eslint.config.mjs
├─ LICENSE                      # AGPL-3.0
├─ CHARTER.md                   # no-composite-scoring constraint + change process
├─ README.md
├─ CONTRIBUTING.md
├─ packages/
│  ├─ core/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ schema.ts           # Zod schemas: Protocol, Feed, RatingCell, Governance, Audit, Incident
│  │  │  ├─ types.ts            # inferred TS types (re-exports)
│  │  │  ├─ load.ts             # read+parse YAML from data/ into typed objects
│  │  │  ├─ validate.ts         # validateDataset(): schema + referential integrity + no-composite guard
│  │  │  └─ index.ts            # public exports
│  │  └─ test/
│  │     ├─ schema.test.ts
│  │     └─ validate.test.ts
│  ├─ ingestion/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ adapter.ts          # FeedAdapter interface + RatingCellInput type
│  │  │  ├─ adapters/defiscan.ts
│  │  │  ├─ safe/fetchSafe.ts   # Safe Transaction API client (threshold, owners)
│  │  │  ├─ safe/updateGovernance.ts # merge Safe data into data/governance/<id>.yaml
│  │  │  ├─ writeCell.ts        # write/update a data/ratings file + stamp provenance
│  │  │  ├─ cli.ts              # `ingest` (feeds) entrypoint
│  │  │  └─ cli-safe.ts         # `ingest:safe` (governance) entrypoint
│  │  └─ test/
│  │     ├─ fixtures/{defiscan-aave.json, safe-aave.json}
│  │     ├─ defiscan.test.ts
│  │     └─ safe.test.ts
│  └─ web/                       # ports defi-risk-agg-poc-design/ → typed Next.js
│     ├─ package.json
│     ├─ next.config.mjs        # output: "export"
│     ├─ scripts/snapshot-tvl.ts
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ globals.css       # GLOBAL only: CSS vars (:root + [data-theme=light]), font, base, focus, keyframes
│     │  │  ├─ layout.tsx        # <html data-theme> + ThemeProvider + TopNav
│     │  │  ├─ page.tsx          # home (SummaryMatrix)
│     │  │  ├─ protocol/[id]/page.tsx
│     │  │  ├─ methodology/page.tsx
│     │  │  └─ contribute/page.tsx
│     │  ├─ lib/
│     │  │  ├─ data.ts           # build-time dataset load via @dra/core (+ view composition)
│     │  │  ├─ tvl.ts            # DefiLlama client fetch (sum slugs)
│     │  │  ├─ format.ts         # fmtTvl, ageFrom  (ported)
│     │  │  └─ coverage.ts       # coverageCount, coverageSpread  (ported)
│     │  └─ components/          # each: Foo.tsx + Foo.module.css
│     │     ├─ TopNav · ThemeProvider · ThemeToggle
│     │     ├─ SummaryMatrix (client) · MatrixCell · CoverageBar · CategoryChip
│     │     ├─ CoverageBadge · ProvenanceTag · StaleFlag · TvlValue (client)
│     │     ├─ FeedCard · GovernanceTable · DiffBlock
│     │     └─ (NOT ported: tweaks-panel)
├─ data/
│  ├─ protocols/{aave,spark,morpho,uniswap,lido}.yaml   # + chain, site, blurb
│  ├─ feeds/{defiscan,blockanalitica,llamarisk,defipunkd}.yaml
│  ├─ governance/{aave,spark,morpho,uniswap,lido}.yaml  # summary, safeApiStatus, items[{...,tag}]
│  ├─ audits/{aave,spark,morpho,uniswap,lido}.yaml      # [{firm,date,url,scope?}]
│  ├─ incidents/{aave,spark,morpho,uniswap,lido}.yaml   # [{date,title,summary,severity?,url}]
│  ├─ tvl-snapshots.yaml         # generated cache (build-time)
│  └─ ratings/<protocol>/<feed>.yaml      # 20 cells
├─ CLAUDE.md                    # repo guidance (created)
└─ .github/workflows/{ci.yml,ingest.yml}   # ingest.yml runs defiscan + safe
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `LICENSE`, `CHARTER.md`

- [ ] **Step 1: Initialize git and pnpm**

Run:
```bash
cd /Users/mgupta/Development/defi-risk-agg
git init
corepack enable
pnpm --version   # confirm pnpm available (>= 9)
```
Expected: a git repo; pnpm prints a version.

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "defi-risk-agg",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "validate": "pnpm --filter @dra/core validate"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "out/**", ".next/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
.next/
out/
*.tsbuildinfo
.DS_Store
.turbo/
```

- [ ] **Step 7: Add `LICENSE` (AGPL-3.0) and `CHARTER.md`**

Fetch the AGPL-3.0 text into `LICENSE`. Create `CHARTER.md`:
```markdown
# Project Charter

## No Composite Scoring (binding constraint)

This project aggregates third-party DeFi risk feeds and displays each feed's
assessment **verbatim**. It MUST NOT produce, store, or display any composite,
derived, normalized, or synthesized risk score, ranking, or rating of its own.

This is enforced in code: the data schema has no field for a derived score, and
`validateDataset()` fails CI if such a field is introduced.

## Changing this constraint

This constraint may only change via a PR that (a) amends this charter, (b) is
approved by the project steward, and (c) documents the rationale publicly. Absent
all three, the no-composite-scoring rule stands.
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo (pnpm + turbo + ts), license, charter"
```

---

## Task 2: `packages/core` — schema + types

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/schema.ts`, `packages/core/src/types.ts`, `packages/core/src/index.ts`
- Test: `packages/core/test/schema.test.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@dra/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint src",
    "validate": "tsx src/cli-validate.ts"
  },
  "dependencies": { "yaml": "^2.5.0", "zod": "^3.23.0" },
  "devDependencies": { "tsx": "^4.19.0", "vitest": "^2.1.0", "typescript": "^5.6.0" }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write the failing schema test**

`packages/core/test/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { RatingCellSchema, findForbiddenKeys } from "../src/schema.js";

const prov = { method: "manual", checkedUrl: "https://defiscan.info/protocol/aave",
  lastChecked: "2026-06-04", curator: "alice" };

describe("RatingCellSchema", () => {
  it("accepts a covered cell with a verbatim rating", () => {
    const cell = { protocolId: "aave", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 1", sourceUrl: "https://defiscan.info/protocol/aave" }, provenance: prov };
    expect(RatingCellSchema.parse(cell)).toMatchObject({ coverage: "covered" });
  });

  it("requires rating to be null when not-yet-covered", () => {
    const ok = { protocolId: "lido", feedId: "blockanalitica", coverage: "not-yet-covered",
      rating: null, provenance: prov };
    expect(() => RatingCellSchema.parse(ok)).not.toThrow();
    expect(() => RatingCellSchema.parse({ ...ok, coverage: "covered", rating: null })).toThrow();
  });

  it("requires coverageScope when partial", () => {
    const base = { protocolId: "aave", feedId: "blockanalitica", coverage: "partial",
      rating: { verbatim: "WETH market only", sourceUrl: "https://x.io/a" }, provenance: prov };
    expect(() => RatingCellSchema.parse(base)).toThrow();                       // missing scope
    expect(() => RatingCellSchema.parse({ ...base, coverageScope: "WETH market only" })).not.toThrow();
  });

  it("rejects a top-level composite/score field via .strict()", () => {
    const cell = { protocolId: "aave", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 1", sourceUrl: "https://x.io" }, provenance: prov, score: 87 };
    expect(() => RatingCellSchema.parse(cell)).toThrow();
  });
});

describe("findForbiddenKeys (recursive no-composite guard)", () => {
  it("catches a denylisted key nested deep in otherwise-valid data", () => {
    const data = { feeds: [{ id: "x", meta: { normalizedScore: 0.9 } }] };
    expect(findForbiddenKeys(data)).toContain(".feeds[0].meta.normalizedScore");
  });
  it("returns nothing for clean data", () => {
    expect(findForbiddenKeys({ verbatim: "Stage 1", dimensions: [{ label: "Control", value: "High" }] })).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @dra/core test`
Expected: FAIL — `../src/schema.js` not found.

- [ ] **Step 5: Implement `packages/core/src/schema.ts`**

```ts
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
export const FORBIDDEN_KEY_PATTERNS = [
  /^score$/i, /^rank$/i, /^tier$/i, /^grade$/i, /^composite/i,
  /^normalized/i, /^aggregate/i, /^weight/i, /^index$/i, /riskscore/i,
];
export function findForbiddenKeys(value: unknown, path = ""): string[] {
  const hits: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findForbiddenKeys(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEY_PATTERNS.some((re) => re.test(k))) hits.push(`${path}.${k}`);
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
}).strict();

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
```
Note: no key name above hits the `FORBIDDEN_KEY_PATTERNS` denylist. `severity` is a
source-verbatim event label (rendered "(per source)"), never a project rating.

- [ ] **Step 6: Create `packages/core/src/types.ts` and `index.ts`**

`types.ts`:
```ts
import { z } from "zod";
import { ProtocolSchema, FeedSchema, RatingCellSchema, GovernanceSchema,
         AuditHistorySchema, IncidentHistorySchema, ProvenanceTagEnum } from "./schema.js";
export type Protocol = z.infer<typeof ProtocolSchema>;
export type Feed = z.infer<typeof FeedSchema>;
export type RatingCell = z.infer<typeof RatingCellSchema>;
export type Governance = z.infer<typeof GovernanceSchema>;
export type AuditHistory = z.infer<typeof AuditHistorySchema>;
export type IncidentHistory = z.infer<typeof IncidentHistorySchema>;
export type ProvenanceTag = z.infer<typeof ProvenanceTagEnum>;
```
`index.ts`:
```ts
export * from "./schema.js";
export * from "./types.js";
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @dra/core test`
Expected: PASS (6 tests). `.strict()` throws on the top-level `score`; `findForbiddenKeys` catches the nested one.

- [ ] **Step 8: Commit**

```bash
git add packages/core
git commit -m "feat(core): zod schemas with strict no-composite-score guard"
```

---

## Task 3: `packages/core` — load + validateDataset

**Files:**
- Create: `packages/core/src/load.ts`, `packages/core/src/validate.ts`, `packages/core/src/cli-validate.ts`
- Test: `packages/core/test/validate.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/core/test/validate.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateDataset } from "../src/validate.js";

const protocols = [{ id: "aave", name: "Aave", category: "Lending",
  chain: "Ethereum", site: "aave.com", blurb: "Lending protocol.",
  links: { website: "https://aave.com" }, defillamaSlugs: ["aave"] }];
const feeds = [{ id: "defiscan", name: "DeFiScan", type: "Rating",
  focus: "Decentralization maturity", url: "https://defiscan.info", access: "auto",
  conflicts: null, displayOrder: 0 }];
const cell = { protocolId: "aave", feedId: "defiscan", coverage: "covered",
  rating: { verbatim: "Stage 1", sourceUrl: "https://defiscan.info/protocol/aave" },
  provenance: { method: "manual", checkedUrl: "https://defiscan.info/protocol/aave",
    lastChecked: "2026-06-04", curator: "a" } };
const full = { protocols, feeds, ratings: [cell], governance: [], audits: [], incidents: [] };

describe("validateDataset", () => {
  it("passes when every protocol×feed has exactly one cell", () => {
    expect(validateDataset(full).ok).toBe(true);
  });
  it("fails when a protocol×feed cell is missing", () => {
    const r = validateDataset({ ...full, ratings: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/missing cell.*aave.*defiscan/i);
  });
  it("fails when a cell references an unknown protocol", () => {
    const r = validateDataset({ ...full, ratings: [cell, { ...cell, protocolId: "ghost" }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/unknown protocol.*ghost/i);
  });
  it("fails on a denylisted composite key nested anywhere in the data", () => {
    const r = validateDataset({ ...full, governance: [{ protocolId: "aave", items: [], rank: 1 }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/forbidden \(composite\) key/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @dra/core test test/validate.test.ts`
Expected: FAIL — `validate.js` not found.

- [ ] **Step 3: Implement `packages/core/src/validate.ts`**

```ts
import { ProtocolSchema, FeedSchema, RatingCellSchema, GovernanceSchema,
         AuditHistorySchema, IncidentHistorySchema, findForbiddenKeys } from "./schema.js";

export interface DatasetInput {
  protocols: unknown[]; feeds: unknown[]; ratings: unknown[];
  governance: unknown[]; audits: unknown[]; incidents: unknown[];
}
export interface ValidationResult { ok: boolean; errors: string[]; }

export function validateDataset(input: DatasetInput): ValidationResult {
  const errors: string[] = [];

  // (0) No-composite guard: recursive denylist scan over ALL raw input.
  for (const hit of findForbiddenKeys(input)) errors.push(`forbidden (composite) key: ${hit}`);

  const parse = <T>(items: unknown[], schema: { safeParse: (x: unknown) => any }, label: string): T[] => {
    const out: T[] = [];
    items.forEach((x, i) => {
      const r = schema.safeParse(x);
      r.success ? out.push(r.data) : errors.push(`${label}[${i}]: ${r.error.message}`);
    });
    return out;
  };

  const protocols = parse<any>(input.protocols, ProtocolSchema, "protocol");
  const feeds = parse<any>(input.feeds, FeedSchema, "feed");
  const ratings = parse<any>(input.ratings, RatingCellSchema, "rating");
  const governance = parse<any>(input.governance, GovernanceSchema, "governance");
  const audits = parse<any>(input.audits, AuditHistorySchema, "audits");
  const incidents = parse<any>(input.incidents, IncidentHistorySchema, "incidents");

  const protocolIds = new Set(protocols.map((p) => p.id));
  const feedIds = new Set(feeds.map((f) => f.id));

  const seen = new Set<string>();
  for (const c of ratings) {
    if (!protocolIds.has(c.protocolId)) errors.push(`rating references unknown protocol: ${c.protocolId}`);
    if (!feedIds.has(c.feedId)) errors.push(`rating references unknown feed: ${c.feedId}`);
    const key = `${c.protocolId}|${c.feedId}`;
    if (seen.has(key)) errors.push(`duplicate cell: ${key}`);
    seen.add(key);
  }
  for (const p of protocols) for (const f of feeds) {
    if (!seen.has(`${p.id}|${f.id}`)) errors.push(`missing cell: ${p.id} × ${f.id}`);
  }
  for (const g of governance) {
    if (!protocolIds.has(g.protocolId)) errors.push(`governance references unknown protocol: ${g.protocolId}`);
  }
  for (const a of audits) {
    if (!protocolIds.has(a.protocolId)) errors.push(`audits reference unknown protocol: ${a.protocolId}`);
  }
  for (const inc of incidents) {
    if (!protocolIds.has(inc.protocolId)) errors.push(`incidents reference unknown protocol: ${inc.protocolId}`);
  }
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @dra/core test test/validate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement `load.ts` (incl. governance + layout check) and `cli-validate.ts`**

`load.ts` (reads YAML files into a `DatasetInput`, and verifies the on-disk layout):
```ts
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const readYamlDir = (dir: string): unknown[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".yaml"))
    .map((f) => parse(readFileSync(join(dir, f), "utf8"))) : [];

export function loadDataset(dataRoot: string) {
  const ratings: unknown[] = [];
  const ratingsRoot = join(dataRoot, "ratings");
  if (existsSync(ratingsRoot)) {
    for (const proto of readdirSync(ratingsRoot)) ratings.push(...readYamlDir(join(ratingsRoot, proto)));
  }
  // Feeds drive matrix column order → sort by displayOrder deterministically (readdir order
  // is filesystem-dependent and must NOT decide column order). Other collections are keyed by
  // id at lookup time, so their order is irrelevant.
  const feeds = (readYamlDir(join(dataRoot, "feeds")) as Array<{ displayOrder?: number }>)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return {
    protocols: readYamlDir(join(dataRoot, "protocols")),
    feeds,
    ratings,
    governance: readYamlDir(join(dataRoot, "governance")),
    audits: readYamlDir(join(dataRoot, "audits")),
    incidents: readYamlDir(join(dataRoot, "incidents")),
  };
}

// Path↔id consistency + orphan rejection: ratings/<protocolId>/<feedId>.yaml.
export function checkDataLayout(dataRoot: string): string[] {
  const errs: string[] = [];
  const ratingsRoot = join(dataRoot, "ratings");
  if (!existsSync(ratingsRoot)) return errs;
  for (const proto of readdirSync(ratingsRoot)) {
    const protoDir = join(ratingsRoot, proto);
    if (!statSync(protoDir).isDirectory()) { errs.push(`orphan in ratings/: ${proto}`); continue; }
    for (const file of readdirSync(protoDir)) {
      if (!file.endsWith(".yaml")) { errs.push(`orphan file: ratings/${proto}/${file}`); continue; }
      const feedId = file.replace(/\.yaml$/, "");
      const cell: any = parse(readFileSync(join(protoDir, file), "utf8"));
      if (cell?.protocolId !== proto) errs.push(`path↔id: ratings/${proto}/${file} has protocolId=${cell?.protocolId}`);
      if (cell?.feedId !== feedId) errs.push(`path↔id: ratings/${proto}/${file} has feedId=${cell?.feedId}`);
    }
  }
  return errs;
}
```
`cli-validate.ts`:
```ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadDataset, checkDataLayout } from "./load.js";
import { validateDataset } from "./validate.js";

const dataRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../data");
const layoutErrors = checkDataLayout(dataRoot);
const result = validateDataset(loadDataset(dataRoot));
const errors = [...layoutErrors, ...result.errors];
if (errors.length) { console.error("Dataset INVALID:\n" + errors.join("\n")); process.exit(1); }
console.log("Dataset valid.");
```
Add `loadDataset` / `checkDataLayout` / `validateDataset` to `index.ts` exports.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): validateDataset (integrity + completeness) and YAML loader"
```

---

## Task 4: Seed data (5 protocols, 4 feeds, 20 cells, governance)

**Files:**
- Create: `data/protocols/*.yaml` (5), `data/feeds/*.yaml` (4), `data/ratings/<p>/<f>.yaml` (20), `data/governance/*.yaml` (5), `data/audits/*.yaml` (5), `data/incidents/*.yaml` (5)

> ### ⛔ DATA INTEGRITY RULE — real data only, valid data only (non-negotiable)
>
> 1. **No placeholder/fabricated data.** Every value committed must be a **real, verified**
>    fact from the cited source — real multisig addresses, real DeFiScan stages, real audit
>    firms/dates/report URLs, real incident post-mortems, real Safe addresses + chainIds, real
>    DefiLlama slugs. **`defi-risk-agg-poc-design/data.js` is a STRUCTURAL TEMPLATE ONLY** — it
>    contains placeholders (truncated addresses like `0x2cc1…4b21`, approximate labels, example
>    URLs). Use it for *shape and which cells are covered/partial/not-yet-covered*, NOT for
>    values. Re-fetch/verify every value from the real source before committing.
> 2. **If a value cannot be verified, do not invent it.** For a rating cell, that means
>    `coverage: not-yet-covered` with a real `checkedUrl`. For an optional field (e.g. a Safe
>    `address`, a governance `link`), **omit it** rather than guess. A truncated/`…` address is
>    a placeholder — never commit one.
> 3. **No invalid data.** `pnpm validate` (schema + integrity + no-composite + path↔id/orphan)
>    must pass before any data commit; CI re-checks every PR. Every `sourceUrl`/`checkedUrl`/
>    `link` must be a real, resolving URL; every `0x…` address must be a full 40-hex address.
> 4. Each feed needs a `displayOrder` (0,1,2,3 — fixes matrix column order); each governance
>    file needs an explicit `safeApiStatus` (`n/a` if the protocol has no tracked Safe).
>
> Treat `data.js` as: "these are the cells and their coverage states; go get the real values."

- [ ] **Step 1: Author the 4 feed files**

Example `data/feeds/defiscan.yaml`:
```yaml
id: defiscan
name: DeFiScan
type: Rating
focus: "Decentralization maturity: who controls keys, upgrades, and admin powers"
url: https://defiscan.info
access: auto
conflicts: null        # required-nullable: null = none declared
displayOrder: 0        # matrix column order (defiscan 0, blockanalitica 1, llamarisk 2, defipunkd 3)
```
Every feed file MUST include `conflicts` and `displayOrder`. Create `blockanalitica.yaml`
(Dashboard, manual, displayOrder 1), `llamarisk.yaml` (Research, manual, displayOrder 2 — note
its real `conflicts` string: it discloses Aave DAO grant funding), `defipunkd.yaml` (Rating,
manual, displayOrder 3) — `focus` one-liners copied verbatim from each feed's real site.

- [ ] **Step 2: Author the 5 protocol files**

Example `data/protocols/aave.yaml` (shape below; `data.js` shows which fields exist, but **verify
every value** — chain coverage, slugs, blurb wording — against the real source, don't copy blindly):
```yaml
id: aave
name: Aave
category: Lending
family: aave
versions: ["v3", "v4"]
chain: "Ethereum + 11 chains"
site: "aave.com"
blurb: "Leading lending protocol. v3 runs cross-chain isolated markets; v4 introduces a unified liquidity hub. Long audit history, mature governance."
links: { website: "https://aave.com", docs: "https://docs.aave.com", github: "https://github.com/aave" }
defillamaSlugs: ["aave-v3", "aave-v2"]
```
Create `spark.yaml`, `morpho.yaml`, `uniswap.yaml` (versions v3/v4/UniswapX, category DEX_AMM), `lido.yaml` (Liquid_Staking). Use `data.js` only to know which fields are expected; fill `chain`/`site`/`blurb`/`defillamaSlugs` with verified real values, and confirm each `defillamaSlugs` resolves on `https://api.llama.fi/protocol/<slug>` before committing.

- [ ] **Step 3: Author the 20 rating cells**

Deliberately include all three coverage states. Examples:

`data/ratings/aave/defiscan.yaml` (covered):
```yaml
protocolId: aave
feedId: defiscan
coverage: covered
rating:
  verbatim: "Stage 1"
  sourceUrl: "https://defiscan.info/protocol/aave"
provenance:
  method: manual
  checkedUrl: "https://defiscan.info/protocol/aave"
  lastChecked: "2026-06-04"
  curator: "your-handle"
coverageNote: "Verbatim stage label from DeFiScan."
```

`data/ratings/lido/blockanalitica.yaml` (not-yet-covered — note the `checkedUrl` is required so the absence is evidenced):
```yaml
protocolId: lido
feedId: blockanalitica
coverage: not-yet-covered
rating: null
provenance:
  method: manual
  checkedUrl: "https://blockanalitica.com/"   # where we looked and found no Lido dashboard
  lastChecked: "2026-06-04"
  curator: "your-handle"
coverageNote: "No dedicated BlockAnalitica dashboard for Lido as of last check."
```

`data/ratings/aave/blockanalitica.yaml` (partial — `coverageScope` is required):
```yaml
protocolId: aave
feedId: blockanalitica
coverage: partial
rating:
  verbatim: "Aave v3 Ethereum market dashboard"
  sourceUrl: "https://blockanalitica.com/aave/v3/ethereum"
coverageScope: "Covers Aave v3 Ethereum market only; v4 and other deployments not covered."
provenance:
  method: manual
  checkedUrl: "https://blockanalitica.com/aave/v3/ethereum"
  lastChecked: "2026-06-04"
  curator: "your-handle"
```

Populate the remaining 17 cells from each feed's public pages, copying labels
**verbatim** and linking the exact source URL. Use `coverage: partial` (with
`coverageScope`) where a feed covers only part of a protocol, and `not-yet-covered`
(with a `checkedUrl`) where it doesn't cover it at all. For multi-dimensional feeds
(e.g., DeFiPunk'd), put each source-native sub-value in `rating.dimensions[]`
verbatim — never a project-computed number.

- [ ] **Step 4: Author governance, audit, and incident files (structure per `data.js`; values verified real)**

`data/governance/aave.yaml` — **shape** shown below; every value must be a real, verified fact
(look up the actual Aave governance/Guardian addresses on Etherscan and the real Safe on
app.safe.global). Set-level `summary`/`safeApiStatus`/`provenance`; Safe-updatable items get a
stable `key`; `safe` block names the multisig the Task-7 service refreshes:
```yaml
protocolId: aave
summary: "<threshold>/<owners> · <timelock>"   # derived from REAL values, e.g. "5/9 · 2d"
safeApiStatus: ok                              # required; "n/a" if no tracked Safe
safe:
  address: "0x<full-40-hex-admin-safe-address>"   # REAL address; omit the whole `safe` block if none
  chainId: 1
items:
  - { key: type,           label: "Type",           value: "<real, e.g. Governor + Guardian>", tag: onchain, sourceUrl: "<real etherscan/governance url>" }
  - { key: admin-multisig, label: "Admin multisig", value: "0x<full address>", tag: onchain, sourceUrl: "<real>", link: "https://etherscan.io/address/0x<full address>" }
  - { key: threshold,      label: "Threshold",      value: "<m> / <n>", tag: onchain, sourceUrl: "https://app.safe.global/..." }
  - { key: timelock,       label: "Timelock",       value: "<real>", tag: onchain, sourceUrl: "<real>" }
  - { label: "Upgrade capability", value: "<real, sourced>", tag: curated, sourceUrl: "https://docs.aave.com/..." }
provenance: { method: manual, checkedUrl: "<real url checked>", lastChecked: "<today>", curator: "<your-handle>" }
```
No truncated `0x…` addresses; either a full 40-hex address or omit the field. The Safe service
will overwrite the `admin-multisig`/`threshold` items (matched by `key`) — but seed real values.

`data/audits/aave.yaml` — firm + **real** report link (verbatim firm name; `date` may be `YYYY-MM`):
```yaml
protocolId: aave
audits:
  - { firm: "<real firm>", date: "<YYYY-MM>", url: "<real, resolving report URL>" }
```
Use the protocol's actual published audit list; do not invent firms/dates/URLs.

`data/incidents/aave.yaml` — factual event with a **real** post-mortem `url`; `severity` only if
the source itself classified it (rendered "(per source)"). Empty list where there are none:
```yaml
protocolId: aave
incidents:
  - { date: "<YYYY-MM>", title: "<verbatim headline>", summary: "<factual, sourced>", severity: "<verbatim if any>", url: "<real post-mortem url>" }
```
```yaml
# data/incidents/lido.yaml — no known incidents (a real, verified "none")
protocolId: lido
incidents: []
```
Seed governance/audits/incidents for all 5 protocols with **verified real values only** (empty
`incidents: []` is valid where genuinely none). Uniswap has no admin multisig → governance
`safeApiStatus: n/a`, no `safe` block.

- [ ] **Step 5: Validate the dataset (and confirm no placeholders)**

Run: `pnpm --filter @dra/core validate`
Expected: `Dataset valid.` Then grep the seed for leftover placeholders and fail if any remain:
`! grep -rERn "0x[0-9a-fA-F]{1,6}…|<.*>|your-handle|example\.com|TODO|TBD" data/` — must print nothing.
Fix anything it finds with real values (or `not-yet-covered`/omission) before committing.

- [ ] **Step 6: Commit**

```bash
git add data
git commit -m "data: seed 5 protocols, 4 feeds, 20 cells, governance/audits/incidents"
```

---

## Task 5: `packages/web` — shell, styling system, and summary matrix

> **This task ports `defi-risk-agg-poc-design/` into typed Next.js.** Rule of thumb:
> copy markup + class names + CSS *declarations* verbatim; only change the delivery
> (CSS Modules + `styles[...]`), the data source (`window.DATA` → `getDataset()` props),
> and routing (hash → Next `<Link>`/`useRouter`). Do not restyle.

**Files:**
- Create: `packages/web/package.json`, `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`
- Create: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/lib/{data,tvl,format,coverage}.ts`, `scripts/snapshot-tvl.ts`
- Create components (each `Foo.tsx` + `Foo.module.css` unless noted):
  `ThemeProvider.tsx` (client), `ThemeToggle.tsx` (client), `TopNav.tsx`,
  `CoverageBadge`, `ProvenanceTag`, `StaleFlag`, `CategoryChip`, `TvlValue` (client),
  `MatrixCell`, `CoverageBar`, `SummaryMatrix` (client)
- Test: `src/test/no-synthesis.test.tsx`

- [ ] **Step 1: Create `packages/web/package.json`** (no Tailwind, no TanStack)

```json
{
  "name": "@dra/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "snapshot": "tsx scripts/snapshot-tvl.ts",
    "build": "pnpm snapshot && next build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "@dra/core": "workspace:*",
    "next": "^15.0.0", "react": "^18.3.0", "react-dom": "^18.3.0", "yaml": "^2.5.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0", "vitest": "^2.1.0", "tsx": "^4.19.0",
    "jsdom": "^25.0.0", "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0", "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`**

`next.config.mjs` (note `transpilePackages` — `@dra/web` imports the workspace TS package `@dra/core`):
```js
/** @type {import('next').NextConfig} */
export default {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ["@dra/core"],   // compile the workspace TS dep through Next
};
```
`vitest.config.ts` sets `test.environment = "jsdom"`. `tsconfig.json` extends the base,
adds `"jsx": "preserve"`, `"plugins": [{ "name": "next" }]`, and CSS-module typing.

- [ ] **Step 3: Port the global stylesheet → `src/app/globals.css`**

Copy from `defi-risk-agg-poc-design/styles.css` **verbatim** the parts that must be
global (not scoped):
- the `@import` for JetBrains Mono and the `:root` + `[data-theme="light"]` variable blocks,
- base: `* { box-sizing }`, `html, body`, `a`, `::selection`, `.tnum`,
- the focus-visible rules and the `prefers-reduced-motion` `.view-enter`/`fadeUp` keyframes,
- **GLOBAL** — layout/typography/controls used everywhere: `.shell`, `.page`, `.title`/`h1.title`,
  `.section-h`, `.lede`, `.muted`, `.faint`, `.row`, `.between`, `.wrap`, `.gap-*`, `.mt-*`, `.hr`,
  `.ghost-link`, `.cta-btn`, `.filter-pill`, `.search`, `.icon-btn`, `.cat-chip`, `.ver-chip`;
  content blocks `.callout`, `.does-list`, `.doesnot-list`, `.prov-legend`, `.codeblock*`; shared
  tables `.dtable`, `.gov-card`, `.gov-foot`, `.code-addr`.
- **GLOBAL** — primitives rendered as *raw markup* in more than one place (NOT only inside their
  "owning" component), so scoping them would break those usages: `.cov`/`.cov-covered`/
  `.cov-partial`/`.cov-none`/`.dot` (the matrix legend writes these by hand, not via `CoverageBadge`),
  `.prov`/`.prov-onchain|feed|curated|self` (methodology + contribute use `<code className="prov prov-curated">`),
  `.stale-flag`/`.pip` (governance footer + methodology write these directly).

> ### Single source of truth for the global ↔ module split (resolve before porting)
> Do the inventory FIRST: grep `defi-risk-agg-poc-design/*.jsx` for every `className` token. Then
> apply this exact assignment (each class lives in **exactly one** place — no class appears in both
> globals and a module):
> | Owner | Classes |
> |-------|---------|
> | `globals.css` | the two GLOBAL bullet groups above |
> | `CoverageBar.module.css` | `.covbar`, `.covbar-track`, `.covbar-fill`, `.covbar-cov`, `.covbar-part` |
> | `Matrix.module.css` | `.matrix-wrap`, `table.matrix`+descendants, `.sticky-col`, `.expander`, `.subrow`, `.gly`*, `.spread-mark`, `.statusline`, `.gov-mini`, `.feeds-mini` |
> | `FeedCard.module.css` | `.feedcard`, `.feed-focus`, `.feed-body`, `.verbatim-line`, `.dims`, `.dim-row`, `.scope-note`, `.feed-foot` |
> | detail page module (`protocol/[id]/page.module.css`) | `.feed-grid`, `.gaps-strip`, `.spread-note` (rendered by the detail page, not by FeedCard) |
>
> `.covbar*` and `.spread-mark` are NOT global (they live in CoverageBar/Matrix modules, used
> wherever those components render). `.gaps-strip`/`.feed-grid`/`.spread-note` are detail-only.

Everything else (component-local structural classes) goes into that component's `*.module.css`
per the table above. **Rule:** a class used by exactly one component → its module; used by ≥2 (or as raw markup in a
shared legend) → globals. When in doubt, keep it global — fidelity beats scoping purity here.

- [ ] **Step 4: `ThemeProvider.tsx` + `ThemeToggle.tsx` + no-flash script**

The design toggles `[data-theme]` (dark default, light available). Replace the tweaks-panel
machinery with a minimal theme system:
```tsx
// ThemeProvider.tsx ("use client")
"use client";
import { createContext, useContext, useEffect, useState } from "react";
type Theme = "dark" | "light";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });
export const useTheme = () => useContext(Ctx);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "dark";
    setTheme(saved); document.documentElement.dataset.theme = saved;
  }, []);
  const toggle = () => setTheme((t) => {
    const next = t === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; localStorage.setItem("theme", next); return next;
  });
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}
```
`ThemeToggle.tsx` renders the `.icon-btn` with `☾`/`☀` (port from `app.jsx` TopNav). In
`layout.tsx`: set `<html data-theme="dark" suppressHydrationWarning>` (the no-flash script mutates
the attribute before React hydrates, so suppress the expected mismatch), and add a tiny inline
`<script>` in `<head>` that reads `localStorage.theme` and sets `document.documentElement.dataset.theme`
before paint — wrapped in `try/catch` so a blocked/again-unavailable `localStorage` can't throw and
break first paint:
```html
<script dangerouslySetInnerHTML={{ __html:
  `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}` }} />
```

- [ ] **Step 5: Port helpers → `src/lib/format.ts` and `src/lib/coverage.ts`**

`format.ts`: port `fmtTvl` and `ageFrom` from `components.jsx` verbatim (typed).
`coverage.ts`: port `coverageCount` + `coverageSpread` from `components.jsx`, plus
`categoryLabels` and a `computeDataStatus` from `data.js`:
```ts
import type { RatingCell } from "@dra/core";
export const categoryLabels: Record<string, string> = {
  Lending: "Lending", DEX_AMM: "DEX / AMM", Swap_Aggregator: "Swap Aggregator",
  Yield_Vault: "Yield Vault", Liquid_Staking: "Liquid Staking", Other: "Other",
};
export function coverageCount(ratings: RatingCell[], protocolId: string) {
  const cs = ratings.filter((r) => r.protocolId === protocolId);
  return { covered: cs.filter((c) => c.coverage === "covered").length,
           partial: cs.filter((c) => c.coverage === "partial").length,
           none: cs.filter((c) => c.coverage === "not-yet-covered").length, total: cs.length };
}
export function coverageSpread(ratings: RatingCell[], protocolId: string) {
  const c = coverageCount(ratings, protocolId);
  if (c.covered > 0 && c.none > 0) return { kind: "gap" as const, label: "coverage varies" };
  if (c.covered > 0 && c.partial > 0) return { kind: "depth" as const, label: "depth varies" };
  return null;
}
export function computeDataStatus(ratings: RatingCell[], snapshotAsOf: string, counts: { protocols: number; feeds: number }) {
  const oldestCheck = ratings.map((r) => r.provenance.lastChecked).sort()[0] ?? "";
  return { oldestCheck, tvlSnapshotAge: snapshotAsOf ? "as of " + snapshotAsOf.slice(0, 10) : "",
           feedCount: counts.feeds, protocolCount: counts.protocols, cellCount: ratings.length };
}
```

- [ ] **Step 6: `src/lib/data.ts` (build-time load; fails loudly; exposes everything)**

```ts
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { loadDataset, checkDataLayout, validateDataset } from "@dra/core";
import type { Protocol, Feed, RatingCell, Governance, AuditHistory, IncidentHistory } from "@dra/core";

const dataRoot = join(process.cwd(), "..", "..", "data");

export function getDataset() {
  const raw = loadDataset(dataRoot);
  const errors = [...checkDataLayout(dataRoot), ...validateDataset(raw).errors];
  if (errors.length) throw new Error("Invalid dataset at build:\n" + errors.join("\n"));
  return raw as {
    protocols: Protocol[]; feeds: Feed[]; ratings: RatingCell[];
    governance: Governance[]; audits: AuditHistory[]; incidents: IncidentHistory[];
  };
}
export function getTvlSnapshot(): { asOf: string; protocols: Record<string, number> } {
  const f = join(dataRoot, "tvl-snapshots.yaml");
  return existsSync(f) ? parse(readFileSync(f, "utf8")) : { asOf: "", protocols: {} };
}
export const cellFor = (ratings: RatingCell[], p: string, f: string) =>
  ratings.find((c) => c.protocolId === p && c.feedId === f)!;
export const governanceFor = (g: Governance[], p: string) => g.find((x) => x.protocolId === p);
export const auditsFor = (a: AuditHistory[], p: string) => a.find((x) => x.protocolId === p)?.audits ?? [];
export const incidentsFor = (i: IncidentHistory[], p: string) => i.find((x) => x.protocolId === p)?.incidents ?? [];
```

- [ ] **Step 7: `scripts/snapshot-tvl.ts` (build-time TVL snapshot + slug validation)**

Generate `data/tvl-snapshots.yaml` per protocol by summing all `defillamaSlugs` from
`https://api.llama.fi/tvl/<slug>`. A `404`/non-number → throw (fail build on an unknown
slug); a transient network/5xx → keep the previous snapshot value and warn. Writes
`{ asOf: ISO, protocols: { <id>: <number> } }`. (Same script specified earlier; multi-slug.)

- [ ] **Step 8: `src/lib/tvl.ts` (client live-fetch, sums slugs)**

```ts
export async function fetchTvlSum(slugs: string[]): Promise<number | null> {
  try {
    let sum = 0;
    for (const slug of slugs) {
      const res = await fetch(`https://api.llama.fi/tvl/${slug}`, { cache: "no-store" });
      if (!res.ok) return null;
      const v = await res.json();
      if (typeof v !== "number") return null;
      sum += v;
    }
    return sum;
  } catch { return null; }
}
```

- [ ] **Step 9: Port the small components** (each `Foo.tsx` + `Foo.module.css`)

Port verbatim from `components.jsx`, converting `className="x y"` → `className={`${styles.x} ${styles.y}`}` (or global utility names left as plain strings), and typing props against `@dra/core`:
- `CoverageBadge({ coverage, size? })` — three first-class states, never blank.
- `ProvenanceTag({ tag }: { tag: ProvenanceTag })` — renders `[onchain|feed|curated|self-reported]`.
- `StaleFlag({ status })` — null on `ok`; loud `stale`/`fetch error` otherwise.
- `CategoryChip({ category })` — uses `categoryLabels`.
- `MatrixCell({ cell }: { cell: RatingCell | null })` — short verbatim (≤9 chars) as text, else dot; partial amber; not-yet-covered em-dash. (Port the `isShort` logic verbatim.)
- `CoverageBar({ count })` (+ `CoverageBar.module.css` with `.covbar*`) — proportional covered+partial fill; `role="img"` + aria-label "N of T feeds covered…". **Pass `count` in (from `coverageCount`)** rather than reading a global. Keep the "NOT a score" comment.
- `TvlValue({ slugs, snapshot, asOf, size? })` (client) — render `fmtTvl(snapshot)` immediately with a grey pip; on mount call `fetchTvlSum(slugs)`; on success set value + green "live" pip; on failure the snapshot stands (never a bare dash). Port the markup/pip styling from `components.jsx`.

- [ ] **Step 10: `TopNav.tsx` + `layout.tsx` (shell)**

Port the `topnav` from `app.jsx`: brand ("OpenRisk" + "every feed, one view"), nav links
Protocols/Methodology/Contribute as Next `<Link>` (`/`, `/methodology`, `/contribute`),
a GitHub link to the placeholder `https://github.com/OWNER/openrisk`, and `<ThemeToggle/>`.
`layout.tsx` renders `<html data-theme="dark">`, the no-flash script, `<ThemeProvider>`, `<TopNav/>`,
and `<div className="shell page">{children}</div>`. Import `globals.css` here.

- [ ] **Step 11: `SummaryMatrix.tsx` (client) — port `matrix.jsx` fully**

A `"use client"` component receiving `{ protocols, feeds, ratings, governance, tvlSnapshot, dataStatus }`.
Port every feature from `matrix.jsx`:
- **Filters:** search (name/category), category pills, coverage pills (All/covered/partial/not-yet-covered), feed pills (Any + each feed). Same filtering logic.
- **Sort:** name / category / tvl only (`toggleSort`, `ariaSort`, keyboard `onKeySort`). **No score/rank sort.** TVL sorts on `tvlSnapshot.protocols[p.id]`.
- **Columns:** Protocol (sticky, expander for versioned), Category, TVL (`<TvlValue slugs snapshot asOf>`), **Gov** (`governance.find(...).summary ?? "—"`), **Coverage** (`<CoverageBar count={coverageCount(ratings,p.id)}/>` + `covered+partial/total` + `⇄` spread mark when `coverageSpread.kind==="gap"`), then one `feedcol` per feed (`<MatrixCell cell={cellFor(...)} />`).
- **Family expander sub-rows:** versioned protocols expand to per-version rows (port the `subrow` block).
- **Deep-linkable filters:** keep the URL in sync with the History API exactly as the design does — read initial state from `new URLSearchParams(location.search)` on mount, and `history.replaceState(null,"",newUrl)` on change. (Use `location.search` + pathname `/` instead of the hash; do **not** use Next `useSearchParams` to avoid the Suspense/static-export constraint.)
- **Status line** + **legend row** (port verbatim). Per the CSS split table, `Matrix.module.css` holds `.matrix-wrap`, `table.matrix`+descendants, `.sticky-col`, `.expander`, `.subrow`, `.gly`*, `.spread-mark`, `.statusline`, `.gov-mini`, `.feeds-mini` (NOT `.covbar*` — those live in `CoverageBar.module.css`).
- Row/name click → `useRouter().push("/protocol/"+id)` (and keyboard Enter), preserving the `role="link"`/`tabIndex` a11y.
- **Column order is deterministic** (feeds arrive pre-sorted by `displayOrder` from `loadDataset`). Add a test asserting the rendered feed-column headers equal the feeds in `displayOrder` order, so a future data/file-order change can't silently reorder the matrix.

- [ ] **Step 12: `app/page.tsx` (home, server component)**

```tsx
import { getDataset, getTvlSnapshot } from "../lib/data";
import { computeDataStatus } from "../lib/coverage";
import { SummaryMatrix } from "../components/SummaryMatrix";
export default function Home() {
  const { protocols, feeds, ratings, governance } = getDataset();
  const tvlSnapshot = getTvlSnapshot();
  const dataStatus = computeDataStatus(ratings, tvlSnapshot.asOf, { protocols: protocols.length, feeds: feeds.length });
  return <SummaryMatrix protocols={protocols} feeds={feeds} ratings={ratings}
    governance={governance} tvlSnapshot={tvlSnapshot} dataStatus={dataStatus} />;
}
```
(The `<h1>` title + lede are inside `SummaryMatrix` per the design; or lift them here — keep the design's copy: "Risk feeds, side by side" + the oracle-analogy lede.)

- [ ] **Step 13: No-synthesis UI guard test → `src/test/no-synthesis.test.tsx`**

Render `SummaryMatrix` with the real dataset and assert the UI exposes no score/rank/composite
affordance. `SummaryMatrix` calls `useRouter()`, so **mock `next/navigation`**. Note the matrix
legitimately contains "covered"/"coverage" and a density bar labelled "not a score" — assert
against synthesis specifically:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
import { SummaryMatrix } from "../components/SummaryMatrix";
import { getDataset, getTvlSnapshot } from "../lib/data";
import { computeDataStatus } from "../lib/coverage";

describe("no-synthesis UI guard", () => {
  it("renders no composite score / rank / sort-by-score control", () => {
    const { protocols, feeds, ratings, governance } = getDataset();
    const tvlSnapshot = getTvlSnapshot();
    const dataStatus = computeDataStatus(ratings, tvlSnapshot.asOf, { protocols: protocols.length, feeds: feeds.length });
    const { container } = render(<SummaryMatrix protocols={protocols} feeds={feeds} ratings={ratings}
      governance={governance} tvlSnapshot={tvlSnapshot} dataStatus={dataStatus} />);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toMatch(/composite|overall score|risk score|aggregate score|safety score|rank #|ranked/);
    expect(container.querySelector("[data-score]")).toBeNull();
    // sort controls are name/category/tvl only
    expect(text).not.toMatch(/sort by score/);
  });
});
```

- [ ] **Step 14: Build + commit**

Run: `pnpm --filter @dra/web build && pnpm --filter @dra/web test`
Expected: static export to `packages/web/out/index.html`; test passes.
```bash
git add packages/web
git commit -m "feat(web): port design — shell, theming, CSS modules, summary matrix"
```

---

## Task 6: `packages/web` — protocol detail, methodology, contribute (port)

**Files:**
- Create components: `FeedCard` (+module), `GovernanceTable` (+module), `DiffBlock` (+module)
- Create pages: `src/app/protocol/[id]/page.tsx` (+ `page.module.css` for `.feed-grid`/`.gaps-strip`/`.spread-note`), `src/app/methodology/page.tsx`, `src/app/contribute/page.tsx`

- [ ] **Step 1: Port `FeedCard.tsx` (+ `FeedCard.module.css`)**

Port `FeedCard` from `components.jsx` verbatim (typed `{ feed: Feed; cell: RatingCell | null }`):
methodology one-liner → verbatim rating (or `dimensions[]` rows) → `coverageNote` → `coverageScope`
(partial) / "No assessment published." (not-yet-covered) → footer with `View assessment →` /
`Checked here →`, `<StaleFlag>`, `<ProvenanceTag tag={feed.access === "auto" ? "feed" : "curated"} />`,
and `provenance.lastChecked`. Per the CSS split table, `FeedCard.module.css` holds `.feedcard`,
`.feed-focus`, `.feed-body`, `.verbatim-line`, `.dims`, `.dim-row`, `.scope-note`, `.feed-foot`
ONLY. `.feed-grid`, `.gaps-strip`, `.spread-note` belong to the detail-page module (Step 3),
since the detail page (not FeedCard) renders them.

- [ ] **Step 2: Port `GovernanceTable.tsx` (+ module)**

Port `GovernanceTable` from `detail.jsx`: a `.gov-card` + `.dtable` mapping `governance.items`
(label, value or explorer `link`, `<ProvenanceTag tag={it.tag}/>`), plus the `.gov-foot`:
a "Source →" link and the Safe status. **Render all four `safeApiStatus` values distinctly**
(the design only handled `failed`):
- `ok` → "Safe API live · multisig reflects current on-chain state"
- `stale` → muted "Safe API stale · last refreshed {provenance.lastSuccessfulFetchAt}"
- `failed` → loud `stale-flag err` "Safe API fetch failed — showing last curated data"
- `n/a` → muted "No tracked admin multisig" (do NOT claim live Safe data for protocols without a Safe)

Takes `{ governance: Governance | undefined }`.

- [ ] **Step 3: `src/app/protocol/[id]/page.tsx` (server) + `generateStaticParams`**

```tsx
import { getDataset, getTvlSnapshot, cellFor, governanceFor, auditsFor, incidentsFor } from "../../../lib/data";
import { coverageCount } from "../../../lib/coverage";
// + FeedCard, GovernanceTable, TvlValue, CategoryChip, CoverageBar imports

export function generateStaticParams() {
  return getDataset().protocols.map((p) => ({ id: p.id }));
}
export default function ProtocolPage({ params }: { params: { id: string } }) {
  const { protocols, feeds, ratings, governance, audits, incidents } = getDataset();
  const tvl = getTvlSnapshot();
  const p = protocols.find((x) => x.id === params.id)!;
  const cells = feeds.map((f) => ({ feed: f, cell: cellFor(ratings, p.id, f.id) }));
  const cc = coverageCount(ratings, p.id);
  // ...render exactly as detail.jsx ProtocolDetail:
  //  • header: name, CategoryChip, versions, chain, site/docs/github links, blurb,
  //    right-aligned big TVL (<TvlValue slugs={p.defillamaSlugs} snapshot={tvl.protocols[p.id]} asOf={tvl.asOf} size="lg">) + "snapshot <date>"
  //  • Governance section → <GovernanceTable governance={governanceFor(governance,p.id)} />
  //  • "Risk intelligence feeds": "<present> of <total> feeds with an assessment",
  //    spread-note (<CoverageBar count={cc}/> + covered/partial/none), <div className="feed-grid"> of <FeedCard>,
  //    gaps-strip listing feeds that are not-yet-covered
  //  • Audit history: .gov-card + .dtable (Firm / Date / Report→) from auditsFor(...), empty → "No audits recorded."
  //  • Incident history: empty → gaps-strip "No known incidents on record."; else .dtable
  //    (Date / Event[title link + summary] / Severity[cat-chip, "(per source)"]) from incidentsFor(...)
  //  • footer correction link → https://github.com/OWNER/openrisk
  return (/* ...ported JSX... */);
}
```
Port the full JSX body from `detail.jsx` (replacing `D.*` accessors with the props above and
`window`-globals with imported components). Severity renders verbatim with a "(per source)" hint.

- [ ] **Step 4: Port `methodology/page.tsx`** (server)

Port `methodology.jsx` verbatim: oracle-analogy `.callout`; "What OpenRisk does / does not do"
(`.doesnot-list` / `.does-list`); "Coverage gaps are data" with the three `<CoverageBadge>` states;
the **feed registry** `.dtable` over `feeds` (name+link, conflict-declared flag when `conflicts`,
type, `<ProvenanceTag tag={f.access==="auto"?"feed":"curated"}/>`); the **provenance legend**
(four `<ProvenanceTag>` rows); the Safe-API note; and the "How to contribute" list. `getDataset()`
supplies `feeds`. Soften the Safe-API copy to match Task 7's actual cadence ("refreshed periodically
from the Safe API", not "live").

- [ ] **Step 5: Port `contribute/page.tsx`** (server) + `DiffBlock.tsx`

Port `contribute.jsx` + its `DiffBlock` component (the `.codeblock` add/del/ctx renderer) verbatim.
Keep the three walkthroughs (correct a cell / add a protocol / propose a feed), the review
checklist, and the CTA to `https://github.com/OWNER/openrisk`. **Update the diff samples to the
current schema** (the prototype's are stale): the "add a protocol" sample must include the now-required
`chain`, `site`, `blurb`; the "propose a feed" sample must include `displayOrder` (and keeps `conflicts`).
The samples are illustrative copy (not validated data), but should still reflect real required fields.

- [ ] **Step 6: Build to verify all routes export, then commit**

Run: `pnpm --filter @dra/web build`
Expected: `out/protocol/{aave,spark,morpho,uniswap,lido}/index.html`, `out/methodology/index.html`,
`out/contribute/index.html` all exist; visually matches the design in both themes.
```bash
git add packages/web
git commit -m "feat(web): port protocol detail, methodology, and contribute pages"
```

---

## Task 7: `packages/ingestion` — DeFiScan adapter + Safe governance service + CLIs

> **Parallelism:** the DeFiScan rating adapter (Steps 2–8) and the Safe governance service
> (Steps 9–12) are independent and may be built by two sub-agents; they share only
> `@dra/core` types and the `writeCell`/file-writing conventions.

**Files:**
- Create: `packages/ingestion/package.json`, `src/adapter.ts`, `src/adapters/defiscan.ts`, `src/writeCell.ts`, `src/cli.ts`
- Create (Safe service): `src/safe/fetchSafe.ts`, `src/safe/updateGovernance.ts`, `src/cli-safe.ts`
- Test: `test/defiscan.test.ts`, `test/safe.test.ts`, `test/fixtures/{defiscan-aave.json, safe-aave.json}`

- [ ] **Step 1: Create `packages/ingestion/package.json`**

```json
{
  "name": "@dra/ingestion",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "ingest": "tsx src/cli.ts",
    "ingest:safe": "tsx src/cli-safe.ts"
  },
  "dependencies": { "@dra/core": "workspace:*", "yaml": "^2.5.0" },
  "devDependencies": { "tsx": "^4.19.0", "vitest": "^2.1.0", "typescript": "^5.6.0" }
}
```

- [ ] **Step 2: Create `src/adapter.ts` (interface)**

```ts
import type { RatingCell } from "@dra/core";
export type RatingCellInput = Pick<RatingCell, "coverage" | "rating">;

export interface FeedAdapter {
  id: string;
  supports(protocolId: string): boolean;
  // Returns the cell data, or throws on fetch/parse failure (caller handles loudly).
  fetchCell(protocolId: string): Promise<RatingCellInput>;
}
```

- [ ] **Step 3: Write the failing adapter test (with fixture)**

`test/fixtures/defiscan-aave.json`: a recorded sample of DeFiScan's response for Aave.
`test/defiscan.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { makeDefiscanAdapter } from "../src/adapters/defiscan.js";
import fixture from "./fixtures/defiscan-aave.json";

describe("defiscan adapter", () => {
  it("maps a successful response to a covered cell with verbatim label", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    const adapter = makeDefiscanAdapter({ fetchFn });
    const cell = await adapter.fetchCell("aave");
    expect(cell.coverage).toBe("covered");
    expect(cell.rating?.verbatim).toBe(fixture.stage);   // verbatim, unmodified
    expect(cell.rating?.sourceUrl).toContain("aave");
  });

  it("throws on a failed fetch instead of returning empty/covered", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const adapter = makeDefiscanAdapter({ fetchFn });
    await expect(adapter.fetchCell("aave")).rejects.toThrow(/defiscan.*503/i);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @dra/ingestion test`
Expected: FAIL — `makeDefiscanAdapter` not found.

- [ ] **Step 5: Implement `src/adapters/defiscan.ts`**

```ts
import type { FeedAdapter, RatingCellInput } from "../adapter.js";

interface Deps { fetchFn?: typeof fetch; }
const SUPPORTED = new Set(["aave", "spark", "morpho", "uniswap", "lido"]);

export function makeDefiscanAdapter({ fetchFn = fetch }: Deps = {}): FeedAdapter {
  return {
    id: "defiscan",
    supports: (id) => SUPPORTED.has(id),
    async fetchCell(protocolId): Promise<RatingCellInput> {
      const url = `https://api.defiscan.info/protocols/${protocolId}`;
      const res = await fetchFn(url);
      if (!("ok" in res) || !res.ok) {
        throw new Error(`defiscan fetch failed for ${protocolId}: ${("status" in res) ? res.status : "no status"}`);
      }
      const data = await res.json();
      if (data == null || typeof data.stage !== "string") {
        throw new Error(`defiscan response shape changed for ${protocolId}`);
      }
      return { coverage: "covered", rating: { verbatim: data.stage,
        sourceUrl: `https://defiscan.info/protocol/${protocolId}` } };
    },
  };
}
```
(Real DeFiScan endpoint/shape verified during implementation; adjust the parse, keep the loud-failure contract.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @dra/ingestion test`
Expected: PASS (2 tests).

- [ ] **Step 7: Implement `writeCell.ts` and `cli.ts`**

`writeCell.ts` merges the adapter's `RatingCellInput` into the existing
`data/ratings/<protocol>/<feed>.yaml` and stamps provenance:
- **success:** set `method = "auto"`, `lastSuccessfulFetchAt = lastAttemptedFetchAt =
  now`, `sourceStatus = "ok"`, `lastChecked = today`; preserve `curator` (or set
  `"ingestion-bot"`). Re-serialize with deterministic key order.
- **failure (adapter threw):** do NOT touch `rating`/`coverage`; set `sourceStatus =
  "fetch-error"` and `lastAttemptedFetchAt = now` only.
`cli.ts` parses `--feed`/`--protocol`, runs the adapter over supported protocols,
writes cells (success or failure-stamp), prints a diff summary, and **exits non-zero
if any fetch failed** — but always after writing files, so the provenance changes
are committable. The CLI never touches git or opens PRs (the workflow owns that).

- [ ] **Step 8: Verify the DeFiScan CLI end to end against fixtures, then commit**

Run: `pnpm --filter @dra/ingestion test && pnpm --filter @dra/core validate`
Expected: tests pass; dataset still valid.
```bash
git add packages/ingestion
git commit -m "feat(ingestion): FeedAdapter + DeFiScan adapter + CLI with loud failure"
```

### Safe governance service (writes `data/governance/<id>.yaml`)

The design surfaces multisig governance (threshold, signer count, admin address) with a
`safeApiStatus`. We keep the **frontend static** and add a **service that refreshes the Safe
config into the governance files** — same data-as-code pattern as the feed adapter: it fetches
the Safe Transaction API, updates only the multisig-derived fields, and a GitHub Action opens a
PR. No `viem`/RPC — the Safe Transaction API is plain HTTPS.

- [ ] **Step 9: (Data only — schema already done in Task 2; seed done in Task 4)**

No schema change here: the `GovernanceSchema.safe { address, chainId }` field and the per-item
`key` were added in **Task 2** (so the type contract is frozen before the parallel fan-out), and
the real `safe` blocks + `key`s were seeded in **Task 4** for protocols that have a tracked
multisig. Uniswap (no admin multisig) has no `safe` block and `safeApiStatus: n/a`. This step is
just the checkpoint that those are present before wiring the service.

- [ ] **Step 10: Write the failing Safe test → `test/safe.test.ts` (+ `fixtures/safe-aave.json`)**

`fixtures/safe-aave.json` is a recorded real `GET /api/v1/safes/{address}/` response (full
40-hex address, real `threshold`, real `owners[]`).
```ts
import { describe, it, expect, vi } from "vitest";
import { fetchSafeConfig } from "../src/safe/fetchSafe.js";
import fixture from "./fixtures/safe-aave.json";

const ADDR = "0x1111111111111111111111111111111111111111"; // full 40-hex (use the real Aave Safe)
describe("fetchSafeConfig", () => {
  it("maps a Safe API response to {threshold, owners}", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    const cfg = await fetchSafeConfig({ address: ADDR, chainId: 1, fetchFn });
    expect(cfg.threshold).toBe(fixture.threshold);
    expect(cfg.owners.length).toBe(fixture.owners.length);
  });
  it("rejects a malformed (truncated) address before fetching", async () => {
    await expect(fetchSafeConfig({ address: "0x2cc1", chainId: 1 })).rejects.toThrow(/address/i);
  });
  it("throws on an unsupported chainId", async () => {
    await expect(fetchSafeConfig({ address: ADDR, chainId: 999999 })).rejects.toThrow(/chainid/i);
  });
  it("throws on a failed fetch (loud, never silent)", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(fetchSafeConfig({ address: ADDR, chainId: 1, fetchFn })).rejects.toThrow(/safe.*502/i);
  });
});
```
Run `pnpm --filter @dra/ingestion test` → FAIL (`fetchSafeConfig` not found).

- [ ] **Step 11: Implement `src/safe/fetchSafe.ts` and `src/safe/updateGovernance.ts`**

```ts
// fetchSafe.ts — Safe Transaction API (plain HTTPS; supported chains documented here)
const BASE: Record<number, string> = {
  1: "https://safe-transaction-mainnet.safe.global",   // add more chainIds here as needed
};
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
interface Args { address: string; chainId: number; fetchFn?: typeof fetch; }
export async function fetchSafeConfig({ address, chainId, fetchFn = fetch }: Args) {
  if (!ADDR_RE.test(address)) throw new Error(`Safe: malformed address ${address}`);  // pre-flight
  const base = BASE[chainId];
  if (!base) throw new Error(`Safe: unsupported chainId ${chainId}`);
  const res = await fetchFn(`${base}/api/v1/safes/${address}/`);
  if (!("ok" in res) || !res.ok) throw new Error(`safe fetch failed for ${address}: ${("status" in res) ? res.status : "?"}`);
  const data = await res.json();
  if (typeof data?.threshold !== "number" || !Array.isArray(data?.owners))
    throw new Error(`safe response shape changed for ${address}`);
  return { threshold: data.threshold as number, owners: data.owners as string[] };
}
```
`updateGovernance.ts` loads `data/governance/<id>.yaml` and, for protocols with a `safe` block,
updates items **by stable `key`** (never by display label, never the curated text items):
- **success:** set the `threshold` item value to `"<threshold> / <owners.length>"`, set the
  `admin-multisig` item value + `link` to the (checksummed) Safe address, recompute `summary`
  preserving the curated timelock segment (`"<threshold>/<n> · <existing-timelock>"`), set
  `safeApiStatus: "ok"`, bump `provenance.lastSuccessfulFetchAt`/`lastChecked`. Leave all other
  items (Type, Timelock, Upgrade capability, "Signers known", …) untouched. Idempotent: identical
  inputs produce a byte-identical file (deterministic key order) so empty runs make no diff.
- **failure (throw):** do NOT overwrite any curated value; set `safeApiStatus: "failed"` and
  `provenance.lastAttemptedFetchAt = now` only. (This drives the detail page's loud
  "Safe API fetch failed — showing last curated data" footer.) `n/a` protocols are skipped.
`cli-safe.ts` iterates protocols whose governance has a `safe` block, writes files, prints a
diff, and exits non-zero if any fetch failed (after writing — same loud-but-committable contract
as the feed CLI; the Action owns PR creation).

- [ ] **Step 12: Verify Safe service + validate, then commit**

Run: `pnpm --filter @dra/ingestion test && pnpm --filter @dra/core validate`
Expected: tests pass; governance files still schema-valid (incl. `safeApiStatus` enum).
```bash
git add packages/ingestion data/governance
git commit -m "feat(ingestion): Safe Transaction API governance service with loud failure"
```

---

## Task 8: CI, scheduled ingestion, docs, deploy

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/ingest.yml`, `README.md`, `CONTRIBUTING.md`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm validate        # fails on schema violation or composite-score field
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Create `.github/workflows/ingest.yml` (scheduled; always opens a reviewable PR, even on fetch error)**

```yaml
name: ingest
on:
  schedule: [{ cron: "0 6 * * 1" }]   # weekly
  workflow_dispatch: {}
permissions: { contents: write, pull-requests: write }
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      # Run BOTH refreshers but DO NOT fail the job yet — we still want to open a PR
      # carrying all provenance changes (incl. any fetch-error / Safe-failed stamps).
      - id: feeds
        continue-on-error: true
        run: pnpm --filter @dra/ingestion ingest --feed defiscan
      - id: safe
        continue-on-error: true
        run: pnpm --filter @dra/ingestion ingest:safe

      # Schema must still hold even on a partial/error run.
      - run: pnpm --filter @dra/core validate

      - uses: peter-evans/create-pull-request@v6
        with:
          branch: ingest/auto-refresh
          title: "data: automated refresh (DeFiScan + Safe governance)"
          commit-message: "data: automated refresh (DeFiScan + Safe governance)"
          body: |
            Automated refresh.
            DeFiScan outcome: ${{ steps.feeds.outcome }} · Safe governance outcome: ${{ steps.safe.outcome }}
            On `failure`, affected cells carry `sourceStatus: fetch-error` / `safeApiStatus: failed`
            (last good data preserved) — review before merge.

      # Surface any failure AFTER the PR exists, so it is visible, not swallowed.
      - if: steps.feeds.outcome == 'failure' || steps.safe.outcome == 'failure'
        run: echo "::error::An automated refresh had fetch errors — see the PR." && exit 1
```
The CLIs never commit or open PRs; PR creation lives only here. Humans review/merge.

- [ ] **Step 3: Reconcile `CLAUDE.md` + `README.md`, write `CONTRIBUTING.md`**

`README.md` and `CLAUDE.md` already exist (created during planning). **Reconcile them with what
was actually built** — verify the commands, directory layout, data model, tech-stack (CSS Modules,
no Tailwind), Safe service, and the data-integrity rule all match reality; fix any drift. (And
honor the standing rule: any task that changed a command/dir/convention should already have
updated these.) Write `CONTRIBUTING.md`: the correction workflow (edit a
`data/ratings/<p>/<f>.yaml`, open a PR; CI validates), how to add a protocol (incl. required
`chain`/`site`/`blurb`) / propose a feed (incl. `displayOrder`/`conflicts`), the
**real-data-only + no-placeholder** expectation, and conflict disclosure.

- [ ] **Step 4: Configure static deploy**

Add a Cloudflare Pages (or GitHub Pages) deploy of `packages/web/out`. Document the
deploy target in the README. Optional: pin an IPFS mirror of `out/`.

- [ ] **Step 5: Final verification**

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm validate && pnpm test && pnpm build`
Expected: all green; `packages/web/out` contains index, 5 protocol pages, methodology, contribute.

- [ ] **Step 6: Commit**

```bash
git add .github README.md CLAUDE.md CONTRIBUTING.md
git commit -m "ci: validation+build pipeline, scheduled refresh PR, docs"
```

---

## Self-Review Notes (author)

- **Spec coverage:** typed/validated data layer (T2–3), no-composite enforced in code (3 layers: `.strict()` + recursive denylist `findForbiddenKeys` + no-synthesis UI test) + charter (T1,T2,T3,T6,CI), verbatim ratings incl. source-native `dimensions` (T4,T6), coverage gaps as data with evidence — `coverageScope` for partial, `checkedUrl` for not-yet-covered (T2,T4), provenance incl. stale/fetch signals + "data last checked" status (T2,T5,T6), community-correctable via PR (T4 file layout + path↔id/orphan checks + CONTRIBUTING + ingest PR flow), automated ingestion exemplar + loud failure that still produces a reviewable PR (T7,T8), summary matrix/detail/methodology/contribute pages (T5–6), live TVL with real build-time snapshot fallback + multi-slug (T5), governance validated (T3,T4,T6), static-first hosting (T8). All spec sections map to a task.
- **Audit & incident history are IN scope** (per user request) — done properly: their own
  `.strict()` schemas (`AuditHistorySchema`/`IncidentHistorySchema`), seed files
  (`data/audits/*`, `data/incidents/*`, empty `incidents: []` allowed), `validateDataset`
  parsing + `protocolId` ref checks (T2–4), and rendered sections on the protocol page (T6).
  They are factual source-linked records; `severityLabel` is shown only verbatim "(per source)".
- **Approved design integrated (port, don't re-design):** T5–6 port `defi-risk-agg-poc-design/`
  into typed Next.js using **CSS Modules + one global token stylesheet** (no Tailwind). Adds the
  matrix Gov column + density **CoverageBar** (explicitly "not a score") + ⇄ spread mark + family
  expander sub-rows + search/category/coverage/feed filters + deep-linkable URL filters + legend;
  the detail page's chain/site/blurb header, governance table with `tag` chips + Safe-status footer,
  feed-card grid, coverage spread-note, gaps-strip, audit + incident tables; the oracle-analogy
  methodology + provenance legend; and the contribute diff blocks. `tweaks-panel.jsx` is not ported;
  the dark/light toggle is (`ThemeProvider`). The design's `data.js` is the seed source for T4.
- **Data-model reconciled to the design:** `Protocol` gains `chain`/`site`/`blurb`; `Governance`
  gains `summary`/`safeApiStatus`/`safe{address,chainId}` + per-item `tag` (`ProvenanceTagEnum`:
  onchain|feed|curated|self-reported) + optional `link`; `Audit` = `{firm,date,url,scope?}`,
  `Incident` = `{date,title,summary,severity?,url}` (date allows `YYYY-MM`); `severity` is
  source-verbatim, rendered "(per source)". No new field hits the no-composite denylist.
- **Safe governance service (T7 Steps 9–12):** keeps the frontend static; a scheduled service
  fetches the Safe Transaction API and refreshes the multisig fields in `data/governance/*.yaml`
  (loud failure → `safeApiStatus: failed`, last good data preserved), opening a PR via the Action.
- **Parallel execution:** see the **Parallel Execution** section — sequential spine T1→2→3→4, then
  fan out Web (Agent A: T5→6) ∥ Ingestion (Agent B: T7, itself splittable), final sync at T8.
- **Codex review incorporated (round 1):** recursive no-composite guard; ingestion
  `continue-on-error` + always-PR + final-fail; TVL snapshot+fallback; governance validation;
  `coverageScope`/`checkedUrl`/`coverageNote`/nullable `conflicts`/`dimensions`; path↔id + orphan
  checks. YAGNI: no `viem` (Safe API is plain HTTPS), CLIs never open PRs, IPFS = future.
- **Type consistency:** `Protocol`/`Feed`/`RatingCell`/`Governance`/`AuditHistory`/`IncidentHistory`/
  `ProvenanceTag` defined once in `@dra/core`; `loadDataset`/`checkDataLayout`/`validateDataset`
  consistent across core/web/ingestion; web `getDataset`/`getTvlSnapshot`/`cellFor`/`governanceFor`/
  `auditsFor`/`incidentsFor` + `coverageCount`/`coverageSpread`/`computeDataStatus` consistent.
- **Known implementation-time unknowns (flagged, not placeholders):** exact DeFiScan + Safe API
  response shapes (T7), the verbatim values for cells beyond the worked examples (T4, sourced from
  `data.js`), and the per-component CSS-Module split boundaries (T5, rule given). Interfaces are
  fully specified. Replace the `OWNER` repo placeholder once the user supplies the GitHub URL.
