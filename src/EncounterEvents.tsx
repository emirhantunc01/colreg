import {useEffect,useRef,useState} from 'react';
import {activeEvents,patternOn,type SceneEvent} from './sceneEvents';
export default function EncounterEvents({events,time,playing}:{events:SceneEvent[];time:number;playing:boolean}){
 const [sound,setSound]=useState(false);
 const audio=useRef<AudioContext|null>(null),tone=useRef<OscillatorNode|null>(null);
 const active=activeEvents(events,time);
 const sounding=sound&&playing&&active.some(e=>e.type==='sound'&&patternOn(time-e.time,e.pattern??[]));
 useEffect(()=>{if(!sounding||document.hidden){tone.current?.stop();tone.current=null;return;}const ctx=audio.current;if(!ctx||ctx.state!=='running')return;const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.frequency.value=220;gain.gain.value=.045;oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();tone.current=oscillator;return()=>{oscillator.stop();if(tone.current===oscillator)tone.current=null;};},[sounding]);
 useEffect(()=>{const stop=()=>{if(document.hidden){setSound(false);}};document.addEventListener('visibilitychange',stop);return()=>{document.removeEventListener('visibilitychange',stop);void audio.current?.close();};},[]);
 return <div className="encounter-events">{events.some(e=>e.type==='sound')&&<button className="event-audio" aria-pressed={sound} onClick={async()=>{if(!sound){try{audio.current??=new AudioContext();await audio.current.resume();setSound(true);}catch{setSound(false);}}else setSound(false);}}>{sound?'Sound on':'Enable sound'} <span>synthetic whistle</span></button>}{active.map((e,i)=><div className="event-caption" key={i} data-active={e.type!=='sound'||patternOn(time-e.time,e.pattern??[])}><span>{e.type==='sound'?'SOUND SIGNAL':e.type==='light'?'LIGHT SIGNAL':'OBSERVE'}</span><p>{e.text}</p></div>)}</div>;
}
