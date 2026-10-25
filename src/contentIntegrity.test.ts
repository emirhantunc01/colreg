import {describe,it,expect} from 'vitest';
import {parseReference} from './reference';
import {parseScenario} from './engine';
import source from '../public/content/rules.json';
import library from '../public/scenarios/index.json';
const files=import.meta.glob('../public/scenarios/*.json',{eager:true,import:'default'});
const assets=import.meta.glob('../public/models/*.glb',{query:'?url',import:'default',eager:true});
describe('delivered source and encounter linkage',()=>{
 it('validates all 45 source entries including their related references',()=>{
  const content=parseReference(source);
  expect(content.records.map(r=>r.id)).toEqual([...Array.from({length:41},(_,i)=>`rule-${i+1}`),...Array.from({length:4},(_,i)=>`annex-${i+1}`)]);
  const clauses=content.records.flatMap(r=>r.clauses);
  expect(new Set(clauses.map(c=>c.id)).size).toBe(clauses.length);
  for(const record of content.records)expect(record.clauses.map(c=>c.text).join('\n\n')).toBe(record.sourceText);
 });
 it('resolves every indexed scene, model and source rule',()=>{
  for(const entry of library){
   const s=parseScenario(files[`../public/scenarios/${entry.file}`]);
   expect(s.id).toBe(entry.id);expect(s.duration).toBe(entry.duration);
   for(const id of s.ruleIds)expect(source.records.some(r=>r.id===id)).toBe(true);
   for(const v of s.vessels)if(v.model)expect(assets[`../public/${v.model}`]).toBeDefined();
  }
 });
});
