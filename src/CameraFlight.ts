import { Camera, Quaternion, Vector3 } from "three";
export class CameraFlight {
  active = false;
  private startPosition = new Vector3();
  private startRotation = new Quaternion();
  private started = 0;
  private duration = 500;
  begin(camera: Camera, now: number, instant: boolean) {
    this.startPosition.copy(camera.position);
    this.startRotation.copy(camera.quaternion);
    this.started = now;
    this.duration = instant ? 0 : 500;
    this.active = true;
  }
  apply(camera: Camera, goal: Camera, now: number) {
    const t = this.active
      ? this.duration === 0
        ? 1
        : Math.min(1, Math.max(0, (now - this.started) / this.duration))
      : 1;
    const f = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(this.startPosition, goal.position, f);
    camera.quaternion.slerpQuaternions(this.startRotation, goal.quaternion, f);
    camera.up.copy(goal.up);
    if (t === 1) this.active = false;
  }
}
