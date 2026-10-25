import {it,expect} from 'vitest';
import {soundCue} from './signalAudio';
import {SIGNALS} from './trainingData';
it('keeps light signals silent',()=>expect(soundCue(SIGNALS.find(s=>s.id==='light-port')!,0)).toBeNull());
it('distinguishes the rapid bell from the following gong and silence',()=>{
 const s=SIGNALS.find(s=>s.id==='anchor-large')!;
 expect(soundCue(s,.3)?.kind).toBe('bell');
 expect(soundCue(s,5.5)).toBeNull();
 expect(soundCue(s,6.3)?.kind).toBe('gong');
 expect(soundCue(s,60.3)?.kind).toBe('bell');
});
it('treats individual aground strokes separately from the rapid bell',()=>{
 const s=SIGNALS.find(s=>s.id==='aground')!;
 expect(soundCue(s,.1)?.key).toBe(soundCue(s,.8)?.key);
 expect(soundCue(s,6.1)?.key).not.toBe(soundCue(s,6.5)?.key);
});
