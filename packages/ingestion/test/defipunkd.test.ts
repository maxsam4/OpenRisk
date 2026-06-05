import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeDefipunkdAdapter, parseDefipunkd } from "../src/adapters/defipunkd.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, "fixtures/defipunkd-aave.html"), "utf8");

describe("defipunkd adapter", () => {
  it("maps a successful response to a covered cell with the verbatim tier + 5 dimensions", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => fixture });
    const adapter = makeDefipunkdAdapter({ fetchFn: fetchFn as unknown as typeof fetch });
    const cell = await adapter.fetchCell("aave");
    expect(cell.coverage).toBe("covered");
    expect(cell.rating?.verbatim).toBe("Silver tier · Weak AI consensus on all dimensions");
    expect(cell.rating?.sourceUrl).toContain("defipunkd.com/protocol/aave");
    expect(cell.rating?.dimensions).toEqual([
      { label: "Control", value: "tentative orange" },
      { label: "Ability to Exit", value: "tentative red" },
      { label: "Autonomy", value: "tentative orange" },
      { label: "Open Access", value: "tentative orange" },
      { label: "Verifiability", value: "tentative green" },
    ]);
  });

  it("throws on a failed fetch instead of returning empty/covered", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const adapter = makeDefipunkdAdapter({ fetchFn: fetchFn as unknown as typeof fetch });
    await expect(adapter.fetchCell("aave")).rejects.toThrow(/defipunkd.*503/i);
  });

  it("maps a rated-but-empty page to not-yet-covered (a gap, not a fetch error)", async () => {
    // 200 page with no tier medal and no dimension slices → protocol not rated yet.
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => "<html><body>no rating here</body></html>" });
    const adapter = makeDefipunkdAdapter({ fetchFn: fetchFn as unknown as typeof fetch });
    const cell = await adapter.fetchCell("lido");
    expect(cell.coverage).toBe("not-yet-covered");
    expect(cell.rating).toBeNull();
  });

  it("throws (loud) on a genuine shape change — slices present but no tier", async () => {
    const broken =
      '<a href="#x-verifiability" data-pizza-slice="verifiability"> <path> <title>Verifiability — tentative green</title> </path> </a>';
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => broken });
    const adapter = makeDefipunkdAdapter({ fetchFn: fetchFn as unknown as typeof fetch });
    await expect(adapter.fetchCell("aave")).rejects.toThrow(/shape changed/i);
  });

  it("parseDefipunkd throws when a dimension slice is missing", () => {
    // tier present, but only one slice → missing dimensions must fail loudly
    const partial =
      '<svg role="img" aria-label="Bronze tier · AI consensus on at least one dimension"></svg>' +
      '<a href="#x-verifiability" data-pizza-slice="verifiability"> <path> <title>Verifiability — tentative green</title> </path> </a>';
    expect(() => parseDefipunkd(partial)).toThrow(/missing .* dimension/i);
  });
});
