"""
2D segments for the extended ad — now with a matching ray-traced "gaming"
lighting pass so they blend with the 3D intro:
  (2) LOGO REVEAL  - light logo zooms up on an atmosphere gradient, with a
                     reflective-floor mirror + bloom
  (3) WEBSITE      - live desktop/mobile captures, bloom + vignette
  (4) LEVELS PATH  - the 7 real levels on the atmosphere bg, glowing nodes

Shared lighting: blue/violet atmosphere gradient, bloom (screen blur), vignette.
Pure Pillow. RUN:  "C:\\Python314\\python.exe" make_segments.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageFilter
import os
import math

AD = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AD, "output")
W, H = 1920, 1080
BG = (7, 7, 26)
NAVY = (30, 58, 95); BLUE = (46, 109, 164); BLUE2 = (59, 130, 196)
LBLUE = (120, 175, 225); CYAN = (0, 200, 255); ORANGE = (245, 166, 35)
WHITE = (234, 242, 255)


def font(paths, size):
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


FB = lambda s: font(["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"], s)
FR = lambda s: font(["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"], s)


def clamp(x):
    return max(0.0, min(1.0, x))


def ease(t):
    return 1 - (1 - t) ** 3


def fade(color, a):
    a = clamp(a)
    return tuple(int(BG[k] + (color[k] - BG[k]) * a) for k in range(3))


def ctext(d, text, cx, y, fnt, fill):
    w = d.textlength(text, font=fnt)
    d.text((cx - w / 2, y), text, font=fnt, fill=fill)


# ── Shared lighting (precomputed once) ───────────────────────────────────────
def _make_atmosphere():
    sw, sh = 256, 144
    g = Image.new("RGB", (sw, sh))
    px = g.load()
    cx, cy = sw * 0.5, sh * 0.40
    for y in range(sh):
        for x in range(sw):
            r, gg, b = 7, 7, 26
            d = ((x - cx) / (sw * 0.62)) ** 2 + ((y - cy) / (sh * 0.62)) ** 2
            glow = max(0.0, 1.0 - d)
            r += int(18 * glow); gg += int(46 * glow); b += int(92 * glow)
            lc = max(0.0, 1.0 - x / (sw * 0.5))          # cyan to the left
            gg += int(20 * lc); b += int(34 * lc)
            rv = max(0.0, (x - sw * 0.5) / (sw * 0.5))    # violet to the right
            r += int(34 * rv); b += int(50 * rv)
            px[x, y] = (min(255, r), min(255, gg), min(255, b))
    return g.resize((W, H), Image.LANCZOS)


def _make_vignette():
    sw, sh = 256, 144
    v = Image.new("L", (sw, sh))
    px = v.load()
    cx, cy = sw / 2, sh / 2
    for y in range(sh):
        for x in range(sw):
            d = math.sqrt(((x - cx) / (sw * 0.62)) ** 2 + ((y - cy) / (sh * 0.62)) ** 2)
            px[x, y] = int(255 * (1 - 0.5 * clamp((d - 0.30) / 0.75)))
    return v.resize((W, H), Image.LANCZOS).convert("RGB")


ATMOS = _make_atmosphere()
VIGN = _make_vignette()


def lit(fr, glow_amt=0.5):
    """Bloom (screen of a blurred copy) + vignette = the 'ray-traced' look."""
    glow = fr.filter(ImageFilter.GaussianBlur(24))
    fr = Image.blend(fr, ImageChops.screen(fr, glow), glow_amt)
    return ImageChops.multiply(fr, VIGN)


def reflection(layer, strength=0.34):
    """Flip + gradient-fade a layer into a reflective-floor mirror."""
    r = layer.transpose(Image.FLIP_TOP_BOTTOM)
    w, h = r.size
    grad = Image.new("L", (1, h))
    for y in range(h):
        grad.putpixel((0, y), int(max(0.0, 1.0 - y / h) * 255 * strength))
    grad = grad.resize((w, h))
    r.putalpha(ImageChops.multiply(r.split()[3], grad))
    return r


# ── Segment 2: LOGO REVEAL ───────────────────────────────────────────────────
def render_logo(n=72):
    out = os.path.join(OUT, "seg_logo")
    os.makedirs(out, exist_ok=True)
    logo = Image.open(os.path.join(AD, "logo_light.png")).convert("RGBA")
    base_h = 820
    base_w = int(logo.width * base_h / logo.height)

    for i in range(n):
        t = i / (n - 1)
        s = 0.32 + ease(clamp(t / 0.55)) * 0.68
        s += clamp((t - 0.55) / 0.45) * 0.05
        w2, h2 = max(2, int(base_w * s)), max(2, int(base_h * s))
        lr = logo.resize((w2, h2), Image.LANCZOS)
        a = clamp(t / 0.14)
        if a < 1:
            lr.putalpha(lr.split()[3].point(lambda p: int(p * a)))
        fr = ATMOS.copy()
        x0, y0 = (W - w2) // 2, (H - h2) // 2 - 70
        refl = reflection(lr, 0.32)                       # reflective floor mirror
        fr.paste(refl, (x0, y0 + h2 - 6), refl)
        fr.paste(lr, (x0, y0), lr)
        lit(fr, 0.55).save(os.path.join(out, "frame_%04d.png" % (i + 1)))
    print("logo frames:", n)


# ── Segment 4: LEVELS PATH ───────────────────────────────────────────────────
LEVELS = [("1", "HTML BASICS"), ("2", "CSS SELECTORS"), ("3", "BOX MODEL"),
          ("4", "FLEXBOX"), ("5", "CSS GRID"), ("6", "POSITIONING"),
          ("7", "CSS ANIMATIONS")]


def render_levels(n=108):
    out = os.path.join(OUT, "seg_levels")
    os.makedirs(out, exist_ok=True)
    node_x, text_x = 600, 710
    row0, gap, r = 250, 100, 40

    for i in range(n):
        t = i / (n - 1)
        fr = ATMOS.copy()
        d = ImageDraw.Draw(fr)

        ha = clamp(t / 0.10)
        ctext(d, "THE CODE ACADEMY PATH", W / 2, 96, FB(62), fade(WHITE, ha))
        ctext(d, "LEVEL  1   →   10", W / 2, 174, FB(34), fade(CYAN, ha))

        for idx, (num, topic) in enumerate(LEVELS):
            appear = 0.16 + idx * 0.085
            ra = clamp((t - appear) / 0.07)
            if ra <= 0:
                continue
            y = row0 + idx * gap + int((1 - ease(ra)) * 36)
            if idx > 0:
                py = row0 + (idx - 1) * gap
                d.line([(node_x, py + r), (node_x, y - r)], fill=fade(BLUE, ra * 0.7), width=5)
            col = BLUE if idx % 2 == 0 else BLUE2
            d.ellipse([node_x - r, y - r, node_x + r, y + r], fill=fade(col, ra),
                      outline=fade(CYAN, ra), width=4)
            ctext(d, num, node_x, y - 28, FB(44), fade(WHITE, ra))
            d.text((text_x, y - 30), "LEVEL " + num, font=FR(22), fill=fade(LBLUE, ra))
            d.text((text_x, y - 4), topic, font=FB(40), fill=fade(WHITE, ra))

        ba = clamp((t - 0.82) / 0.1)
        if ba > 0:
            ctext(d, "…  AND BEYOND  →  10", W / 2, row0 + 7 * gap + 6, FB(40), fade(ORANGE, ba))

        lit(fr, 0.5).save(os.path.join(out, "frame_%04d.png" % (i + 1)))
    print("levels frames:", n)


# ── Segment 3: WEBSITE ───────────────────────────────────────────────────────
def render_website(n=72):
    out = os.path.join(OUT, "seg_web")
    os.makedirs(out, exist_ok=True)
    desk = Image.open(os.path.join(AD, "web", "web_desktop.png")).convert("RGB")
    mob = Image.open(os.path.join(AD, "web", "web_mobile.png")).convert("RGB")
    half = 40

    dw = W
    dh = int(desk.height * dw / desk.width)
    desk_r = desk.resize((dw, dh), Image.LANCZOS)
    maxpan = max(1, dh - H)
    for i in range(half):
        t = i / (half - 1)
        fr = ATMOS.copy()
        fr.paste(desk_r, (0, -int(ease(clamp(t)) * maxpan * 0.92)))
        a = clamp(t / 0.12) * (1 - clamp((t - 0.86) / 0.14))
        ctext(ImageDraw.Draw(fr), "INSIDE THE PLATFORM", W / 2, H - 72, FB(34), fade(WHITE, a))
        lit(fr, 0.28).save(os.path.join(out, "frame_%04d.png" % (i + 1)))

    rest = n - half
    for i in range(rest):
        t = i / (rest - 1)
        fr = ATMOS.copy()
        mh = int(940 * (1.0 + 0.06 * ease(t)))
        mw = int(mob.width * mh / mob.height)
        mr = mob.resize((mw, mh), Image.LANCZOS)
        mask = Image.new("L", (mw, mh), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, mw - 1, mh - 1], radius=34, fill=255)
        fr.paste(mr, ((W - mw) // 2, (H - mh) // 2), mask)
        a = clamp(t / 0.14) * (1 - clamp((t - 0.86) / 0.14))
        ctext(ImageDraw.Draw(fr), "LEARN ANYWHERE", W / 2, H - 72, FB(34), fade(WHITE, a))
        lit(fr, 0.28).save(os.path.join(out, "frame_%04d.png" % (half + i + 1)))
    print("web frames:", n)


if __name__ == "__main__":
    render_logo()
    render_website()
    render_levels()
    print("done")
