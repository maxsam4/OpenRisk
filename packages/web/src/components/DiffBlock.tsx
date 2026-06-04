// The .codeblock add/del/ctx renderer used by the Contribute page. A line is an
// addition (leading "+"), a deletion (leading "-"), or context (anything else).
export function DiffBlock({ filename, lines }: { filename: string; lines: string[] }) {
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span className="faint">{filename}</span>
      </div>
      <pre className="codeblock-body">
        {lines.map((l, i) => (
          <div key={i} className={"cl " + (l[0] === "+" ? "add" : l[0] === "-" ? "del" : "ctx")}>
            <span className="gutter">{l[0] === "+" ? "+" : l[0] === "-" ? "-" : " "}</span>
            <span>{l.slice(1)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
