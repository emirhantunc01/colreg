import {useEffect,useRef} from 'react';
import type {Signal} from './trainingData';
import {soundCue} from './signalAudio';
export default function useSignalAudio(signal:Signal,time:number,playing:boolean,muted:boolean){
 const context=useRef<AudioContext|null>(null),nodes=useRef<OscillatorNode[]>([]),last=useRef('');
 const stop=()=>{for(const n of nodes.current){try{n.stop();}catch{}}nodes.current=[];last.current='';};
 useEffect(()=>{if(!playing||muted||document.hidden){stop();return;}
  const cue=soundCue(signal,time);
  if(!cue){if(signal.kind==='whistle')stop();return;}
  if(cue.key===last.current)return;
  if(cue.kind==='whistle')stop();
  try{
   context.current??=new AudioContext();const audio=context.current;
   if(audio.state==='suspended')void audio.resume();
   last.current=cue.key;
   const frequencies=cue.kind==='whistle'?[330]:cue.kind==='bell'?[780,1280,2190]:[110,173,263];
   for(const [i,frequency] of frequencies.entries()){
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.frequency.value=frequency;oscillator.type='sine';
    const volume=(cue.kind==='whistle'?.06:.035)/(i+1);
    gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(volume,audio.currentTime+.01);
    if(cue.kind!=='whistle')gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+(cue.kind==='gong'?1.3:.6));
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();nodes.current.push(oscillator);
    oscillator.onended=()=>{nodes.current=nodes.current.filter(n=>n!==oscillator);gain.disconnect();oscillator.disconnect();};
    if(cue.kind!=='whistle')oscillator.stop(audio.currentTime+(cue.kind==='gong'?1.4:.7));
   }
  }catch{stop();}
 },[signal,time,playing,muted]);
 useEffect(()=>()=>{stop();void context.current?.close();context.current=null;},[]);
}
