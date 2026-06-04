// Pure, client-safe selectors + shared types. NO Node imports here, so client
// components (e.g. SummaryMatrix) can import these without dragging node:fs into
// the browser bundle. Build-time loading lives in data.ts (server-only).
import type {
  Protocol,
  Feed,
  RatingCell,
  Governance,
  AuditHistory,
  IncidentHistory,
} from "@dra/core";

export interface Dataset {
  protocols: Protocol[];
  feeds: Feed[];
  ratings: RatingCell[];
  governance: Governance[];
  audits: AuditHistory[];
  incidents: IncidentHistory[];
}

export interface TvlSnapshot {
  asOf: string;
  protocols: Record<string, number>;
}

export const cellFor = (
  ratings: RatingCell[],
  p: string,
  f: string,
): RatingCell | undefined => ratings.find((c) => c.protocolId === p && c.feedId === f);

export const governanceFor = (g: Governance[], p: string): Governance | undefined =>
  g.find((x) => x.protocolId === p);

export const auditsFor = (a: AuditHistory[], p: string): AuditHistory["audits"] =>
  a.find((x) => x.protocolId === p)?.audits ?? [];

export const incidentsFor = (i: IncidentHistory[], p: string): IncidentHistory["incidents"] =>
  i.find((x) => x.protocolId === p)?.incidents ?? [];
