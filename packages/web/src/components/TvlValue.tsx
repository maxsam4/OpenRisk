"use client";
import { useEffect, useState } from "react";
import { fmtTvl } from "../lib/format";
import { fetchTvlSum } from "../lib/tvl";

// Build-time snapshot rendered immediately with a grey pip; on mount we live-fetch
// from DefiLlama and, on success, set the value + green "live" pip. If the fetch
// fails, the snapshot stands — never a bare dash.
export function TvlValue({
  slugs,
  snapshot,
  asOf,
  size,
}: {
  slugs: string[];
  snapshot: number | undefined;
  asOf: string;
  size?: "lg";
}) {
  const [val, setVal] = useState<number | undefined>(snapshot);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchTvlSum(slugs).then((sum) => {
      if (!alive || sum == null) return;
      setVal(sum);
      setLive(true);
    });
    return () => {
      alive = false;
    };
  }, [slugs]);
  const big = size === "lg";
  return (
    <span className="tnum" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontWeight: 700, fontSize: big ? "22px" : "14px", color: "var(--text)" }}>
        {fmtTvl(val ?? null)}
      </span>
      <span
        title={live ? "Live — DefiLlama" : "Snapshot " + (asOf ? asOf.slice(0, 10) : "")}
        style={{
          width: big ? "7px" : "6px",
          height: big ? "7px" : "6px",
          borderRadius: "50%",
          background: live ? "var(--cov-covered)" : "var(--text-3)",
          boxShadow: live
            ? "0 0 0 3px color-mix(in srgb, var(--cov-covered) 22%, transparent)"
            : "none",
          transition: "all .3s",
        }}
      ></span>
    </span>
  );
}
