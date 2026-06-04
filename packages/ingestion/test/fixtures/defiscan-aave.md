---
chain: "Ethereum"
stage: 0
risks: ["L", "H", "H", "H", "L"]
reasons: []
author: ["sagaciousyves"]
submission_date: "2025-05-07"
publish_date: "2025-05-07"
update_date: "1970-01-01"
stage_requirements:
  [
    [
      { text: "Assets are not in custody by a centralized entity", status: "fixed"},
      { text: "All contracts are verified", status: "fixed"},
      { text: "Source-available codebase", status: "fixed"},
      { text: "Public documentation exists", status: "fixed"},
    ],
    [
      { text: "Upgrades with potential of “loss of funds” not protected with Exit Window >= 7 days OR a sufficient Security Council", status: "unfixed"},
      { text: "Dependency with a High centralization score without mitigation", status: "unfixed"},
      { text: "Frontend backups or self-hosting option exists", status: "fixed"}
    ],
    [
      { text: "Upgrades with potential of “loss of funds or unclaimed yield” not protected with onchain governance AND Exit Window >= 30 days", status: "unfixed"},
      { text: "Dependencies with High or Medium centralization score and no mitigations.", status: "unfixed"},
      { text: "Alternative third-party frontends exist", status: "fixed" }
    ],
  ]
---

# Summary

Aave v3 is a lending protocol that allows users to lend and borrow different ERC20 assets. Users are able to create positions that consist of debt in different loan assets which is secured by different collateral assets. The lending market allows anyone to liquidate insolvent positions, based on an external price feed and specific collateral factors representing an asset's specific risk profile. Furthermore, instead of borrowing supplied assets, Aave V3 also issues its own stablecoin, GHO. Users can borrow and lend GHO like any other asset in the system.

# Ratings
