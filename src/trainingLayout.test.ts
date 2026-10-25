import {it,expect} from 'vitest';
import {dayShapeLayout,signalDuration,SIGNALS} from './trainingData';
it('keeps dredging obstruction balls together opposite the safe-side diamonds',()=>{
 const positions=dayShapeLayout('dredging',7);
 expect(positions[3].x).toBe(positions[4].x);
 expect(positions[5].x).toBe(positions[6].x);
 expect(positions[3].x).toBeLessThan(0);
 expect(positions[5].x).toBeGreaterThan(0);
});
it('places mine-clearance balls at the head and both yard ends',()=>{
 const p=dayShapeLayout('mineclearance',3);
 expect(p[0].y).toBeGreaterThan(p[1].y);
 expect(p[1].y).toBe(p[2].y);
 expect(p[1].x).toBeLessThan(0);expect(p[2].x).toBeGreaterThan(0);
});
it('allows a recurring fog signal to be observed on both sides of its repeat boundary',()=>{
 const fog=SIGNALS.find(s=>s.id==='fog-making-way')!;
 expect(signalDuration(fog)).toBeGreaterThan(125);
});
