import type { ProvenanceTag as ProvenanceTagType } from "@dra/core";

// method/source provenance: onchain | feed | curated | self-reported
const map: Record<string, { cls: string; label: string }> = {
  onchain: { cls: "prov-onchain", label: "onchain" },
  feed: { cls: "prov-feed", label: "feed" },
  curated: { cls: "prov-curated", label: "curated" },
  "self-reported": { cls: "prov-self", label: "self-reported" },
};

export function ProvenanceTag({ tag }: { tag: ProvenanceTagType }) {
  const m = map[tag] ?? map.curated!;
  return <span className={"prov " + m.cls}>[{m.label}]</span>;
}
