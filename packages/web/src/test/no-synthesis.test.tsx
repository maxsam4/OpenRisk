import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// SummaryMatrix calls useRouter() — mock next/navigation for the jsdom env.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { SummaryMatrix } from "../components/SummaryMatrix";
import { getDataset, getTvlSnapshot } from "../lib/data";
import { computeDataStatus } from "../lib/coverage";

describe("no-synthesis UI guard", () => {
  it("renders no composite score / rank / sort-by-score control", () => {
    const { protocols, feeds, ratings, governance } = getDataset();
    const tvlSnapshot = getTvlSnapshot();
    const dataStatus = computeDataStatus(ratings, tvlSnapshot.asOf, {
      protocols: protocols.length,
      feeds: feeds.length,
    });
    const { container } = render(
      <SummaryMatrix
        protocols={protocols}
        feeds={feeds}
        ratings={ratings}
        governance={governance}
        tvlSnapshot={tvlSnapshot}
        dataStatus={dataStatus}
      />,
    );
    const text = (container.textContent ?? "").toLowerCase();
    // The UI legitimately contains "covered"/"coverage", a "not a score" density
    // bar, and the neutrality disclaimer ("no composite scores, no ranking") — so
    // assert specifically against synthesis *affordances*, not the disclaimer.
    // The disclaimer is verbatim copy, so confirm it's present rather than banned.
    expect(text).toContain("no composite scores, no ranking");
    // Banned: any phrasing that asserts a synthesized verdict/order as a feature.
    expect(text).not.toMatch(
      /overall score|risk score|aggregate score|safety score|composite rating|rank #|ranked #|sort by score|sort by rank/,
    );
    expect(container.querySelector("[data-score]")).toBeNull();
    expect(container.querySelector("[data-rank]")).toBeNull();
    expect(text).not.toMatch(/sort by score/);
  });

  it("renders feed columns in displayOrder", () => {
    const { protocols, feeds, ratings, governance } = getDataset();
    const tvlSnapshot = getTvlSnapshot();
    const dataStatus = computeDataStatus(ratings, tvlSnapshot.asOf, {
      protocols: protocols.length,
      feeds: feeds.length,
    });
    const { container } = render(
      <SummaryMatrix
        protocols={protocols}
        feeds={feeds}
        ratings={ratings}
        governance={governance}
        tvlSnapshot={tvlSnapshot}
        dataStatus={dataStatus}
      />,
    );
    const headerCells = Array.from(container.querySelectorAll("thead th.feedcol")).map(
      (th) => th.textContent?.trim() ?? "",
    );
    const expected = [...feeds]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((f) => f.name);
    expect(headerCells).toEqual(expected);
  });
});
