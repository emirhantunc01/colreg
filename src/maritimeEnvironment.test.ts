import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createMaritimeEnvironment } from "./maritimeEnvironment";

const environments: ReturnType<typeof createMaritimeEnvironment>[] = [];
afterEach(() => environments.splice(0).forEach((environment) => environment.dispose()));

describe("createMaritimeEnvironment", () => {
  it("provides a daylight sea whose motion is driven by supplied scenario time", () => {
    const environment = createMaritimeEnvironment();
    environments.push(environment);

    const water = environment.group.getObjectByName("maritime-water") as THREE.Mesh;
    expect(water).toBeInstanceOf(THREE.Mesh);
    expect((water.material as THREE.ShaderMaterial).fog).toBe(true);
    expect((water.material as THREE.ShaderMaterial).uniforms.fogDensity).toBeDefined();
    expect((water.material as THREE.ShaderMaterial).uniforms.fogColor).toBeDefined();
    const geometry = water.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.getSize(new THREE.Vector3()).z).toBeGreaterThan(15000);
    expect(geometry.boundingBox!.getSize(new THREE.Vector3()).y).toBeCloseTo(0);

    environment.update(12.5);

    expect((water.material as THREE.ShaderMaterial).uniforms.uTime.value).toBe(12.5);
  });

  it("builds a deterministic curved wake from the recent authored track poses", () => {
    const environment = createMaritimeEnvironment();
    environments.push(environment);

    environment.update(5, [{
      id: "own", x: 20, z: 0, heading: 90, length: 90, speed: 2,
      history: [
        { x: 0, z: 0, heading: 0 },
        { x: 10, z: 10, heading: 45 },
        { x: 20, z: 0, heading: 90 },
      ],
    }]);

    const wake = environment.group.getObjectByName("wake-own") as THREE.Mesh;
    expect(wake).toBeInstanceOf(THREE.Mesh);
    expect(wake.visible).toBe(true);
    const positions = wake.geometry.getAttribute("position");
    expect(positions.getX(0)).toBeLessThan(20);
    const currentCenter = new THREE.Vector3().fromBufferAttribute(positions, 0)
      .add(new THREE.Vector3().fromBufferAttribute(positions, 1)).multiplyScalar(0.5);
    const middleCenter = new THREE.Vector3().fromBufferAttribute(positions, 2)
      .add(new THREE.Vector3().fromBufferAttribute(positions, 3)).multiplyScalar(0.5);
    const oldestCenter = new THREE.Vector3().fromBufferAttribute(positions, 4)
      .add(new THREE.Vector3().fromBufferAttribute(positions, 5)).multiplyScalar(0.5);
    const straightMiddle = currentCenter.clone().add(oldestCenter).multiplyScalar(0.5);
    expect(middleCenter.distanceTo(straightMiddle)).toBeGreaterThan(1);
  });

  it("hides a wake when its authored vessel speed is zero", () => {
    const environment = createMaritimeEnvironment();
    environments.push(environment);

    environment.update(5, [{ id: "own", x: 10, z: 20, heading: 0, length: 90, speed: 0 }]);

    expect(environment.group.getObjectByName("wake-own")?.visible).toBe(false);
  });
});
