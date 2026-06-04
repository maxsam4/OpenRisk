import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDataset,
  getTvlSnapshot,
  cellFor,
  governanceFor,
  auditsFor,
  incidentsFor,
} from "../../../lib/data";
import { coverageCount } from "../../../lib/coverage";
import { CategoryChip } from "../../../components/CategoryChip";
import { TvlValue } from "../../../components/TvlValue";
import { CoverageBar } from "../../../components/CoverageBar";
import { FeedCard } from "../../../components/FeedCard";
import { GovernanceTable } from "../../../components/GovernanceTable";
import styles from "./page.module.css";

export function generateStaticParams() {
  return getDataset().protocols.map((p) => ({ id: p.id }));
}

export default async function ProtocolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { protocols, feeds, ratings, governance, audits, incidents } = getDataset();
  const tvl = getTvlSnapshot();
  const p = protocols.find((x) => x.id === id);
  if (!p) notFound();

  const cells = feeds.map((f) => ({ feed: f, cell: cellFor(ratings, p.id, f.id) ?? null }));
  const present = cells.filter((c) => c.cell && c.cell.coverage !== "not-yet-covered");
  const gaps = cells.filter((c) => !c.cell || c.cell.coverage === "not-yet-covered");
  const cc = coverageCount(ratings, p.id);
  const protoAudits = auditsFor(audits, p.id);
  const protoIncidents = incidentsFor(incidents, p.id);

  return (
    <div className="view-enter">
      <Link
        className="ghost-link"
        href="/"
        style={{ fontFamily: "var(--mono)", whiteSpace: "nowrap" }}
      >
        ← All protocols
      </Link>

      {/* header */}
      <div className="row between wrap mt-4" style={{ alignItems: "flex-start", gap: "24px" }}>
        <div style={{ maxWidth: "680px" }}>
          <div className="row gap-3 wrap" style={{ alignItems: "center" }}>
            <h1 className="title">{p.name}</h1>
            <CategoryChip category={p.category} />
            {p.versions ? <span className="ver-chip">{p.versions.join(" · ")}</span> : null}
          </div>
          <div
            className="row gap-3 mt-2 wrap"
            style={{ alignItems: "center", color: "var(--text-2)", fontSize: "12.5px" }}
          >
            <span>{p.chain}</span>
            <a href={p.links.website} target="_blank" rel="noopener">
              {p.site}
            </a>
            {p.links.docs ? (
              <a href={p.links.docs} target="_blank" rel="noopener">
                docs
              </a>
            ) : null}
            {p.links.github ? (
              <a href={p.links.github} target="_blank" rel="noopener">
                github
              </a>
            ) : null}
          </div>
          <p className="lede" style={{ fontSize: "14px", marginTop: "14px" }}>
            {p.blurb}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            className="faint"
            style={{ fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            TVL
          </div>
          <div className="mt-2">
            <TvlValue
              slugs={p.defillamaSlugs}
              snapshot={tvl.protocols[p.id]}
              asOf={tvl.asOf}
              size="lg"
            />
          </div>
          <div className="faint mt-2" style={{ fontSize: "11.5px", whiteSpace: "nowrap" }}>
            snapshot {tvl.asOf ? tvl.asOf.slice(0, 10) : "—"}
          </div>
        </div>
      </div>

      {/* governance */}
      <div className="mt-8">
        <h2 className="section-h">Governance</h2>
        <GovernanceTable governance={governanceFor(governance, p.id)} />
      </div>

      {/* feed cards */}
      <div className="mt-8">
        <div className="row between wrap" style={{ alignItems: "baseline" }}>
          <h2 className="section-h">Risk intelligence feeds</h2>
          <span className="muted" style={{ fontSize: "13px" }}>
            <b style={{ color: "var(--text)", fontWeight: 700 }}>{present.length}</b> of{" "}
            {cells.length} feeds with an assessment
          </span>
        </div>
        <p className="muted mt-2" style={{ fontSize: "12.5px", maxWidth: "760px" }}>
          Each card is one provider&apos;s view. Methodology first, then the verbatim finding.
          Ratings are never normalized or combined.
        </p>
        <div className={`${styles.spreadNote} mt-3`}>
          <CoverageBar count={cc} />
          <span>
            <b style={{ color: "var(--cov-covered)", fontWeight: 700 }}>{cc.covered}</b> covered
          </span>
          <span className="sep">·</span>
          <span>
            <b style={{ color: "var(--cov-partial)", fontWeight: 700 }}>{cc.partial}</b> partial
          </span>
          <span className="sep">·</span>
          <span>
            <b style={{ fontWeight: 700 }}>{cc.none}</b> not yet covered
          </span>
          {cc.covered > 0 && cc.none > 0 ? (
            <span className="faint">— compare the verdicts below; OpenRisk takes no side</span>
          ) : null}
        </div>
        <div className={`${styles.feedGrid} mt-4`}>
          {cells.map(({ feed, cell }) => (
            <FeedCard key={feed.id} feed={feed} cell={cell} />
          ))}
        </div>
        {gaps.length ? (
          <div className={`${styles.gapsStrip} mt-4`}>
            Not yet covered by <b>{gaps.map((g) => g.feed.name).join(", ")}</b>. Coverage gaps are
            data — each cell above records where the absence was verified.
          </div>
        ) : null}
      </div>

      {/* audit history */}
      <div className="mt-8">
        <h2 className="section-h">Audit history</h2>
        <div className="gov-card mt-4">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Firm</th>
                <th>Date</th>
                <th className="right">Report</th>
              </tr>
            </thead>
            <tbody>
              {protoAudits.length === 0 ? (
                <tr>
                  <td colSpan={3} className="faint" style={{ padding: "20px 14px" }}>
                    No audits recorded.
                  </td>
                </tr>
              ) : (
                protoAudits.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{a.firm}</td>
                    <td className="tnum muted">{a.date}</td>
                    <td className="right">
                      <a href={a.url} target="_blank" rel="noopener">
                        View →
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* incident history */}
      <div className="mt-8">
        <h2 className="section-h">Incident history</h2>
        {protoIncidents.length === 0 ? (
          <div className={`${styles.gapsStrip} mt-4 faint`}>No known incidents on record.</div>
        ) : (
          <div className="gov-card mt-4">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {protoIncidents.map((inc, i) => (
                  <tr key={i}>
                    <td className="tnum muted" style={{ width: "14%", verticalAlign: "top" }}>
                      {inc.date}
                    </td>
                    <td>
                      <a
                        href={inc.url}
                        target="_blank"
                        rel="noopener"
                        style={{ fontWeight: 500 }}
                      >
                        {inc.title}
                      </a>
                      <div className="muted mt-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}>
                        {inc.summary}
                      </div>
                    </td>
                    <td style={{ width: "14%", verticalAlign: "top" }}>
                      {inc.severity ? (
                        <span className="row gap-2 wrap" style={{ alignItems: "center" }}>
                          <span className="cat-chip">{inc.severity}</span>
                          <span className="faint" style={{ fontSize: "11px" }}>
                            (per source)
                          </span>
                        </span>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr className="hr mt-8" />
      <p className="muted mt-4" style={{ fontSize: "13px" }}>
        See something wrong? This data is open source.{" "}
        <a href="https://github.com/maxsam4/OpenRisk" target="_blank" rel="noopener">
          Submit a correction on GitHub →
        </a>
      </p>
    </div>
  );
}
