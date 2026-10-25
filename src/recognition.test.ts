import {describe,it,expect} from 'vitest';
import {profileDisplay} from './trainingData';
import {recognitionReadout,recognitionDefaults,viewPosition,hasFlashes} from './recognition';
describe('guided recognition',()=>{
 it('shows bow masthead and both sidelights, but not the sternlight',()=>{
  const result=recognitionReadout(profileDisplay('power-way',49,{}),true,0);
  expect(result.lights.map(l=>l.label)).toEqual(['Masthead · 225°','Starboard · 112.5°','Port · 112.5°']);
 });
 it('shows sternlight from aft and no navigation-light list by day',()=>{
  const profile=profileDisplay('power-way',49,{});
  expect(recognitionReadout(profile,true,180).lights.map(l=>l.label)).toEqual(['Stern · 135°']);
  expect(recognitionReadout(profile,false,180).lights).toEqual([]);
  expect(recognitionReadout(profile,false,180).explanation).toMatch(/no special day shape/i);
 });
 it('explains required day shapes and only offers playback for flashing profiles',()=>{
  expect(recognitionReadout(profileDisplay('nuc',49,{}),false,90).shapes).toEqual(['ball','ball']);
  expect(hasFlashes(profileDisplay('power-way',49,{}))).toBe(false);
  expect(hasFlashes(profileDisplay('purse-seine',49,{}))).toBe(true);
 });
 it('starts a new condition without retaining the previous anchor or tow configuration',()=>{
  expect(recognitionDefaults()).toEqual({makingWay:true,anchored:false,towLength:150,gearLength:100,composite:false});
 });
 it('places viewpoints on the correct side of a north-facing vessel',()=>{
  expect(viewPosition('bow',50).z).toBeLessThan(0);
  expect(viewPosition('starboard',50).x).toBeGreaterThan(0);
  expect(viewPosition('stern',50).z).toBeGreaterThan(0);
  expect(viewPosition('port',50).x).toBeLessThan(0);
 });
});
