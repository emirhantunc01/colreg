"""Inspect and normalize user-supplied models without changing authored scenarios.

Run with Blender in background mode. Source archives and Blender intermediates
stay outside public/. Only optimized derivatives are shipped by the Node stage.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source-models"
OUTPUT = SOURCE / "prepared"


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return Vector([min(p[i] for p in points) for i in range(3)]), Vector([max(p[i] for p in points) for i in range(3)])


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_view(objects, output, view):
    low, high = bounds(objects)
    center = (low + high) / 2
    span = max(high - low)
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("Inspection camera")
    camera = bpy.data.objects.new("Inspection camera", camera_data)
    scene.collection.objects.link(camera)
    direction = Vector((0, 0, 2) if view == "top" else (1.1, -1.3, 0.9))
    camera.location = center + direction * span
    aim(camera, center)
    camera_data.type = "ORTHO"
    scene.camera = camera
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    camera_matrix = camera.matrix_world.inverted()
    bpy.context.view_layer.update()
    projected = [camera.matrix_world.inverted() @ (obj.matrix_world @ Vector(corner)) for obj in objects for corner in obj.bound_box]
    extent_x = max(abs(p.x) for p in projected)
    extent_y = max(abs(p.y) for p in projected)
    camera_data.ortho_scale = max(extent_x * 2, extent_y * 3) * 1.12
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Inspection world")
    scene.world.color = (0.32, 0.36, 0.4)
    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.65, 0.72, 0.8, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    for index, offset in enumerate(((1, -1, 2), (-1, 1, 1))):
        light_data = bpy.data.lights.new(f"Inspection light {index}", "AREA")
        light_data.energy = 900 if index == 0 else 500
        light_data.shape = "DISK"
        light_data.size = span
        light = bpy.data.objects.new(light_data.name, light_data)
        scene.collection.objects.link(light)
        light.location = center + Vector(offset) * span
        aim(light, center)
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    for obj in [o for o in scene.objects if o.type in {"LIGHT", "CAMERA"}]:
        bpy.data.objects.remove(obj, do_unlink=True)


def process(model, normalize, yaw, waterline):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / model / "scene.gltf"))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    bpy.context.view_layer.update()
    low, high = bounds(objects)
    metadata = {
        "model": model,
        "rawBounds": {"min": list(low), "max": list(high), "size": list(high-low)},
        "meshObjects": len(objects),
        "polygons": sum(len(obj.data.polygons) for obj in objects),
        "images": [{"name": image.name, "size": list(image.size)} for image in bpy.data.images if image.source == "FILE"],
    }
    # Flatten only transform parents, preserving the meshes and their materials.
    worlds = {obj: obj.matrix_world.copy() for obj in objects}
    for obj in objects:
        obj.parent = None
        obj.matrix_world = worlds[obj]
    if normalize:
        rotation = Matrix.Rotation(math.radians(yaw), 4, "Z")
        for obj in objects:
            obj.matrix_world = rotation @ obj.matrix_world
        bpy.context.view_layer.update()
        low, high = bounds(objects)
        length = high.y - low.y
        transform = Matrix.Scale(1 / length, 4) @ Matrix.Translation(Vector((-(low.x+high.x)/2, -(low.y+high.y)/2, -waterline)))
        for obj in objects:
            obj.matrix_world = transform @ obj.matrix_world
        bpy.context.view_layer.update()
        low, high = bounds(objects)
        metadata["normalization"] = {"yawDegrees": yaw, "waterlineOriginalZ": waterline, "bounds": {"min": list(low), "max": list(high), "size": list(high-low)}}
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{model}.normalized.glb"), export_format="GLB", use_selection=True, export_animations=False, export_cameras=False, export_lights=False)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / f"{model}.blend"))
    (OUTPUT / f"{model}.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    # Render in a compact, deterministic studio space; the saved source is intact.
    low, high = bounds(objects)
    preview_transform = Matrix.Scale(10 / max(high-low), 4) @ Matrix.Translation(-(low+high)/2)
    for obj in objects:
        obj.matrix_world = preview_transform @ obj.matrix_world
    bpy.context.view_layer.update()
    render_view(objects, OUTPUT / f"{model}.top.png", "top")
    render_view(objects, OUTPUT / f"{model}.perspective.png", "perspective")
    print("MODEL_REPORT " + json.dumps(metadata))


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("model", choices=["cargo", "tanker"])
    parser.add_argument("--normalize", action="store_true")
    parser.add_argument("--yaw", type=float, default=0)
    parser.add_argument("--waterline", type=float, default=0)
    options = parser.parse_args(args)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    process(options.model, options.normalize, options.yaw, options.waterline)
