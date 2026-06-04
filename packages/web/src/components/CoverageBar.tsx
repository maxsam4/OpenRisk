import type { CoverageCount } from "../lib/coverage";
import styles from "./CoverageBar.module.css";

// Proportional fill bar (covered + partial as fractions of all feeds). Scales to
// dozens of feeds. A density read-out, NOT a score: it shows how much of the
// registry has assessed this protocol — nothing is weighted or ranked.
export function CoverageBar({ count }: { count: CoverageCount }) {
  const total = count.total || 1;
  const covPct = (count.covered / total) * 100;
  const partPct = (count.partial / total) * 100;
  return (
    <span
      className={styles.covbar}
      role="img"
      aria-label={
        count.covered +
        " of " +
        total +
        " feeds covered, " +
        count.partial +
        " partial, " +
        count.none +
        " not yet covered"
      }
    >
      <span className={styles.covbarTrack}>
        {covPct > 0 ? (
          <span
            className={`${styles.covbarFill} ${styles.covbarCov}`}
            style={{ width: covPct + "%" }}
            title={count.covered + " covered"}
          ></span>
        ) : null}
        {partPct > 0 ? (
          <span
            className={`${styles.covbarFill} ${styles.covbarPart}`}
            style={{ width: partPct + "%" }}
            title={count.partial + " partial"}
          ></span>
        ) : null}
      </span>
    </span>
  );
}
