/** The intro follows the authored Rule 14 lesson, including its stated timings. */
export const HEAD_ON_SCENARIO_ID = "head-on-powered";
export const INTRO_STORY_BEATS = [
  { start: 0, end: 0.3, startTime: 0, endTime: 36 },
  { start: 0.3, end: 0.7, startTime: 36, endTime: 65 },
  { start: 0.7, end: 1, startTime: 65, endTime: 90 },
] as const;

export function introProgressToScenarioTime(progress: number, duration = 90) {
  const p = Math.min(1, Math.max(0, progress));
  const beat = INTRO_STORY_BEATS.find((item) => p <= item.end) ?? INTRO_STORY_BEATS.at(-1)!;
  const local = (p - beat.start) / (beat.end - beat.start);
  return (beat.startTime + (beat.endTime - beat.startTime) * local) * (duration / 90);
}
