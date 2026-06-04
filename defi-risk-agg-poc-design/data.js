/* ============================================================
   OpenRisk — mock dataset (POC scope: 5 protocols × 4 feeds)
   Shapes mirror packages/core Zod types in the spec.
   Exposed as window.DATA for the client prototype.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- FEEDS (registry) ---------------- */
  const feeds = [
    {
      id: "defiscan", name: "DeFiScan", type: "Rating", access: "auto",
      focus: "Decentralization maturity framework assessing who controls the keys, upgrades, and admin powers.",
      url: "https://defiscan.info", conflicts: null,
    },
    {
      id: "blockanalitica", name: "BlockAnalitica", type: "Dashboard", access: "manual",
      focus: "Quantitative on-chain risk dashboards for lending markets, tracking liquidations, collateral health, and market exposure.",
      url: "https://blockanalitica.com", conflicts: null,
    },
    {
      id: "llamarisk", name: "LlamaRisk", type: "Research", access: "manual",
      focus: "Per-asset and per-protocol deep-dive risk research with governance proposal analysis.",
      url: "https://llamarisk.com",
      conflicts: "Independent risk service provider funded in part by Aave DAO grants.",
    },
    {
      id: "defipunkd", name: "DeFiPunk'd", type: "Rating", access: "manual",
      focus: "Multi-dimension risk registry assessing Control, Ability to Exit, Autonomy, Open Access, and Verifiability.",
      url: "https://defipunkd.xyz", conflicts: null,
    },
  ];

  /* ---------------- PROTOCOLS ---------------- */
  const protocols = [
    {
      id: "lido", name: "Lido", category: "Liquid_Staking",
      chain: "Ethereum", site: "lido.fi",
      links: { website: "https://lido.fi", docs: "https://docs.lido.fi", github: "https://github.com/lidofinance" },
      defillamaSlugs: ["lido"],
      blurb: "Largest liquid-staking protocol: stake ETH, receive stETH while keeping liquidity. stETH is a rebasing token widely used as collateral across DeFi.",
      tvlSnapshot: 21_200_000_000, tvlAsOf: "2026-06-03T22:00:00Z",
    },
    {
      id: "aave", name: "Aave", category: "Lending", family: "aave",
      versions: ["v3", "v4"],
      chain: "Ethereum + 11 chains", site: "aave.com",
      links: { website: "https://aave.com", docs: "https://docs.aave.com", github: "https://github.com/aave" },
      defillamaSlugs: ["aave-v3", "aave-v2"],
      blurb: "Leading lending protocol. v3 runs cross-chain isolated markets; v4 introduces a unified liquidity hub. Long audit history, mature governance.",
      tvlSnapshot: 14_600_000_000, tvlAsOf: "2026-06-03T22:00:00Z",
    },
    {
      id: "morpho", name: "Morpho", category: "Lending", family: "morpho",
      versions: ["Blue", "Vaults"],
      chain: "Ethereum + Base", site: "morpho.org",
      links: { website: "https://morpho.org", docs: "https://docs.morpho.org", github: "https://github.com/morpho-org" },
      defillamaSlugs: ["morpho-blue"],
      blurb: "Minimal, immutable lending primitive (Morpho Blue) plus curated MetaMorpho vaults that allocate across markets. Risk is largely externalized to curators.",
      tvlSnapshot: 7_400_000_000, tvlAsOf: "2026-06-03T22:00:00Z",
    },
    {
      id: "spark", name: "Spark", category: "Lending",
      chain: "Ethereum", site: "spark.fi",
      links: { website: "https://spark.fi", docs: "https://docs.spark.fi", github: "https://github.com/marsfoundation" },
      defillamaSlugs: ["spark"],
      blurb: "Sky (formerly MakerDAO) sub-protocol for borrowing and saving, deeply integrated with USDS and the Sky governance stack.",
      tvlSnapshot: 5_500_000_000, tvlAsOf: "2026-06-03T22:00:00Z",
    },
    {
      id: "uniswap", name: "Uniswap", category: "DEX_AMM", family: "uniswap",
      versions: ["v3", "v4", "UniswapX"],
      chain: "Ethereum + 20 chains", site: "uniswap.org",
      links: { website: "https://uniswap.org", docs: "https://docs.uniswap.org", github: "https://github.com/Uniswap" },
      defillamaSlugs: ["uniswap-v3", "uniswap-v2"],
      blurb: "Dominant AMM DEX. v4 adds hooks and a singleton architecture; UniswapX routes intents off-chain. Different risk profile from lending — no liquidations.",
      tvlSnapshot: 1_800_000_000, tvlAsOf: "2026-06-03T22:00:00Z",
    },
  ];

  /* ---------------- helper to build provenance ---------------- */
  function prov(method, opts) {
    return Object.assign({
      method,                       // "auto" | "manual"
      checkedUrl: opts.checkedUrl || opts.sourceUrl || "",
      lastChecked: opts.lastChecked || "2026-06-02",
      lastAttemptedFetchAt: opts.lastAttemptedFetchAt || null,
      lastSuccessfulFetchAt: opts.lastSuccessfulFetchAt || null,
      curator: opts.curator || (method === "auto" ? "ingestion-bot" : "@cpstl"),
      sourceStatus: opts.sourceStatus || "ok",   // ok | stale | fetch-error
    }, {});
  }

  /* ---------------- RATING CELLS (5 × 4 = 20) ----------------
     Deliberately patchy: covered / partial / not-yet-covered. */
  const ratings = [
    /* ===== Lido ===== */
    { protocolId: "lido", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 0", sourceUrl: "https://defiscan.info/protocol/lido" },
      coverageNote: "Decentralization stage rating. Operator set and oracle quorum cited as centralization vectors.",
      provenance: prov("auto", { sourceUrl: "https://defiscan.info/protocol/lido", lastChecked: "2026-06-02", lastAttemptedFetchAt: "2026-06-02T06:00:00Z", lastSuccessfulFetchAt: "2026-06-02T06:00:00Z" }) },
    { protocolId: "lido", feedId: "blockanalitica", coverage: "not-yet-covered",
      rating: null,
      provenance: prov("manual", { checkedUrl: "https://blockanalitica.com", lastChecked: "2026-05-28" }),
      coverageNote: "BlockAnalitica scope is lending-market collateral health; liquid-staking protocols are not modeled." },
    { protocolId: "lido", feedId: "llamarisk", coverage: "partial",
      rating: { verbatim: "stETH assessed as collateral asset — moderate, well-collateralized de-peg risk", sourceUrl: "https://llamarisk.com/research/steth" },
      coverageScope: "Covers stETH only as a collateral asset within other protocols. No full liquid-staking-protocol review of Lido itself.",
      coverageNote: "Analysis published in the context of stETH usage as Aave collateral.",
      provenance: prov("manual", { sourceUrl: "https://llamarisk.com/research/steth", lastChecked: "2026-05-30" }) },
    { protocolId: "lido", feedId: "defipunkd", coverage: "not-yet-covered",
      rating: null,
      provenance: prov("manual", { checkedUrl: "https://defipunkd.xyz/registry", lastChecked: "2026-05-25" }),
      coverageNote: "Not present in the DeFiPunk'd registry as of last check." },

    /* ===== Aave ===== */
    { protocolId: "aave", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 0", sourceUrl: "https://defiscan.info/protocol/aave" },
      coverageNote: "Governance can pause and upgrade markets; Guardian holds emergency powers.",
      provenance: prov("auto", { sourceUrl: "https://defiscan.info/protocol/aave", lastChecked: "2026-06-02", lastAttemptedFetchAt: "2026-06-02T06:00:00Z", lastSuccessfulFetchAt: "2026-06-02T06:00:00Z" }) },
    { protocolId: "aave", feedId: "blockanalitica", coverage: "partial",
      rating: { verbatim: "Healthy — utilization within bounds, liquidation buffers adequate", sourceUrl: "https://blockanalitica.com/aave/v3/ethereum" },
      coverageScope: "Covers Aave v3 Ethereum core market only. v4, GHO, and L2 deployments not currently tracked.",
      coverageNote: "Dashboard metrics reflect the Ethereum core market.",
      provenance: prov("manual", { sourceUrl: "https://blockanalitica.com/aave/v3/ethereum", lastChecked: "2026-06-01" }) },
    { protocolId: "aave", feedId: "llamarisk", coverage: "covered",
      rating: { verbatim: "Comprehensive collateral & governance review — no critical findings (2026-Q1)", sourceUrl: "https://llamarisk.com/research/aave-v3" },
      coverageNote: "Per-asset onboarding analyses plus governance-process review.",
      provenance: prov("manual", { sourceUrl: "https://llamarisk.com/research/aave-v3", lastChecked: "2026-05-22" }) },
    { protocolId: "aave", feedId: "defipunkd", coverage: "covered",
      rating: { verbatim: "Assessed across five dimensions",
        dimensions: [
          { label: "Control", value: "Medium" },
          { label: "Ability to Exit", value: "High" },
          { label: "Autonomy", value: "Medium" },
          { label: "Open Access", value: "High" },
          { label: "Verifiability", value: "High" },
        ], sourceUrl: "https://defipunkd.xyz/registry/aave" },
      coverageNote: "Sub-values are the feed's own labels, shown verbatim and never combined.",
      provenance: prov("manual", { sourceUrl: "https://defipunkd.xyz/registry/aave", lastChecked: "2026-05-26" }) },

    /* ===== Morpho ===== */
    { protocolId: "morpho", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 1", sourceUrl: "https://defiscan.info/protocol/morpho" },
      coverageNote: "Morpho Blue core is immutable; vault layer introduces curator trust assumptions.",
      provenance: prov("auto", { sourceUrl: "https://defiscan.info/protocol/morpho", lastChecked: "2026-05-29", lastAttemptedFetchAt: "2026-06-02T06:00:00Z", lastSuccessfulFetchAt: "2026-05-29T06:00:00Z", sourceStatus: "stale" }) },
    { protocolId: "morpho", feedId: "blockanalitica", coverage: "covered",
      rating: { verbatim: "Active monitoring — 0 bad debt across tracked markets", sourceUrl: "https://blockanalitica.com/morpho" },
      coverageNote: "Per-market liquidation and utilization dashboards.",
      provenance: prov("manual", { sourceUrl: "https://blockanalitica.com/morpho", lastChecked: "2026-06-01" }) },
    { protocolId: "morpho", feedId: "llamarisk", coverage: "not-yet-covered",
      rating: null,
      provenance: prov("manual", { checkedUrl: "https://llamarisk.com/research", lastChecked: "2026-05-24" }),
      coverageNote: "No published Morpho-specific report at last check; vault curators assessed individually elsewhere." },
    { protocolId: "morpho", feedId: "defipunkd", coverage: "covered",
      rating: { verbatim: "Assessed across five dimensions",
        dimensions: [
          { label: "Control", value: "High" },
          { label: "Ability to Exit", value: "High" },
          { label: "Autonomy", value: "High" },
          { label: "Open Access", value: "High" },
          { label: "Verifiability", value: "Medium" },
        ], sourceUrl: "https://defipunkd.xyz/registry/morpho" },
      coverageNote: "Immutable core scores well on control/autonomy; vault layer lowers verifiability.",
      provenance: prov("manual", { sourceUrl: "https://defipunkd.xyz/registry/morpho", lastChecked: "2026-05-26" }) },

    /* ===== Spark ===== */
    { protocolId: "spark", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 0", sourceUrl: "https://defiscan.info/protocol/spark" },
      coverageNote: "Inherits Sky governance controls; admin powers held by Sky core.",
      provenance: prov("auto", { sourceUrl: "https://defiscan.info/protocol/spark", lastChecked: "2026-06-02", lastAttemptedFetchAt: "2026-06-02T06:00:00Z", lastSuccessfulFetchAt: "2026-06-02T06:00:00Z" }) },
    { protocolId: "spark", feedId: "blockanalitica", coverage: "covered",
      rating: { verbatim: "Healthy — collateral well-diversified, DSR-backed liquidity", sourceUrl: "https://blockanalitica.com/spark" },
      coverageNote: "Tracks SparkLend markets and savings rate flows.",
      provenance: prov("manual", { sourceUrl: "https://blockanalitica.com/spark", lastChecked: "2026-06-01" }) },
    { protocolId: "spark", feedId: "llamarisk", coverage: "covered",
      rating: { verbatim: "Collateral risk moderate; governance Sky-aligned, RWA exposure flagged for monitoring", sourceUrl: "https://llamarisk.com/research/spark" },
      coverageNote: "RWA backing reviewed as part of the Sky collateral framework.",
      provenance: prov("manual", { sourceUrl: "https://llamarisk.com/research/spark", lastChecked: "2026-05-20" }) },
    { protocolId: "spark", feedId: "defipunkd", coverage: "not-yet-covered",
      rating: null,
      provenance: prov("manual", { checkedUrl: "https://defipunkd.xyz/registry", lastChecked: "2026-05-25" }),
      coverageNote: "Not yet in the registry; Sky/MakerDAO entry exists but Spark is not separately listed." },

    /* ===== Uniswap ===== */
    { protocolId: "uniswap", feedId: "defiscan", coverage: "covered",
      rating: { verbatim: "Stage 2", sourceUrl: "https://defiscan.info/protocol/uniswap" },
      coverageNote: "Core contracts immutable; governance limited to fee switch and front-end. Highest decentralization stage among POC protocols.",
      provenance: prov("auto", { sourceUrl: "https://defiscan.info/protocol/uniswap", lastChecked: "2026-06-02", lastAttemptedFetchAt: "2026-06-02T06:00:00Z", lastSuccessfulFetchAt: "2026-05-21T06:00:00Z", sourceStatus: "fetch-error" }) },
    { protocolId: "uniswap", feedId: "blockanalitica", coverage: "not-yet-covered",
      rating: null,
      provenance: prov("manual", { checkedUrl: "https://blockanalitica.com", lastChecked: "2026-05-28" }),
      coverageNote: "DEX/AMM venues are out of BlockAnalitica's lending-risk scope." },
    { protocolId: "uniswap", feedId: "llamarisk", coverage: "not-yet-covered",
      rating: null,
      provenance: prov("manual", { checkedUrl: "https://llamarisk.com/research", lastChecked: "2026-05-24" }),
      coverageNote: "No published Uniswap report; focus is collateral & lending governance." },
    { protocolId: "uniswap", feedId: "defipunkd", coverage: "covered",
      rating: { verbatim: "Assessed across five dimensions",
        dimensions: [
          { label: "Control", value: "High" },
          { label: "Ability to Exit", value: "High" },
          { label: "Autonomy", value: "High" },
          { label: "Open Access", value: "High" },
          { label: "Verifiability", value: "High" },
        ], sourceUrl: "https://defipunkd.xyz/registry/uniswap" },
      coverageNote: "Immutable singleton core scores high across all five dimensions.",
      provenance: prov("manual", { sourceUrl: "https://defipunkd.xyz/registry/uniswap", lastChecked: "2026-05-26" }) },
  ];

  /* ---------------- GOVERNANCE (one set per protocol) ---------------- */
  const governance = {
    lido: {
      summary: "5/7 · 3d",
      safeApiStatus: "ok",
      items: [
        { label: "Type", value: "DAO + node-operator registry", tag: "onchain", sourceUrl: "https://etherscan.io/address/lido-dao" },
        { label: "Admin multisig", value: "0x3e40…9C8c", link: "https://etherscan.io/address/0x3e40", tag: "onchain", sourceUrl: "https://etherscan.io/address/0x3e40" },
        { label: "Threshold", value: "5 / 7", tag: "onchain", sourceUrl: "https://app.safe.global/lido" },
        { label: "Timelock", value: "3 days", tag: "onchain", sourceUrl: "https://etherscan.io/address/lido-timelock" },
        { label: "Signers known", value: "Yes — published", tag: "curated", sourceUrl: "https://lido.fi/governance" },
        { label: "Pause capability", value: "Yes — withdrawals & deposits", tag: "curated", sourceUrl: "https://docs.lido.fi" },
        { label: "Upgrade capability", value: "Yes — via DAO vote", tag: "curated", sourceUrl: "https://docs.lido.fi" },
      ],
    },
    aave: {
      summary: "5/9 · 2d",
      safeApiStatus: "ok",
      items: [
        { label: "Type", value: "Governor + Guardian", tag: "onchain", sourceUrl: "https://etherscan.io/address/aave-gov" },
        { label: "Admin multisig", value: "0x2cc1…4b21", link: "https://etherscan.io/address/0x2cc1", tag: "onchain", sourceUrl: "https://etherscan.io/address/0x2cc1" },
        { label: "Threshold", value: "5 / 9", tag: "onchain", sourceUrl: "https://app.safe.global/aave" },
        { label: "Timelock", value: "2 days (short executor)", tag: "onchain", sourceUrl: "https://etherscan.io/address/aave-timelock" },
        { label: "Signers known", value: "Yes — published", tag: "curated", sourceUrl: "https://governance.aave.com" },
        { label: "Pause capability", value: "Yes — Guardian emergency pause", tag: "onchain", sourceUrl: "https://docs.aave.com" },
        { label: "Upgrade capability", value: "Yes — per-market via governance", tag: "curated", sourceUrl: "https://docs.aave.com" },
      ],
    },
    morpho: {
      summary: "5/9 · 7d",
      safeApiStatus: "ok",
      items: [
        { label: "Type", value: "Immutable core + DAO (vault layer)", tag: "onchain", sourceUrl: "https://etherscan.io/address/morpho" },
        { label: "Admin multisig", value: "0x9D03…F1aa", link: "https://etherscan.io/address/0x9D03", tag: "onchain", sourceUrl: "https://etherscan.io/address/0x9D03" },
        { label: "Threshold", value: "5 / 9", tag: "onchain", sourceUrl: "https://app.safe.global/morpho" },
        { label: "Timelock", value: "7 days (vault curators)", tag: "onchain", sourceUrl: "https://docs.morpho.org" },
        { label: "Signers known", value: "Partial — curators self-identify", tag: "curated", sourceUrl: "https://docs.morpho.org" },
        { label: "Pause capability", value: "No — core is immutable", tag: "onchain", sourceUrl: "https://docs.morpho.org" },
        { label: "Upgrade capability", value: "No — core immutable; vaults reconfigurable", tag: "onchain", sourceUrl: "https://docs.morpho.org" },
      ],
    },
    spark: {
      summary: "2d",
      safeApiStatus: "ok",
      items: [
        { label: "Type", value: "Sky governance (inherited)", tag: "onchain", sourceUrl: "https://etherscan.io/address/sky-gov" },
        { label: "Admin", value: "Sky Core (SubDAO)", tag: "curated", sourceUrl: "https://sky.money/governance" },
        { label: "Threshold", value: "Sky-controlled", tag: "self-reported", sourceUrl: "https://spark.fi" },
        { label: "Timelock", value: "2 days (GSM pause)", tag: "onchain", sourceUrl: "https://docs.spark.fi" },
        { label: "Signers known", value: "Via Sky governance", tag: "curated", sourceUrl: "https://sky.money/governance" },
        { label: "Pause capability", value: "Yes — Sky emergency module", tag: "onchain", sourceUrl: "https://docs.spark.fi" },
        { label: "Upgrade capability", value: "Yes — via Sky executive vote", tag: "curated", sourceUrl: "https://docs.spark.fi" },
      ],
    },
    uniswap: {
      summary: "2d",
      safeApiStatus: "failed",
      items: [
        { label: "Type", value: "Governor Bravo + Timelock", tag: "onchain", sourceUrl: "https://etherscan.io/address/uniswap-gov" },
        { label: "Admin", value: "No admin keys on core contracts", tag: "onchain", sourceUrl: "https://docs.uniswap.org" },
        { label: "Threshold", value: "Token-vote quorum (40M UNI)", tag: "onchain", sourceUrl: "https://www.tally.xyz/gov/uniswap" },
        { label: "Timelock", value: "2 days", tag: "onchain", sourceUrl: "https://etherscan.io/address/uniswap-timelock" },
        { label: "Signers known", value: "N/A — no admin multisig", tag: "curated", sourceUrl: "https://docs.uniswap.org" },
        { label: "Pause capability", value: "No — core immutable", tag: "onchain", sourceUrl: "https://docs.uniswap.org" },
        { label: "Upgrade capability", value: "Fee switch only (governance)", tag: "curated", sourceUrl: "https://docs.uniswap.org" },
      ],
    },
  };

  /* ---------------- AUDIT HISTORY ---------------- */
  const audits = {
    lido: [
      { firm: "MixBytes", date: "2021-04", url: "https://github.com/lidofinance/audits" },
      { firm: "Quantstamp", date: "2022-05", url: "https://github.com/lidofinance/audits" },
      { firm: "Statemind", date: "2024-09", url: "https://github.com/lidofinance/audits" },
    ],
    aave: [
      { firm: "Trail of Bits", date: "2022-11", url: "https://github.com/aave/aave-v3-core/tree/master/audits" },
      { firm: "OpenZeppelin", date: "2023-01", url: "https://github.com/aave" },
      { firm: "Certora (formal)", date: "2023-01", url: "https://github.com/aave" },
      { firm: "SigmaPrime", date: "2024-06", url: "https://github.com/aave" },
    ],
    morpho: [
      { firm: "Spearbit", date: "2023-12", url: "https://github.com/morpho-org/morpho-blue/tree/main/audits" },
      { firm: "Cantina", date: "2024-02", url: "https://github.com/morpho-org" },
      { firm: "Certora (formal)", date: "2024-02", url: "https://github.com/morpho-org" },
    ],
    spark: [
      { firm: "ChainSecurity", date: "2023-05", url: "https://github.com/marsfoundation/sparklend" },
      { firm: "Cantina", date: "2024-08", url: "https://github.com/marsfoundation" },
    ],
    uniswap: [
      { firm: "Trail of Bits", date: "2023-09", url: "https://github.com/Uniswap/v4-core/tree/main/audits" },
      { firm: "OpenZeppelin", date: "2024-01", url: "https://github.com/Uniswap" },
      { firm: "Certora (formal)", date: "2024-03", url: "https://github.com/Uniswap" },
      { firm: "ABDK", date: "2024-05", url: "https://github.com/Uniswap" },
    ],
  };

  /* ---------------- INCIDENT HISTORY ---------------- */
  const incidents = {
    lido: [],
    aave: [
      { date: "2022-11", title: "CRV short-squeeze bad debt", severity: "moderate",
        summary: "~$1.6M of bad debt accrued on a large CRV borrow position during a market squeeze; covered by the Safety Module reserves.",
        url: "https://governance.aave.com" },
    ],
    morpho: [],
    spark: [],
    uniswap: [
      { date: "2023-04", title: "Front-end / Permit2 phishing (user-side)", severity: "low",
        summary: "Phishing campaigns abused Permit2 signatures against end users. No protocol-contract compromise; mitigations shipped to the official front-end.",
        url: "https://uniswap.org/blog" },
    ],
  };

  /* ---------------- categories present (for filters) ---------------- */
  const categoryLabels = {
    Lending: "Lending",
    DEX_AMM: "DEX / AMM",
    Swap_Aggregator: "Swap Aggregator",
    Yield_Vault: "Yield Vault",
    Liquid_Staking: "Liquid Staking",
    Other: "Other",
  };

  /* ---------------- global "data last checked" ---------------- */
  const dataStatus = {
    oldestCheck: "2026-05-20",
    tvlSnapshotAge: "as of 2026-06-03",
    feedCount: feeds.length,
    protocolCount: protocols.length,
    cellCount: ratings.length,
  };

  /* ---------------- accessors ---------------- */
  function cell(protocolId, feedId) {
    return ratings.find((r) => r.protocolId === protocolId && r.feedId === feedId) || null;
  }
  function feed(id) { return feeds.find((f) => f.id === id) || null; }
  function protocol(id) { return protocols.find((p) => p.id === id) || null; }
  function cellsForProtocol(id) { return feeds.map((f) => ({ feed: f, cell: cell(id, f.id) })); }
  function coverageCount(id) {
    const cs = ratings.filter((r) => r.protocolId === id);
    return {
      covered: cs.filter((c) => c.coverage === "covered").length,
      partial: cs.filter((c) => c.coverage === "partial").length,
      none: cs.filter((c) => c.coverage === "not-yet-covered").length,
      total: cs.length,
    };
  }

  window.DATA = {
    feeds, protocols, ratings, governance, audits, incidents,
    categoryLabels, dataStatus,
    cell, feed, protocol, cellsForProtocol, coverageCount,
  };
})();
