/* ============================================================
   OpenRisk — app shell: nav, hash routing, theme, Tweaks
   ============================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#8b87f0",
  "covered": "#3fb950",
  "density": "comfortable"
}/*EDITMODE-END*/;

function useHashRoute() {
  function parse() {
    const h = (location.hash || "#/").replace(/^#/, "");
    const parts = h.split("/").filter(Boolean);
    if (parts[0] === "protocol" && parts[1]) return { view: "protocol", id: parts[1] };
    if (parts[0] === "methodology") return { view: "methodology" };
    if (parts[0] === "contribute") return { view: "contribute" };
    return { view: "home" };
  }
  const [route, setRoute] = useState(parse());
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

function navigate(view, id) {
  if (view === "home") location.hash = "#/";
  else if (view === "protocol") location.hash = "#/protocol/" + id;
  else if (view === "methodology") location.hash = "#/methodology";
  else if (view === "contribute") location.hash = "#/contribute";
}

function TopNav({ route, t, setTweak }) {
  return (
    <div className="topnav">
      <div className="topnav-inner">
        <div className="brand" onClick={() => navigate("home")}>
          <span className="mark">OpenRisk</span>
          <span className="tag">every feed, one view</span>
        </div>
        <div className="navlinks">
          <button className={"navlink" + (route.view === "home" || route.view === "protocol" ? " active" : "")} onClick={() => navigate("home")}>Protocols</button>
          <button className={"navlink" + (route.view === "methodology" ? " active" : "")} onClick={() => navigate("methodology")}>Methodology</button>
          <button className={"navlink" + (route.view === "contribute" ? " active" : "")} onClick={() => navigate("contribute")}>Contribute</button>
          <a className="navlink" href="https://github.com/cpstl/openrisk" target="_blank" rel="noopener">GitHub</a>
          <button className="icon-btn" title="Toggle theme" onClick={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")}>
            {t.theme === "dark" ? "☾" : "☀"}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const route = useHashRoute();

  // apply tweaks → CSS variables
  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute("data-theme", t.theme);
    r.style.setProperty("--accent", t.accent);
    r.style.setProperty("--accent-soft", t.accent + "24");
    r.style.setProperty("--accent-line", t.accent + "4d");
    r.style.setProperty("--cov-covered", t.covered);
    r.style.setProperty("--gutter", t.density === "compact" ? "28px" : "40px");
    r.style.setProperty("--maxw", t.density === "compact" ? "1240px" : "1320px");
  }, [t]);

  return (
    <React.Fragment>
      <TopNav route={route} t={t} setTweak={setTweak} />
      <div className="shell page">
        {route.view === "home" ? <SummaryMatrix navigate={navigate} /> : null}
        {route.view === "protocol" ? <ProtocolDetail id={route.id} navigate={navigate} /> : null}
        {route.view === "methodology" ? <Methodology navigate={navigate} /> : null}
        {route.view === "contribute" ? <Contribute navigate={navigate} /> : null}
      </div>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme} options={["dark", "light"]} onChange={(v) => setTweak("theme", v)} />
        <TweakColor label="Accent" value={t.accent}
          options={["#8b87f0", "#63b3ed", "#e0a85a", "#5b51d6"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Coverage palette" />
        <TweakColor label="Covered dot" value={t.covered}
          options={["#3fb950", "#8b87f0", "#63b3ed", "#c0c0c8"]}
          onChange={(v) => setTweak("covered", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={["comfortable", "compact"]} onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
