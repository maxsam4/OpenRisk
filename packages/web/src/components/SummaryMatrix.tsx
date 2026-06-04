"use client";
import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Protocol, Feed, RatingCell, Governance } from "@dra/core";
import { categoryLabels, coverageCount, coverageSpread, type DataStatus } from "../lib/coverage";
import { cellFor, governanceFor, type TvlSnapshot } from "../lib/select";
import { CategoryChip } from "./CategoryChip";
import { TvlValue } from "./TvlValue";
import { MatrixCell } from "./MatrixCell";
import { CoverageBar } from "./CoverageBar";
import styles from "./Matrix.module.css";

type SortKey = "name" | "category" | "tvl";
type SortDir = "asc" | "desc";

interface InitState {
  q: string;
  cat: string;
  cov: string;
  feedFilter: string;
  sort: { key: SortKey; dir: SortDir };
}

function parseHomeParams(): InitState {
  const sp = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
  const sortRaw = sp.get("sort") || "tvl:desc";
  const [skey, sdir] = sortRaw.split(":");
  const key: SortKey =
    skey === "name" || skey === "category" || skey === "tvl" ? skey : "tvl";
  return {
    q: sp.get("q") || "",
    cat: sp.get("cat") || "All",
    cov: sp.get("cov") || "All",
    feedFilter: sp.get("feed") || "All",
    sort: { key, dir: sdir === "asc" ? "asc" : "desc" },
  };
}

export function SummaryMatrix({
  protocols,
  feeds,
  ratings,
  governance,
  tvlSnapshot,
  dataStatus,
}: {
  protocols: Protocol[];
  feeds: Feed[];
  ratings: RatingCell[];
  governance: Governance[];
  tvlSnapshot: TvlSnapshot;
  dataStatus: DataStatus;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [cov, setCov] = useState("All");
  const [feedFilter, setFeedFilter] = useState("All");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "tvl", dir: "desc" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Hydrate filter state from the URL on mount (deep-linkable view).
  useEffect(() => {
    const init = parseHomeParams();
    setQ(init.q);
    setCat(init.cat);
    setCov(init.cov);
    setFeedFilter(init.feedFilter);
    setSort(init.sort);
  }, []);

  // Keep the URL in sync via the History API (shareable view, no history spam,
  // no scroll jump). Use location.search on pathname "/" — NOT Next useSearchParams.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (cat !== "All") sp.set("cat", cat);
    if (cov !== "All") sp.set("cov", cov);
    if (feedFilter !== "All") sp.set("feed", feedFilter);
    if (!(sort.key === "tvl" && sort.dir === "desc")) sp.set("sort", sort.key + ":" + sort.dir);
    const qs = sp.toString();
    const newUrl = "/" + (qs ? "?" + qs : "");
    const current = location.pathname + location.search;
    if (current !== newUrl) history.replaceState(null, "", newUrl);
  }, [q, cat, cov, feedFilter, sort]);

  const tvlFor = (id: string): number => tvlSnapshot.protocols[id] ?? 0;
  const cats = ["All", ...Array.from(new Set(protocols.map((p) => p.category)))];

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "category" ? "asc" : "desc" },
    );
  }
  const ariaSort = (k: SortKey): "ascending" | "descending" | "none" =>
    sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const onKeySort = (k: SortKey) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSort(k);
    }
  };

  let rows = protocols.slice();

  if (q.trim()) {
    const s = q.trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(s) || (p.category || "").toLowerCase().includes(s),
    );
  }
  if (cat !== "All") rows = rows.filter((p) => p.category === cat);
  if (cov !== "All")
    rows = rows.filter((p) =>
      ratings.some((r) => r.protocolId === p.id && r.coverage === cov),
    );
  if (feedFilter !== "All")
    rows = rows.filter((p) => {
      const c = cellFor(ratings, p.id, feedFilter);
      return !!c && c.coverage !== "not-yet-covered";
    });

  rows.sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    if (sort.key === "name") {
      av = a.name.toLowerCase();
      bv = b.name.toLowerCase();
    } else if (sort.key === "category") {
      av = a.category || "";
      bv = b.category || "";
    } else {
      av = tvlFor(a.id);
      bv = tvlFor(b.id);
    }
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const open = (id: string) => router.push("/protocol/" + id);
  const arr = (k: SortKey) =>
    sort.key === k ? <span className="arr">{sort.dir === "asc" ? "↑" : "↓"}</span> : null;

  return (
    <div className="view-enter">
      <h1 className="title">Risk feeds, side by side</h1>
      <p className="lede">
        Like a sound oracle aggregates many price feeds into one trusted value, OpenRisk gathers
        what independent risk feeds say about a protocol into one view. What each feed says,
        verbatim — no composite scores, no ranking.
      </p>
      <div className={styles.statusline}>
        <span className="pip"></span>
        <span>Data last checked {dataStatus.oldestCheck} (oldest cell)</span>
        <span className="faint">·</span>
        <span>TVL {dataStatus.tvlSnapshotAge}</span>
        <span className="faint">·</span>
        <span>
          {dataStatus.protocolCount} protocols × {dataStatus.feedCount} feeds ={" "}
          {dataStatus.cellCount} cells
        </span>
      </div>

      {/* controls */}
      <div className="row gap-3 wrap mt-6" style={{ alignItems: "center" }}>
        <input
          className="search"
          placeholder="Search protocols…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="row gap-2 wrap">
          {cats.map((c) => (
            <button
              key={c}
              className={"filter-pill" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c === "All" ? "All" : categoryLabels[c] || c}
            </button>
          ))}
        </div>
      </div>
      <div className="row gap-3 wrap mt-3" style={{ alignItems: "center" }}>
        <span className="faint" style={{ fontSize: "12px" }}>
          Coverage
        </span>
        {["All", "covered", "partial", "not-yet-covered"].map((c) => (
          <button
            key={c}
            className={"filter-pill" + (cov === c ? " active" : "")}
            onClick={() => setCov(c)}
            style={{ padding: "6px 12px" }}
          >
            {c === "All"
              ? "Any"
              : c === "not-yet-covered"
                ? "Not yet covered"
                : c[0]!.toUpperCase() + c.slice(1)}
          </button>
        ))}
        <span className="faint" style={{ fontSize: "12px", marginLeft: "8px" }}>
          Feed
        </span>
        <button
          className={"filter-pill" + (feedFilter === "All" ? " active" : "")}
          onClick={() => setFeedFilter("All")}
          style={{ padding: "6px 12px" }}
        >
          Any
        </button>
        {feeds.map((f) => (
          <button
            key={f.id}
            className={"filter-pill" + (feedFilter === f.id ? " active" : "")}
            onClick={() => setFeedFilter(f.id)}
            style={{ padding: "6px 12px" }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* matrix */}
      <div className={`${styles.matrixWrap} mt-4`}>
        <table>
          <thead>
            <tr>
              <th
                className={`sortable ${styles.stickyCol}`}
                tabIndex={0}
                role="columnheader"
                aria-sort={ariaSort("name")}
                onClick={() => toggleSort("name")}
                onKeyDown={onKeySort("name")}
                style={{ minWidth: "210px" }}
              >
                Protocol {arr("name")}
              </th>
              <th
                className="sortable"
                tabIndex={0}
                role="columnheader"
                aria-sort={ariaSort("category")}
                onClick={() => toggleSort("category")}
                onKeyDown={onKeySort("category")}
              >
                Category {arr("category")}
              </th>
              <th
                className="sortable"
                tabIndex={0}
                role="columnheader"
                aria-sort={ariaSort("tvl")}
                onClick={() => toggleSort("tvl")}
                onKeyDown={onKeySort("tvl")}
                style={{ textAlign: "right" }}
              >
                TVL {arr("tvl")}
              </th>
              <th>Gov</th>
              <th title="One segment per feed. A density read-out, not a score.">Coverage</th>
              {feeds.map((f) => (
                <th key={f.id} className="feedcol" title={f.focus}>
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5 + feeds.length}
                  style={{ textAlign: "center", color: "var(--text-3)", height: "120px" }}
                >
                  No protocols match these filters.
                </td>
              </tr>
            ) : null}
            {rows.map((p) => {
              const cc = coverageCount(ratings, p.id);
              const sp = coverageSpread(ratings, p.id);
              const isOpen = !!expanded[p.id];
              const hasVersions = !!(p.versions && p.versions.length);
              const gov = governanceFor(governance, p.id);
              return (
                <Fragment key={p.id}>
                  <tr className="prow">
                    <td
                      className={`name-cell ${styles.stickyCol}`}
                      role="link"
                      tabIndex={0}
                      aria-label={"Open " + p.name}
                      onClick={() => open(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") open(p.id);
                      }}
                    >
                      <span className="row gap-2" style={{ alignItems: "center" }}>
                        {hasVersions ? (
                          <span
                            className={`${styles.expander}${isOpen ? " open" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded((x) => ({ ...x, [p.id]: !x[p.id] }));
                            }}
                          >
                            ▸
                          </span>
                        ) : (
                          <span style={{ width: "16px" }}></span>
                        )}
                        <span className="pname">{p.name}</span>
                        {hasVersions ? (
                          <span className="ver-chip">({p.versions!.length} versions)</span>
                        ) : null}
                      </span>
                    </td>
                    <td>
                      <CategoryChip category={p.category} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <TvlValue
                        slugs={p.defillamaSlugs}
                        snapshot={tvlSnapshot.protocols[p.id]}
                        asOf={tvlSnapshot.asOf}
                      />
                    </td>
                    <td className={`${styles.govMini} tnum`}>{gov ? (gov.summary ?? "—") : "—"}</td>
                    <td className={styles.feedsMini}>
                      <span className="row gap-2" style={{ alignItems: "center" }}>
                        <CoverageBar count={cc} />
                        <span className="tnum faint" style={{ fontSize: "11.5px" }}>
                          {cc.covered + cc.partial}/{cc.total}
                        </span>
                        {sp && sp.kind === "gap" ? (
                          <span
                            className={styles.spreadMark}
                            title="Some feeds cover this protocol; others explicitly do not. Coverage gaps are data — compare the feeds inside."
                          >
                            ⇄
                          </span>
                        ) : null}
                      </span>
                    </td>
                    {feeds.map((f) => (
                      <td key={f.id} className="feedcol">
                        <MatrixCell cell={cellFor(ratings, p.id, f.id) ?? null} />
                      </td>
                    ))}
                  </tr>
                  {hasVersions && isOpen
                    ? p.versions!.map((v) => (
                        <tr className={styles.subrow} key={p.id + v}>
                          <td className={styles.stickyCol}>
                            <span className="pname">
                              {p.name} {v}
                            </span>
                          </td>
                          <td>
                            <span className="faint" style={{ fontSize: "12px" }}>
                              {categoryLabels[p.category] || p.category}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="faint" style={{ fontSize: "12px" }}>
                              grouped
                            </span>
                          </td>
                          <td></td>
                          <td></td>
                          {feeds.map((f) => (
                            <td key={f.id} className="feedcol">
                              <MatrixCell cell={cellFor(ratings, p.id, f.id) ?? null} />
                            </td>
                          ))}
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="row gap-3 mt-4 wrap"
        style={{ fontSize: "12px", color: "var(--text-3)" }}
      >
        <span className="cov cov-covered">
          <span className="dot"></span>Covered
        </span>
        <span className="cov cov-partial">
          <span className="dot"></span>Partial
        </span>
        <span className="cov cov-none">
          <span className="dot"></span>Not yet covered
        </span>
        <span className="row gap-2" style={{ alignItems: "center" }}>
          {protocols[0] ? <CoverageBar count={coverageCount(ratings, protocols[0].id)} /> : null}
          <span>= share of feeds that have assessed it (not a score)</span>
        </span>
        <span className="row gap-2" style={{ alignItems: "center" }}>
          <span className={styles.spreadMark}>⇄</span>
          <span>= some feeds cover it, some explicitly don&apos;t</span>
        </span>
      </div>
    </div>
  );
}
