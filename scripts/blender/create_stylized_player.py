"""Generate the first Total City Grind stylized male player prototype.

Run with Blender:
    blender --background --python scripts/blender/create_stylized_player.py

The script creates an editable .blend, a portable .glb, and two PNG previews.
It deliberately does not modify or wire any gameplay files.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "src" / "assets" / "characters" / "3d" / "player-man"
BLEND_PATH = OUTPUT_DIR / "player-man.blend"
GLB_PATH = OUTPUT_DIR / "player-man.glb"
FRONT_PREVIEW_PATH = OUTPUT_DIR / "player-man-preview.png"
GAME_PREVIEW_PATH = OUTPUT_DIR / "player-man-game-angle.png"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name: str, color: tuple[float, float, float, float], metallic=0.0, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return mat


def assign_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    obj.data.materials.append(mat)


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def add_uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    segments=32,
    rings=20,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, mat)
    smooth(obj)
    return obj


def add_rounded_cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel=0.14,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel_modifier = obj.modifiers.new(name="Soft comic edges", type="BEVEL")
    bevel_modifier.width = bevel
    bevel_modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel_modifier.name)
    assign_material(obj, mat)
    smooth(obj)
    return obj


def add_cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
    vertices=24,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) / 2
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    assign_material(obj, mat)
    smooth(obj)
    return obj


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    rotation=(math.pi / 2, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=32,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, mat)
    smooth(obj)
    return obj


def parent_to(obj: bpy.types.Object, parent: bpy.types.Object) -> None:
    world_matrix = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world_matrix


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_joint(name: str, location: tuple[float, float, float], parent: bpy.types.Object):
    joint = bpy.data.objects.new(name, None)
    joint.empty_display_type = "SPHERE"
    joint.empty_display_size = 0.12
    joint.location = location
    bpy.context.collection.objects.link(joint)
    parent_to(joint, parent)
    return joint


def build_character() -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    skin = material("Skin - warm dark brown", (0.28, 0.095, 0.04, 1.0), roughness=0.72)
    skin_light = material("Skin highlight", (0.42, 0.16, 0.075, 1.0), roughness=0.7)
    hair = material("Hair", (0.018, 0.012, 0.012, 1.0), roughness=0.9)
    navy = material("Trousers - ink navy", (0.018, 0.055, 0.13, 1.0), roughness=0.7)
    yellow = material("Jacket - Lagos yellow", (1.0, 0.48, 0.025, 1.0), roughness=0.52)
    yellow_dark = material("Jacket trim", (0.72, 0.19, 0.015, 1.0), roughness=0.58)
    teal = material("Shirt - city teal", (0.0, 0.52, 0.58, 1.0), roughness=0.58)
    white = material("Eyes and shoe trim", (0.96, 0.94, 0.82, 1.0), roughness=0.45)
    black = material("Pupils and soles", (0.008, 0.012, 0.02, 1.0), roughness=0.72)
    red = material("Shoe accent", (0.86, 0.035, 0.045, 1.0), roughness=0.55)
    gold = material("Watch", (0.95, 0.58, 0.06, 1.0), metallic=0.6, roughness=0.28)

    root = bpy.data.objects.new("TCG_Player_Man_ROOT", None)
    root.empty_display_type = "CIRCLE"
    root.empty_display_size = 0.55
    root["asset_name"] = "Total City Grind Player Man"
    root["style"] = "Bright stylized comic"
    root["forward_axis"] = "-Y"
    bpy.context.collection.objects.link(root)

    parts: list[bpy.types.Object] = []

    def register(obj, parent=root):
        parent_to(obj, parent)
        parts.append(obj)
        return obj

    # Future animation-friendly joint hierarchy.
    hips_joint = add_joint("JNT_Hips", (0, 0, 2.45), root)
    chest_joint = add_joint("JNT_Chest", (0, 0, 3.75), hips_joint)
    neck_joint = add_joint("JNT_Neck", (0, 0, 4.75), chest_joint)
    head_joint = add_joint("JNT_Head", (0, 0, 5.45), neck_joint)
    shoulder_l = add_joint("JNT_Shoulder_L", (-0.72, 0, 4.25), chest_joint)
    shoulder_r = add_joint("JNT_Shoulder_R", (0.72, 0, 4.25), chest_joint)
    hip_l = add_joint("JNT_Hip_L", (-0.3, 0, 2.45), hips_joint)
    hip_r = add_joint("JNT_Hip_R", (0.3, 0, 2.45), hips_joint)

    # Legs and shoes: slightly oversized feet read clearly from the game camera.
    register(add_cylinder_between("Leg_L", (-0.30, 0, 2.45), (-0.33, 0, 0.72), 0.28, navy), hip_l)
    register(add_cylinder_between("Leg_R", (0.30, 0, 2.45), (0.33, 0, 0.72), 0.28, navy), hip_r)
    register(add_rounded_cube("Sneaker_L", (-0.34, -0.16, 0.28), (0.34, 0.52, 0.22), white, 0.12), hip_l)
    register(add_rounded_cube("Sneaker_R", (0.34, -0.16, 0.28), (0.34, 0.52, 0.22), white, 0.12), hip_r)
    register(add_rounded_cube("Sole_L", (-0.34, -0.18, 0.10), (0.36, 0.55, 0.08), black, 0.06), hip_l)
    register(add_rounded_cube("Sole_R", (0.34, -0.18, 0.10), (0.36, 0.55, 0.08), black, 0.06), hip_r)
    register(add_rounded_cube("Shoe_Accent_L", (-0.34, -0.64, 0.28), (0.24, 0.035, 0.08), red, 0.025), hip_l)
    register(add_rounded_cube("Shoe_Accent_R", (0.34, -0.64, 0.28), (0.24, 0.035, 0.08), red, 0.025), hip_r)

    # Torso, shirt and jacket.
    register(add_rounded_cube("Torso_Jacket", (0, 0, 3.62), (0.82, 0.43, 1.08), yellow, 0.22), chest_joint)
    register(add_rounded_cube("Shirt_Front", (0, -0.455, 3.64), (0.30, 0.035, 0.82), teal, 0.045), chest_joint)
    register(add_rounded_cube("Jacket_Hem", (0, -0.47, 2.72), (0.77, 0.035, 0.105), yellow_dark, 0.04), chest_joint)
    register(add_cylinder_between("Jacket_Zip", (0, -0.505, 2.88), (0, -0.505, 4.42), 0.025, black, 12), chest_joint)
    register(add_rounded_cube("Pocket_L", (-0.48, -0.49, 3.15), (0.20, 0.035, 0.17), yellow_dark, 0.045), chest_joint)
    register(add_rounded_cube("Pocket_R", (0.48, -0.49, 3.15), (0.20, 0.035, 0.17), yellow_dark, 0.045), chest_joint)

    # Relaxed A-pose arms.
    left_elbow = (-1.08, 0.0, 3.35)
    right_elbow = (1.08, 0.0, 3.35)
    left_wrist = (-1.04, -0.03, 2.52)
    right_wrist = (1.04, -0.03, 2.52)
    register(add_cylinder_between("UpperArm_L", (-0.72, 0, 4.25), left_elbow, 0.29, yellow), shoulder_l)
    register(add_cylinder_between("UpperArm_R", (0.72, 0, 4.25), right_elbow, 0.29, yellow), shoulder_r)
    register(add_cylinder_between("Forearm_L", left_elbow, left_wrist, 0.22, skin), shoulder_l)
    register(add_cylinder_between("Forearm_R", right_elbow, right_wrist, 0.22, skin), shoulder_r)
    register(add_uv_sphere("Hand_L", (-1.04, -0.03, 2.40), (0.25, 0.22, 0.32), skin), shoulder_l)
    register(add_uv_sphere("Hand_R", (1.04, -0.03, 2.40), (0.25, 0.22, 0.32), skin), shoulder_r)
    register(add_torus("Watch_L", (-1.045, -0.03, 2.66), 0.235, 0.045, gold, rotation=(0, 0, 0)), shoulder_l)

    # Neck and head.
    register(add_cylinder_between("Neck", (0, 0, 4.55), (0, 0, 4.92), 0.27, skin), neck_joint)
    register(add_uv_sphere("Head", (0, 0, 5.52), (0.66, 0.56, 0.78), skin), head_joint)
    register(add_uv_sphere("Ear_L", (-0.65, 0, 5.52), (0.15, 0.09, 0.22), skin_light), head_joint)
    register(add_uv_sphere("Ear_R", (0.65, 0, 5.52), (0.15, 0.09, 0.22), skin_light), head_joint)

    # Hair cap plus curls, deliberately bold for top-down readability.
    register(add_uv_sphere("Hair_Cap", (0, 0.05, 5.96), (0.67, 0.55, 0.45), hair), head_joint)
    curl_positions = [
        (-0.48, -0.25, 6.12), (-0.24, -0.38, 6.20), (0, -0.40, 6.22),
        (0.24, -0.38, 6.20), (0.48, -0.25, 6.12), (-0.42, 0.04, 6.26),
        (-0.14, -0.02, 6.34), (0.14, -0.02, 6.34), (0.42, 0.04, 6.26),
    ]
    for index, position in enumerate(curl_positions, start=1):
        register(add_uv_sphere(f"Hair_Curl_{index:02d}", position, (0.22, 0.19, 0.18), hair, 20, 12), head_joint)

    # Face is oriented toward -Y.
    for side, x in (("L", -0.24), ("R", 0.24)):
        register(add_uv_sphere(f"Eye_White_{side}", (x, -0.515, 5.62), (0.17, 0.055, 0.13), white, 24, 14), head_joint)
        register(add_uv_sphere(f"Eye_Pupil_{side}", (x, -0.568, 5.61), (0.067, 0.025, 0.075), black, 20, 12), head_joint)
        eyebrow = register(add_rounded_cube(f"Eyebrow_{side}", (x, -0.575, 5.83), (0.19, 0.025, 0.035), hair, 0.025), head_joint)
        eyebrow.rotation_euler[1] = -0.10 if side == "L" else 0.10
    register(add_uv_sphere("Nose", (0, -0.57, 5.43), (0.12, 0.09, 0.16), skin_light, 24, 14), head_joint)
    register(add_rounded_cube("Mouth", (0, -0.585, 5.17), (0.19, 0.022, 0.035), yellow_dark, 0.025), head_joint)

    # Small chest badge gives the model a distinct protagonist identity.
    badge = register(add_rounded_cube("TCG_Chest_Badge", (0.51, -0.51, 4.17), (0.15, 0.025, 0.15), white, 0.04), chest_joint)
    badge["description"] = "Placeholder protagonist badge"
    register(add_uv_sphere("TCG_Badge_Centre", (0.51, -0.545, 4.17), (0.07, 0.018, 0.07), teal, 20, 12), chest_joint)

    return root, parts


def configure_render() -> tuple[bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("TCG Preview World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.055, 0.09, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55

    bpy.ops.object.camera_add(location=(7.2, -11.5, 6.4))
    camera = bpy.context.object
    camera.name = "Preview_Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 7.25
    look_at(camera, (0, 0, 3.15))
    scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-4.5, -5.5, 9.5))
    key = bpy.context.object
    key.name = "Key_Light"
    key.data.energy = 1150
    key.data.shape = "DISK"
    key.data.size = 5.0
    look_at(key, (0, 0, 3.2))

    bpy.ops.object.light_add(type="AREA", location=(5.5, -1.5, 6.5))
    fill = bpy.context.object
    fill.name = "Fill_Light"
    fill.data.energy = 760
    fill.data.size = 4.0
    look_at(fill, (0, 0, 3.2))

    bpy.ops.object.light_add(type="AREA", location=(0, 4.5, 8.0))
    rim = bpy.context.object
    rim.name = "Rim_Light"
    rim.data.energy = 980
    rim.data.color = (1.0, 0.42, 0.08)
    rim.data.size = 3.0
    look_at(rim, (0, 0, 4.0))

    return camera, scene


def export_character(root: bpy.types.Object, parts: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in parts:
        obj.select_set(True)
    # Include the joint empties without exporting preview cameras/lights.
    for obj in bpy.data.objects:
        ancestor = obj.parent
        while ancestor is not None:
            if ancestor == root:
                obj.select_set(True)
                break
            ancestor = ancestor.parent
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
    )


def render_previews(camera: bpy.types.Object, scene: bpy.types.Scene) -> None:
    camera.location = (7.2, -11.5, 6.4)
    camera.data.ortho_scale = 7.25
    look_at(camera, (0, 0, 3.15))
    scene.render.filepath = str(FRONT_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    # Approximate the actual elevated game camera while retaining facial readability.
    camera.location = (6.8, -8.2, 11.5)
    camera.data.ortho_scale = 7.0
    look_at(camera, (0, 0, 2.9))
    scene.render.filepath = str(GAME_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reset_scene()
    root, parts = build_character()
    camera, scene = configure_render()
    export_character(root, parts)
    render_previews(camera, scene)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Created: {BLEND_PATH}")
    print(f"Created: {GLB_PATH}")
    print(f"Created: {FRONT_PREVIEW_PATH}")
    print(f"Created: {GAME_PREVIEW_PATH}")


if __name__ == "__main__":
    main()
