import Link from "next/link";
import { DiffBlock } from "../../components/DiffBlock";

export default function ContributePage() {
  return (
    <div className="view-enter" style={{ maxWidth: "880px" }}>
      <h1 className="title">Contribute</h1>
      <p className="lede" style={{ fontSize: "14px" }}>
        OpenRisk has no database. The data layer is version-controlled files, so every correction
        is an ordinary pull request with a visible diff and full provenance. Anyone can propose a
        change; maintainers and the community review it in the open.
      </p>

      <div className="callout mt-6">
        <h3>The data lives in git</h3>
        <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6, fontSize: "13.5px" }}>
          One file per protocol, one per feed, and one per protocol × feed cell. Tiny files keep
          diffs small and reviewable, and make &quot;every cell is assessed&quot; literal. Fork the
          repo, edit a file, open a PR.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="section-h">Correct a cell</h2>
        <p className="muted mt-2" style={{ fontSize: "13px", lineHeight: 1.6 }}>
          Found a rating that&apos;s out of date or mislabeled? Edit its file. The path encodes the
          protocol and feed, so there&apos;s exactly one place to change. Keep the rating{" "}
          <b style={{ color: "var(--text)", fontWeight: 700 }}>verbatim</b> — paste what the feed
          says, never your own summary — and update the provenance.
        </p>
        <DiffBlock
          filename="data/ratings/morpho/defiscan.yaml"
          lines={[
            " coverage: covered",
            " rating:",
            '-  verbatim: "Stage 0"',
            '+  verbatim: "Stage 1"',
            "   sourceUrl: https://defiscan.info/protocol/morpho",
            " provenance:",
            "   method: auto",
            "-  lastChecked: 2026-05-29",
            "+  lastChecked: 2026-06-04",
            "-  sourceStatus: stale",
            "+  sourceStatus: ok",
          ]}
        />
        <p className="faint mt-3" style={{ fontSize: "12.5px" }}>
          CI runs <code className="prov prov-curated">validateDataset()</code> on every PR. It
          rejects unknown fields and any composite/score field, so an accidental ranking can&apos;t
          slip in.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="section-h">Add a protocol</h2>
        <p className="muted mt-2" style={{ fontSize: "13px", lineHeight: 1.6 }}>
          Add one protocol file. The build then expects a rating cell for every feed — a missing
          cell fails CI, so coverage gaps stay explicit rather than silently blank.
        </p>
        <DiffBlock
          filename="data/protocols/pendle.yaml"
          lines={[
            "+id: pendle",
            "+name: Pendle",
            "+category: Yield_Vault",
            '+chain: "Ethereum + 8 chains"',
            '+site: "pendle.finance"',
            '+blurb: "Yield-tokenization protocol splitting yield-bearing assets into principal and yield tokens."',
            "+links:",
            "+  website: https://pendle.finance",
            "+  docs: https://docs.pendle.finance",
            "+defillamaSlugs: [pendle]",
          ]}
        />
      </div>

      <div className="mt-8">
        <h2 className="section-h">Propose a feed</h2>
        <p className="muted mt-2" style={{ fontSize: "13px", lineHeight: 1.6 }}>
          New risk source? Add a registry entry with its focus one-liner and access method.
          Conflicts are a required field — declare them or write{" "}
          <code className="prov prov-curated">null</code>; they&apos;re never omitted.
        </p>
        <DiffBlock
          filename="data/feeds/credora.yaml"
          lines={[
            "+id: credora",
            "+name: Credora",
            "+type: Rating",
            '+focus: "Institutional-grade credit risk ratings for DeFi protocols and borrowers."',
            "+url: https://credora.io",
            "+access: manual",
            "+conflicts: null",
            "+displayOrder: 4",
          ]}
        />
      </div>

      <div className="mt-8">
        <h2 className="section-h">Review checklist</h2>
        <ul className="does-list mt-4" style={{ gap: "12px" }}>
          <li>Rating text is verbatim from the source — no paraphrase, no normalization.</li>
          <li>
            A real source link resolves; <code className="prov prov-curated">checkedUrl</code> set
            for gaps.
          </li>
          <li>
            Provenance updated: method, curator,{" "}
            <code className="prov prov-curated">lastChecked</code>.
          </li>
          <li>No field implies a composite score, grade, or rank.</li>
        </ul>
      </div>

      <hr className="hr mt-8" />
      <div className="row gap-4 mt-4 wrap" style={{ alignItems: "center" }}>
        <a className="cta-btn" href="https://github.com/OWNER/openrisk" target="_blank" rel="noopener">
          Open the repo →
        </a>
        <Link
          className="ghost-link"
          href="/methodology"
          style={{ fontFamily: "var(--mono)" }}
        >
          Read the methodology →
        </Link>
      </div>
    </div>
  );
}
