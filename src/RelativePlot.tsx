import {sampleTrack,type Scenario} from './engine';
export default function RelativePlot({scenario,time}:{scenario:Scenario;time:number}){
 const own=scenario.vessels[0],other=scenario.vessels[1];if(!other)return null;
 const a=sampleTrack(own.track,time),b=sampleTrack(other.track,time),de=b.east-a.east,dn=b.north-a.north;
 const range=Math.hypot(de,dn),bearing=((Math.atan2(de,dn)*180/Math.PI)+360)%360;
 const extent=Math.max(400,...scenario.vessels.flatMap(v=>v.track.map(p=>Math.hypot(p.east,p.north))));
 return <aside className="relative-plot" aria-label="Illustrative relative position diagram"><span>{scenario.environment.visibility==='restricted'?'RADAR CONTACT DIAGRAM':'RELATIVE MOTION'}</span><svg viewBox="0 0 160 160" role="img" aria-label={`Target bearing ${bearing.toFixed(0)} degrees true, range ${range.toFixed(0)} metres`}><circle cx="80" cy="80" r="68"/><circle cx="80" cy="80" r="34"/><path d="M80 12V148M12 80H148"/><text x="77" y="9">N</text><line x1="80" y1="80" x2={80+de/extent*65} y2={80-dn/extent*65}/><circle className="relative-own" cx="80" cy="80" r="3"/><circle className="relative-target" cx={80+de/extent*65} cy={80-dn/extent*65} r="4"/></svg><p>{bearing.toFixed(0).padStart(3,'0')}° T <span>{range.toFixed(0)} m</span></p><small>Authored positions · no radar simulation</small></aside>;
}
