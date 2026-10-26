import {describe,it,expect} from 'vitest';
import {parseReference,searchRules,sourceHref} from './reference';
describe('reference library',()=>{
 const record={id:'rule-14',number:14,title:'Head-on situation',part:'B',summary:'Alter course to starboard.',conditions:['Power-driven vessels in sight'],duties:['Both alter'],exceptions:[],related:['rule-8'],keywords:['port-to-port'],notes:[],pages:[6],clauses:[{id:'rule-14-a',text:'Kaynak',pages:[6],kind:'source-text' as const}],sourceText:'Kaynak'};
 it('finds a rule by number, title and maritime keyword',()=>{
  for(const q of ['14','head-on','PORT-TO-PORT'])expect(searchRules([record],q)).toHaveLength(1);
  expect(searchRules([record],'anchor')).toHaveLength(0);
 });
 it('rejects missing source pages and duplicate record identifiers',()=>{
  const source={title:'COLREG',file:'content/colreg-source.pdf',sha256:'a'.repeat(64),pages:25};
  expect(()=>parseReference({source,records:[{...record,pages:[]}]})).toThrow();
  expect(()=>parseReference({source,records:[record,record]})).toThrow();
 });
 it('opens the exact PDF page under a deployment prefix',()=>{
  expect(sourceHref('/colreg/','content/colreg-source.pdf',6)).toBe('/colreg/content/colreg-source.pdf#page=6');
 });
 it('retains edition, language and separate supplementary page ranges',()=>{
  const source={title:'COLREG consolidated 2018',file:'content/colreg-source.pdf',sha256:'a'.repeat(64),pages:62,language:'en',edition:'2018',originalFilename:'COLREG-Consolidated-2018.pdf',pageImageDirectory:'content/pages',notes:['Two Annex IV versions are present.'],supplemental:[{id:'convention-articles',title:'Convention articles',pages:[1,2,3,4],note:'Separate from the 41 Rules.'}]};
  const result=parseReference({source,records:[{...record,related:[]}]});
  expect(result.source).toEqual(source);
 });
 it('rejects supplementary references outside the supplied PDF and duplicate segment IDs',()=>{
  const source={title:'COLREG',file:'content/colreg-source.pdf',sha256:'a'.repeat(64),pages:62,supplemental:[{id:'watchkeeping',title:'Watchkeeping',pages:[63],note:'Supplementary.'}]};
  expect(()=>parseReference({source,records:[{...record,related:[]}]})).toThrow();
  expect(()=>parseReference({source:{...source,supplemental:[]},records:[{...record,related:[],clauses:[record.clauses[0],record.clauses[0]]}]})).toThrow();
 });
 it('preserves the distinction between document commentary and Rule text',()=>{
  const source={title:'COLREG',file:'content/colreg-source.pdf',sha256:'a'.repeat(64),pages:62};
  const input={...record,related:[],clauses:[{...record.clauses[0],kind:'document-note'}]};
  expect(parseReference({source,records:[input]}).records[0].clauses[0].kind).toBe('document-note');
 });
});
