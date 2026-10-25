import {describe, expect, it} from "vitest";
import {lightVisible, profileDisplay, signalActive, type LightSector} from "./trainingData";

describe("light sector visibility", () => {
  const starboard: LightSector = {start: 0, end: 112.5};
  const port: LightSector = {start: 247.5, end: 360};
  const masthead: LightSector = {start: 247.5, end: 112.5};

  it("includes the edges of an ordinary sector", () => {
    expect(lightVisible(0, starboard)).toBe(true);
    expect(lightVisible(112.5, starboard)).toBe(true);
    expect(lightVisible(112.5001, starboard)).toBe(false);
  });

  it("normalizes bearings and handles a sector crossing north", () => {
    expect(lightVisible(-1, port)).toBe(true);
    expect(lightVisible(359, masthead)).toBe(true);
    expect(lightVisible(0, masthead)).toBe(true);
    expect(lightVisible(112.5, masthead)).toBe(true);
    expect(lightVisible(180, masthead)).toBe(false);
  });

  it("treats equal boundaries as an all-round sector", () => {
    expect(lightVisible(0, {start: 0, end: 360})).toBe(true);
    expect(lightVisible(173, {start: 0, end: 360})).toBe(true);
  });
});

describe("deterministic signal timing", () => {
  const oneShort = [1];
  const twoShort = [1, 1, 1];

  it("uses half-open tone intervals at exact boundaries", () => {
    expect(signalActive(0, oneShort)).toBe(true);
    expect(signalActive(0.999, oneShort)).toBe(true);
    expect(signalActive(1, oneShort)).toBe(false);
    expect(signalActive(-0.1, oneShort)).toBe(false);
  });

  it("activates successive tones without timer state", () => {
    expect(signalActive(0.5, twoShort)).toBe(true);
    expect(signalActive(1.5, twoShort)).toBe(false);
    expect(signalActive(2, twoShort)).toBe(true);
    expect(signalActive(3, twoShort)).toBe(false);
  });

  it("replays from the same phase at the repeat boundary", () => {
    expect(signalActive(9.999, oneShort, 10)).toBe(false);
    expect(signalActive(10, oneShort, 10)).toBe(true);
    expect(signalActive(20.5, oneShort, 10)).toBe(true);
  });
});

describe("conditional vessel displays",()=>{
  it("adds the required second masthead at 50 m",()=>{
    expect(profileDisplay("power-way",49,{}).lights.filter(l=>l.label.includes("After masthead"))).toHaveLength(0);
    expect(profileDisplay("power-way",50,{}).lights.filter(l=>l.label.includes("After masthead"))).toHaveLength(1);
  });
  it("changes a tow over 200 m to three towing mastheads and a diamond",()=>{
    expect(profileDisplay("towing",49,{towLength:150}).lights.filter(l=>l.label==="Towing masthead · 225°")).toHaveLength(2);
    const longTow=profileDisplay("towing",49,{towLength:250});
    expect(longTow.lights.filter(l=>l.label==="Towing masthead · 225°")).toHaveLength(3);
    expect(longTow.shapes).toEqual(["diamond"]);
  });
  it("keeps pushing masthead lights directional unless it is a composite unit",()=>{
    const pushing=profileDisplay("pushing",49,{composite:false});
    expect(pushing.lights.filter(l=>l.label==="Pushing masthead · 225°")).toHaveLength(2);
    expect(profileDisplay("pushing",49,{composite:true}).lights.some(l=>l.label==="Masthead · 225°")).toBe(true);
  });
  it("applies anchor and aground length exceptions",()=>{
    expect(profileDisplay("anchor",49,{}).lights.filter(l=>l.label.includes("anchor light"))).toHaveLength(1);
    expect(profileDisplay("anchor",50,{}).lights.filter(l=>l.label.includes("anchor light"))).toHaveLength(2);
    expect(profileDisplay("aground",11,{}).lights.some(l=>l.label==="Aground")).toBe(false);
    expect(profileDisplay("aground",12,{}).shapes).toHaveLength(3);
  });
  it("adds navigation lights only when the status vessel is making way",()=>{
    expect(profileDisplay("nuc",49,{makingWay:false}).lights.some(l=>l.label.startsWith("Starboard"))).toBe(false);
    expect(profileDisplay("nuc",49,{makingWay:true}).lights.some(l=>l.label.startsWith("Starboard"))).toBe(true);
  });
  it("adds anchor lights to RAM when anchored",()=>{
    expect(profileDisplay("ram",49,{anchored:true,makingWay:false}).lights.some(l=>l.label.includes("anchor light"))).toBe(true);
  });
  it("shows gear direction only beyond 150 m",()=>{
    expect(profileDisplay("fishing",49,{gearLength:150}).lights.some(l=>l.label.includes("Gear"))).toBe(false);
    expect(profileDisplay("fishing",49,{gearLength:151}).lights.some(l=>l.label.includes("Gear"))).toBe(true);
  });
  it("applies the 50 m second-masthead threshold to motor sailing",()=>{
    expect(profileDisplay("motor-sailing",50,{}).lights.some(l=>l.label.includes("After masthead"))).toBe(true);
  });
  it("applies the 50 m threshold to a rigid pushing composite",()=>{
    expect(profileDisplay("pushing",50,{composite:true}).lights.filter(l=>l.label.includes("masthead · 225°"))).toHaveLength(1);
  });
  it("adds the applicable power or anchor base display to mine clearance",()=>{
    expect(profileDisplay("mineclearance",49,{anchored:false}).lights.some(l=>l.label==="Masthead · 225°")).toBe(true);
    expect(profileDisplay("mineclearance",49,{anchored:true}).lights.some(l=>l.label.includes("anchor light"))).toBe(true);
  });
  it("switches pilot vessels between underway and anchor displays",()=>{
    expect(profileDisplay("pilot",49,{anchored:false}).lights.some(l=>l.label.startsWith("Starboard"))).toBe(true);
    const anchored=profileDisplay("pilot",49,{anchored:true});
    expect(anchored.lights.some(l=>l.label.startsWith("Starboard"))).toBe(false);
    expect(anchored.lights.some(l=>l.label.includes("anchor light"))).toBe(true);
  });
  it("lets anchored state dominate an impossible RAM making-way combination",()=>{
    const anchored=profileDisplay("ram",50,{anchored:true,makingWay:true});
    expect(anchored.lights.some(l=>l.label.startsWith("Starboard"))).toBe(false);
    expect(anchored.lights.filter(l=>l.label.includes("anchor light"))).toHaveLength(2);
  });
  it("adds both required mastheads to making-way RAM and dredging vessels at 50 m",()=>{
    for(const id of ["ram","dredging"]){expect(profileDisplay(id,50,{makingWay:true}).lights.filter(l=>l.label.toLowerCase().includes("masthead"))).toHaveLength(2)}
  });
});
