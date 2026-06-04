/* ============================================================
   OpenRisk — Methodology page
   Oracle analogy · does / does-not · feed registry · provenance legend
   · coverage states legend
   ============================================================ */

function Methodology({ navigate }) {
  const D = window.DATA;
  return (
    <div className="view-enter" style={{ maxWidth: "880px" }}>
      <h1 className="title">Methodology</h1>

      <div className="callout mt-6">
        <h3>The oracle analogy</h3>
        <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6, fontSize: "13.5px" }}>
          No single price feed is canonical. A well-designed oracle aggregates many feeds into one trusted value,
          with no individual source treated as authoritative — the aggregation is the value. OpenRisk applies the
          same principle to DeFi risk: a neutral place to see what every risk feed says about a protocol,
          side by side, with sources intact.
        </p>
      </div>

      <div className="row gap-4 wrap mt-8" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 360px" }}>
          <h2 className="section-h" style={{ color: "var(--error)" }}>What OpenRisk does not do</h2>
          <ul className="doesnot-list mt-4">
            <li>Assign its own risk score, grade, or star rating.</li>
            <li>Weight, rank, or order feeds against each other.</li>
            <li>Tell you whether a protocol is safe or unsafe.</li>
            <li>Endorse, normalize, or synthesize any rating.</li>
          </ul>
        </div>
        <div style={{ flex: "1 1 360px" }}>
          <h2 className="section-h" style={{ color: "var(--cov-covered)" }}>What OpenRisk does</h2>
          <ul className="does-list mt-4">
            <li>Aggregates risk-feed coverage for DeFi protocols in one view.</li>
            <li>Surfaces governance from on-chain sources with provenance.</li>
            <li>Tracks which feeds have — and have not — assessed a protocol.</li>
            <li>Links to source assessments; ratings shown verbatim.</li>
            <li>Keeps an open, correctable data registry on GitHub.</li>
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="section-h">Coverage gaps are data</h2>
        <p className="lede" style={{ fontSize: "13.5px", marginTop: "12px" }}>
          A protocol no feed has assessed is itself a signal. A protocol covered by one research feed has a
          meaningfully different profile from one covered by four. Every protocol × feed cell carries one of three
          first-class states — never a blank, never an implied zero.
        </p>
        <div className="row gap-4 wrap mt-4">
          {[
            { c: "covered", t: "Covered", d: "The feed has assessed this protocol. Its verdict is shown verbatim with a source link." },
            { c: "partial", t: "Partial", d: "Assessed in a limited scope (one market, one asset). The cell states exactly what is and isn't covered." },
            { c: "not-yet-covered", t: "Not yet covered", d: "No assessment exists. The cell still records where that absence was verified." },
          ].map((s) => (
            <div key={s.c} style={{ flex: "1 1 240px" }}>
              <CoverageBadge coverage={s.c} />
              <p className="muted mt-2" style={{ fontSize: "12.5px", lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="row between wrap" style={{ alignItems: "baseline" }}>
          <h2 className="section-h">The feed registry</h2>
          <span className="muted" style={{ fontSize: "13px" }}>{D.feeds.length} feeds in this POC</span>
        </div>
        <p className="muted mt-2" style={{ fontSize: "12.5px" }}>Each feed has its own methodology and focus. We do not rank them.</p>
        <div className="gov-card mt-4">
          <table className="dtable">
            <thead>
              <tr><th style={{ width: "18%" }}>Feed</th><th style={{ width: "13%" }}>Type</th><th>Focus</th><th style={{ width: "11%" }}>Access</th></tr>
            </thead>
            <tbody>
              {D.feeds.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 700, verticalAlign: "top" }}>
                    <a href={f.url} target="_blank" rel="noopener">{f.name}</a>
                    {f.conflicts ? <div className="stale-flag mt-2" style={{ color: "var(--prov-self-fg)", fontSize: "11px" }} title={f.conflicts}><span className="pip"></span>conflict declared</div> : null}
                  </td>
                  <td style={{ color: "var(--accent)", verticalAlign: "top" }}>{f.type}</td>
                  <td className="muted" style={{ lineHeight: 1.55, verticalAlign: "top" }}>
                    {f.focus}
                    {f.conflicts ? <div className="faint mt-2" style={{ fontSize: "11.5px" }}>Conflict: {f.conflicts}</div> : null}
                  </td>
                  <td style={{ verticalAlign: "top" }}><ProvenanceTag tag={f.access === "auto" ? "feed" : "curated"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="section-h">Data provenance</h2>
        <p className="muted mt-2" style={{ fontSize: "12.5px" }}>Every datum carries a source tag:</p>
        <div className="prov-legend mt-4">
          <div className="lrow"><ProvenanceTag tag="onchain" /><span className="desc">Fetched directly from chain or a verified on-chain source (Safe API, block explorer).</span></div>
          <div className="lrow"><ProvenanceTag tag="feed" /><span className="desc">Sourced from a feed provider's published assessment.</span></div>
          <div className="lrow"><ProvenanceTag tag="curated" /><span className="desc">Manually researched and added by a human curator via pull request.</span></div>
          <div className="lrow"><ProvenanceTag tag="self-reported" /><span className="desc">Provided by the protocol team directly.</span></div>
        </div>
        <p className="muted mt-4" style={{ fontSize: "12.5px", lineHeight: 1.6 }}>
          Governance is fetched live from the Safe API where possible, so multisig thresholds and signer counts
          reflect current on-chain state. When a fetch fails, the cell shows the last good data with a loud
          <span className="stale-flag err" style={{ margin: "0 5px" }}><span className="pip"></span>fetch error</span>
          flag — stale data is never served as fresh.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="section-h">How to contribute</h2>
        <p className="muted mt-2" style={{ fontSize: "13px", lineHeight: 1.6 }}>
          All OpenRisk data is version-controlled files. Corrections are ordinary pull requests with visible diffs.
        </p>
        <ul className="does-list mt-4" style={{ gap: "12px" }}>
          <li><span><b style={{ fontWeight: 700 }}>Correct a cell</b> — edit <code className="prov prov-curated">data/ratings/&lt;protocol&gt;/&lt;feed&gt;.yaml</code> and open a PR.</span></li>
          <li><span><b style={{ fontWeight: 700 }}>Add a protocol</b> — add a file to <code className="prov prov-curated">data/protocols/</code>.</span></li>
          <li><span><b style={{ fontWeight: 700 }}>Propose a feed</b> — add an entry to <code className="prov prov-curated">data/feeds/</code> with its focus and access method.</span></li>
        </ul>
        <p className="mt-4"><a href="https://github.com/cpstl/openrisk" target="_blank" rel="noopener">github.com/cpstl/openrisk →</a></p>
      </div>
    </div>
  );
}

Object.assign(window, { Methodology });
