import type { Feed, RatingCell } from "@dra/core";
import { CoverageBadge } from "./CoverageBadge";
import { StaleFlag } from "./StaleFlag";
import { ProvenanceTag } from "./ProvenanceTag";
import styles from "./FeedCard.module.css";

// One provider's view of a protocol. Methodology one-liner → verbatim rating
// (+ source-native dimensions) → coverageScope (partial) / checked-here (none)
// → provenance footer with stale flag.
export function FeedCard({ feed, cell }: { feed: Feed; cell: RatingCell | null }) {
  const coverage = cell ? cell.coverage : "not-yet-covered";
  const rating = cell && cell.rating;
  const dims = rating && rating.dimensions;
  const status = cell?.provenance?.sourceStatus;

  return (
    <div className={styles.feedcard} data-coverage={coverage}>
      <div className="row between" style={{ alignItems: "flex-start", gap: "12px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px" }}>{feed.name}</div>
        <CoverageBadge coverage={coverage} />
      </div>

      <p className={styles.feedFocus}>{feed.focus}</p>

      {coverage === "not-yet-covered" ? (
        <div className={styles.feedBody}>
          <div className="muted" style={{ fontSize: "13px" }}>
            No assessment published.
          </div>
          {cell && cell.coverageNote ? (
            <div className="faint mt-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}>
              {cell.coverageNote}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.feedBody}>
          {rating && rating.verbatim && !dims ? (
            <div className={styles.verbatimLine}>
              <span className="faint">Rating&nbsp;</span>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>{rating.verbatim}</span>
            </div>
          ) : null}

          {dims ? (
            <div className={styles.dims}>
              {dims.map((d) => (
                <div className={styles.dimRow} key={d.label}>
                  <span className="muted">{d.label}</span>
                  <span style={{ fontWeight: 700 }}>{d.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {cell && cell.coverageNote ? (
            <div className="faint mt-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}>
              {cell.coverageNote}
            </div>
          ) : null}

          {coverage === "partial" && cell && cell.coverageScope ? (
            <div className={styles.scopeNote}>
              <span className="cov-partial" style={{ fontWeight: 700 }}>
                Scope
              </span>
              &nbsp;{cell.coverageScope}
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.feedFoot}>
        {rating && rating.sourceUrl ? (
          <a className="ghost-link" href={rating.sourceUrl} target="_blank" rel="noopener">
            View assessment →
          </a>
        ) : (
          <a
            className="ghost-link"
            href={cell ? cell.provenance.checkedUrl : feed.url}
            target="_blank"
            rel="noopener"
          >
            Checked here →
          </a>
        )}
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <StaleFlag status={status} />
          <ProvenanceTag tag={feed.access === "auto" ? "feed" : "curated"} />
          <span className="faint tnum" style={{ fontSize: "11.5px" }}>
            {cell ? cell.provenance.lastChecked : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
