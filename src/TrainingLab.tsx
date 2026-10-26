import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { BookOpen, ChevronRight, Eye, EyeOff, Pause, Play, RotateCcw, Search, Volume2, VolumeX } from "lucide-react";
import { DISTRESS_SIGNALS, LENGTHS, REFERENCES, SIGNALS, SOUND_AUDIBILITY_RANGES, VESSEL_PROFILES, profileDisplay, signalActive, signalDuration, type Signal, type VesselProfile } from "./trainingData";
import { SOURCE_EDITION_NOTE } from "./sourceCatalog";
import DistressSigns from "./DistressSigns";
import RecognitionScene from "./RecognitionScene";
import TechnicalReference, { RangeTable } from "./TechnicalReference";
import useSignalAudio from "./useSignalAudio";
import { hasFlashes, recognitionDefaults, recognitionReadout, type RecognitionView } from "./recognition";
import "./trainingLab.css";

type Props = { mode: "lights" | "signals"; onRule: (id: string) => void; selectedId?: string; onSelect?: (id: string) => void };
type OptionState = ReturnType<typeof recognitionDefaults>;

function sectorPath(start: number, end: number, r = 88) {
  const span = ((end - start) % 360 + 360) % 360 || 360;
  const point = (angle: number) => ({ x: 110 + r * Math.sin(angle * Math.PI / 180), y: 110 - r * Math.cos(angle * Math.PI / 180) });
  const a = point(start), b = point(end);
  if (Math.abs(end - start) >= 360) { const opposite = point(start + 180); return `M110 110 L${a.x} ${a.y} A${r} ${r} 0 1 1 ${opposite.x} ${opposite.y} A${r} ${r} 0 1 1 ${a.x} ${a.y} Z`; }
  return `M110 110 L${a.x} ${a.y} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}

function SectorDiagram({ bearing, profile }: { bearing: number; profile: VesselProfile }) {
  const sectors = [...new Map(profile.lights.filter(light => light.sector).map(light => [`${light.color}:${light.sector!.start}:${light.sector!.end}`, light])).values()];
  return <figure className="lab-sector"><svg viewBox="0 0 220 220" role="img" aria-label={`Light sectors with the observer at ${bearing.toFixed(0)} degrees`}>
    <circle cx="110" cy="110" r="88" className="sector-ring" />
    {sectors.map((light, index) => <path key={`${light.color}-${light.sector!.start}-${index}`} d={sectorPath(light.sector!.start, light.sector!.end)} className={`sector sector-${light.color}`} />)}
    <g transform={`rotate(${bearing} 110 110)`}><line x1="110" y1="110" x2="110" y2="13" className="bearing-line" /><circle cx="110" cy="13" r="4" className="bearing-dot" /></g>
    <path d="M110 91 L103 111 L117 111 Z" className="ship-arrow" /><text x="110" y="82">BOW</text>
  </svg><figcaption><strong>{bearing.toFixed(0).padStart(3, "0")}°</strong><span>observer bearing</span></figcaption></figure>;
}

function Shapes({ items = [] }: { items?: VesselProfile["shapes"] }) {
  return <div className="shape-row" aria-label="Required day shapes">{items.length ? items.map((shape, i) => <span className={`day-shape ${shape}`} key={`${shape}-${i}`} title={shape} aria-label={shape} />) : <span className="no-shape">No required day shape in this condition.</span>}</div>;
}

function ReferenceRail({ onRule }: { onRule: (id: string) => void }) {
  const links = [["rule-20", "Rules 20–31", REFERENCES.rules], ["rule-32", "Rules 32–37", REFERENCES.soundRules], ["annex-1", "Annex I", REFERENCES.annex1], ["annex-2", "Annex II", REFERENCES.annex2], ["annex-3", "Annex III", REFERENCES.annex3], ["annex-4", "Annex IV", REFERENCES.annex4]];
  return <aside className="reference-rail"><h3><BookOpen size={17} />Reference shelf</h3>{links.map(([id, title, note]) => <button key={id} onClick={() => onRule(id)}><span><strong>{title}</strong><small>{note}</small></span><ChevronRight size={16} /></button>)}</aside>;
}

function Measurements() {
  return <div className="measurement-card"><div className="measure-sketch"><span className="waterline" /><span className="mast-line" /><i className="height-arrow">≥6 m*</i><i className="spacing-arrow">≥4.5 m</i></div><div><strong>Annex I placement</strong><p>For power-driven vessels 20 m or more: the forward masthead is at least 6 m above the hull, generally at least the vessel’s breadth, but need not exceed 12 m. The after masthead is at least 4.5 m higher.</p><small>*Different provisions apply below 20 m. Diagram is explanatory and not to scale.</small></div></div>;
}

function ConditionControls({ id, options, setOption, kind='technical' }: { id: string; options: OptionState; kind?:'status'|'technical'; setOption: <K extends keyof OptionState>(key: K, value: OptionState[K]) => void }) {
  const status = ["nuc", "ram", "dredging", "trawling", "fishing", "trawl-shooting", "trawl-hauling", "trawl-obstructed", "pair-trawling", "purse-seine"].includes(id);
  const anchorable = ["ram", "mineclearance", "pilot"].includes(id);
  if (kind==='status' ? !status&&!anchorable : !["towing", "pushing", "fishing"].includes(id)) return null;
  return <div className="condition-controls">
    {kind==='status' && status && <label><input type="checkbox" checked={options.makingWay} onChange={e => { setOption("makingWay", e.target.checked); if (e.target.checked) setOption("anchored", false); }} />Making way through the water</label>}
    {kind==='status' && anchorable && <label><input type="checkbox" checked={options.anchored} onChange={e => { setOption("anchored", e.target.checked); if (e.target.checked) setOption("makingWay", false); }} />At anchor · include applicable Rule 30 display</label>}
    {kind==='technical' && id === "towing" && <label><span>Tow length</span><select value={options.towLength} onChange={e => setOption("towLength", Number(e.target.value))}><option value="150">150 m</option><option value="250">250 m · three whites + diamond</option></select></label>}
    {kind==='technical' && id === "pushing" && <label><input type="checkbox" checked={options.composite} onChange={e => setOption("composite", e.target.checked)} />Rigid composite unit · treat as one power vessel</label>}
    {kind==='technical' && id === "fishing" && <label><span>Gear extension</span><select value={options.gearLength} onChange={e => setOption("gearLength", Number(e.target.value))}><option value="100">100 m</option><option value="151">151 m · direction light</option></select></label>}
  </div>;
}

function SignalTimeline({ signal, time, duration }: { signal: Signal; time: number; duration: number }) {
  const patternLength = signal.pattern.reduce((sum, part) => sum + part, 0);
  const starts = signal.repeat ? Array.from({ length: Math.ceil(duration / signal.repeat) }, (_, i) => i * signal.repeat!) : [0];
  const segments = starts.flatMap(start => { let cursor = start; return signal.pattern.map((part, index) => { const item = { start: cursor, duration: Math.min(part, Math.max(0, duration - cursor)), active: index % 2 === 0, patternIndex: index }; cursor += part; return item; }); }).filter(item => item.duration > 0);
  const instrument = signal.kind === "light" ? "Light" : signal.kind === "bell" ? "Bell" : signal.kind === "gong" ? "Bell → gong" : "Whistle";
  return <div className="signal-timeline"><div className="timeline-meta"><span>{instrument}</span><span>{signal.repeat ? `repeat no later than ${signal.repeat / 60} min` : `${patternLength} s pattern`}</span></div><svg viewBox={`0 0 ${duration} 48`} preserveAspectRatio="none" role="img" aria-label={`${signal.title} timing pattern`}><rect className="timeline-bed" x="0" y="17" width={duration} height="14" rx="2" />{segments.map((part, index) => part.active ? <rect key={index} className={`timeline-sound timeline-${signal.kind === "gong" && part.patternIndex === 0 ? "bell" : signal.kind}`} x={part.start} y="12" width={part.duration} height="24" rx="1" /> : null)}{signal.repeat && starts.slice(1).map(start => <line key={start} className="repeat-mark" x1={start} x2={start} y1="4" y2="44" />)}<line className="playhead" x1={time} x2={time} y1="2" y2="46" /></svg><div className="timeline-scale"><span>0:00</span><span>{time.toFixed(1)} s</span><span>{Math.floor(duration / 60)}:{Math.round(duration % 60).toString().padStart(2, "0")}</span></div></div>;
}

function activeSignalLabel(signal: Signal, time: number) {
  if (!signalActive(time, signal.pattern, signal.repeat)) return "Silence";
  if (signal.kind === "light") return "Flash";
  if (signal.kind === "whistle") return "Sounding";
  if (signal.kind === "bell") return "Bell";
  const local = signal.repeat ? time % signal.repeat : time;
  return local < signal.pattern[0] ? "Bell" : "Gong";
}

function Picker({ mode, query, setQuery, selected, onSelect }: { mode: Props["mode"]; query: string; setQuery: (value: string) => void; selected: string; onSelect: (id: string) => void }) {
  const records = mode === "lights" ? VESSEL_PROFILES : SIGNALS;
  const matches = records.filter(record => `${record.title} ${"family" in record ? record.family : record.meaning} ${record.rule}`.toLowerCase().includes(query.trim().toLowerCase()));
  const current = records.find(record => record.id === selected);
  const filtered = current && !matches.some(record => record.id === selected) ? [current, ...matches] : matches;
  return <div className="lab-picker"><label><Search size={18} /><span className="sr-only">Search {mode === "lights" ? "conditions" : "signals"}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={mode === "lights" ? "Search vessel conditions" : "Search sound and light signals"} /></label><select aria-label={mode === "lights" ? "Vessel condition" : "Signal"} value={selected} onChange={e => onSelect(e.target.value)}>{filtered.length ? filtered.map(record => <option key={record.id} value={record.id}>{record.title}{"family" in record ? ` · ${record.family}` : ""}</option>) : <option value={selected}>No matches — current selection</option>}</select>{query.trim()&&!matches.length&&<p role="status">No matches. The current selection remains visible.</p>}</div>;
}

export default function TrainingLab({ mode, onRule, selectedId, onSelect }: Props) {
  const [localProfileId, setLocalProfileId] = useState("power-way"), [localSignalId, setLocalSignalId] = useState("starboard");
  const requestedProfileId = mode === "lights" ? selectedId ?? (onSelect ? "power-way" : localProfileId) : localProfileId, requestedSignalId = mode === "signals" ? selectedId ?? (onSelect ? "starboard" : localSignalId) : localSignalId;
  const baseProfile = VESSEL_PROFILES.find(item => item.id === requestedProfileId) ?? VESSEL_PROFILES[0], signal = SIGNALS.find(item => item.id === requestedSignalId) ?? SIGNALS[0];
  const profileId = baseProfile.id, signalId = signal.id;
  const [query, setQuery] = useState("");
  const [length, setLength] = useState(49), [view, setView] = useState<RecognitionView>("bow"), [night, setNight] = useState(true), [sectors, setSectors] = useState(false), [bearing, setBearing] = useState(35), [cameraReset, setCameraReset] = useState(0);
  const [optionState, setOptionState] = useState(() => ({ id: profileId, value: recognitionDefaults() }));
  const options = optionState.id === profileId ? optionState.value : recognitionDefaults();
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true), [speed, setSpeed] = useState(1);
  const lessonKey=`${mode}:${mode==='lights'?profileId:signalId}`;
  const [clockLesson,setClockLesson]=useState(lessonKey);
  const validClock=clockLesson===lessonKey;
  const shownTime=validClock?time:0, running=validClock&&playing;
  const root = useRef<HTMLElement>(null);
  const profile = useMemo(() => profileDisplay(profileId, length, options), [profileId, length, options]), readout = useMemo(() => recognitionReadout(profile, night, bearing), [profile, night, bearing]);
  const duration = mode === "signals" ? signalDuration(signal) : 10, flashes = hasFlashes(profile), canPlay = validClock&&(mode === "signals" || (night && flashes)), active = running && mode === "signals" && signalActive(shownTime, signal.pattern, signal.repeat);
  useSignalAudio(signal, shownTime, running && mode === "signals", muted);

  useEffect(() => { if (optionState.id !== profileId) setOptionState({ id: profileId, value: recognitionDefaults() }); }, [optionState.id, profileId]);
  useEffect(() => { setQuery(""); }, [mode]);
  useEffect(() => { setPlaying(false); setTime(0); setClockLesson(lessonKey); }, [lessonKey]);
  useEffect(() => { if (mode === "lights" && !night) { setPlaying(false); setTime(0); } }, [mode, night]);
  useEffect(() => { const hide = () => { if (document.hidden) setPlaying(false); }; document.addEventListener("visibilitychange", hide); return () => document.removeEventListener("visibilitychange", hide); }, []);
  useEffect(() => { const scope = root.current; if (!scope) return; const media = gsap.matchMedia(); media.add("(prefers-reduced-motion: no-preference)", () => { gsap.fromTo(scope.querySelectorAll("[data-lab-reveal]"), { opacity: 0, y: 8, clipPath: "inset(0 0 8% 0)" }, { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: .26, ease: "power2.out", stagger: .035, overwrite: "auto" }); }); return () => media.revert(); }, [mode, profileId, signalId]);
  useEffect(() => { if (!playing || !canPlay) return; let frame = 0, startedAt = performance.now(); const startTime = time; const tick = (now: number) => { const next = Math.min(duration, startTime + (now - startedAt) / 1000 * speed); setTime(next); if (next >= duration) { setPlaying(false); return; } frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [playing, canPlay, duration, speed]);

  const setOption = <K extends keyof OptionState>(key: K, value: OptionState[K]) => setOptionState(current => ({ id: profileId, value: { ...(current.id === profileId ? current.value : recognitionDefaults()), [key]: value } }));
  const selectProfile = (id: string) => { setOptionState({ id, value: recognitionDefaults() }); setPlaying(false); setTime(0); setLocalProfileId(id); onSelect?.(id); }, selectSignal = (id: string) => { setPlaying(false); setTime(0); setLocalSignalId(id); onSelect?.(id); }, scrub = (value: number) => { setPlaying(false); setTime(value); };
  const cameraOptions: Array<[RecognitionView, string]> = [["bow", "Bow"], ["starboard", "Starboard"], ["stern", "Stern"], ["port", "Port"], ["free", "Free"]];

  return <section className="training-lab" ref={root} data-mode={mode} data-night={night} aria-labelledby="training-title">
    <header className="lab-intro" data-lab-reveal><h1 id="training-title">{mode === "lights" ? "Read a vessel by what it shows" : "Hear the meaning before the vessel arrives"}</h1><p>{mode === "lights" ? "Choose a condition, move around the ship, then compare the lights or day shapes visible from your bearing." : "Choose one prescribed signal and follow its real timing, silence and repeat interval."}</p></header>
    <Picker mode={mode} query={query} setQuery={setQuery} selected={mode === "lights" ? profileId : signalId} onSelect={mode === "lights" ? selectProfile : selectSignal} />
    {mode === "lights" ? <Lights profile={profile} length={length} setLength={setLength} view={view} setView={setView} night={night} setNight={setNight} sectors={sectors} setSectors={setSectors} bearing={bearing} setBearing={setBearing} cameraReset={cameraReset} resetCamera={() => { setView("free"); setCameraReset(value => value + 1); }} time={shownTime} setTime={setTime} playing={running} setPlaying={setPlaying} duration={duration} readout={readout} options={options} setOption={setOption} cameraOptions={cameraOptions} /> : <Signals signal={signal} active={active} time={shownTime} duration={duration} playing={running} setPlaying={setPlaying} muted={muted} setMuted={setMuted} speed={speed} setSpeed={setSpeed} scrub={scrub} />}
    {mode === "signals" && <SignalDetails />}
    <details className="lab-details source-details"><summary>Source references</summary><div className="details-body"><ReferenceRail onRule={onRule} /><p className="source-note">{SOURCE_EDITION_NOTE} {mode === "lights" ? `${REFERENCES.rules}; ${REFERENCES.annex1}.` : `${REFERENCES.manoeuvringRules}; ${REFERENCES.annex3}; ${REFERENCES.annex4}.`} Models and overlays are explanatory, not engineering drawings.</p></div></details>
  </section>;
}

type LightsProps = { profile: VesselProfile; length: number; setLength: (n: number) => void; view: RecognitionView; setView: (v: RecognitionView) => void; night: boolean; setNight: (v: boolean) => void; sectors: boolean; setSectors: (fn: (v: boolean) => boolean) => void; bearing: number; setBearing: (n: number) => void; cameraReset: number; resetCamera: () => void; time: number; setTime: (n: number) => void; playing: boolean; setPlaying: (fn: (v: boolean) => boolean) => void; duration: number; readout: ReturnType<typeof recognitionReadout>; options: OptionState; setOption: <K extends keyof OptionState>(key: K, value: OptionState[K]) => void; cameraOptions: Array<[RecognitionView, string]> };
function Lights({ profile, length, setLength, view, setView, night, setNight, sectors, setSectors, bearing, setBearing, cameraReset, resetCamera, time, setTime, playing, setPlaying, duration, readout, options, setOption, cameraOptions }: LightsProps) {
  const flashes = hasFlashes(profile);
  return <><div className="recognition-grid"><div className="recognition-stage" data-lab-reveal><div className="display-controls" role="group" aria-label="Display mode"><button className={night ? "active" : ""} onClick={() => setNight(true)} aria-pressed={night}><Eye size={17} />Night lights</button><button className={!night ? "active" : ""} onClick={() => setNight(false)} aria-pressed={!night}><EyeOff size={17} />Day shapes</button>{night && <button className={sectors ? "active" : ""} onClick={() => setSectors(value => !value)} aria-pressed={sectors}>Sector overlay</button>}</div><div className="lab-scene-frame" aria-label="Vessel recognition scene"><RecognitionScene profile={profile} length={length} view={view} night={night} sectors={sectors} time={time} resetKey={cameraReset} onBearingChange={setBearing} /><div className="stage-wash" aria-hidden="true" /></div><div className="view-controls" role="group" aria-label="Observer viewpoint">{cameraOptions.map(([key, label]) => <button key={key} className={view === key ? "selected" : ""} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}<button className="view-reset" onClick={resetCamera}><RotateCcw size={15} />Reset view</button></div></div>
    <aside className="recognition-readout" data-lab-reveal><div className="readout-heading"><div><span>{profile.rule}</span><h2>{profile.title}</h2></div>{night && <SectorDiagram bearing={bearing} profile={profile} />}</div><p className="profile-summary">{profile.summary}</p><div className="status-line"><strong>{["anchor", "aground"].includes(profile.id) || options.anchored ? "At anchor" : profile.underway === false || !options.makingWay ? "Not making way" : "Making way"}</strong><span>{night ? `${readout.lights.length} visible light${readout.lights.length === 1 ? "" : "s"}` : `${readout.shapes.length} day shape${readout.shapes.length === 1 ? "" : "s"}`}</span></div><ConditionControls id={profile.id} options={options} setOption={setOption} kind="status" /><h3>{night ? "Visible from here" : "Day shapes"}</h3><p>{readout.explanation}</p>{night ? readout.lights.length ? <ul className="light-readout">{readout.lights.map((light, index) => <li key={`${light.label}-${index}`}><i style={{ background: light.color }} /><span>{light.label}</span></li>)}</ul> : <p className="empty-readout">No modeled light reaches this bearing.</p> : <Shapes items={readout.shapes} />}</aside></div>
    {night && flashes && <div className="flash-player"><strong>Flashing-light sequence</strong><button onClick={() => { if (time >= duration) setTime(0); setPlaying(value => !value); }}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "Pause" : "Play"}</button><input aria-label="Light flash timeline" type="range" min="0" max={duration} step="0.05" value={time} onChange={e => { setPlaying(() => false); setTime(Number(e.target.value)); }} /><span>{time.toFixed(1)} s</span></div>}
    <details className="lab-details"><summary>Details &amp; conditions</summary><div className="details-body"><p>{profile.note}</p><ConditionControls id={profile.id} options={options} setOption={setOption} /><div className="thresholds"><h3>Vessel length</h3><div>{LENGTHS.map(value => <button key={value} className={length === value ? "selected" : ""} aria-pressed={length === value} onClick={() => setLength(value)}>{value} m</button>)}</div><p>{length < 7 ? "Under 7 m: narrow exceptions may apply." : length < 12 ? "7–11 m: small-vessel provisions." : length < 20 ? "12–19 m: intermediate placement and range provisions." : length < 50 ? "20–49 m: full-size placement; second masthead may be omitted." : length < 100 ? "50–99 m: second masthead required for power-driven vessels." : "100 m+: anchor deck illumination and gong provisions apply."}</p></div><Measurements /><RangeTable length={length} /><TechnicalReference kind="lights" /></div></details></>;
}

function Signals({ signal, active, time, duration, playing, setPlaying, muted, setMuted, speed, setSpeed, scrub }: { signal: Signal; active: boolean; time: number; duration: number; playing: boolean; setPlaying: (fn: (v: boolean) => boolean) => void; muted: boolean; setMuted: (fn: (v: boolean) => boolean) => void; speed: number; setSpeed: (n: number) => void; scrub: (n: number) => void }) {
  return <article className={`signal-focus ${active ? "is-active" : ""}`} data-lab-reveal><header><div><span>Rule {signal.rule}</span><h2>{signal.title}</h2></div><span className={`signal-state signal-${signal.kind}`}>{active ? activeSignalLabel(signal, time) : "Silence"}</span></header><p className="signal-meaning">{signal.meaning}</p><SignalTimeline signal={signal} time={time} duration={duration} /><input className="timeline-scrubber" aria-label="Signal timeline" type="range" min="0" max={duration} step="0.05" value={time} onChange={e => scrub(Number(e.target.value))} /><div className="transport-actions"><button className="primary" onClick={() => { if (time >= duration) scrub(0); setPlaying(value => !value); }}>{playing ? <Pause size={17} /> : <Play size={17} />}{playing ? "Pause" : "Play sequence"}</button><button onClick={() => scrub(0)}><RotateCcw size={16} />Restart</button><label>Speed<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label><button onClick={() => setMuted(value => !value)} aria-pressed={!muted}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}{muted ? "Enable audio" : "Audio on"}</button></div>{signal.note && <p className="signal-note">{signal.note}</p>}</article>;
}

function SignalDetails() { return <div className="signal-details"><details className="lab-details"><summary>Timing language &amp; Rule 35 cases</summary><div className="details-body"><p>A short blast is about 1 second. A prolonged blast lasts 4–6 seconds; this lab uses 5 seconds. Rule 35 intervals are maxima: 2 minutes for underway fog signals and 1 minute for anchor or aground bell sequences.</p><p>Fishing or RAM at anchor uses prolonged–short–short instead of the anchor bell pattern (35(d)). A rigid pushing composite unit follows the power-driven signal (35(f)). Vessels 12–&lt;20 m may use another effective signal instead of the bell or gong sequences; vessels under 12 m may use another effective signal instead of any listed signal, at intervals no longer than two minutes (35(i–j)).</p><p><b>Annex III:</b> the sound-pressure table explicitly assigns its audibility ranges as ≥200 m, ≥75–&lt;200 m, ≥20–&lt;75 m, and &lt;20 m. Fundamental-frequency bands are distinct: 70–200 Hz at ≥200 m, 130–350 Hz at 75–&lt;200 m, and 250–700 Hz below 75 m. Ranges are informational and conditions can reduce them greatly.</p></div></details><details className="lab-details"><summary>Annex III · technical detail</summary><div className="details-body"><div className="annex-table"><table><thead><tr><th>Vessel length</th><th>Fundamental</th><th>Nominal range</th></tr></thead><tbody>{SOUND_AUDIBILITY_RANGES.map(row=><tr key={row.length}><td>{row.length}</td><td>{row.fundamental}</td><td>{row.range}</td></tr>)}</tbody></table><small>*For vessels under 20 m, the source audibility table gives separate measurement-band levels: 120 dB at 180–450 Hz, 115 dB at 450–800 Hz, or 111 dB at 800–2100 Hz.</small></div><TechnicalReference kind="sound" /></div></details><details className="lab-details"><summary>Annex IV · 15 distress signals + 2 additional signals</summary><div className="details-body"><DistressSigns /></div></details></div>; }



