import {describe,it,expect} from 'vitest';
import {patternOn,activeEvents} from './sceneEvents';
describe('scrubbable encounter events',()=>{
 it('uses half-open on/off intervals and stops after the pattern',()=>{
  expect([0,.99,1,1.99,2,2.99,3].map(t=>patternOn(t,[1,1,1]))).toEqual([true,true,false,false,true,true,false]);
  expect(patternOn(-1,[1])).toBe(false);
 });
 it('reconstructs visible events directly from time after rewinding',()=>{
  const events=[{time:10,duration:5,text:'blast',type:'sound' as const,pattern:[5]}];
  expect(activeEvents(events,15)).toEqual([]);
  activeEvents(events,20);
  expect(activeEvents(events,12)).toEqual(events);
 });
});
