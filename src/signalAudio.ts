import type {Signal} from './trainingData';
export function soundCue(signal:Signal,time:number):{kind:'whistle'|'bell'|'gong';key:string}|null{
 if(time<0||signal.kind==='light')return null;
 const cycle=signal.repeat?Math.floor(time/signal.repeat):0;
 const local=signal.repeat?time%signal.repeat:time;
 let start=0;
 for(let i=0;i<signal.pattern.length;i++){
  const duration=signal.pattern[i];
  if(local<start+duration){
   if(i%2)return null;
   const kind=signal.kind==='gong'?(i===0?'bell':'gong'):signal.kind;
   const strike=kind==='whistle'||duration<4?0:Math.floor((local-start)/.16);
   return {kind,key:`${signal.id}:${cycle}:${i}:${strike}`};
  }
  start+=duration;
 }
 return null;
}
