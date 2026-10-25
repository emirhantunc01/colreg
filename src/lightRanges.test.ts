import {it,expect} from 'vitest';
import {lightRanges} from './trainingData';
it('applies Rule22 range changes at 12, 20 and 50 metres',()=>{
 expect(lightRanges(11)).toEqual({masthead:2,sidelight:1,stern:2,towing:2,allRound:2});
 expect(lightRanges(12).masthead).toBe(3);
 expect(lightRanges(19).masthead).toBe(3);
 expect(lightRanges(20).masthead).toBe(5);
 expect(lightRanges(49).sidelight).toBe(2);
 expect(lightRanges(50)).toEqual({masthead:6,sidelight:3,stern:3,towing:3,allRound:3});
});
