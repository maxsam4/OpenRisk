import type { RatingCell } from "@dra/core";
import styles from "./Matrix.module.css";

// Shows a peek of the verbatim rating where it exists, else a dot/dash.
// Short verbatim labels (Stage 0, grades) render as text; otherwise a dot.
export function MatrixCell({ cell }: { cell: RatingCell | null }) {
  if (!cell || cell.coverage === "not-yet-covered") {
    return (
      <span className={`${styles.gly} none`} title="Not yet covered">
        —
      </span>
    );
  }
  const v = cell.rating && cell.rating.verbatim ? cell.rating.verbatim : "";
  const isShort = !!v && v.length <= 9 && !/dimension/i.test(v);
  if (cell.coverage === "partial") {
    if (isShort)
      return (
        <span className={`${styles.gly} partial`} title={"Partial · " + v}>
          <span className="lbl-amber">{v}</span>
        </span>
      );
    return (
      <span className={`${styles.gly} partial`} title={"Partial · " + v}>
        <span className="dot"></span>
      </span>
    );
  }
  if (isShort)
    return (
      <span className={`${styles.gly} covered`} title={v}>
        <span className="lbl">{v}</span>
      </span>
    );
  return (
    <span className={`${styles.gly} covered`} title={v}>
      <span className="dot"></span>
    </span>
  );
}
