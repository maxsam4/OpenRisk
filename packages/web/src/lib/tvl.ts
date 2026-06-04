// Client-side live TVL fetch. Sums each protocol's DefiLlama slugs. On any
// failure returns null so the build-time snapshot stands (never a bare dash).
export async function fetchTvlSum(slugs: string[]): Promise<number | null> {
  try {
    let sum = 0;
    for (const slug of slugs) {
      const res = await fetch(`https://api.llama.fi/tvl/${slug}`, { cache: "no-store" });
      if (!res.ok) return null;
      const v: unknown = await res.json();
      if (typeof v !== "number") return null;
      sum += v;
    }
    return sum;
  } catch {
    return null;
  }
}
