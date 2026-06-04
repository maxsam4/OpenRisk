import { ProtocolSchema, FeedSchema, RatingCellSchema, GovernanceSchema,
         AuditHistorySchema, IncidentHistorySchema, findForbiddenKeys } from "./schema.js";

export interface DatasetInput {
  protocols: unknown[]; feeds: unknown[]; ratings: unknown[];
  governance: unknown[]; audits: unknown[]; incidents: unknown[];
}
export interface ValidationResult { ok: boolean; errors: string[]; }

export function validateDataset(input: DatasetInput): ValidationResult {
  const errors: string[] = [];

  // (0) No-composite guard: recursive denylist scan over ALL raw input.
  for (const hit of findForbiddenKeys(input)) errors.push(`forbidden (composite) key: ${hit}`);

  const parse = <T>(items: unknown[], schema: { safeParse: (x: unknown) => any }, label: string): T[] => {
    const out: T[] = [];
    items.forEach((x, i) => {
      const r = schema.safeParse(x);
      if (r.success) out.push(r.data);
      else errors.push(`${label}[${i}]: ${r.error.message}`);
    });
    return out;
  };

  const protocols = parse<any>(input.protocols, ProtocolSchema, "protocol");
  const feeds = parse<any>(input.feeds, FeedSchema, "feed");
  const ratings = parse<any>(input.ratings, RatingCellSchema, "rating");
  const governance = parse<any>(input.governance, GovernanceSchema, "governance");
  const audits = parse<any>(input.audits, AuditHistorySchema, "audits");
  const incidents = parse<any>(input.incidents, IncidentHistorySchema, "incidents");

  const protocolIds = new Set(protocols.map((p) => p.id));
  const feedIds = new Set(feeds.map((f) => f.id));

  const seen = new Set<string>();
  for (const c of ratings) {
    if (!protocolIds.has(c.protocolId)) errors.push(`rating references unknown protocol: ${c.protocolId}`);
    if (!feedIds.has(c.feedId)) errors.push(`rating references unknown feed: ${c.feedId}`);
    const key = `${c.protocolId}|${c.feedId}`;
    if (seen.has(key)) errors.push(`duplicate cell: ${key}`);
    seen.add(key);
  }
  for (const p of protocols) for (const f of feeds) {
    if (!seen.has(`${p.id}|${f.id}`)) errors.push(`missing cell: ${p.id} × ${f.id}`);
  }
  for (const g of governance) {
    if (!protocolIds.has(g.protocolId)) errors.push(`governance references unknown protocol: ${g.protocolId}`);
  }
  for (const a of audits) {
    if (!protocolIds.has(a.protocolId)) errors.push(`audits reference unknown protocol: ${a.protocolId}`);
  }
  for (const inc of incidents) {
    if (!protocolIds.has(inc.protocolId)) errors.push(`incidents reference unknown protocol: ${inc.protocolId}`);
  }
  return { ok: errors.length === 0, errors };
}
