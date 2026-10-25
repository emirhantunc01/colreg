import * as THREE from "three";

export type MaritimeVesselPose = {
  id: string;
  x: number;
  z: number;
  heading: number;
  length: number;
  speed?: number;
  /** Authored poses in chronological order, ending at this vessel pose. */
  history?: MaritimeTrackPoint[];
};

export type MaritimeTrackPoint = { x: number; z: number; heading: number };

export type MaritimeEnvironment = {
  group: THREE.Group;
  update: (time: number, vessels?: MaritimeVesselPose[]) => void;
  dispose: () => void;
};

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  #include <fog_pars_vertex>

  float seaWave(vec2 p, float t) {
    vec2 warp = vec2(
      sin(dot(p, vec2(0.0011, 0.0018)) + t * 0.11),
      cos(dot(p, vec2(-0.0017, 0.0012)) - t * 0.09)
    ) * 24.0;
    vec2 q = p + warp;
    return sin(dot(q, vec2(0.0031, 0.0017)) + t * 0.23) * 0.34
      + sin(dot(q, vec2(-0.0019, 0.0037)) - t * 0.17) * 0.22
      + sin(dot(q, vec2(0.0063, -0.0027)) + t * 0.31) * 0.07
      + sin(dot(p, vec2(0.0023, -0.0041)) + t * 0.14) * 0.12;
  }

  void main() {
    vec3 displaced = position;
    displaced.y += seaWave(position.xz, uTime);
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDirection;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  #include <fog_pars_fragment>

  void main() {
    vec2 p = vWorldPosition.xz;
    vec2 warp = vec2(
      sin(dot(p, vec2(0.0011, 0.0018)) + uTime * 0.11),
      cos(dot(p, vec2(-0.0017, 0.0012)) - uTime * 0.09)
    ) * 24.0;
    vec2 q = p + warp;
    float broad = sin(dot(q, vec2(0.0031, 0.0017)) + uTime * 0.23)
      + sin(dot(q, vec2(-0.0019, 0.0037)) - uTime * 0.17) * 0.65
      + sin(dot(p, vec2(0.0023, -0.0041)) + uTime * 0.14) * 0.38;
    float fine = sin(dot(q, vec2(0.0167, 0.0073)) + broad * 1.8 + uTime * 0.31)
      + sin(dot(q, vec2(-0.011, 0.019)) - broad + uTime * 0.22) * 0.42;
    vec3 normal = normalize(vWorldNormal + vec3(fine * 0.11, 0.0, broad * 0.08));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(uSunDirection);
    float diffuse = 0.42 + max(dot(normal, sunDirection), 0.0) * 0.24;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);
    float glint = pow(max(dot(reflect(-sunDirection, normal), viewDirection), 0.0), 48.0);
    float glimmer = smoothstep(0.77, 1.0, sin(dot(p, vec2(0.023, 0.011)) + broad * 1.4)) * 0.025;
    vec3 deep = vec3(0.052, 0.095, 0.118);
    vec3 lit = vec3(0.205, 0.278, 0.298);
    vec3 sky = vec3(0.40, 0.49, 0.50);
    vec3 color = mix(deep, lit, clamp(0.48 + broad * 0.12, 0.0, 1.0)) * diffuse;
    color = mix(color, sky, fresnel * 0.31);
    color += vec3(0.46, 0.50, 0.46) * (glint * 0.12 + glimmer);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const skyVertexShader = /* glsl */ `
  varying float vHeight;
  void main() {
    vHeight = normalize(position).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  varying float vHeight;
  void main() {
    float horizon = smoothstep(-0.2, 0.85, vHeight);
    vec3 haze = vec3(0.49, 0.58, 0.60);
    vec3 zenith = vec3(0.16, 0.25, 0.31);
    vec3 color = mix(haze, zenith, horizon);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const MAX_WAKE_POINTS = 32;

function createWake(id: string, length: number) {
  const wakeLength = Math.max(length * 2.2, 60);
  const vertexCount = MAX_WAKE_POINTS * 2;
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 3), 3);
  const colors = new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 4), 4);
  positions.setUsage(THREE.DynamicDrawUsage);
  colors.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positions);
  geometry.setAttribute("color", colors);
  const indices: number[] = [];
  for (let i = 0; i < MAX_WAKE_POINTS - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(indices);
  geometry.setDrawRange(0, 0);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `wake-${id}`;
  mesh.userData.wakeLength = wakeLength;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return mesh;
}

/** A compact daylight sea/sky rig and deterministic wake placement for authored vessel poses. */
export function createMaritimeEnvironment(): MaritimeEnvironment {
  const group = new THREE.Group();
  group.name = "maritime-environment";

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(9000, 32, 20),
    new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    }),
  );
  sky.name = "maritime-sky";
  sky.renderOrder = -100;
  group.add(sky);

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uSunDirection: { value: new THREE.Vector3(-0.42, 0.82, -0.38).normalize() },
      },
    ]),
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    fog: true,
  });
  const waterGeometry = new THREE.PlaneGeometry(16000, 16000, 96, 96).rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.name = "maritime-water";
  water.position.y = -1;
  water.frustumCulled = false;
  group.add(water);

  group.add(new THREE.HemisphereLight(0xd8e5e4, 0x34434a, 1.25));
  const daylight = new THREE.DirectionalLight(0xfff2de, 2.1);
  daylight.position.set(-420, 760, -350);
  daylight.name = "maritime-daylight";
  group.add(daylight);

  const wakes = new Map<string, THREE.Mesh>();
  let disposed = false;
  const update = (time: number, vessels: MaritimeVesselPose[] = []) => {
    if (disposed) return;
    waterMaterial.uniforms.uTime.value = Number.isFinite(time) ? time : 0;
    const active = new Set(vessels.map((vessel) => vessel.id));
    for (const [id, wake] of wakes) {
      if (!active.has(id)) {
        group.remove(wake);
        wake.geometry.dispose();
        (wake.material as THREE.Material).dispose();
        wakes.delete(id);
      }
    }
    for (const vessel of vessels) {
      if (![vessel.x, vessel.z, vessel.heading, vessel.length].every(Number.isFinite)) continue;
      let wake = wakes.get(vessel.id);
      if (!wake) {
        wake = createWake(vessel.id, vessel.length);
        wakes.set(vessel.id, wake);
        group.add(wake);
      }
      const speed = vessel.speed;
      const hasExplicitHistory = vessel.history !== undefined;
      if (speed !== undefined && speed <= 0.001) {
        wake.visible = false;
        (wake.material as THREE.MeshBasicMaterial).opacity = 0;
        continue;
      }
      if (hasExplicitHistory && vessel.history!.length < 2) {
        wake.visible = false;
        continue;
      }

      const heading = THREE.MathUtils.degToRad(vessel.heading);
      const wakeLength = wake.userData.wakeLength as number;
      const history = hasExplicitHistory
        ? vessel.history!.slice(-MAX_WAKE_POINTS).reverse()
        : Array.from({ length: 16 }, (_, index) => {
            const distance = wakeLength * index / 15;
            return {
              x: vessel.x - Math.sin(heading) * distance,
              z: vessel.z + Math.cos(heading) * distance,
              heading: vessel.heading,
            };
          });
      const positions = wake.geometry.getAttribute("position") as THREE.BufferAttribute;
      const colors = wake.geometry.getAttribute("color") as THREE.BufferAttribute;
      const beam = Math.max(vessel.length * 0.12, 5);
      history.forEach((point, index) => {
        const pointHeading = THREE.MathUtils.degToRad(point.heading);
        const sternOffset = vessel.length * 0.49;
        const sternX = point.x - Math.sin(pointHeading) * sternOffset;
        const sternZ = point.z + Math.cos(pointHeading) * sternOffset;
        const fade = 1 - index / Math.max(1, history.length - 1);
        const halfWidth = beam * (0.16 + (1 - fade) * 0.48);
        const sideX = Math.cos(pointHeading) * halfWidth;
        const sideZ = Math.sin(pointHeading) * halfWidth;
        const near = index * 2;
        const alpha = 0.18 * Math.pow(fade, 1.35);
        positions.setXYZ(near, sternX + sideX, -0.72, sternZ + sideZ);
        positions.setXYZ(near + 1, sternX - sideX, -0.72, sternZ - sideZ);
        for (const vertex of [near, near + 1]) colors.setXYZW(vertex, 0.67, 0.77, 0.77, alpha);
      });
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      wake.geometry.setDrawRange(0, Math.max(0, history.length - 1) * 6);
      wake.visible = history.length >= 2;
      const speedFactor = speed === undefined ? 1 : THREE.MathUtils.clamp(speed / 4, 0, 1);
      (wake.material as THREE.MeshBasicMaterial).opacity = speedFactor;
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    wakes.clear();
  };

  return { group, update, dispose };
}
