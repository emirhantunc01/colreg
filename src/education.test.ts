import {describe,it,expect} from 'vitest';
import {parseScenario,parseLibrary} from './engine';
import demo from '../public/scenarios/steady-tracks.json';
describe('source-linked encounter metadata',()=>{
 it('preserves rule references, conditions and environmental layers',()=>{
  const s=parseScenario({...demo,ruleIds:['rule-9'],conditions:['In sight'],environment:{kind:'channel',visibility:'clear'},events:[]});
  expect(s).toMatchObject({ruleIds:['rule-9'],conditions:['In sight'],environment:{kind:'channel'}});
 });
 it('rejects events outside the scenario and unknown event vessels',()=>{
  expect(()=>parseScenario({...demo,events:[{time:demo.duration+1,duration:2,type:'sound',text:'Whistle',pattern:[1]}]})).toThrow();
  expect(()=>parseScenario({...demo,events:[{time:0,duration:2,type:'light',text:'Flash',vesselId:'missing'}]})).toThrow();
 });
 it('preserves discoverable rule links in library entries',()=>{
  expect(parseLibrary([{id:'head-on',file:'head-on.json',title:'Head on',subtitle:'Rule 14',duration:90,ruleIds:['rule-14']}])[0]).toHaveProperty('ruleIds',['rule-14']);
 });
});
