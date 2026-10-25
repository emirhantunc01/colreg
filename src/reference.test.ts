import {describe,it,expect} from 'vitest';
import {parseReference,searchRules,sourceHref} from './reference';
describe('reference library',()=>{
 const record={id:'rule-14',number:14,title:'Head-on situation',part:'B',summary:'Alter course to starboard.',conditions:['Power-driven vessels in sight'],duties:['Both alter'],exceptions:[],related:['rule-8'],keywords:['port-to-port'],notes:[],pages:[6],clauses:[{id:'rule-14-a',text:'Kaynak',pages:[6]}],sourceText:'Kaynak'};
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
});
