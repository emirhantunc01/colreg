import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {parseReference} from './reference';
import {parseScenario} from './engine';
import source from '../public/content/rules.json';
import library from '../public/scenarios/index.json';
import catalog from '../content/reference-catalog.json';
const files=import.meta.glob('../public/scenarios/*.json',{eager:true,import:'default'});
const assets=import.meta.glob('../public/models/*.glb',{query:'?url',import:'default',eager:true});
describe('delivered source and encounter linkage',()=>{
 it('ships the selected English PDF, matching compact metadata and all lazy source pages',()=>{
  const content=parseReference(source);
  expect(content.source.language).toBe('en');
  expect(content.source.edition).toBe('2018');
  expect(content.source.pages).toBe(62);
  const pdf=readFileSync(new URL(`../public/${content.source.file}`,import.meta.url));
  expect(createHash('sha256').update(pdf).digest('hex')).toBe(content.source.sha256);
  expect(catalog.source.sha256).toBe(content.source.sha256);
  expect(catalog.records).toEqual(content.records.map(({id,pages})=>({id,pages})));
  for(let page=1;page<=content.source.pages;page++)expect(existsSync(new URL(`../public/${content.source.pageImageDirectory}/page-${page}.webp`,import.meta.url)),`PDF page ${page}`).toBe(true);
  expect(content.records.find(r=>r.id==='annex-4')?.pages).toEqual([52,53]);
  expect(content.source.supplemental.find(item=>item.id==='superseded-annex-4')?.pages).toEqual([50,51]);
 });
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
