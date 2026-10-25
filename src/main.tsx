import React,{lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,ChevronLeft,ChevronRight,Maximize2,Pause,Play,RotateCcw,Search,Settings2,SkipBack,SkipForward,X} from 'lucide-react';
import BrandMark from './BrandMark';
import ModelCredits from './ModelCredits';
import {gsap} from 'gsap';
import Scene,{type ViewMode} from './Scene';
import Cinematic from './Cinematic';
import EncounterPreview from './EncounterPreview';
import EncounterEvents from './EncounterEvents';
import RelativePlot from './RelativePlot';
import {advanceClock,parseLibrary,parseScenario,sampleTrack,type LibraryEntry,type Scenario} from './engine';
import {parseRoute,routeHash,type AppRoute,type LearningSection} from './navigation';
import './style.css';
import './design-system.css';
import './studio.css';
const TrainingLab=lazy(()=>import('./TrainingLab'));
const ReferenceLibrary=lazy(()=>import('./ReferenceLibrary'));
const base=import.meta.env.BASE_URL;
const format=(t:number)=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
const destinations:[LearningSection,string][]=[['encounters','Encounters'],['lights','Lights & Shapes'],['signals','Signals'],['rules','Rules']];
function useNavigation(){
 const [route,setRoute]=useState(()=>parseRoute(location.hash));
 useEffect(()=>{const change=()=>setRoute(parseRoute(location.hash));addEventListener('hashchange',change);return()=>removeEventListener('hashchange',change)},[]);
 const navigate=useCallback((next:AppRoute)=>{const hash=routeHash(next);if(location.hash===hash){setRoute(next);return;}location.hash=hash;},[]);
 return [route,navigate] as const;
}
function category(entry:LibraryEntry){
 const ids=entry.ruleIds??[];
 if(!ids.length)return 'Technical demonstrations';
 if(ids.includes('rule-19'))return 'Restricted visibility';
 if(ids.includes('rule-9')||ids.includes('rule-10'))return 'Channels & traffic lanes';
 if(ids.includes('rule-12')||ids.includes('rule-18'))return 'Sailing & vessel responsibilities';
 if(ids.some(id=>['rule-13','rule-14','rule-15','rule-16','rule-17'].includes(id)))return 'Vessels in sight';
 return 'Foundations of safe navigation';
}
function App(){
 const [route,navigate]=useNavigation();
 const [entries,setEntries]=useState<LibraryEntry[]>([]),[libraryError,setLibraryError]=useState(''),[retry,setRetry]=useState(0);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('All encounters'),[activePreview,setActivePreview]=useState<string|null>(null);
 const [scenario,setScenario]=useState<Scenario|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[view,setView]=useState<ViewMode>('orbit'),[selected,setSelected]=useState('');
 const [labels,setLabels]=useState(true),[arrows,setArrows]=useState(false),[trails,setTrails]=useState(false),[plannedRoutes,setPlannedRoutes]=useState(true),[grid,setGrid]=useState(false),[settings,setSettings]=useState(false),[autoOrbit,setAutoOrbit]=useState(false);
 const [sources,setSources]=useState(false),[instantMotion,setInstantMotion]=useState(false);
 const [fullscreenError,setFullscreenError]=useState('');
 const clock=useRef(0),stage=useRef<HTMLDivElement>(null),sourceDialog=useRef<HTMLDialogElement>(null),workspace=useRef<HTMLDivElement>(null);
 clock.current=time;
 const selectedId=route.section==='encounters'?route.encounterId:undefined;
 useEffect(()=>{const abort=new AbortController();setLibraryError('');fetch(`${base}scenarios/index.json`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('The encounter library could not load.');return r.json()}).then(raw=>setEntries(parseLibrary(raw))).catch(e=>{if(e.name!=='AbortError')setLibraryError(e.name==='ZodError'?'The encounter library contains invalid data.':e.message)});return()=>abort.abort()},[retry]);
 useEffect(()=>{setPlaying(false);setSources(false);setSettings(false);setAutoOrbit(false);setFullscreenError('');window.scrollTo(0,0)},[route.section,selectedId]);
 useEffect(()=>{document.title=route.section==='intro'?'COLREG 3D · Read the encounter':`COLREG 3D · ${destinations.find(([id])=>id===route.section)?.[1]??'Encounter studies'}`},[route.section]);
 useEffect(()=>{if(!workspace.current)return;const media=gsap.matchMedia();media.add('(prefers-reduced-motion: no-preference)',()=>{gsap.fromTo(workspace.current,{opacity:.85,y:6},{opacity:1,y:0,duration:.28,ease:'power2.out',overwrite:true})});return()=>media.revert()},[route.section,selectedId]);
 useEffect(()=>{
  if(!selectedId){setScenario(null);return;}
  if(!entries.length)return;
  const entry=entries.find(e=>e.id===selectedId);setScenario(null);setTime(0);setLoading(true);setError('');
  if(!entry){setLoading(false);setError('This encounter is not in the library. Choose another scene.');return;}
  const abort=new AbortController();
  fetch(`${base}scenarios/${entry.file}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('This encounter could not load.');return r.json()}).then(raw=>{
   const next=parseScenario(raw);if(next.id!==entry.id||next.duration!==entry.duration)throw Error('The scene does not match its library entry.');
   setScenario(next);setSelected(next.vessels[0].id);setView('orbit');setTime(0);setLoading(false);
  }).catch(e=>{if(e.name!=='AbortError'){setError(e.name==='ZodError'?'This encounter has missing or invalid data. Select another scene.':e.message);setLoading(false)}});
  return()=>abort.abort();
 },[selectedId,entries,retry]);
 useEffect(()=>{
  if(!playing||!scenario)return;
  let frame=0,last:number|undefined;
  const tick=(now:number)=>{if(last!==undefined){const next=advanceClock(clock.current,Math.min((now-last)/1000,.25),speed,scenario.duration);clock.current=next.time;setTime(next.time);if(!next.playing){setPlaying(false);return;}}last=now;frame=requestAnimationFrame(tick)};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing,speed,scenario]);
 useEffect(()=>{const hide=()=>{if(document.hidden)setPlaying(false)};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
 useEffect(()=>{if(sources)sourceDialog.current?.showModal();else sourceDialog.current?.close()},[sources]);
 const openRule=useCallback((id:string)=>navigate({section:'rules',ruleId:id}),[navigate]);
 const openEncounter=useCallback((id:string)=>navigate({section:'encounters',encounterId:id}),[navigate]);
 const toggleFullscreen=async()=>{try{setFullscreenError('');if(document.fullscreenElement)await document.exitFullscreen();else if(stage.current?.requestFullscreen)await stage.current.requestFullscreen();else setFullscreenError('Fullscreen is unavailable in this browser. The scene remains available here.')}catch{setFullscreenError('Fullscreen could not open. You can continue using the scene here.')}};
 const seek=(t:number)=>{setPlaying(false);setTime(Math.max(0,Math.min(scenario?.duration??0,t)))};
 const toggle=()=>{if(scenario&&time>=scenario.duration)setTime(0);setPlaying(v=>!v)};
 const stepIndex=scenario?scenario.steps.reduce((result,s,i)=>s.time<=time?i:result,0):0;
 const step=scenario?.steps[stepIndex];
 const filtered=entries.filter(e=>(filter==='All encounters'||category(e)===filter)&&`${e.title} ${e.subtitle} ${e.ruleIds.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 const groups=['Foundations of safe navigation','Vessels in sight','Sailing & vessel responsibilities','Channels & traffic lanes','Restricted visibility','Technical demonstrations'].filter(group=>entries.some(entry=>category(entry)===group));
 if(route.section==='intro')return <><Cinematic onEnter={()=>openEncounter('head-on-powered')}/><footer className="model-credits-intro"><ModelCredits/></footer></>;
 return <div className="learning-app">
  <a className="skip-link" href="#workspace-content" onClick={e=>{e.preventDefault();document.getElementById('workspace-content')?.focus()}}>Skip to content</a>
  <header className="site-header">
   <a className="wordmark" href={routeHash({section:'intro'})||'#'} aria-label="COLREG 3D home"><BrandMark/><span>COLREG <small>3D</small></span></a>
   <nav className="main-navigation" aria-label="Learning sections">{destinations.map(([id,label])=><a href={routeHash({section:id})} key={id} aria-current={route.section===id?'page':undefined}>{label}</a>)}</nav>
   <a className="opening-link" href="#">The encounter <ArrowUpRight size={15}/></a>
  </header>
  <div id="workspace-content" tabIndex={-1} ref={workspace}>
  {route.section==='encounters'&&!selectedId&&<main className="encounter-collection">
   <div className="collection-heading"><div><h1>See the meeting.<br/>Understand the move.</h1><p>Explore encounters through their conditions, tracks and source rules.</p></div><p className="collection-summary">{entries.length} encounters<br/>One perspective at a time.</p></div>
   <div className="collection-tools"><label className="collection-search"><Search size={20}/><input aria-label="Search encounters" type="search" placeholder="Search a situation or rule" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Show <select aria-label="Encounter category" value={filter} onChange={e=>setFilter(e.target.value)}><option>All encounters</option>{groups.map(g=><option key={g}>{g}</option>)}</select></label><span>{filtered.length} {filtered.length===1?'scene':'scenes'}</span></div>
   {libraryError?<div className="content-error" role="alert"><h2>Library unavailable</h2><p>{libraryError}</p><button onClick={()=>setRetry(v=>v+1)}>Try again</button></div>:!entries.length?<p role="status">Loading encounters…</p>:!filtered.length?<div className="empty-results"><h2>No matching encounters</h2><p>Try another condition, title or rule number.</p><button onClick={()=>{setQuery('');setFilter('All encounters')}}>Clear search</button></div>:groups.filter(g=>filtered.some(e=>category(e)===g)).map(g=><section className="collection-group" key={g}><h2>{g}</h2><div className="encounter-rows">{filtered.filter(e=>category(e)===g).map(entry=><a className="encounter-row" href={routeHash({section:'encounters',encounterId:entry.id})} key={entry.id} onPointerEnter={e=>{if(e.pointerType!=='touch')setActivePreview(entry.id)}} onPointerLeave={()=>setActivePreview(null)} onFocus={()=>setActivePreview(entry.id)} onBlur={()=>setActivePreview(null)}>{entry.preview&&<EncounterPreview preview={entry.preview} active={activePreview===entry.id}/>}<div className="encounter-row-copy"><h3>{entry.title}</h3><p>{entry.preview?.conditions[0]??entry.subtitle}</p><small>{entry.subtitle}</small></div><span className="encounter-row-duration">{format(entry.duration)}</span><ArrowUpRight size={22}/></a>)}</div></section>)}
   <footer className="collection-footer"><h2>Read the rule.<br/>Return to the scene.</h2><a href={routeHash({section:'rules'})}>41 rules and four annexes <ArrowRight size={22}/></a></footer>
  </main>}
  {route.section==='encounters'&&selectedId&&<main className="encounter-study">
   <div className="study-heading"><div><a href={routeHash({section:'encounters'})} className="back-link"><ArrowLeft size={16}/>All encounters</a><h1>{scenario?.title??(loading?'Preparing your encounter…':'Encounter study')}</h1></div><button className="text-action" onClick={()=>{setPlaying(false);setSources(true)}} disabled={!scenario}>Source & notes <BookOpen size={17}/></button></div>
   {libraryError||error?<div className="content-error" role="alert"><h2>Unable to open this scene</h2><p>{libraryError||error}</p><button onClick={()=>setRetry(v=>v+1)}>Reload</button><a href={routeHash({section:'encounters'})}>Choose another encounter</a></div>:!scenario?<div className="scene-loading" role="status">Preparing the sea and vessels…</div>:<>
    <div className="study-stage" ref={stage}>
     <Scene scenario={scenario} time={time} view={view} selected={selected} labels={labels} arrows={arrows} trails={trails} plannedRoutes={plannedRoutes} grid={grid} autoOrbit={autoOrbit} instantMotion={instantMotion}/>
     <button className="fullscreen-control" aria-label="Toggle fullscreen" onClick={()=>void toggleFullscreen()}><Maximize2 size={18}/></button>
     {fullscreenError&&<p className="scene-error" role="status">{fullscreenError}</p>}
     <span className="scene-gesture">{view==='orbit'?'Drag to orbit · Scroll to zoom':view==='bridge'?'On board the selected vessel':'North-up overview'}</span>
    </div>
    <div className="study-tools"><div role="group" aria-label="Camera views">{([['orbit','Free'],['overhead','Overhead'],['bridge','Bridge']] as const).map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>{setAutoOrbit(false);setView(id)}}>{label}</button>)}</div>{view==='bridge'&&<label>On board <select aria-label="Bridge vessel" value={selected} onChange={e=>setSelected(e.target.value)}>{scenario.vessels.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}<span className="scene-units">Metres · Seconds</span><button className="text-action" aria-expanded={settings} onClick={()=>setSettings(v=>!v)}><Settings2 size={17}/>Scene settings</button></div>
    {settings&&<section className="scene-settings" aria-label="Scene settings"><h2>Show what matters</h2><div className="setting-switches">{([['Vessel names',labels,setLabels],['Heading arrows',arrows,setArrows],['Movement tracks',trails,setTrails],['Planned routes',plannedRoutes,setPlannedRoutes],['Distance grid',grid,setGrid],['Auto orbit',autoOrbit,setAutoOrbit],['Instant camera changes',instantMotion,setInstantMotion]] as const).map(([label,value,set])=><label key={label}><input type="checkbox" checked={value} onChange={e=>set(e.target.checked)}/>{label}</label>)}</div><div className="vessel-facts">{scenario.vessels.map(v=><div key={v.id}><strong>{v.name}</strong><span>{v.length} m · {Math.round(sampleTrack(v.track,time).heading).toString().padStart(3,'0')}° heading</span></div>)}</div></section>}
    <section className="study-transport" aria-label="Encounter player"><div className="timeline-top"><span>{playing?'Playing encounter':'Encounter timeline'}</span><time>{format(time)} / {format(scenario.duration)}</time></div><div className="study-timeline"><input type="range" aria-label="Encounter time" min="0" max={scenario.duration} step=".1" value={time} onChange={e=>seek(Number(e.target.value))}/><div className="timeline-chapters">{scenario.steps.map((s,i)=><button key={s.time} style={{left:`${s.time/scenario.duration*100}%`}} aria-label={`Jump to step ${i+1}: ${s.title}`} title={s.title} onClick={()=>seek(s.time)}/>)}</div></div><div className="transport-row"><div className="transport-buttons"><button aria-label="Restart" onClick={()=>seek(0)}><RotateCcw size={19}/></button><button aria-label="Back 5 seconds" onClick={()=>seek(time-5)}><SkipBack size={19}/></button><button className="primary-action" aria-label={playing?'Pause':'Play'} onClick={toggle}>{playing?<Pause size={18}/>:<Play size={18}/>}<span>{playing?'Pause':'Play encounter'}</span></button><button aria-label="Forward 5 seconds" onClick={()=>seek(time+5)}><SkipForward size={19}/></button></div><label>Playback <select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label></div></section>
    <section className="observation-band"><div className="observation-heading"><span>{format(step?.time??0)} / {format(scenario.duration)}</span><h2>{step?.title}</h2></div><div className="observation-copy"><p>{step?.body}</p><div className="observation-actions"><button disabled={stepIndex===0} onClick={()=>seek(scenario.steps[stepIndex-1].time)}><ChevronLeft size={17}/>Previous</button><button disabled={stepIndex===scenario.steps.length-1} onClick={()=>seek(scenario.steps[stepIndex+1].time)}>Next observation<ChevronRight size={17}/></button></div></div><nav className="observation-index" aria-label="Observation chapters">{scenario.steps.map((s,i)=><button key={s.time} aria-current={stepIndex===i?'step':undefined} onClick={()=>seek(s.time)}>{s.title}</button>)}</nav></section>
    <section className="encounter-context" aria-label="Scene observations"><EncounterEvents key={scenario.id} events={scenario.events} time={time} playing={playing&&!sources}/>{scenario.environment.windFrom!==undefined&&<p>Wind from {scenario.environment.windFrom}° true · illustrative</p>}{(scenario.ruleIds.includes('rule-7')||scenario.ruleIds.includes('rule-19'))&&<RelativePlot scenario={scenario} time={time}/>}</section>
    <p className="study-assumptions">{scenario.status==='technical-demo'?'Technical demo — not validated COLREG instruction':'Source-linked learning scene. Distances, timings and separation are illustrative.'}</p>
   </>}
  </main>}
  <Suspense fallback={<main className="workspace-loading" role="status">Loading learning workspace…</main>}>
   {(route.section==='lights'||route.section==='signals')&&<TrainingLab mode={route.section} selectedId={route.section==='lights'?route.profileId:route.signalId} onSelect={id=>navigate(route.section==='lights'?{section:'lights',profileId:id}:{section:'signals',signalId:id})} onRule={openRule}/>}
   {route.section==='rules'&&<ReferenceLibrary selectedId={route.ruleId} onSelect={openRule} onEncounter={openEncounter} encounters={entries}/>}
  </Suspense>
  <footer className="model-credits-footer"><ModelCredits/></footer>
  </div>
  <dialog className="source-dialog" ref={sourceDialog} onCancel={()=>setSources(false)} onClose={()=>setSources(false)}><button className="dialog-close" aria-label="Close source notes" onClick={()=>setSources(false)}><X size={22}/></button>{scenario&&<><h2>Source & scene notes</h2><p>{scenario.title}</p><h3>Conditions</h3><ul>{scenario.conditions.map(c=><li key={c}>{c}</li>)}</ul><h3>Reference material</h3>{scenario.ruleIds.map(id=><button className="text-action" key={id} onClick={()=>{setSources(false);openRule(id)}}>{id.replace('rule-','Rule ')}<ArrowUpRight size={16}/></button>)}{scenario.sources.map((s,i)=><p key={i}>{s.title} · {s.pages} {s.rule}</p>)}<h3>Animation assumptions</h3><ul>{scenario.assumptions.map(a=><li key={a}>{a}</li>)}</ul></>}</dialog>
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
