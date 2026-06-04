import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const readYamlDir = (dir: string): unknown[] =>
  existsSync(dir) ? readdirSync(dir).filter((f: string) => f.endsWith(".yaml"))
    .map((f: string) => parse(readFileSync(join(dir, f), "utf8"))) : [];

export function loadDataset(dataRoot: string) {
  const ratings: unknown[] = [];
  const ratingsRoot = join(dataRoot, "ratings");
  if (existsSync(ratingsRoot)) {
    for (const proto of readdirSync(ratingsRoot)) ratings.push(...readYamlDir(join(ratingsRoot, proto)));
  }
  // Feeds drive matrix column order → sort by displayOrder deterministically (readdir order
  // is filesystem-dependent and must NOT decide column order). Other collections are keyed by
  // id at lookup time, so their order is irrelevant.
  const feeds = (readYamlDir(join(dataRoot, "feeds")) as Array<{ displayOrder?: number }>)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return {
    protocols: readYamlDir(join(dataRoot, "protocols")),
    feeds,
    ratings,
    governance: readYamlDir(join(dataRoot, "governance")),
    audits: readYamlDir(join(dataRoot, "audits")),
    incidents: readYamlDir(join(dataRoot, "incidents")),
  };
}

// Path↔id consistency + orphan rejection: ratings/<protocolId>/<feedId>.yaml.
export function checkDataLayout(dataRoot: string): string[] {
  const errs: string[] = [];
  const ratingsRoot = join(dataRoot, "ratings");
  if (!existsSync(ratingsRoot)) return errs;
  for (const proto of readdirSync(ratingsRoot)) {
    const protoDir = join(ratingsRoot, proto);
    if (!statSync(protoDir).isDirectory()) { errs.push(`orphan in ratings/: ${proto}`); continue; }
    for (const file of readdirSync(protoDir)) {
      if (!file.endsWith(".yaml")) { errs.push(`orphan file: ratings/${proto}/${file}`); continue; }
      const feedId = file.replace(/\.yaml$/, "");
      const cell: any = parse(readFileSync(join(protoDir, file), "utf8"));
      if (cell?.protocolId !== proto) errs.push(`path↔id: ratings/${proto}/${file} has protocolId=${cell?.protocolId}`);
      if (cell?.feedId !== feedId) errs.push(`path↔id: ratings/${proto}/${file} has feedId=${cell?.feedId}`);
    }
  }
  return errs;
}
