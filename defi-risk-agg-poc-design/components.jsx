/* ============================================================
   OpenRisk — shared presentational components
   Maps to: CoverageBadge, ProvenanceTag, TvlValue, FeedCard
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* ---------- formatting helpers ---------- */
function fmtTvl(n) {
  if (n == null) return "—";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(0) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n;
}
function ageFrom(iso) {
  const then = new Date(iso).getTime();
  const days = Math.max(0, Math.round((Date.now() - then) / 86400000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return days + "d ago";
  return Math.round(days / 30) + "mo ago";
}

/* ---------- CoverageBadge ----------
   Renders one of three FIRST-CLASS states. Never a blank. */
function CoverageBadge({ coverage, size }) {
  const map = {
    covered: { cls: "cov-covered", label: "Covered" },
    partial: { cls: "cov-partial", label: "Partial" },
    "not-yet-covered": { cls: "cov-none", label: "Not yet covered" },
  };
  const m = map[coverage] || map["not-yet-covered"];
  return (
    <span className={"cov " + m.cls} style={size === "lg" ? { fontSize: "13px" } : null}>
      <span className="dot"></span>{m.label}
    </span>
  );
}

/* ---------- matrix glyph (compact cell) ----------
   Shows a peek of the verbatim rating where it exists, else a dot/dash. */
function MatrixCell({ cell }) {
  if (!cell || cell.coverage === "not-yet-covered") {
    return <span className="gly none" title="Not yet covered">—</span>;
  }
  const v = cell.rating && cell.rating.verbatim ? cell.rating.verbatim : "";
  // short verbatim labels (Stage 0, grades) rendered as text; otherwise a dot
  const isShort = v && v.length <= 9 && !/dimension/i.test(v);
  if (cell.coverage === "partial") {
    if (isShort) return <span className="gly partial" title={"Partial · " + v}><span className="lbl-amber">{v}</span></span>;
    return <span className="gly partial" title={"Partial · " + v}><span className="dot"></span></span>;
  }
  if (isShort) return <span className="gly covered" title={v}><span className="lbl">{v}</span></span>;
  return <span className="gly covered" title={v}><span className="dot"></span></span>;
}

/* ---------- ProvenanceTag ----------
   method/source provenance: onchain | feed | curated | self-reported */
function ProvenanceTag({ tag }) {
  const map = {
    onchain: { cls: "prov-onchain", label: "onchain" },
    feed: { cls: "prov-feed", label: "feed" },
    curated: { cls: "prov-curated", label: "curated" },
    "self-reported": { cls: "prov-self", label: "self-reported" },
  };
  const m = map[tag] || map.curated;
  return <span className={"prov " + m.cls}>[{m.label}]</span>;
}

/* ---------- StaleFlag ----------
   Loud, never silent. ok = nothing; stale/fetch-error = visible flag. */
function StaleFlag({ status }) {
  if (!status || status === "ok") return null;
  if (status === "stale")
    return <span className="stale-flag" title="Source data is stale"><span className="pip"></span>stale</span>;
  return <span className="stale-flag err" title="Last automated fetch failed — showing last good data"><span className="pip"></span>fetch error</span>;
}

/* ---------- CategoryChip ---------- */
function CategoryChip({ category }) {
  const label = (window.DATA.categoryLabels[category]) || category;
  return <span className="cat-chip">{label}</span>;
}

/* ---------- TvlValue ----------
   Build-time snapshot rendered immediately; a mock "live" upgrade nudges it
   after mount and flags the value as live. If the (mock) fetch fails, the
   snapshot stands — never a bare dash. */
function TvlValue({ snapshot, asOf, size }) {
  const [val, setVal] = useState(snapshot);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      // mock a successful DefiLlama live upgrade (~±0.4%)
      if (!alive) return;
      const jitter = 1 + (Math.random() - 0.5) * 0.008;
      setVal(Math.round(snapshot * jitter));
      setLive(true);
    }, 1100);
    return () => { alive = false; clearTimeout(t); };
  }, [snapshot]);
  const big = size === "lg";
  return (
    <span className="tnum" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontWeight: 700, fontSize: big ? "22px" : "14px", color: "var(--text)" }}>{fmtTvl(val)}</span>
      <span title={live ? "Live — DefiLlama" : ("Snapshot " + (asOf ? new Date(asOf).toISOString().slice(0, 10) : ""))}
        style={{ width: big ? "7px" : "6px", height: big ? "7px" : "6px", borderRadius: "50%",
          background: live ? "var(--cov-covered)" : "var(--text-3)",
          boxShadow: live ? "0 0 0 3px color-mix(in srgb, var(--cov-covered) 22%, transparent)" : "none",
          transition: "all .3s" }}></span>
    </span>
  );
}

/* ---------- FeedCard ----------
   One provider's view of a protocol. Methodology one-liner → verbatim rating
   (+ source-native dimensions) → coverageScope (partial) / checked-here (none)
   → provenance footer with stale flag. */
function FeedCard({ feed, cell }) {
  const coverage = cell ? cell.coverage : "not-yet-covered";
  const rating = cell && cell.rating;
  const dims = rating && rating.dimensions;
  const status = cell && cell.provenance && cell.provenance.sourceStatus;

  return (
    <div className="feedcard" data-coverage={coverage}>
      <div className="row between" style={{ alignItems: "flex-start", gap: "12px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px" }}>{feed.name}</div>
        <CoverageBadge coverage={coverage} />
      </div>

      <p className="feed-focus">{feed.focus}</p>

      {coverage === "not-yet-covered" ? (
        <div className="feed-body">
          <div className="muted" style={{ fontSize: "13px" }}>No assessment published.</div>
          {cell && cell.coverageNote ? <div className="faint mt-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}>{cell.coverageNote}</div> : null}
        </div>
      ) : (
        <div className="feed-body">
          {rating && rating.verbatim && !dims ? (
            <div className="verbatim-line">
              <span className="faint">Rating&nbsp;</span>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>{rating.verbatim}</span>
            </div>
          ) : null}

          {dims ? (
            <div className="dims">
              {dims.map((d) => (
                <div className="dim-row" key={d.label}>
                  <span className="muted">{d.label}</span>
                  <span style={{ fontWeight: 700 }}>{d.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {cell && cell.coverageNote ? (
            <div className="faint mt-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}>{cell.coverageNote}</div>
          ) : null}

          {coverage === "partial" && cell.coverageScope ? (
            <div className="scope-note">
              <span className="cov-partial" style={{ fontWeight: 700 }}>Scope</span>&nbsp;{cell.coverageScope}
            </div>
          ) : null}
        </div>
      )}

      <div className="feed-foot">
        {rating && rating.sourceUrl ? (
          <a className="ghost-link" href={rating.sourceUrl} target="_blank" rel="noopener">View assessment →</a>
        ) : (
          <a className="ghost-link" href={cell ? cell.provenance.checkedUrl : feed.url} target="_blank" rel="noopener">Checked here →</a>
        )}
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <StaleFlag status={status} />
          <ProvenanceTag tag={feed.access === "auto" ? "feed" : "curated"} />
          <span className="faint tnum" style={{ fontSize: "11.5px" }}>{cell ? cell.provenance.lastChecked : ""}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- CoverageBar ----------
   Proportional fill bar (covered + partial as fractions of all feeds).
   Scales to dozens of feeds. A density read-out, NOT a score: it shows
   how much of the registry has assessed this protocol, nothing is weighted
   or ranked. */
function CoverageBar({ protocolId }) {
  const D = window.DATA;
  const c = D.coverageCount(protocolId);
  const total = c.total || 1;
  const covPct = (c.covered / total) * 100;
  const partPct = (c.partial / total) * 100;
  return (
    <span className="covbar" role="img"
      aria-label={c.covered + " of " + total + " feeds covered, " + c.partial + " partial, " + c.none + " not yet covered"}>
      <span className="covbar-track">
        {covPct > 0 ? <span className="covbar-fill covbar-cov" style={{ width: covPct + "%" }} title={c.covered + " covered"}></span> : null}
        {partPct > 0 ? <span className="covbar-fill covbar-part" style={{ width: partPct + "%" }} title={c.partial + " partial"}></span> : null}
      </span>
    </span>
  );
}

/* coverageSpread — FACTUAL classification of how coverage is distributed,
   never a quality judgment. Returns null when there's nothing notable. */
function coverageSpread(protocolId) {
  const c = window.DATA.coverageCount(protocolId);
  if (c.covered > 0 && c.none > 0) return { kind: "gap", label: "coverage varies" };
  if (c.covered > 0 && c.partial > 0) return { kind: "depth", label: "depth varies" };
  return null;
}

Object.assign(window, {
  fmtTvl, ageFrom,
  CoverageBadge, MatrixCell, ProvenanceTag, StaleFlag, CategoryChip, TvlValue, FeedCard,
  CoverageBar, coverageSpread,
});
