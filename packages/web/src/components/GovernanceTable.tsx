import type { Governance } from "@dra/core";
import { ProvenanceTag } from "./ProvenanceTag";

// Renders all four safeApiStatus values distinctly (the design only handled `failed`).
function SafeStatus({ governance }: { governance: Governance }) {
  switch (governance.safeApiStatus) {
    case "ok":
      return <span className="faint">Safe API live · multisig reflects current on-chain state</span>;
    case "stale":
      return (
        <span className="faint">
          Safe API stale · last refreshed{" "}
          {governance.provenance.lastSuccessfulFetchAt ?? governance.provenance.lastChecked}
        </span>
      );
    case "failed":
      return (
        <span className="stale-flag err">
          <span className="pip"></span>Safe API fetch failed — showing last curated data
        </span>
      );
    case "n/a":
    default:
      return <span className="faint">No tracked admin multisig</span>;
  }
}

export function GovernanceTable({ governance }: { governance: Governance | undefined }) {
  if (!governance) return null;
  return (
    <div className="gov-card mt-4">
      <table className="dtable">
        <tbody>
          {governance.items.map((it) => (
            <tr key={it.label}>
              <td>{it.label}</td>
              <td>
                <span className="row gap-2 wrap" style={{ alignItems: "center" }}>
                  {it.link ? (
                    <a
                      className="code-addr"
                      href={it.link}
                      target="_blank"
                      rel="noopener"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {it.value} →
                    </a>
                  ) : (
                    <span style={{ fontWeight: it.label === "Type" ? 400 : 500, whiteSpace: "nowrap" }}>
                      {it.value}
                    </span>
                  )}
                  <ProvenanceTag tag={it.tag} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="gov-foot">
        <a
          className="ghost-link"
          href={governance.provenance.checkedUrl}
          target="_blank"
          rel="noopener"
        >
          Source →
        </a>
        <SafeStatus governance={governance} />
        <span className="faint">Pulled from on-chain and curated sources. Flag inaccuracies via GitHub.</span>
      </div>
    </div>
  );
}
