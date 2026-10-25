import {it,expect} from 'vitest';
import {profileDisplay,lightPhaseOn} from './trainingData';
it('keeps ordinary fishing identification when displaying additional Annex II signals',()=>{
 for(const id of ['trawl-shooting','trawl-hauling','trawl-obstructed','pair-trawling']){
  const lights=profileDisplay(id,49,{makingWay:true}).lights;
  expect(lights.some(l=>l.color==='green'&&l.label==='Trawling')).toBe(true);
  expect(lights.some(l=>l.label.startsWith('Starboard'))).toBe(true);
 }
});
it('alternates purse-seine yellows with one-second light and dark periods',()=>{
 const p=profileDisplay('purse-seine',49,{makingWay:false});
 const [a,b]=p.lights.filter(l=>l.color==='yellow');
 expect([lightPhaseOn(a,0),lightPhaseOn(b,0)]).toEqual([true,false]);
 expect([lightPhaseOn(a,1),lightPhaseOn(b,1)]).toEqual([false,true]);
 expect([lightPhaseOn(a,2),lightPhaseOn(b,2)]).toEqual([true,false]);
 expect(p.lights.some(l=>l.color==='red'&&l.label==='Fishing')).toBe(true);
});
