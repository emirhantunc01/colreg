export type AdaptiveResolutionSample = {
  fps: number;
  dpr: number;
  changed: boolean;
};

/** Lowers backing-buffer resolution only after several sustained low-FPS windows. */
export class AdaptiveResolutionController {
  readonly initialDpr: number;
  readonly minimumDpr: number;
  private dpr: number;
  private windowStart: number | null = null;
  private frameCount = 0;
  private lowWindows = 0;
  private targetFps: number;

  constructor(
    initialDpr: number,
    targetFps: number,
    minimumDpr = 0.8,
    private readonly slowWindowsRequired = 3,
    private readonly decrement = 0.1,
  ) {
    this.initialDpr = Math.max(0.1, initialDpr);
    this.minimumDpr = Math.min(this.initialDpr, Math.max(0.1, minimumDpr));
    this.dpr = this.initialDpr;
    this.targetFps = Math.max(1, targetFps);
  }

  get currentDpr() {
    return this.dpr;
  }

  reset() {
    this.windowStart = null;
    this.frameCount = 0;
    this.lowWindows = 0;
  }

  setTargetFps(targetFps: number) {
    const nextTarget = Math.max(1, targetFps);
    if (nextTarget === this.targetFps) return;
    this.targetFps = nextTarget;
    this.reset();
  }

  recordFrame(now: number): AdaptiveResolutionSample | null {
    if (this.windowStart === null) {
      this.windowStart = now;
      this.frameCount = 1;
      return null;
    }
    this.frameCount++;
    const elapsed = now - this.windowStart;
    if (elapsed < 1000) return null;

    const fps = this.frameCount * 1000 / elapsed;
    this.windowStart = now;
    this.frameCount = 0;
    if (fps < this.targetFps * 0.8) this.lowWindows++;
    else this.lowWindows = 0;

    let changed = false;
    if (this.lowWindows >= this.slowWindowsRequired && this.dpr > this.minimumDpr) {
      this.dpr = Math.max(this.minimumDpr, Math.round((this.dpr - this.decrement) * 100) / 100);
      this.lowWindows = 0;
      changed = true;
    }
    return { fps, dpr: this.dpr, changed };
  }
}
