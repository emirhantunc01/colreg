import {describe,it,expect} from 'vitest';
import {parseRoute,routeHash} from './navigation';
describe('learning workspace navigation',()=>{
 it('preserves old studio links while giving the library its own address',()=>{
  expect(parseRoute('#studio')).toEqual({section:'encounters',encounterId:'head-on-powered'});
  expect(parseRoute('#studio/encounters')).toEqual({section:'encounters'});
 });
 it('round trips selected lessons and reference records',()=>{
  for(const route of [{section:'encounters',encounterId:'crossing-give-way'},{section:'rules',ruleId:'annex-1'},{section:'lights',profileId:'nuc'},{section:'signals',signalId:'starboard'}] as const)
   expect(parseRoute(routeHash(route))).toEqual(route);
 });
 it('recovers safely from malformed addresses',()=>{
  expect(parseRoute('#studio/unknown')).toEqual({section:'encounters'});
  expect(parseRoute('#studio/rules/%E0%A4%A')).toEqual({section:'encounters'});
  expect(parseRoute('')).toEqual({section:'intro'});
 });
});
