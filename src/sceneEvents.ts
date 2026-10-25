export type SceneEvent={time:number;duration:number;type:'sound'|'light'|'annotation';text:string;pattern?:number[];vesselId?:string};
export function patternOn(elapsed:number,pattern:number[]){if(elapsed<0)return false;let edge=0;for(let i=0;i<pattern.length;i++){edge+=pattern[i];if(elapsed<edge)return i%2===0;}return false;}
export const activeEvents=(events:SceneEvent[],time:number)=>events.filter(e=>time>=e.time&&time<e.time+e.duration);
