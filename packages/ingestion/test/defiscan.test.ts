import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { makeDefiscanAdapter } from "../src/adapters/defiscan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Real recorded Aave review markdown (frontmatter has `stage: 0`).
const fixture = readFileSync(join(__dirname, "fixtures/defiscan-aave.md"), "utf8");

describe("defiscan adapter", () => {
  it("maps a successful response to a covered cell with verbatim label", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => fixture });
    const adapter = makeDefiscanAdapter({ fetchFn });
    const cell = await adapter.fetchCell("aave");
    expect(cell.coverage).toBe("covered");
    expect(cell.rating?.verbatim).toBe("Stage 0"); // verbatim, unmodified, matches fixture
    expect(cell.rating?.sourceUrl).toContain("aave");
    expect(cell.rating?.sourceUrl).toBe("https://www.defiscan.info/protocols/aave/ethereum");
  });

  it("fetches the raw markdown for the mapped DeFiScan id", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => fixture });
    const adapter = makeDefiscanAdapter({ fetchFn });
    // uniswap → uniswap-v3 in the DeFiScan content repo.
    await adapter.fetchCell("uniswap");
    const requested = fetchFn.mock.calls[0]?.[0] as string;
    expect(requested).toContain("/protocols/uniswap-v3/ethereum.md");
  });

  it("supports the five POC protocol ids only", () => {
    const adapter = makeDefiscanAdapter();
    for (const id of ["aave", "spark", "morpho", "uniswap", "lido"]) {
      expect(adapter.supports(id)).toBe(true);
    }
    expect(adapter.supports("compound")).toBe(false);
  });

  it("throws on a failed fetch instead of returning empty/covered", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const adapter = makeDefiscanAdapter({ fetchFn });
    await expect(adapter.fetchCell("aave")).rejects.toThrow(/defiscan.*503/i);
  });

  it("throws when the frontmatter is missing/garbled (shape change)", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => "# Aave\n\nno frontmatter here" });
    const adapter = makeDefiscanAdapter({ fetchFn });
    await expect(adapter.fetchCell("aave")).rejects.toThrow(/frontmatter/i);
  });

  it("throws when frontmatter has no `stage:` field (shape change)", async () => {
    const garbled = "---\nchain: \"Ethereum\"\nrisks: []\n---\n\n# Summary\n";
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => garbled });
    const adapter = makeDefiscanAdapter({ fetchFn });
    await expect(adapter.fetchCell("aave")).rejects.toThrow(/stage/i);
  });
});
