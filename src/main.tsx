import BrandMark from "./BrandMark";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Flag,
  Layers,
  Maximize2,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Ship,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import Scene, { type ViewMode } from "./Scene";
import Cinematic from "./Cinematic";
import {
  advanceClock,
  parseScenario,
  parseLibrary,
  sampleTrack,
  type Scenario,
} from "./engine";
import "./style.css";

type Entry = {
  id: string;
  file: string;
  title: string;
  subtitle: string;
  duration: number;
};
const base = import.meta.env.BASE_URL;
const format = (t: number) =>
  `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;

function App() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => matchMedia("(min-width: 721px)").matches);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {if(e.key==='Escape'){setLibraryOpen(false);setSettingsOpen(false);}};
    document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);
  },[]);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(q.matches);
    q.addEventListener("change", change);
    return () => q.removeEventListener("change", change);
  }, []);
  const [instantMotion, setInstantMotion] = useState(false);
  const [intro, setIntro] = useState(() => window.location.hash !== "#studio");
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!intro)
      document
        .querySelector<HTMLElement>(".main h1")
        ?.focus({ preventScroll: true });
  }, [intro]);
  const [entries, setEntries] = useState<Entry[]>([]),
    [selectedId, setSelectedId] = useState(""),
    [scenario, setScenario] = useState<Scenario | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [view, setView] = useState<ViewMode>("orbit"),
    [selected, setSelected] = useState("");
  const [labels, setLabels] = useState(true),
    [arrows, setArrows] = useState(true),
    [trails, setTrails] = useState(true),
    [sources, setSources] = useState(false);
  const stage = useRef<HTMLDivElement>(null),
    notes = useRef<HTMLElement>(null),
    sourceTrigger = useRef<HTMLButtonElement>(null),
    clock = useRef(0);
  clock.current = time;
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${base}scenarios/index.json`, { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error("Scenario library could not load.");
        return r.json();
      })
      .then((data: unknown) => {
        const library = parseLibrary(data);
        setEntries(library);
        setSelectedId(library[0].id);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(String(e.message));
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [retry]);
  useEffect(() => {
    const entry = entries.find((e) => e.id === selectedId);
    if (!entry) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");

    setPlaying(false);
    setSources(false);
    fetch(`${base}scenarios/${entry.file}`, { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error("This scenario could not load.");
        return r.json();
      })
      .then((data) => {
        const s = parseScenario(data);
        if (s.id !== entry.id)
          throw Error("Scenario identity does not match its library entry.");
        if (s.duration !== entry.duration)
          throw Error("Scenario duration does not match its library entry.");
        setAutoOrbit(false);
        setTime(0);
        setScenario(s);
        setSelected(s.vessels[0].id);
        setView("orbit");
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(
            e instanceof Error && e.name === "ZodError"
              ? "This scenario contains missing or invalid data. Select another encounter or check its source file."
              : e instanceof Error
                ? e.message
                : "Invalid scenario content.",
          );
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [selectedId, entries]);
  useEffect(() => {
    if (!playing || !scenario) return;
    let frame = 0,
      last: number | undefined;
    const tick = (now: number) => {
      if (last !== undefined) {
        const result = advanceClock(
          clock.current,
          Math.min((now - last) / 1000, 0.25),
          speed,
          scenario.duration,
        );
        clock.current = result.time;
        setTime(result.time);
        if (!result.playing) {
          setPlaying(false);
          return;
        }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, scenario]);
  useEffect(() => {
    if (!sources) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSources(false);
        return;
      }
      if (event.key === "Tab") {
        const buttons = notes.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        );
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      sourceTrigger.current?.focus();
    };
  }, [sources]);
  const seek = (t: number) => {
    setPlaying(false);
    setTime(Math.max(0, Math.min(scenario?.duration ?? 0, t)));
  };
  const stepIndex = scenario
    ? scenario.steps.reduce((active, s, i) => (s.time <= time ? i : active), 0)
    : 0;
  const step = scenario?.steps[stepIndex];
  const activeVessel = scenario?.vessels.find((v) => v.id === selected);
  const pose = activeVessel ? sampleTrack(activeVessel.track, time) : null;
  const togglePlay = () => {
    if (time >= (scenario?.duration ?? 0)) setTime(0);
    setPlaying((p) => !p);
  };
  const fullscreen = () => {
    if (!document.fullscreenElement)
      stage.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };
  if (intro)
    return (
      <Cinematic
        onEnter={() => {
          history.replaceState(null, "", "#studio");
          setIntro(false);
        }}
      />
    );
  return (
    <div
      className="app-shell studio-arrival"
      data-playing={playing}
      data-guide-open={guideOpen}
      data-instant-motion={instantMotion}
      onKeyDownCapture={() => setInstantMotion(true)}
      onPointerDownCapture={() => setInstantMotion(false)}
    >
      <header className="topbar">
        <a className="brand" href="./" aria-label="COLREG 3D home">
          <span className="brand-symbol">
            <BrandMark />
          </span>
          <span>
            COLREG<span className="brand-3d">3D</span>
          </span>
          <span className="brand-caption">Encounter studio</span>
        </a>
        <nav className="studio-navigation" aria-label="Studio tools">
          <button aria-expanded={libraryOpen} id="library-tool" aria-controls="encounter-library" onClick={()=>{setLibraryOpen(v=>!v);setSettingsOpen(false);}}><Layers size={17}/>Encounters<ChevronRight size={13}/></button>
          <button aria-expanded={guideOpen} id="story-tool" aria-controls="encounter-guide" onClick={()=>setGuideOpen(v=>!v)}><BookOpen size={17}/>Story</button>
          <button aria-expanded={settingsOpen} id="scene-tool" aria-controls="scene-settings" onClick={()=>{setSettingsOpen(v=>!v);setLibraryOpen(false);}}><Eye size={17}/>Scene</button>
        </nav>
        <div className="top-meta">
          <button
            className="replay-opening"
            onClick={() => {
              history.replaceState(
                null,
                "",
                location.pathname + location.search,
              );
              setPlaying(false);
              setIntro(true);
            }}
          >
            <Play size={13} />
            Replay opening
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="library" id="encounter-library" data-open={libraryOpen} inert={!libraryOpen} aria-label="Encounter library">
          <button className="panel-dismiss" aria-label="Close encounters" onClick={()=>{setLibraryOpen(false);document.getElementById("library-tool")?.focus();}}><X size={18}/></button>
          <div className="library-heading">
            <h2>Encounters</h2>
            <span className="count">
              {entries.length.toString().padStart(2, "0")}
            </span>
          </div>
          <p className="muted intro">Choose a scene to explore.</p>
          <div className="library-list">
            {entries.map((entry, i) => (
              <button
                key={entry.id}
                className={`scenario-card ${selectedId === entry.id ? "active" : ""}`}
                onClick={() => {setSelectedId(entry.id);setLibraryOpen(false);}}
                aria-pressed={selectedId === entry.id}
              >
                <svg className={`route-preview route-${i}`} viewBox="0 0 180 70" aria-hidden="true"><path className="route-grid" d="M0 20H180M0 45H180M35 0V70M80 0V70M125 0V70"/><path className="route-a" d={i===0 ? "M15 60L150 10" : "M15 60L85 32Q110 20 150 35"}/><path className="route-b" d="M155 65L75 5"/><circle className="route-ship" r="4" cx="0" cy="0"/></svg>
                <span className="encounter-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="card-copy">
                  <strong>{entry.title}</strong>
                  <span>{entry.subtitle}</span>
                  <span className="card-duration">
                    {format(entry.duration)}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="source-pending">
            <BookOpen size={18} />
            <strong>Reference library</strong>
            <p>Book-based encounters will appear here after review.</p>
            <span>Awaiting source PDF</span>
          </div>
        </aside>
        <main className="main">
          <div className="page-heading">
            <div>
              <span className="studio-eyebrow">Encounter study</span>
              <h1 tabIndex={-1}>{scenario?.title ?? "Encounter studies"}</h1>
              <p>{scenario?.summary ?? "Preparing your learning workspace."}</p>
            </div>
            <button
              ref={sourceTrigger}
              className="source-button"
              onClick={() => {
                setPlaying(false);
                setSources(true);
              }}
              disabled={!scenario}
            >
              <BookOpen size={16} />
              Source & notes
            </button>
          </div>
          <div className="demo-banner">
            <Flag size={15} />
            <span>
              {scenario?.status === "reviewed"
                ? "Reviewed source-based content"
                : scenario?.status === "draft"
                  ? "Draft — pending maritime review"
                  : "Technical demo — not validated COLREG instruction"}
            </span>
          </div>
          {error ? (
            <div className="load-error" role="alert">
              <h2>Unable to open this content</h2>
              <p>{error}</p>
              <button
                onClick={() => {
                  setError("");
                  setLoading(true);
                  setRetry((r) => r + 1);
                }}
              >
                Reload library
              </button>
              <p>Select another encounter from the library to continue.</p>
            </div>
          ) : loading && !scenario ? (
            <div className="loading" role="status">
              <Compass className="spin" />
              Preparing the scene…
            </div>
          ) : (
            scenario && (
              <>
                <div
                  className={`study-layout ${loading ? "is-switching" : ""}`}
                  key={scenario.id}
                  aria-busy={loading}
                >
                  <section
                    className="viewer"
                    ref={stage}
                    aria-label="Encounter player"
                  >
                    <div className="scene-wrap">
                      <Scene
                        scenario={scenario}
                        time={time}
                        view={view}
                        selected={selected}
                        labels={labels}
                        arrows={arrows}
                        trails={trails}
                        instantMotion={instantMotion}
                        autoOrbit={autoOrbit}
                        reservePanel={guideOpen}
                      />
                      <div className="scene-top">
                        <span className="scene-pill">
                          <span className="status-dot" />{" "}
                          {view === "bridge"
                            ? "Bridge view"
                            : view === "overhead"
                              ? "Overhead view"
                              : "Free view"}
                        </span>
                        <div className="scene-tools">
                          <button
                            className="auto-orbit glass"
                            disabled={reducedMotion}
                            aria-pressed={autoOrbit}
                            onClick={() => {
                              setAutoOrbit((v) => !v);
                              setView("orbit");
                            }}
                            title="Slowly orbit the scene"
                          >
                            <RotateCcw size={14} />
                            Auto orbit
                          </button>
                          <button
                            className="icon-button glass"
                            onClick={fullscreen}
                            title="Toggle fullscreen"
                            aria-label="Toggle fullscreen"
                          >
                            <Maximize2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`compass ${view !== "overhead" ? "hidden" : ""}`}
                      >
                        <span>N</span>
                        <Navigation size={27} />
                        <small>TRUE NORTH</small>
                      </div>
                      <div className="scene-bottom">
                        <span>
                          <Layers size={13} />
                          <small>Grid spacing: 50 m</small>
                        </span>
                        <span className="mouse-hint">
                          {view === "orbit"
                            ? "Drag to orbit · Scroll to zoom"
                            : view === "bridge"
                              ? `On board ${activeVessel?.name}`
                              : "North-up overview"}
                        </span>
                      </div>
                      <div className="camera-switch" aria-label="Camera views">
                        <span
                          aria-hidden="true"
                          className="camera-indicator"
                          style={{
                            transform: `translateX(${["orbit", "overhead", "bridge"].indexOf(view) * 100}%)`,
                          }}
                        />
                        {(
                          [
                            ["orbit", Compass, "Free"],
                            ["overhead", Layers, "Overhead"],
                            ["bridge", Ship, "Bridge"],
                          ] as const
                        ).map(([key, Icon, label]) => (
                          <button
                            key={key}
                            className={view === key ? "selected" : ""}
                            aria-pressed={view === key}
                            onClick={() => {
                              setAutoOrbit(false);
                              setView(key);
                            }}
                          >
                            <Icon size={15} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="transport">
                      <div className="timeline-labels">
                        <span className="timeline-caption"><span className="transport-indicator" />{playing ? "Playing" : "Timeline"}</span>
                        <span>
                          <strong>{format(time)}</strong> /{" "}
                          {format(scenario.duration)}
                        </span>
                      </div>
                      <div className="timeline">
                        <input
                          aria-label="Encounter time"
                          type="range"
                          min="0"
                          max={scenario.duration}
                          step="0.1"
                          value={time}
                          onChange={(e) => seek(Number(e.target.value))}
                          style={
                            {
                              "--progress": `${(time / scenario.duration) * 100}%`,
                            } as React.CSSProperties
                          }
                        />
                        <div className="step-markers">
                          {scenario.steps.map((s, i) => (
                            <button
                              key={s.time}
                              style={{
                                left: `${(s.time / scenario.duration) * 100}%`,
                              }}
                              onClick={() => seek(s.time)}
                              title={s.title}
                              aria-label={`Jump to step ${i + 1}: ${s.title}`}
                              className={i <= stepIndex ? "past" : ""}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="playback-controls">
                        <div className="playback-left">
                          <button
                            className="icon-button"
                            onClick={() => seek(0)}
                            title="Restart"
                            aria-label="Restart"
                          >
                            <RotateCcw size={17} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => seek(time - 5)}
                            title="Back 5 seconds"
                            aria-label="Back 5 seconds"
                          >
                            <SkipBack size={17} />
                          </button>
                          <button
                            className="play-button"
                            onClick={togglePlay}
                            aria-label={playing ? "Pause" : "Play"}
                          >
                            {playing ? (
                              <Pause size={20} />
                            ) : (
                              <Play size={20} fill="currentColor" />
                            )}
                            <span className="play-label">
                              {playing ? "Pause" : "Play encounter"}
                            </span>
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => seek(time + 5)}
                            title="Forward 5 seconds"
                            aria-label="Forward 5 seconds"
                          >
                            <SkipForward size={17} />
                          </button>
                          <span className="play-state">
                            {playing
                              ? "Playing"
                              : time >= scenario.duration
                                ? "Complete"
                                : "Paused"}
                          </span>
                        </div>
                        <label className="speed-control">
                          Playback
                          <select
                            aria-label="Playback speed"
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                          >
                            <option value="0.5">0.5×</option>
                            <option value="1">1×</option>
                            <option value="2">2×</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </section>
                  <aside className="guide" id="encounter-guide" data-open={guideOpen} inert={!guideOpen}>
                    <button className="panel-dismiss" aria-label="Hide story" onClick={()=>{setGuideOpen(false);document.getElementById("story-tool")?.focus();}}><X size={18}/></button>
                    <span className="guide-kicker">Guided observation</span>
                    <div className="guide-heading">
                      <BookOpen size={17} />
                      <span>Observation</span>
                      <span>
                        {String(stepIndex + 1).padStart(2, "0")} /{" "}
                        {String(scenario.steps.length).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="guide-progress">
                      {scenario.steps.map((s, i) => (
                        <button
                          key={s.time}
                          aria-label={`Open step ${i + 1}`}
                          className={i <= stepIndex ? "filled" : ""}
                          onClick={() => seek(s.time)}
                        />
                      ))}
                    </div>
                    <div
                      className="step-content"
                      key={`${scenario.id}-${stepIndex}`}
                    >
                      <span className="step-number">
                        Step {stepIndex + 1}
                        <span>{format(step?.time ?? 0)}</span>
                      </span>
                      <h2>{step?.title}</h2>
                      <p>{step?.body}</p>
                    </div>
                    <div className="step-nav">
                      <button
                        disabled={stepIndex === 0}
                        onClick={() => seek(scenario.steps[stepIndex - 1].time)}
                      >
                        <ChevronLeft size={15} />
                        Previous
                      </button>
                      <button
                        disabled={stepIndex === scenario.steps.length - 1}
                        onClick={() => seek(scenario.steps[stepIndex + 1].time)}
                      >
                        Next step
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="guide-divider" />
                    <div className="section-label">In this encounter</div>
                    <div className="sequence">
                      {scenario.steps.map((s, i) => (
                        <button
                          className={stepIndex === i ? "current" : ""}
                          key={s.time}
                          onClick={() => seek(s.time)}
                        >
                          <span className="sequence-index">
                            {i < stepIndex ? (
                              <Check size={13} />
                            ) : (
                              String(i + 1).padStart(2, "0")
                            )}
                          </span>
                          <span>
                            {s.title}
                            <small>{format(s.time)}</small>
                          </span>
                          {i === stepIndex && <span className="current-dot" />}
                        </button>
                      ))}
                    </div>
                  </aside>
                </div>
                <div className="below-viewer" id="scene-settings" data-open={settingsOpen} inert={!settingsOpen}>
                  <button className="panel-dismiss" aria-label="Close scene settings" onClick={()=>{setSettingsOpen(false);document.getElementById("scene-tool")?.focus();}}><X size={18}/></button>
                  <section className="vessel-panel">
                    <div className="panel-title">
                      <Navigation size={16} />
                      <h3>Vessels in this scene</h3>
                      <span>Select a vessel for bridge view</span>
                    </div>
                    <div className="vessel-cards">
                      {scenario.vessels.map((v) => {
                        const p = sampleTrack(v.track, time);
                        return (
                          <button
                            key={v.id}
                            className={`vessel-card ${selected === v.id ? "selected" : ""}`}
                            onClick={() => setSelected(v.id)}
                          >
                            <span
                              className="vessel-icon"
                              style={{ color: v.color }}
                            >
                              <Ship size={22} />
                            </span>
                            <span>
                              <strong>{v.name}</strong>
                              <small>{v.length} m · {v.kind ?? "Demonstration vessel"}</small>
                            </span>
                            <span className="heading-value">
                              {Math.round(p.heading)
                                .toString()
                                .padStart(3, "0")}
                              °<small>Heading</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                  <section className="overlays">
                    <div className="panel-title">
                      <Eye size={16} />
                      <h3>Scene overlays</h3>
                    </div>
                    {(
                      [
                        ["Vessel names", labels, setLabels],
                        ["Heading arrows", arrows, setArrows],
                        ["Movement tracks", trails, setTrails],
                      ] as const
                    ).map(([label, value, set]) => (
                      <label className="toggle-row" key={label}>
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => set(e.target.checked)}
                        />
                        <span className="toggle" />
                      </label>
                    ))}
                  </section>
                </div>
                <footer className="main-footer">
                  <span>
                    <span className="status-dot" />
                    All distances in metres · Time in seconds
                  </span>
                  <span>
                    {pose
                      ? `${activeVessel?.name.toUpperCase()} · E ${pose.east.toFixed(0)} / N ${pose.north.toFixed(0)}`
                      : ""}
                  </span>
                </footer>
              </>
            )
          )}
        </main>
      </div>
      {sources && scenario && (
        <div className="modal-backdrop" onClick={() => setSources(false)}>
          <section
            ref={notes}
            className="notes-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Source and assumptions"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="icon-button modal-close"
              aria-label="Close source notes"
              onClick={() => setSources(false)}
            >
              <X size={20} />
            </button>
            <BookOpen size={24} />
            <h2>Source & scene notes</h2>
            <p>{scenario.title}</p>
            <h3>Reference material</h3>
            {scenario.sources.length ? (
              scenario.sources.map((s, i) => (
                <p key={i}>
                  {s.title} · pp. {s.pages}
                  {s.figure && ` · Figure ${s.figure}`}
                  {s.rule && ` · ${s.rule}`}
                </p>
              ))
            ) : (
              <p>
                No book has been supplied. This scene contains synthetic
                demonstration data only.
              </p>
            )}
            <h3>Animation assumptions</h3>
            <ul>
              {scenario.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <button className="source-button" onClick={() => setSources(false)}>
              Return to encounter
              <ArrowUpRight size={15} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
import "./studio.css";
