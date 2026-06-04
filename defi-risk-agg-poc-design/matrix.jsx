/* ============================================================
   OpenRisk — SummaryMatrix + Home page
   rows = protocols, columns = feeds. Sort by name/category/TVL only
   (never by any synthesized score — there is none).
   ============================================================ */

function parseHomeParams() {
  const h = location.hash || "";
  const qi = h.indexOf("?");
  const sp = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : "");
  const sortRaw = sp.get("sort") || "tvl:desc";
  const [skey, sdir] = sortRaw.split(":");
  return {
    q: sp.get("q") || "",
    cat: sp.get("cat") || "All",
    cov: sp.get("cov") || "All",
    feedFilter: sp.get("feed") || "All",
    sort: { key: skey || "tvl", dir: sdir === "asc" ? "asc" : "desc" },
  };
}

function SummaryMatrix({ navigate }) {
  const D = window.DATA;
  const init = parseHomeParams();
  const [q, setQ] = useState(init.q);
  const [cat, setCat] = useState(init.cat);
  const [cov, setCov] = useState(init.cov);        // coverage filter
  const [feedFilter, setFeedFilter] = useState(init.feedFilter);
  const [sort, setSort] = useState(init.sort);
  const [expanded, setExpanded] = useState({});

  // deep-linkable filters — keep the URL hash in sync (shareable view,
  // no history spam, no scroll jump). replaceState never fires hashchange.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (cat !== "All") sp.set("cat", cat);
    if (cov !== "All") sp.set("cov", cov);
    if (feedFilter !== "All") sp.set("feed", feedFilter);
    if (!(sort.key === "tvl" && sort.dir === "desc")) sp.set("sort", sort.key + ":" + sort.dir);
    const qs = sp.toString();
    const newHash = "#/" + (qs ? "?" + qs : "");
    if (location.hash !== newHash) history.replaceState(null, "", newHash);
  }, [q, cat, cov, feedFilter, sort]);

  const cats = ["All", ...Array.from(new Set(D.protocols.map((p) => p.category)))];

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "category" ? "asc" : "desc" });
  }
  const ariaSort = (k) => sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const onKeySort = (k) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSort(k); } };

  let rows = D.protocols.slice();

  // filter: search
  if (q.trim()) {
    const s = q.trim().toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(s) || (p.category || "").toLowerCase().includes(s));
  }
  // filter: category
  if (cat !== "All") rows = rows.filter((p) => p.category === cat);
  // filter: coverage status (protocol has ≥1 cell in that state)
  if (cov !== "All") rows = rows.filter((p) => D.ratings.some((r) => r.protocolId === p.id && r.coverage === cov));
  // filter: feed (protocol covered/partial by that feed)
  if (feedFilter !== "All") rows = rows.filter((p) => {
    const c = D.cell(p.id, feedFilter); return c && c.coverage !== "not-yet-covered";
  });

  // sort
  rows.sort((a, b) => {
    let av, bv;
    if (sort.key === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    else if (sort.key === "category") { av = (a.category || ""); bv = (b.category || ""); }
    else { av = a.tvlSnapshot || 0; bv = b.tvlSnapshot || 0; }
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const arr = (k) => sort.key === k ? <span className="arr">{sort.dir === "asc" ? "↑" : "↓"}</span> : null;

  return (
    <div className="view-enter">
      <h1 className="title">Risk feeds, side by side</h1>
      <p className="lede">
        Like a sound oracle aggregates many price feeds into one trusted value, OpenRisk gathers what
        independent risk feeds say about a protocol into one view. What each feed says, verbatim — no composite
        scores, no ranking.
      </p>
      <div className="statusline">
        <span className="pip"></span>
        <span>Data last checked {D.dataStatus.oldestCheck} (oldest cell)</span>
        <span className="faint">·</span>
        <span>TVL {D.dataStatus.tvlSnapshotAge}</span>
        <span className="faint">·</span>
        <span>{D.dataStatus.protocolCount} protocols × {D.dataStatus.feedCount} feeds = {D.dataStatus.cellCount} cells</span>
      </div>

      {/* controls */}
      <div className="row gap-3 wrap mt-6" style={{ alignItems: "center" }}>
        <input className="search" placeholder="Search protocols…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row gap-2 wrap">
          {cats.map((c) => (
            <button key={c} className={"filter-pill" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>
              {c === "All" ? "All" : (D.categoryLabels[c] || c)}
            </button>
          ))}
        </div>
      </div>
      <div className="row gap-3 wrap mt-3" style={{ alignItems: "center" }}>
        <span className="faint" style={{ fontSize: "12px" }}>Coverage</span>
        {["All", "covered", "partial", "not-yet-covered"].map((c) => (
          <button key={c} className={"filter-pill" + (cov === c ? " active" : "")} onClick={() => setCov(c)} style={{ padding: "6px 12px" }}>
            {c === "All" ? "Any" : c === "not-yet-covered" ? "Not yet covered" : c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
        <span className="faint" style={{ fontSize: "12px", marginLeft: "8px" }}>Feed</span>
        <button className={"filter-pill" + (feedFilter === "All" ? " active" : "")} onClick={() => setFeedFilter("All")} style={{ padding: "6px 12px" }}>Any</button>
        {D.feeds.map((f) => (
          <button key={f.id} className={"filter-pill" + (feedFilter === f.id ? " active" : "")} onClick={() => setFeedFilter(f.id)} style={{ padding: "6px 12px" }}>{f.name}</button>
        ))}
      </div>

      {/* matrix */}
      <div className="matrix-wrap mt-4">
        <table className="matrix">
          <thead>
            <tr>
              <th className="sortable sticky-col" tabIndex={0} role="columnheader" aria-sort={ariaSort("name")} onClick={() => toggleSort("name")} onKeyDown={onKeySort("name")} style={{ minWidth: "210px" }}>Protocol {arr("name")}</th>
              <th className="sortable" tabIndex={0} role="columnheader" aria-sort={ariaSort("category")} onClick={() => toggleSort("category")} onKeyDown={onKeySort("category")}>Category {arr("category")}</th>
              <th className="sortable" tabIndex={0} role="columnheader" aria-sort={ariaSort("tvl")} onClick={() => toggleSort("tvl")} onKeyDown={onKeySort("tvl")} style={{ textAlign: "right" }}>TVL {arr("tvl")}</th>
              <th>Gov</th>
              <th title="One segment per feed. A density read-out, not a score.">Coverage</th>
              {D.feeds.map((f) => <th key={f.id} className="feedcol" title={f.focus}>{f.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5 + D.feeds.length} style={{ textAlign: "center", color: "var(--text-3)", height: "120px" }}>No protocols match these filters.</td></tr>
            ) : null}
            {rows.map((p) => {
              const cc = D.coverageCount(p.id);
              const sp = coverageSpread(p.id);
              const isOpen = !!expanded[p.id];
              const hasVersions = p.versions && p.versions.length;
              return (
                <React.Fragment key={p.id}>
                  <tr className="prow">
                    <td className="name-cell sticky-col" role="link" tabIndex={0} aria-label={"Open " + p.name} onClick={() => navigate("protocol", p.id)} onKeyDown={(e) => { if (e.key === "Enter") navigate("protocol", p.id); }}>
                      <span className="row gap-2" style={{ alignItems: "center" }}>
                        {hasVersions ? (
                          <span className={"expander" + (isOpen ? " open" : "")}
                            onClick={(e) => { e.stopPropagation(); setExpanded((x) => ({ ...x, [p.id]: !x[p.id] })); }}>▸</span>
                        ) : <span style={{ width: "16px" }}></span>}
                        <span className="pname">{p.name}</span>
                        {hasVersions ? <span className="ver-chip">({p.versions.length} versions)</span> : null}
                      </span>
                    </td>
                    <td><CategoryChip category={p.category} /></td>
                    <td style={{ textAlign: "right" }}><TvlValue snapshot={p.tvlSnapshot} asOf={p.tvlAsOf} /></td>
                    <td className="gov-mini tnum">{D.governance[p.id] ? D.governance[p.id].summary : "—"}</td>
                    <td className="feeds-mini">
                      <span className="row gap-2" style={{ alignItems: "center" }}>
                        <CoverageBar protocolId={p.id} />
                        <span className="tnum faint" style={{ fontSize: "11.5px" }}>{cc.covered + cc.partial}/{cc.total}</span>
                        {sp && sp.kind === "gap" ? (
                          <span className="spread-mark" title="Some feeds cover this protocol; others explicitly do not. Coverage gaps are data — compare the feeds inside.">⇄</span>
                        ) : null}
                      </span>
                    </td>
                    {D.feeds.map((f) => (
                      <td key={f.id} className="feedcol"><MatrixCell cell={D.cell(p.id, f.id)} /></td>
                    ))}
                  </tr>
                  {hasVersions && isOpen ? p.versions.map((v) => (
                    <tr className="subrow" key={p.id + v}>
                      <td className="sticky-col"><span className="pname">{p.name} {v}</span></td>
                      <td><span className="faint" style={{ fontSize: "12px" }}>{D.categoryLabels[p.category] || p.category}</span></td>
                      <td style={{ textAlign: "right" }}><span className="faint" style={{ fontSize: "12px" }}>grouped</span></td>
                      <td></td><td></td>
                      {D.feeds.map((f) => {
                        const c = D.cell(p.id, f.id);
                        return <td key={f.id} className="feedcol"><MatrixCell cell={c} /></td>;
                      })}
                    </tr>
                  )) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="row gap-3 mt-4 wrap" style={{ fontSize: "12px", color: "var(--text-3)" }}>
        <span className="cov cov-covered"><span className="dot"></span>Covered</span>
        <span className="cov cov-partial"><span className="dot"></span>Partial</span>
        <span className="cov cov-none"><span className="dot"></span>Not yet covered</span>
        <span className="row gap-2" style={{ alignItems: "center" }}><CoverageBar protocolId={D.protocols[0].id} /><span>= share of feeds that have assessed it (not a score)</span></span>
        <span className="row gap-2" style={{ alignItems: "center" }}><span className="spread-mark">⇄</span><span>= some feeds cover it, some explicitly don't</span></span>
      </div>
    </div>
  );
}

Object.assign(window, { SummaryMatrix });
