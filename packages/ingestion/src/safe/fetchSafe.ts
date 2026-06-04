// fetchSafe.ts — Safe Transaction API (plain HTTPS; no RPC/viem).
//
// NOTE: the old per-network host `https://safe-transaction-mainnet.safe.global`
// now 308-redirects to the consolidated `api.safe.global/tx-service/<network>`.
// We target the new base directly so we never depend on redirect-following.
const BASE: Record<number, string> = {
  1: "https://api.safe.global/tx-service/eth", // Ethereum mainnet (add chainIds here as needed)
};

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export interface SafeConfig {
  threshold: number;
  owners: string[];
}

interface Args {
  address: string;
  chainId: number;
  fetchFn?: typeof fetch;
}

export async function fetchSafeConfig({
  address,
  chainId,
  fetchFn = fetch,
}: Args): Promise<SafeConfig> {
  // Pre-flight: reject a malformed/truncated address BEFORE hitting the network.
  if (!ADDR_RE.test(address)) {
    throw new Error(`Safe: malformed address ${address}`);
  }
  const base = BASE[chainId];
  if (!base) {
    throw new Error(`Safe: unsupported chainId ${chainId}`);
  }
  const res = await fetchFn(`${base}/api/v1/safes/${address}/`);
  if (!("ok" in res) || !res.ok) {
    const status = "status" in res ? res.status : "?";
    throw new Error(`safe fetch failed for ${address}: ${status}`);
  }
  const data = await res.json();
  // Loud shape-change guard: a redirect/HTML page or a renamed field must throw,
  // not silently produce a half-filled config.
  if (typeof data?.threshold !== "number" || !Array.isArray(data?.owners)) {
    throw new Error(`safe response shape changed for ${address}`);
  }
  return { threshold: data.threshold as number, owners: data.owners as string[] };
}
