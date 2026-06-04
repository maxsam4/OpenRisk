import type { CSSProperties } from "react";

// Renders one of three FIRST-CLASS states. Never a blank.
const map: Record<string, { cls: string; label: string }> = {
  covered: { cls: "cov-covered", label: "Covered" },
  partial: { cls: "cov-partial", label: "Partial" },
  "not-yet-covered": { cls: "cov-none", label: "Not yet covered" },
};

export function CoverageBadge({ coverage, size }: { coverage: string; size?: "lg" }) {
  const m = map[coverage] ?? map["not-yet-covered"]!;
  const style: CSSProperties | undefined = size === "lg" ? { fontSize: "13px" } : undefined;
  return (
    <span className={"cov " + m.cls} style={style}>
      <span className="dot"></span>
      {m.label}
    </span>
  );
}
