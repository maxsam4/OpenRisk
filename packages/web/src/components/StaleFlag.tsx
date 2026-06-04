// Loud, never silent. ok / undefined = nothing; stale / fetch-error = visible flag.
export function StaleFlag({ status }: { status?: "ok" | "stale" | "fetch-error" }) {
  if (!status || status === "ok") return null;
  if (status === "stale")
    return (
      <span className="stale-flag" title="Source data is stale">
        <span className="pip"></span>stale
      </span>
    );
  return (
    <span className="stale-flag err" title="Last automated fetch failed — showing last good data">
      <span className="pip"></span>fetch error
    </span>
  );
}
