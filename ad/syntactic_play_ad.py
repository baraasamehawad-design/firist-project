"""
Syntactic Play — promotional ad generator for Blender (headless, no GUI needed).

Renders a short, looping brand ad for "Syntactic Play — Gamified Coding
Education": a glossy blue-glass logo + drifting glass prisms on a space-navy
studio stage, cinematic rim lighting (cyan / blue / gold-XP), depth of field,
and a slow camera move.

────────────────────────────────────────────────────────────────────────────
RUN:
    "D:\\blender\\blender.exe" --background --python syntactic_play_ad.py

Quick framing test (renders only the poster still, ~seconds):
    set AD_POSTER_ONLY=1  &  "D:\\blender\\blender.exe" --background --python syntactic_play_ad.py

OUTPUT  (./output/ next to this script):
    syntactic_play_ad.mp4   — H.264, 1920x1080, ~5s @ 24fps
    poster.png              — a single hero still (thumbnail/poster)
────────────────────────────────────────────────────────────────────────────
Defensive socket/setting lookups → runs on Blender 3.6+ and on 4.2+ / 5.x
(EEVEE Next). All branding/tuning lives in the CONFIG block.
"""

import bpy
import os
import math
import random

# ── CONFIG ───────────────────────────────────────────────────────────────────
TITLE = "CODE\nACADEMY"             # two lines so the wordmark always fits frame
TAGLINE = "FUELING THE FUTURE, BRIGHT MINDS THROUGH CODE"
FRAMES = 200                        # intro + spin + vanish (~8.3s @ 24fps); 2D logo+levels appended later
FPS = 24
RES = (1920, 1080)                  # use (1080, 1920) for a vertical / story ad
SAMPLES = 64

# Syntactic Play palette (sRGB hex — converted to linear below)
HEX_BG = "#07071a"      # space-navy stage
HEX_BRAND = "#4a90e2"   # signature blue (the logo's namesake color)
HEX_PRISM = "#cfeeff"   # near-clear, faint cyan tint
HEX_CYAN = "#00c8ff"
HEX_GOLD = "#f5a623"    # orange accent (from the Code Academy logo)

N_PRISMS = 9
SEED = 7

POSTER_ONLY = os.environ.get("AD_POSTER_ONLY") == "1"
SAVE_BLEND = os.environ.get("AD_SAVE_BLEND") == "1"   # build scene + save .blend, skip render

try:
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    SCRIPT_DIR = os.getcwd()
OUT_DIR = os.path.join(SCRIPT_DIR, "output")
os.makedirs(OUT_DIR, exist_ok=True)


# ── Helpers ──────────────────────────────────────────────────────────────────
def srgb(hex_str):
    """sRGB hex → linear RGBA (Blender's node/light inputs expect linear)."""
    h = hex_str.lstrip("#")
    rgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return (lin[0], lin[1], lin[2], 1.0)


def set_socket(node, names, value):
    """Set the first matching input socket (Blender renamed many in 4.0)."""
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return True
    return False


def _principled(mat):
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        for nd in mat.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED":
                bsdf = nd
                break
    return bsdf


def clear_scene():
    """Headless-safe wipe of the factory scene (default cube/cam/light)."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                 bpy.data.cameras, bpy.data.lights):
        for b in list(coll):
            if b.users == 0:
                coll.remove(b)


def glass_material(name, color, roughness=0.03, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = _principled(mat)
    set_socket(bsdf, ["Base Color"], color)
    set_socket(bsdf, ["Transmission Weight", "Transmission"], 1.0)
    set_socket(bsdf, ["Roughness"], roughness)
    set_socket(bsdf, ["IOR"], 1.45)
    set_socket(bsdf, ["Metallic"], 0.0)
    set_socket(bsdf, ["Coat Weight", "Clearcoat"], 1.0)            # edge sheen
    set_socket(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.05)
    if emission is not None:                                        # subtle brand self-glow
        set_socket(bsdf, ["Emission Color", "Emission"], emission)
        set_socket(bsdf, ["Emission Strength"], emission_strength)
    try:
        mat.use_screen_refraction = True     # EEVEE: see *through* the glass
    except Exception:
        pass
    return mat


def emissive_material(name, color, strength=2.2):
    """Solid self-illuminated material — legible glowing text."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = _principled(mat)
    set_socket(bsdf, ["Base Color"], color)
    set_socket(bsdf, ["Emission Color", "Emission"], color)
    set_socket(bsdf, ["Emission Strength"], strength)
    set_socket(bsdf, ["Roughness"], 0.4)
    return mat


def add_text(body, name, size, z=0.0, extrude=0.06, bevel=0.012, mat=None):
    bpy.ops.object.text_add()
    ob = bpy.context.object
    ob.name = name
    ob.data.body = body
    ob.data.align_x = "CENTER"
    ob.data.align_y = "CENTER"
    ob.data.size = size
    ob.data.extrude = extrude
    ob.data.bevel_depth = bevel
    ob.data.bevel_resolution = 2
    ob.rotation_euler = (math.radians(90), 0, 0)   # stand it up to face camera (-Y)
    ob.location = (0, 0, z)
    if mat:
        ob.data.materials.append(mat)
    return ob


def add_prisms(n, mat):
    prisms = []
    for i in range(n):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1, radius=random.uniform(0.18, 0.5)
        )
        ob = bpy.context.object
        ob.name = "Prism_%d" % i
        ob.location = (
            random.uniform(-5.5, 5.5),
            random.uniform(-1.0, 3.5),
            random.uniform(-1.8, 2.0),
        )
        for p in ob.data.polygons:      # faceted (flat) shading = gem-like
            p.use_smooth = False
        ob.data.materials.append(mat)
        prisms.append(ob)
    return prisms


def animate_prism(ob, frames):
    z0 = ob.location.z
    amp = random.uniform(0.3, 0.8)
    for f, z in ((1, z0), (frames // 2, z0 + amp), (frames, z0)):   # sinusoidal float
        ob.location.z = z
        ob.keyframe_insert("location", index=2, frame=f)
    ax = random.randint(0, 2)                                       # slow spin
    ob.rotation_euler[ax] = 0
    ob.keyframe_insert("rotation_euler", index=ax, frame=1)
    ob.rotation_euler[ax] = math.radians(random.choice([-1, 1]) * random.uniform(120, 360))
    ob.keyframe_insert("rotation_euler", index=ax, frame=frames)


def add_area(name, loc, rot, energy, size, color):
    bpy.ops.object.light_add(type="AREA", location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.rotation_euler = rot
    ob.data.energy = energy
    ob.data.size = size
    ob.data.color = color[:3]
    return ob


def add_camera(target, frames):
    bpy.ops.object.camera_add(location=(-2.2, -10.5, 0.7))
    cam = bpy.context.object
    cam.name = "AdCamera"
    bpy.context.scene.camera = cam
    cam.data.lens = 50
    cam.data.dof.use_dof = True              # the soft depth-of-field look
    cam.data.dof.focus_object = target
    cam.data.dof.aperture_fstop = 2.2
    con = cam.constraints.new("TRACK_TO")    # always frame the logo
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    settle = int(frames * 0.6)               # dolly in, then settle frontal for the spin
    cam.location = (-2.5, -10.5, 0.7)
    cam.keyframe_insert("location", frame=1)
    cam.location = (0.0, -10.0, 1.7)
    cam.keyframe_insert("location", frame=settle)
    cam.location = (0.0, -10.0, 1.7)
    cam.keyframe_insert("location", frame=frames)
    return cam


def setup_spin(title, tagline, frames):
    """Spin the wordmark around the vertical axis, then shrink it to nothing —
    a clean hand-off into the 2D logo reveal that gets appended afterward."""
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    pivot = bpy.context.object
    pivot.name = "TitlePivot"
    for ob in (title, tagline):
        ob.parent = pivot
        ob.matrix_parent_inverse = pivot.matrix_world.inverted()

    spin_start = int(frames * 0.52)
    spin_end = int(frames * 0.90)
    vanish_end = int(frames * 0.96)

    pivot.rotation_euler[2] = 0.0
    pivot.keyframe_insert("rotation_euler", index=2, frame=spin_start)
    pivot.rotation_euler[2] = math.radians(360)          # one slow, gentle turn
    pivot.keyframe_insert("rotation_euler", index=2, frame=spin_end)
    # default Bezier interpolation already eases the spin in/out smoothly

    pivot.scale = (1.0, 1.0, 1.0)
    pivot.keyframe_insert("scale", frame=spin_end)
    pivot.scale = (0.001, 0.001, 0.001)                  # collapse to nothing
    pivot.keyframe_insert("scale", frame=vanish_end)
    return pivot


def set_world(color):
    scene = bpy.context.scene
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = color
    bg.inputs["Strength"].default_value = 0.5


def configure_render():
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = FRAMES
    scene.render.fps = FPS
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = eng
            break
        except Exception:
            continue
    ee = scene.eevee
    for attr, val in (
        ("use_raytracing", True),        # EEVEE Next (4.2+ / 5.x) refraction + GI
        ("use_ssr", True),               # legacy EEVEE
        ("use_ssr_refraction", True),    # legacy EEVEE
        ("use_bloom", True),             # legacy EEVEE glow
        ("bloom_intensity", 0.04),
        ("use_gtao", True),
        ("taa_render_samples", SAMPLES),
        ("use_volumetric_shadows", True),
        ("volumetric_samples", 32),
        ("volumetric_start", 0.1),
        ("volumetric_end", 45.0),
    ):
        if hasattr(ee, attr):
            try:
                setattr(ee, attr, val)
            except Exception:
                pass
    # Push ray-tracing quality for the reflective floor (EEVEE Next; defensive)
    try:
        rt = ee.ray_tracing_options
        for attr, val in (("resolution_scale", "1"), ("trace_max_roughness", 0.6),
                          ("screen_trace_quality", 0.6), ("use_denoise", True)):
            if hasattr(rt, attr):
                try:
                    setattr(rt, attr, val)
                except Exception:
                    pass
    except Exception:
        pass


def render_still(path, frame):
    scene = bpy.context.scene
    scene.render.image_settings.file_format = "PNG"
    scene.frame_set(frame)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def render_animation(base_dir):
    """Render the loop. Use FFmpeg/MP4 if this Blender build has it; otherwise
    fall back to a PNG sequence (Blender 5.x ships without FFmpeg output)."""
    scene = bpy.context.scene
    try:
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "HIGH"
        scene.render.ffmpeg.ffmpeg_preset = "GOOD"
        scene.render.filepath = os.path.join(base_dir, "syntactic_play_ad.mp4")
        bpy.ops.render.render(animation=True)
        return "video"
    except TypeError:
        frames_dir = os.path.join(base_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = os.path.join(frames_dir, "frame_")  # frame_0001.png …
        bpy.ops.render.render(animation=True)
        return "frames"


def add_gaming_flair():
    """Ray-traced 'gaming' look: a glossy reflective floor, a hero spotlight,
    neon RGB rim accents, and a faint volumetric haze for light shafts."""
    # Reflective wet-look floor (ray-traced reflections of the glass + lights)
    bpy.ops.mesh.primitive_plane_add(size=90, location=(0, 0, -2.05))
    floor = bpy.context.object
    floor.name = "Floor"
    fm = bpy.data.materials.new("FloorMat")
    fm.use_nodes = True
    b = _principled(fm)
    set_socket(b, ["Base Color"], (0.012, 0.015, 0.026, 1))
    set_socket(b, ["Roughness"], 0.06)
    set_socket(b, ["Metallic"], 0.0)
    set_socket(b, ["Coat Weight", "Clearcoat"], 0.7)
    floor.data.materials.append(fm)

    # Dramatic hero spotlight from above
    bpy.ops.object.light_add(type="SPOT", location=(0, -2.5, 9))
    sp = bpy.context.object
    sp.name = "HeroSpot"
    sp.data.energy = 4200
    sp.data.spot_size = math.radians(58)
    sp.data.spot_blend = 0.45
    sp.data.color = srgb("#8fc4ff")[:3]
    sp.rotation_euler = (math.radians(12), 0, 0)

    # Neon RGB rim accents (the "gaming" pop)
    add_area("NeonCyan", (-6, 2, 1.0), (math.radians(80), 0, math.radians(-30)), 650, 2.5, srgb("#00d8ff"))
    add_area("NeonViolet", (6, 2, -0.5), (math.radians(80), 0, math.radians(30)), 480, 2.5, srgb("#7c3aed"))

    # Faint volumetric haze so the spotlight throws visible shafts (EEVEE Next)
    try:
        bpy.ops.mesh.primitive_cube_add(size=46, location=(0, 0, 1))
        vol = bpy.context.object
        vol.name = "Atmos"
        vm = bpy.data.materials.new("Atmos")
        vm.use_nodes = True
        nt = vm.node_tree
        for nd in list(nt.nodes):
            nt.nodes.remove(nd)
        out_node = nt.nodes.new("ShaderNodeOutputMaterial")
        scat = nt.nodes.new("ShaderNodeVolumeScatter")
        scat.inputs["Density"].default_value = 0.006
        scat.inputs["Color"].default_value = (0.55, 0.72, 1.0, 1.0)
        nt.links.new(scat.outputs[0], out_node.inputs["Volume"])
        vol.data.materials.append(vm)
    except Exception as e:
        print("[flair] volumetric skipped:", e)


# ── Build & render ───────────────────────────────────────────────────────────
def main():
    random.seed(SEED)
    clear_scene()
    set_world(srgb(HEX_BG))

    glass_brand = glass_material("GlassBrand", srgb(HEX_BRAND),
                                 emission=srgb(HEX_BRAND), emission_strength=0.6)
    glass_clear = glass_material("GlassClear", srgb(HEX_PRISM))
    tag_glow = emissive_material("TaglineGlow", srgb(HEX_CYAN), strength=2.4)

    title = add_text(TITLE, "Title", size=0.9, z=0.65, mat=glass_brand)
    tagline = add_text(TAGLINE, "Tagline", size=0.18, z=-1.05,
                       extrude=0.02, bevel=0.004, mat=tag_glow)

    for p in add_prisms(N_PRISMS, glass_clear):
        animate_prism(p, FRAMES)

    # Cinematic studio rig: white key, cool fill, a frontal fill to light the
    # glass faces, and brand-tinted rims (blue / cyan / gold-XP).
    add_area("Key",   (3, -4, 6),    (math.radians(50), 0, math.radians(20)),  750, 6, srgb("#ffffff"))
    add_area("Fill",  (-5, -3, 1),   (math.radians(80), 0, math.radians(-40)), 180, 8, srgb("#aab6ff"))
    add_area("Front", (0, -7.5, 0.8), (math.radians(90), 0, 0),                260, 7, srgb("#dfe9ff"))
    add_area("RimB",  (2, 5, 2),     (math.radians(-70), 0, math.radians(10)), 400, 3, srgb(HEX_BRAND))
    add_area("RimC",  (-4, 4, 0),    (math.radians(-80), 0, math.radians(-20)),300, 3, srgb(HEX_CYAN))
    add_area("RimG",  (5, 3, -1),    (math.radians(-80), 0, math.radians(40)), 180, 3, srgb(HEX_GOLD))

    add_gaming_flair()
    add_camera(title, FRAMES)
    setup_spin(title, tagline, FRAMES)
    configure_render()

    if SAVE_BLEND:
        blend_path = os.path.join(SCRIPT_DIR, "syntactic_play_ad.blend")
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        print("[Syntactic Play] Saved Blender project ->", blend_path)
        return

    test_frame = int(os.environ.get("AD_TEST_FRAME", FRAMES // 3))
    render_still(os.path.join(OUT_DIR, "poster.png"), test_frame)
    if not POSTER_ONLY:
        mode = render_animation(OUT_DIR)
        print("\n[Syntactic Play] Animation rendered as:", mode)
    print("[Syntactic Play] Output ->", OUT_DIR)


if __name__ == "__main__":
    main()
