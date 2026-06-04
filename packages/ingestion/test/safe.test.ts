import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSafeConfig } from "../src/safe/fetchSafe.js";
import {
  updateGovernanceSuccess,
  updateGovernanceFailure,
  governanceTracksSafe,
  readSafeTarget,
} from "../src/safe/updateGovernance.js";
import fixture from "./fixtures/safe-aave.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DATA = join(__dirname, "../../../data"); // read-only source of truth
// Real Aave Protocol Guardian Safe (chainId 1).
const ADDR = "0x2CFe3ec4d5a6811f4B8067F0DE7e47DfA938Aa30";

describe("fetchSafeConfig", () => {
  it("maps a Safe API response to {threshold, owners}", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    const cfg = await fetchSafeConfig({ address: ADDR, chainId: 1, fetchFn });
    expect(cfg.threshold).toBe(fixture.threshold); // 4
    expect(cfg.owners.length).toBe(fixture.owners.length); // 7
  });

  it("targets the new api.safe.global/tx-service/eth base", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    await fetchSafeConfig({ address: ADDR, chainId: 1, fetchFn });
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toBe(`https://api.safe.global/tx-service/eth/api/v1/safes/${ADDR}/`);
  });

  it("rejects a malformed (truncated) address before fetching", async () => {
    await expect(fetchSafeConfig({ address: "0x2cc1", chainId: 1 })).rejects.toThrow(/address/i);
  });

  it("throws on an unsupported chainId", async () => {
    await expect(fetchSafeConfig({ address: ADDR, chainId: 999999 })).rejects.toThrow(/chainid/i);
  });

  it("throws on a failed fetch (loud, never silent)", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(fetchSafeConfig({ address: ADDR, chainId: 1, fetchFn })).rejects.toThrow(
      /safe.*502/i,
    );
  });

  it("throws on a shape change (no numeric threshold / no owners array)", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ foo: "bar" }) });
    await expect(fetchSafeConfig({ address: ADDR, chainId: 1, fetchFn })).rejects.toThrow(
      /shape changed/i,
    );
  });
});

describe("updateGovernance (against a temp copy of data/)", () => {
  let dataRoot: string;
  const NOW = new Date("2026-06-04T12:00:00.000Z");

  beforeEach(() => {
    // Copy the committed governance files into a throwaway temp dir so tests never
    // mutate the real data/ layer.
    const tmp = mkdtempSync(join(tmpdir(), "dra-gov-"));
    dataRoot = tmp;
    mkdirSync(join(tmp, "governance"), { recursive: true });
    cpSync(join(REPO_DATA, "governance"), join(tmp, "governance"), { recursive: true });
  });

  it("detects which protocols track a Safe", () => {
    expect(governanceTracksSafe(dataRoot, "aave")).toBe(true);
    expect(governanceTracksSafe(dataRoot, "lido")).toBe(true);
    expect(governanceTracksSafe(dataRoot, "morpho")).toBe(true);
    expect(governanceTracksSafe(dataRoot, "spark")).toBe(false); // no safe block
    expect(governanceTracksSafe(dataRoot, "uniswap")).toBe(false); // safeApiStatus n/a
  });

  it("reads the Safe target {address, chainId}", () => {
    expect(readSafeTarget(dataRoot, "aave")).toEqual({ address: ADDR, chainId: 1 });
    expect(readSafeTarget(dataRoot, "uniswap")).toBeUndefined();
  });

  it("updates threshold + admin-multisig by key and recomputes summary, preserving the note", () => {
    const path = join(dataRoot, "governance", "aave.yaml");
    updateGovernanceSuccess({
      dataRoot,
      protocolId: "aave",
      config: { threshold: fixture.threshold, owners: fixture.owners },
      now: NOW,
    });
    const out = readFileSync(path, "utf8");
    // threshold item value "<m> / <n>"
    expect(out).toContain("value: \"4 / 7\"");
    // summary recomputed, curated "· 1d" note preserved
    expect(out).toContain("summary: \"4/7 · 1d\"");
    expect(out).toContain("safeApiStatus: ok");
    expect(out).toContain("lastSuccessfulFetchAt: 2026-06-04T12:00:00.000Z");
    // The second (un-keyed) Governance Guardian "5 / 9" row is untouched.
    expect(out).toContain("value: \"5 / 9\"");
  });

  it("is idempotent: a re-run with identical inputs (matching curated state) yields no diff", () => {
    const path = join(dataRoot, "governance", "morpho.yaml");
    const before = readFileSync(path, "utf8");
    // morpho is seeded as 5/9 with the curated "· immutable core" summary note.
    const config = { threshold: 5, owners: new Array(9).fill("0x0") };
    // Freeze provenance to the file's existing lastChecked so timestamps don't drift.
    // Use the committed values; success stamps fresh timestamps, so to assert true
    // byte-idempotency we compare two consecutive runs with the same NOW.
    updateGovernanceSuccess({ dataRoot, protocolId: "morpho", config, now: NOW });
    const first = readFileSync(path, "utf8");
    updateGovernanceSuccess({ dataRoot, protocolId: "morpho", config, now: NOW });
    const second = readFileSync(path, "utf8");
    expect(second).toBe(first); // two runs, same inputs → byte-identical
    // And the threshold/summary reflect the Safe config.
    expect(first).toContain("value: \"5 / 9\"");
    expect(first).toContain("summary: \"5/9 · immutable core\"");
    expect(before).toContain("summary: \"5/9 · immutable core\""); // sanity
  });

  it("on failure sets safeApiStatus=failed without overwriting curated values", () => {
    const path = join(dataRoot, "governance", "aave.yaml");
    const before = readFileSync(path, "utf8");
    updateGovernanceFailure({ dataRoot, protocolId: "aave", now: NOW });
    const out = readFileSync(path, "utf8");
    expect(out).toContain("safeApiStatus: failed");
    expect(out).toContain("lastAttemptedFetchAt: 2026-06-04T12:00:00.000Z");
    // Curated threshold value + summary are NOT overwritten.
    expect(out).toContain("value: \"4 / 7\"");
    // The admin-multisig address is unchanged from the curated file.
    const adminBefore = before.match(/Protocol Guardian[\s\S]*?value: "([^"]+)"/)?.[1];
    expect(out).toContain(`value: "${adminBefore}"`);
  });

  it("skips protocols with no safe block / n/a status", () => {
    const uniPath = join(dataRoot, "governance", "uniswap.yaml");
    const before = readFileSync(uniPath, "utf8");
    updateGovernanceSuccess({
      dataRoot,
      protocolId: "uniswap",
      config: { threshold: 4, owners: ["a", "b"] },
      now: NOW,
    });
    updateGovernanceFailure({ dataRoot, protocolId: "uniswap", now: NOW });
    expect(readFileSync(uniPath, "utf8")).toBe(before); // untouched
  });
});

describe("writeCell (rating provenance, temp copy)", () => {
  // Sanity-check the rating writer here too (shares the same serialize/idempotency contract).
  let dataRoot: string;
  const NOW = new Date("2026-06-04T12:00:00.000Z");

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "dra-rat-"));
    dataRoot = tmp;
    mkdirSync(join(tmp, "ratings"), { recursive: true });
    cpSync(join(REPO_DATA, "ratings"), join(tmp, "ratings"), { recursive: true });
  });

  it("stamps a successful fetch (method auto, sourceStatus ok, fresh timestamps)", async () => {
    const { writeCellSuccess } = await import("../src/writeCell.js");
    const path = join(dataRoot, "ratings", "aave", "defiscan.yaml");
    writeCellSuccess({
      dataRoot,
      protocolId: "aave",
      feedId: "defiscan",
      cell: {
        coverage: "covered",
        rating: {
          verbatim: "Stage 0",
          sourceUrl: "https://www.defiscan.info/protocols/aave/ethereum",
        },
      },
      now: NOW,
    });
    const out = readFileSync(path, "utf8");
    expect(out).toContain("method: auto");
    expect(out).toContain("sourceStatus: ok");
    expect(out).toContain("lastSuccessfulFetchAt: 2026-06-04T12:00:00.000Z");
    expect(out).toContain("verbatim: \"Stage 0\"");
    expect(out).toContain("curator: \"openrisk\""); // preserved (curated, untouched)
  });

  it("on failure flags fetch-error without touching coverage/rating", async () => {
    const { writeCellFailure } = await import("../src/writeCell.js");
    const path = join(dataRoot, "ratings", "aave", "defiscan.yaml");
    const before = readFileSync(path, "utf8");
    writeCellFailure({ dataRoot, protocolId: "aave", feedId: "defiscan", now: NOW });
    const out = readFileSync(path, "utf8");
    expect(out).toContain("sourceStatus: fetch-error");
    expect(out).toContain("lastAttemptedFetchAt: 2026-06-04T12:00:00.000Z");
    expect(out).toContain("coverage: covered"); // unchanged
    expect(out).toContain(before.match(/verbatim: "([^"]+)"/)?.[0] ?? "MISSING");
  });
});
