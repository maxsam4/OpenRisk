# Contributing to OpenRisk

OpenRisk is a **data-as-code** project: the data layer *is* this git repository, so
every correction, addition, or new feed is an ordinary pull request with a visible
diff. Thank you for helping keep it accurate and neutral.

## The two rules that matter most

1. **Real, verified data only — no placeholders, no guesses.** Every value you commit
   must be a real fact from the cited source: real addresses (full 40-hex, never
   truncated), real DeFiScan stages, real audit firms/dates/report URLs, real Safe
   addresses + chainIds, real DefiLlama slugs, real incident post-mortems. If you
   cannot verify something, **do not invent it** — mark the rating cell
   `not-yet-covered` (with a real `checkedUrl`), or omit the optional field.
2. **No composite scoring — ever.** OpenRisk never produces its own score, rank,
   grade, tier, or aggregate assessment. Show each feed's verdict **verbatim**, in the
   feed's own words, with a link to the source. This is enforced in code
   (`validateDataset()` + a recursive forbidden-key scan + a no-synthesis UI test) and
   documented in [`CHARTER.md`](./CHARTER.md). Changing it requires the charter process.

## Before you open a PR

```bash
pnpm install
pnpm validate   # schema + referential integrity + path↔id + no-composite guard
pnpm test
pnpm build
```

CI runs `lint → typecheck → validate → test → build` on every PR. A PR cannot merge
with invalid data, a missing/orphan cell, a path↔id mismatch, or any composite/
denylisted field.

## Correct a rating

Edit the relevant `data/ratings/<protocolId>/<feedId>.yaml`:

- Copy the feed's label/text **verbatim** into `rating.verbatim` (and use
  `rating.dimensions[]` for any source-native sub-values — never a number you derived).
- Set `coverage` to `covered`, `partial`, or `not-yet-covered`:
  - `partial` **requires** `coverageScope` (what is and isn't covered).
  - `not-yet-covered` **requires** `rating: null` and a `provenance.checkedUrl`
    showing *where* you verified the absence.
- Update `provenance` (`lastChecked`, `curator`, `sourceStatus`, …).

One file == one protocol×feed cell. The filename must match the ids inside it.

## Add a protocol

1. Create `data/protocols/<id>.yaml` with the **required** fields: `id`, `name`,
   `category`, `chain`, `site`, `blurb`, `links.website`, and at least one
   `defillamaSlugs` entry (confirm each resolves at
   `https://api.llama.fi/tvl/<slug>` before committing). Add `family`/`versions` if it
   has versions.
2. Add **one rating cell per feed** under `data/ratings/<id>/<feedId>.yaml` (all of
   them — every protocol×feed cell must exist, even `not-yet-covered` ones).
3. Add `data/governance/<id>.yaml`, `data/audits/<id>.yaml`, and
   `data/incidents/<id>.yaml` (an empty `incidents: []` is a valid "none"). Governance
   needs an explicit `safeApiStatus` (`n/a` if the protocol has no tracked Safe; include
   a `safe { address, chainId }` block and `key`s on the `admin-multisig`/`threshold`
   items if it does).

## Propose a feed

Create `data/feeds/<id>.yaml` with `id`, `name`, `type`, `focus` (one line, faithful
to the feed's own description), `url`, `access` (`auto`|`manual`), a `displayOrder`
(its column position in the matrix), and `conflicts` — which is **required-nullable**:
use `null` for "none declared", or a verbatim disclosure string otherwise. Then add a
rating cell for that feed under **every** protocol. Disclosing conflicts of interest is
a project invariant — do not omit the field.

## Automated refreshes

The DeFiScan and DeFiPunk'd rating adapters and the Safe governance service run on a
schedule (`.github/workflows/ingest.yml`) and open a PR with any changes — including loud
`sourceStatus: fetch-error` / `safeApiStatus: failed` stamps when a source can't be
reached (last good data is preserved, never silently overwritten). Humans review and
merge. The ingestion CLIs only write files; they never open PRs themselves. Adapters refresh
`coverage`/`rating`/`provenance`; narrative `coverageNote`/`coverageScope` stay human-curated.

We **automate every source that exposes a machine-readable, verbatim-copyable signal**
(see the source table in `CLAUDE.md`); BlockAnalitica and LlamaRisk are curated by hand
because they currently expose no such surface.

## Conduct

Be accurate, be neutral, cite your sources. Corrections that make the data more
faithful to what feeds actually say are always welcome.
