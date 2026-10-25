import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture } from "three";
import { cloneVesselModel, resolveVesselAsset } from "./vesselAssets";

describe("licensed vessel assets", () => {
  it("selects the desktop or mobile licensed model for known authored paths", () => {
    expect(resolveVesselAsset("models/atlas-container-ship.glb", false)).toBe(
      "models/licensed/cargo-ship.desktop.glb",
    );
    expect(resolveVesselAsset("models/atlas-container-ship.glb", true)).toBe(
      "models/licensed/cargo-ship.mobile.glb",
    );
    expect(resolveVesselAsset("models/product-tanker.glb", true)).toBe(
      "models/licensed/tanker-ship.mobile.glb",
    );
    expect(resolveVesselAsset("models/other.glb", true)).toBe("models/other.glb");
  });

  it("clones geometry, materials, and textures without sharing disposable resources", () => {
    const template = new Group();
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    template.add(new Mesh(geometry, [material, material]));

    const clone = cloneVesselModel(template);
    const mesh = clone.children[0] as Mesh;
    const clonedMaterials = mesh.material as MeshBasicMaterial[];

    expect(mesh.geometry).not.toBe(geometry);
    expect(clonedMaterials[0]).not.toBe(material);
    expect(clonedMaterials[1]).toBe(clonedMaterials[0]);
    expect(clonedMaterials[0].map).not.toBe(texture);
    expect(clonedMaterials[0].map).toBe(clonedMaterials[1].map);
    mesh.geometry.dispose();
    clonedMaterials[0].dispose();
    clonedMaterials[0].map?.dispose();
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
  });
});
