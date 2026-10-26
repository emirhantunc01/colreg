import {DISTRESS_SIGNAL_GROUPS} from './trainingData';
// Schematic recognition aids. Radio and satellite alerts are represented as diagrams.
function Diagram({index,label}:{index:number;label:string}){
 const radio=[4,11,12,13,14].includes(index);
 return <svg viewBox="0 0 160 88" role="img" aria-label={label}>
  <path d="M6 76Q18 70 30 76T54 76T78 76T102 76T126 76T150 76" fill="none" stroke="#699b9d"/>
  {radio?<><path d="M30 66L45 28H69L84 66Z" fill="#386d70"/><path d="M57 30V15M85 19Q115 35 85 53M94 11Q135 35 94 63" fill="none" stroke="#669b86" strokeWidth="3"/><text x="104" y="77" textAnchor="middle" fontSize="11" fill="#28514c">{['','','','','MAYDAY','','','','','','','DSC 70','SATELLITE','EPIRB','SART'][index]}</text></>:
  index===3?<><text x="80" y="40" textAnchor="middle" fontSize="23" fill="#2f6956">SOS</text><text x="80" y="61" textAnchor="middle" fontSize="14" fill="#2f6956">··· — — — ···</text></>:
  index===5?<><g transform="translate(40 12)">{Array.from({length:16},(_,i)=><rect key={i} x={(i%4)*9} y={Math.floor(i/4)*9} width="9" height="9" fill={(Math.floor(i/4)+i%4)%2?'#fff':'#286ca0'}/>)}</g>{['#286ca0','#fff','#d55845','#fff','#286ca0'].map((c,i)=><rect key={c+i} x="86" y={12+i*7.2} width="36" height="7.2" fill={c}/>)}<text x="80" y="65" textAnchor="middle" fontSize="11" fill="#28514c">N · C</text></>:
  index===6?<><path d="M50 69V20" stroke="#36585b" strokeWidth="3"/><rect x="51" y="22" width="35" height="27" fill="#203637"/><circle cx="68" cy="10" r="8" fill="#203637"/></>:
  index===15?<><rect x="34" y="12" width="92" height="52" fill="#ed8d3f"/><rect x="50" y="27" width="20" height="20" fill="#203637"/><circle cx="101" cy="37" r="12" fill="#203637"/></>:
  index===10?<><circle cx="80" cy="18" r="7" fill="#36585b"/><path d="M80 27V53M80 35L48 12M80 35L112 12M80 53L65 70M80 53L95 70" stroke="#36585b" strokeWidth="5" fill="none"/><path d="M40 44L43 28M117 28L120 44" stroke="#a2aa88" strokeWidth="3" fill="none"/></>:
  index===9||index===16?<><ellipse cx="80" cy="65" rx="45" ry="9" fill="#ed8d3f" opacity=".5"/>{index===9&&[0,1,2].map(i=><circle key={i} cx={65+i*13} cy={48-i*14} r={10+i*2} fill="#ed8d3f" opacity={.9-i*.2}/>)}</>:
  index===7?<path d="M60 67Q35 48 68 19Q65 38 83 13Q117 53 92 67Z" fill="#e49a43" stroke="#cc6146" strokeWidth="3"/>:
  index===2||index===8?<><path d="M52 68L100 17" stroke="#a79776" strokeWidth="2" strokeDasharray="3"/><path d="M100 4L104 15L116 17L106 24L108 36L99 29L89 36L91 24L81 17L95 15Z" fill="#d9554c"/>{index===8&&<path d="M99 36L88 43L111 43Z" fill="#d9554c"/>}</>:
  index===0?<><path d="M40 63L78 41L84 49L46 71Z" fill="#36585b"/><path d="M87 37L100 20M95 42L120 35M91 51L112 60" stroke="#dc9b53" strokeWidth="4"/><text x="118" y="77" fontSize="10" fill="#28514c">~1 min</text></>:
  <><path d="M45 55V31L77 20V66Z" fill="#36585b"/><path d="M90 24Q115 43 90 62M102 16Q140 43 102 70" fill="none" stroke="#669b86" strokeWidth="3"/></>}
 </svg>;
}
export default function DistressSigns(){return <div>{DISTRESS_SIGNAL_GROUPS.map(group=><section key={group.title} aria-label={group.title}><h4>{group.title}</h4><div className="distress-signs">{group.signals.map((label,index)=><figure key={label}><Diagram index={group.offset+index} label={label}/><figcaption>{label}</figcaption></figure>)}<p>{group.note}</p></div></section>)}</div>}
