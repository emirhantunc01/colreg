export type LightColor = "white" | "red" | "green" | "yellow";
export type LightSector = {start: number; end: number};
export type LightMark = {
  color: LightColor;
  label: string;
  sector?: LightSector;
  y: number;
  x?: number;
  z?: number;
  flashing?: boolean;
  flashPeriod?:number;
  flashPhase?:number;
};
export type ShapeMark = "ball" | "diamond" | "cone-down" | "cone-up" | "cylinder" | "cones-apex" | "flag-a";
export type VesselProfile = {
  id: string;
  title: string;
  rule: string;
  family: string;
  summary: string;
  note: string;
  lights: LightMark[];
  shapes?: ShapeMark[];
  underway?: boolean;
};

const normal: LightMark[] = [
  {color:"white",label:"Masthead · 225°",sector:{start:247.5,end:112.5},y:8,z:-2},
  {color:"green",label:"Starboard · 112.5°",sector:{start:0,end:112.5},y:3,x:2,z:-2},
  {color:"red",label:"Port · 112.5°",sector:{start:247.5,end:360},y:3,x:-2,z:-2},
  {color:"white",label:"Stern · 135°",sector:{start:112.5,end:247.5},y:3,z:5},
];
const stack = (colors: LightColor[], label: string): LightMark[] => colors.map((color,index)=>({color,label,y:11-index*2.2}));
const withWay = (lights: LightMark[]) => [...lights, ...normal.slice(1)];

export const LENGTHS = [7,11,19,49,50,100] as const;
export const LIGHT_SECTORS = [
  {name:"Masthead",color:"white" as const,arc:"225°",sector:{start:247.5,end:112.5}},
  {name:"Starboard sidelight",color:"green" as const,arc:"112.5°",sector:{start:0,end:112.5}},
  {name:"Port sidelight",color:"red" as const,arc:"112.5°",sector:{start:247.5,end:360}},
  {name:"Sternlight",color:"white" as const,arc:"135°",sector:{start:112.5,end:247.5}},
  {name:"All-round",color:"white" as const,arc:"360°",sector:{start:0,end:360}},
] as const;

export const VESSEL_PROFILES: VesselProfile[] = [
  {id:"power-way",title:"Power-driven · making way",rule:"Rule 23",family:"Power",summary:"Masthead, sidelights and sternlight; a second masthead is required at 50 m and above.",note:"Underway means not at anchor, made fast to shore, or aground. Making way means moving through the water.",lights:normal,underway:true},
  {id:"power-stopped",title:"Power-driven · stopped in water",rule:"Rules 23 & 35(b)",family:"Power",summary:"The same navigation lights remain displayed while underway but stopped; the distinction becomes audible in restricted visibility.",note:"Two prolonged blasts about two seconds apart identify underway but stopped and making no way through the water.",lights:normal,underway:false},
  {id:"sailing",title:"Sailing vessel",rule:"Rule 25",family:"Sail & oar",summary:"Sidelights and sternlight; optional all-round red over green may be shown at or near the masthead.",note:"A vessel under sail and machinery is a power-driven vessel and shows a cone apex downward by day.",lights:[...normal.slice(1),...stack(["red","green"],"Optional red over green")],shapes:[]},
  {id:"motor-sailing",title:"Motor sailing",rule:"Rule 25(e)",family:"Sail & oar",summary:"Power-driven lights apply when machinery propels the vessel, with a cone apex downward by day.",note:"The cone is a daytime signal; it is not added as a navigation light.",lights:normal,shapes:["cone-down"]},
  {id:"rowing",title:"Vessel under oars",rule:"Rule 25(d)",family:"Sail & oar",summary:"May exhibit sailing-vessel lights; otherwise keeps an electric torch or white light ready in time to prevent collision.",note:"The ready white light is not an all-night all-round-light substitute in this teaching view.",lights:[{color:"white",label:"Ready white light",y:5}]},
  {id:"towing",title:"Towing astern",rule:"Rule 24(a)",family:"Tow & push",summary:"Two masthead lights vertically, or three when tow length exceeds 200 m; sidelights, sternlight and yellow towing light above it.",note:"A diamond is also shown by day when tow length exceeds 200 m. Rule 24(d) carries across the second-masthead provision for vessels 50 m and above.",lights:[...stack(["white","white"],"Towing mastheads"),...normal.slice(1),{color:"yellow",label:"Towing light · 135°",sector:{start:112.5,end:247.5},y:5,z:5}],shapes:["diamond"]},
  {id:"pushing",title:"Pushing / alongside tow",rule:"Rule 24(b–c)",family:"Tow & push",summary:"A composite unit is treated as one power-driven vessel; otherwise the pushing vessel shows two mastheads, sidelights and sternlight.",note:"The configuration depends on whether the vessels are rigidly connected as a composite unit.",lights:[...stack(["white","white"],"Pushing mastheads"),...normal.slice(1)]},
  {id:"trawling",title:"Fishing · trawling",rule:"Rule 26(b)",family:"Fishing",summary:"All-round green over white; add sidelights and sternlight only when making way through the water.",note:"A masthead light is shown abaft and higher; vessels under 50 m are not obliged to show it.",lights:withWay(stack(["green","white"],"Trawling")),shapes:["cones-apex"]},
  {id:"fishing",title:"Fishing · other than trawling",rule:"Rule 26(c)",family:"Fishing",summary:"All-round red over white. If gear extends more than 150 m horizontally, show an all-round white light toward the gear.",note:"Sidelights and sternlight are added only when making way through the water.",lights:[...withWay(stack(["red","white"],"Fishing")),{color:"white",label:"Gear >150 m",y:6,x:8}],shapes:["cones-apex"]},
  {id:"nuc",title:"Not under command",rule:"Rule 27(a)",family:"Restricted",summary:"Two all-round red lights or two balls; sidelights and sternlight are added only when making way.",note:"These are status signals, not distress signals.",lights:withWay(stack(["red","red"],"Not under command")),shapes:["ball","ball"]},
  {id:"ram",title:"Restricted in ability to manoeuvre",rule:"Rule 27(b)",family:"Restricted",summary:"All-round red–white–red or ball–diamond–ball; navigation lights are added when making way.",note:"At anchor, the Rule 30 anchor signals are also added.",lights:withWay(stack(["red","white","red"],"Restricted manoeuvrability")),shapes:["ball","diamond","ball"]},
  {id:"dredging",title:"Dredging / underwater operations",rule:"Rule 27(d)",family:"Restricted",summary:"RAM signals plus two red on the obstructed side and two green on the safe-passage side.",note:"By day, two balls mark the obstruction and two diamonds mark the safe side, in addition to ball–diamond–ball.",lights:[...stack(["red","white","red"],"Restricted manoeuvrability"),...stack(["red","red"],"Obstructed side").map(l=>({...l,x:-6})),...stack(["green","green"],"Safe side").map(l=>({...l,x:6}))],shapes:["ball","diamond","ball","ball","ball","diamond","diamond"]},
  {id:"mineclearance",title:"Mine-clearance vessel",rule:"Rule 27(f)",family:"Restricted",summary:"Three all-round green lights, or three balls, placed at the foremast head and fore-yard ends in addition to the applicable power-driven or anchor display.",note:"The signals warn that approaching within 1,000 m is dangerous.",lights:[{color:"green",label:"Mine clearance",y:11},{color:"green",label:"Mine clearance",y:8,x:-5},{color:"green",label:"Mine clearance",y:8,x:5}],shapes:["ball","ball","ball"]},
  {id:"diving",title:"Diving operations · compact vessel",rule:"Rule 27(e)",family:"Restricted",summary:"When the full dredging display is impracticable: red–white–red and a rigid International Code flag A at least 1 m high.",note:"The flag must be visible all around. This diagram marks the flag location and minimum height; it is not to scale.",lights:stack(["red","white","red"],"Diving operation"),shapes:["flag-a"]},
  {id:"trawl-shooting",title:"Trawler · shooting nets",rule:"Annex II 2(a)",family:"Fishing extras",summary:"Two all-round white lights vertically below the ordinary fishing lights.",note:"Annex II additional signal for trawlers of 20 m or more; smaller trawlers may show it.",lights:stack(["white","white"],"Shooting nets")},
  {id:"trawl-hauling",title:"Trawler · hauling nets",rule:"Annex II 2(a)",family:"Fishing extras",summary:"All-round white over red below the ordinary fishing lights.",note:"This is an additional fishing signal, not the vessel's complete navigation display.",lights:stack(["white","red"],"Hauling nets")},
  {id:"trawl-obstructed",title:"Trawler · net fast on obstruction",rule:"Annex II 2(a)",family:"Fishing extras",summary:"Two all-round red lights vertically below the ordinary fishing lights.",note:"Shown while the net is fast on an obstruction.",lights:stack(["red","red"],"Net fast")},
  {id:"pair-trawling",title:"Pair trawling",rule:"Annex II 2(b)",family:"Fishing extras",summary:"Each vessel directs a searchlight forward toward its partner at night, with the additional net-handling signals as applicable.",note:"This single-vessel profile marks the forward searchlight; the other vessel is not modeled. These signals supplement the Rule 26 trawling display.",lights:[{color:"white",label:"Forward searchlight toward partner",sector:{start:340,end:20},y:10,z:-5}]},
  {id:"purse-seine",title:"Purse seine · hampered by gear",rule:"Annex II 3",family:"Fishing extras",summary:"Two all-round yellow lights flash alternately once each second, with equal light and dark periods.",note:"These lights may be shown only while the vessel is hampered by its fishing gear.",lights:[{color:"yellow",label:"Alternating yellow A",y:10,flashing:true},{color:"yellow",label:"Alternating yellow B",y:7,flashing:true}]},
  {id:"cbd",title:"Constrained by draught",rule:"Rule 28",family:"Restricted",summary:"A power-driven vessel may add three all-round red lights or a cylinder where best seen.",note:"The three red lights and cylinder are optional under Rule 28; ordinary power-driven lights still apply.",lights:[...normal,...stack(["red","red","red"],"Constrained by draught")],shapes:["cylinder"]},
  {id:"pilot",title:"Pilot vessel on duty",rule:"Rule 29",family:"Service",summary:"All-round white over red; sidelights and sternlight when underway, anchor signals when at anchor.",note:"When not engaged on pilotage duty, the vessel shows the signals appropriate to a vessel of its size and type.",lights:withWay(stack(["white","red"],"Pilot on duty"))},
  {id:"anchor",title:"At anchor",rule:"Rule 30(a–c)",family:"Stationary",summary:"Forward all-round white and a lower aft all-round white; vessels under 50 m may show one all-round white.",note:"Vessels 100 m and above must also illuminate decks. A vessel under 7 m outside channels, anchorages and trafficked areas is excepted.",lights:[{color:"white",label:"Forward anchor light",y:9,z:-5},{color:"white",label:"Lower aft anchor light",y:5,z:5}],shapes:["ball"]},
  {id:"aground",title:"Aground",rule:"Rule 30(d–f)",family:"Stationary",summary:"Anchor lights plus two all-round red lights and three balls.",note:"A vessel under 12 m is not required to show the additional two reds and three balls.",lights:[{color:"white",label:"Forward anchor light",y:9,z:-5},{color:"white",label:"Lower aft anchor light",y:5,z:5},...stack(["red","red"],"Aground")],shapes:["ball","ball","ball"]},
  {id:"hovercraft",title:"Air-cushion vessel",rule:"Rule 23(b)",family:"Special craft",summary:"When operating in non-displacement mode, adds an all-round flashing yellow light to power-driven lights.",note:"Flashing means regular intervals at 120 flashes per minute or more under Rule 21(f).",lights:[...normal,{color:"yellow",label:"Flashing all-round yellow",y:12,flashing:true}]},
  {id:"wig",title:"Wing-in-ground craft",rule:"Rule 23(c)",family:"Special craft",summary:"When taking off, landing or flying near the surface, adds a high-intensity all-round flashing red light.",note:"When operating on the water it follows the rules for power-driven vessels.",lights:[...normal,{color:"red",label:"Flashing all-round red",y:12,flashing:true}]},
  {id:"seaplane",title:"Seaplane",rule:"Rule 31",family:"Special craft",summary:"Where prescribed positions or characteristics are impracticable, shows lights and shapes as closely similar as possible.",note:"This is a practical-equivalence provision, not a unique seaplane light pattern.",lights:normal},
];

export type Signal = {id:string;title:string;rule:string;meaning:string;pattern:number[];repeat?:number;kind:"whistle"|"bell"|"gong"|"light";note?:string};
const S=1, L=5, G=1;
const seq=(...tones:number[])=>tones.flatMap((tone,i)=>i===tones.length-1?[tone]:[tone,G]);
export const SIGNALS: Signal[] = [
  {id:"starboard",title:"One short",rule:"34(a)",meaning:"I am altering course to starboard",pattern:seq(S),kind:"whistle"},
  {id:"port",title:"Two short",rule:"34(a)",meaning:"I am altering course to port",pattern:seq(S,S),kind:"whistle"},
  {id:"astern",title:"Three short",rule:"34(a)",meaning:"I am operating astern propulsion",pattern:seq(S,S,S),kind:"whistle"},
  {id:"overtake-starboard",title:"Two prolonged + one short",rule:"34(c)",meaning:"I intend to overtake on your starboard side",pattern:seq(L,L,S),kind:"whistle"},
  {id:"overtake-port",title:"Two prolonged + two short",rule:"34(c)",meaning:"I intend to overtake on your port side",pattern:seq(L,L,S,S),kind:"whistle"},
  {id:"agreement",title:"Prolonged · short · prolonged · short",rule:"34(c)",meaning:"Agreement to being overtaken in a narrow channel",pattern:seq(L,S,L,S),kind:"whistle"},
  {id:"doubt",title:"At least five short and rapid",rule:"34(d)",meaning:"Doubt or danger",pattern:seq(S,S,S,S,S),kind:"whistle"},
  {id:"bend",title:"One prolonged",rule:"34(e)",meaning:"Approaching an obscured bend or obstruction",pattern:seq(L),kind:"whistle"},
  {id:"fog-making-way",title:"One prolonged / 2 min",rule:"35(a)",meaning:"Power-driven vessel making way",pattern:seq(L),repeat:120,kind:"whistle"},
  {id:"fog-stopped",title:"Two prolonged / 2 min",rule:"35(b)",meaning:"Power-driven vessel underway but stopped",pattern:[L,2,L],repeat:120,kind:"whistle"},
  {id:"fog-restricted",title:"Prolonged + two short / 2 min",rule:"35(c)",meaning:"NUC, RAM, constrained draught, sailing, fishing, towing or pushing",pattern:seq(L,S,S),repeat:120,kind:"whistle"},
  {id:"towed-manned",title:"Prolonged + three short / 2 min",rule:"35(e)",meaning:"Last vessel of a tow, if manned",pattern:seq(L,S,S,S),repeat:120,kind:"whistle",note:"When practicable, sounded immediately after the towing vessel."},
  {id:"anchor",title:"Rapid bell · about 5 s / 1 min",rule:"35(g)",meaning:"Vessel at anchor",pattern:[5],repeat:60,kind:"bell",note:"The audio demo is a synthetic timing cue, not a certified physical bell."},
  {id:"anchor-large",title:"Bell then gong · about 5 s each / 1 min",rule:"35(g)",meaning:"Vessel at anchor, 100 m or more",pattern:seq(5,5),repeat:60,kind:"gong",note:"Bell forward, then gong aft. The demo tones only illustrate timing."},
  {id:"aground",title:"3 strokes · rapid bell · 3 strokes",rule:"35(h)",meaning:"Vessel aground",pattern:seq(S,S,S,5,S,S,S),repeat:60,kind:"bell",note:"Physical bell/gong character and striking are described; synthesized audio only marks the sequence."},
  {id:"pilot",title:"Four short identity signal",rule:"35(k)",meaning:"Pilot vessel on duty; may supplement its applicable Rule 35 signal",pattern:seq(S,S,S,S),kind:"whistle"},
  {id:"anchor-warning",title:"Short · prolonged · short",rule:"35(g)",meaning:"Optional anchor warning to an approaching vessel",pattern:seq(S,L,S),kind:"whistle"},
  {id:"light-starboard",title:"One white flash",rule:"34(b)",meaning:"Optional light supplement: altering to starboard",pattern:seq(S),kind:"light",note:"Each flash lasts about one second; successive signals are separated by at least 10 seconds."},
  {id:"light-port",title:"Two white flashes",rule:"34(b)",meaning:"Optional light supplement: altering to port",pattern:seq(S,S),kind:"light",note:"The gap between flashes is about one second."},
  {id:"light-astern",title:"Three white flashes",rule:"34(b)",meaning:"Optional light supplement: operating astern propulsion",pattern:seq(S,S,S),kind:"light",note:"The all-round white signal light is visible at least 5 miles under Rule 34(b)."},
];

export const DISTRESS_SIGNALS = [
  "Gun or other explosive signal at intervals of about one minute","Continuous sounding with any fog-signalling apparatus","Rockets or shells throwing red stars one at a time at short intervals","SOS by any signalling method","Spoken MAYDAY by radiotelephony","International Code signal N.C.","Square flag with a ball or ball-like object above or below","Flames on the vessel, such as a burning tar or oil barrel","Red hand flare or red parachute flare","Orange smoke signal","Slow, repeated raising and lowering of outstretched arms","DSC distress alert on VHF channel 70 or listed MF/HF distress frequencies","Ship-to-shore distress alert via Inmarsat or another mobile satellite provider","EPIRB signal","Approved radio signals, including survival-craft radar transponders","Orange canvas with a black square and circle or suitable symbol for aerial identification","Dye marker",
] as const;

export const REFERENCES = {
  rules:"Source PDF · Rules 20–31 · pp. 7–13",
  annex1:"Annex I · placement and technical detail · pp. 17–21",
  annex2:"Annex II · fishing signals · p. 22",
  annex3:"Annex III · sound appliances · pp. 22–24",
  annex4:"Annex IV · distress signals · pp. 24–25",
} as const;

const norm=(value:number)=>((value%360)+360)%360;
export function lightVisible(angle:number,sector:LightSector){
  if(!Number.isFinite(angle)) return false;
  const span=sector.end-sector.start;
  if(Math.abs(span)>=360) return true;
  const a=norm(angle),start=norm(sector.start),end=norm(sector.end);
  return start<=end ? a>=start&&a<=end : a>=start||a<=end;
}

export function signalActive(time:number,pattern:readonly number[],repeat?:number){
  if(!Number.isFinite(time)||time<0||pattern.length===0) return false;
  const local=repeat&&repeat>0?time%repeat:time;
  let cursor=0;
  for(let i=0;i<pattern.length;i++){
    const end=cursor+Math.max(0,pattern[i]);
    if(local>=cursor&&local<end) return i%2===0;
    cursor=end;
  }
  return false;
}

export type ProfileOptions={makingWay?:boolean;anchored?:boolean;towLength?:number;gearLength?:number;composite?:boolean};
export function lightRanges(length:number){return {masthead:length>=50?6:length>=20?5:length>=12?3:2,sidelight:length>=50?3:length>=12?2:1,stern:length>=50?3:2,towing:length>=50?3:2,allRound:length>=50?3:2};}
export function lightPhaseOn(mark:LightMark,time:number){
 if(!mark.flashing)return true;
 const period=mark.flashPeriod??.5;
 return ((time+(mark.flashPhase??0))%period+period)%period<period/2;
}
export const signalDuration=(signal:Signal)=>Math.max(12,(signal.repeat??0)+signal.pattern.reduce((a,b)=>a+b,0)+3);
export function dayShapeLayout(id:string,count:number){
 return Array.from({length:count},(_,i)=>{
  if(id==='dredging'&&i>=3)return {x:i<5?-.2:.2,y:.56-((i-3)%2)*.09,z:0};
  if(id==='mineclearance'&&i<3)return {x:i===0?0:i===1?-.2:.2,y:i===0?.68:.54,z:0};
  if(i===3&&(id==='ram'||id==='mineclearance'))return {x:0,y:.42,z:-.35};
  return {x:0,y:.65-i*.09,z:0};
 });
}
export function profileDisplay(id:string,length:number,options:ProfileOptions):VesselProfile{
  const base=VESSEL_PROFILES.find(p=>p.id===id)??VESSEL_PROFILES[0];
  let lights=[...base.lights],shapes=base.shapes?[...base.shapes]:[];
  const removeNav=()=>{lights=lights.filter(l=>!l.label.startsWith("Starboard")&&!l.label.startsWith("Port")&&!l.label.startsWith("Stern")&&!l.label.startsWith("Masthead"))};
  const afterMasthead:LightMark={color:"white",label:"After masthead · 225°",sector:{start:247.5,end:112.5},y:11,z:3};
  const powerFamily=["power-way","power-stopped","motor-sailing","cbd","hovercraft","wig","seaplane"].includes(id);
  if(['trawl-shooting','trawl-hauling','trawl-obstructed','pair-trawling'].includes(id)){
    const extras=lights.map(l=>({...l,y:l.y-6}));
    lights=[...stack(['green','white'],'Trawling'),...extras];shapes=['cones-apex'];
    if(options.makingWay)lights.push(...normal.slice(1));
    if(length>=50)lights.push({color:'white',label:'Required masthead at ≥50 m · 225°',sector:{start:247.5,end:112.5},y:14,z:3});
  }
  if(id==='purse-seine'){
    lights=[...stack(['red','white'],'Fishing'),...lights.map((l,i)=>({...l,y:l.y-6,flashPeriod:2,flashPhase:i===0?0:1}))];shapes=['cones-apex'];
    if(options.makingWay)lights.push(...normal.slice(1));
  }
  if(powerFamily&&length>=50)lights.push(afterMasthead);
  if(["nuc","ram","dredging","trawling","fishing"].includes(id)){
    removeNav();
    if(options.makingWay&&!options.anchored){lights.push(...normal.slice(1));if(["ram","dredging"].includes(id)){lights.push(normal[0]);if(length>=50)lights.push(afterMasthead)}}
  }
  if(id==="trawling"&&length>=50)lights.push({color:"white",label:"Required masthead at ≥50 m · 225°",sector:{start:247.5,end:112.5},y:12,z:3});
  if(id==="fishing"&&(options.gearLength??0)<=150)lights=lights.filter(l=>!l.label.includes("Gear >150"));
  if(id==="towing"){
    const count=(options.towLength??150)>200?3:2;
    lights=lights.filter(l=>l.label!=="Towing mastheads");
    lights.push(...Array.from({length:count},(_,i)=>({color:"white" as const,label:"Towing masthead · 225°",sector:{start:247.5,end:112.5},y:11-i*2.2})));shapes=count===3?["diamond"]:[];
    if(length>=50)lights.push(afterMasthead);
  }
  if(id==="pushing"){
    if(options.composite){lights=[...normal];if(length>=50)lights.push(afterMasthead);shapes=[]}
    else{lights=lights.filter(l=>l.label!=="Pushing mastheads");lights.push(...[11,8.8].map(y=>({color:"white" as const,label:"Pushing masthead · 225°",sector:{start:247.5,end:112.5},y})));if(length>=50)lights.push({color:"white",label:"After masthead · 225°",sector:{start:247.5,end:112.5},y:12,z:3})}
  }
  if(id==="ram"&&options.anchored){lights.push({color:"white",label:"Forward anchor light",y:9,z:-5});if(length>=50)lights.push({color:"white",label:"Lower aft anchor light",y:5,z:5});shapes=[...shapes,"ball"]}
  if(id==="mineclearance"){
    const status=[...lights];
    if(options.anchored){lights=[...status,{color:"white",label:"Forward anchor light",y:9,z:-5}];if(length>=50)lights.push({color:"white",label:"Lower aft anchor light",y:5,z:5});shapes=[...shapes,"ball"]}
    else{lights=[...status,...normal];if(length>=50)lights.push(afterMasthead)}
  }
  if(id==="pilot"&&options.anchored){removeNav();lights.push({color:"white",label:"Forward anchor light",y:9,z:-5});if(length>=50)lights.push({color:"white",label:"Lower aft anchor light",y:5,z:5});shapes=["ball"]}
  if((id==="anchor"||id==="aground")&&length<50)lights=lights.filter(l=>l.label!=="Lower aft anchor light");
  if(id==="aground"&&length<12){lights=lights.filter(l=>l.label!=="Aground");shapes=[]}
  return {...base,lights,shapes};
}
