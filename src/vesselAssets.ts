import { Group, Mesh, Texture, type Material } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { assetUrl } from "./vesselModel";

const licensedAssets: Record<string, string> = {
  "models/atlas-container-ship.glb": "cargo-ship",
  "models/product-tanker.glb": "tanker-ship",
};

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

// Four licensed variants plus the finite set of legacy vessel paths fit here.
const MAX_CACHED_MODELS = 10;
const modelPromises = new Map<string, Promise<Group>>();

export function resolveVesselAsset(authoredPath: string, mobile: boolean): string {
  const licensedName = licensedAssets[authoredPath];
  return licensedName
    ? `models/licensed/${licensedName}.${mobile ? "mobile" : "desktop"}.glb`
    : authoredPath;
}

/** Deep-clone render resources so a caller can dispose its model independently. */
export function cloneVesselModel(template: Group): Group {
  const clone = template.clone(true);
  const geometries = new Map<object, object>();
  const materials = new Map<Material, Material>();
  const textures = new Map<Texture, Texture>();
  const sourceMeshes: Mesh[] = [];
  const clonedMeshes: Mesh[] = [];
  template.traverse((object) => {
    if (object instanceof Mesh) sourceMeshes.push(object);
  });
  clone.traverse((object) => {
    if (object instanceof Mesh) clonedMeshes.push(object);
  });

  for (let index = 0; index < sourceMeshes.length; index++) {
    const source = sourceMeshes[index];
    const target = clonedMeshes[index];
    let geometry = geometries.get(source.geometry);
    if (!geometry) {
      geometry = source.geometry.clone();
      geometries.set(source.geometry, geometry);
    }
    target.geometry = geometry as typeof target.geometry;
    const cloneMaterial = (material: Material) => {
      let copied = materials.get(material);
      if (!copied) {
        copied = cloneMaterialResource(material, textures);
        materials.set(material, copied);
      }
      return copied;
    };
    target.material = Array.isArray(source.material)
      ? source.material.map(cloneMaterial)
      : cloneMaterial(source.material);
  }
  return clone;
}

function cloneMaterialResource(material: Material, textures: Map<Texture, Texture>): Material {
  const copy = material.clone();
  for (const [key, value] of Object.entries(copy)) {
    if (value instanceof Texture) {
      let texture = textures.get(value);
      if (!texture) {
        texture = value.clone();
        textures.set(value, texture);
      }
      (copy as unknown as Record<string, unknown>)[key] = texture;
    }
  }
  return copy;
}

function loadTemplate(url: string): Promise<Group> {
  const existing = modelPromises.get(url);
  if (existing) {
    modelPromises.delete(url);
    modelPromises.set(url, existing);
    return existing;
  }

  const promise = new Promise<Group>((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
  modelPromises.set(url, promise);
  while (modelPromises.size > MAX_CACHED_MODELS) {
    const oldest = modelPromises.keys().next().value;
    if (oldest === undefined) break;
    modelPromises.delete(oldest);
  }
  void promise.catch(() => {
    if (modelPromises.get(url) === promise) modelPromises.delete(url);
  });
  return promise;
}

export function loadVesselModel(authoredPath: string, base: string, mobile: boolean): Promise<Group> {
  const resolvedPath = resolveVesselAsset(authoredPath, mobile);
  return loadTemplate(assetUrl(resolvedPath, base)).then(cloneVesselModel);
}
