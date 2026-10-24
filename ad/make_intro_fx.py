"""
2D intro FX over the rendered 3D frames (no Blender re-render):
  - starts BLACK, a spotlight from the RIGHT reveals the word, then one from the
    LEFT (clicks are added in the audio at the matching moments)
  - a white shine-line sweep (Android-install glow) across the word
  - glistening sparkles on the glass

Processes frames 1..REVEAL_END with the effect; copies the rest through.
Output -> ad/output/frames_fx.  RUN: python make_intro_fx.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import os
import math
import shutil

AD = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AD, "output")
SRC = os.path.join(OUT, "frames")
DST = os.path.join(OUT, "frames_fx")
os.makedirs(DST, exist_ok=True)
W, H = 1920, 1080
TOTAL = 200
REVEAL_END = 52

RC = (W * 0.66, H * 0.42)   # right spotlight centre (on the word)
LC = (W * 0.34, H * 0.42)   # left spotlight centre


def clamp(x):
    return max(0.0, min(1.0, x))


def build_mask(i):
    sw, sh = 192, 108
    m = Image.new("L", (sw, sh), 0)
    px = m.load()
    rampR = clamp((i - 6) / 12.0)      # right light fades in at frame 6 (~0.30s)
    rampL = clamp((i - 22) / 12.0)     # left light at frame 22 (~0.92s)
    glob = clamp((i - 34) / 18.0)      # full reveal by ~frame 52
    rcx, rcy = RC[0] * sw / W, RC[1] * sh / H
    lcx, lcy = LC[0] * sw / W, LC[1] * sh / H
    rr = sw * 0.42
    for y in range(sh):
        for x in range(sw):
            dr = math.exp(-(((x - rcx) / rr) ** 2 + ((y - rcy) / (rr * 0.8)) ** 2) * 2.2) * rampR
            dl = math.exp(-(((x - lcx) / rr) ** 2 + ((y - lcy) / (rr * 0.8)) ** 2) * 2.2) * rampL
            px[x, y] = int(min(1.0, max(dr, dl, glob)) * 255)
    return m.resize((W, H), Image.LANCZOS).convert("RGB")


def add_sweep(fr, i):
    s = clamp((i - 26) / 22.0)         # shine sweeps L->R, frames 26..48
    if s <= 0 or s >= 1:
        return fr
    x = int(s * W)
    line = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(line)
    lw = 60
    for dx in range(-lw, lw):
        a = max(0.0, 1 - abs(dx) / lw)
        c = int(210 * a)
        xx = x + dx
        if 0 <= xx < W:
            d.line([(xx, 0), (xx, H)], fill=(c, c, min(255, int(c * 1.1))))
    return ImageChops.screen(fr, line.filter(ImageFilter.GaussianBlur(7)))


def add_glints(fr, i):
    if i < 16 or i > REVEAL_END + 4:
        return fr
    pts = [(W * 0.40, H * 0.40), (W * 0.58, H * 0.45), (W * 0.50, H * 0.55), (W * 0.66, H * 0.40)]
    g = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(g)
    for k, (px, py) in enumerate(pts):
        tw = 0.5 + 0.5 * math.sin(i * 0.5 + k * 1.7)
        if tw < 0.25:
            continue
        sz = int(8 + 20 * tw)
        c = int(230 * tw)
        d.line([(px - sz, py), (px + sz, py)], fill=(c, c, c), width=2)
        d.line([(px, py - sz), (px, py + sz)], fill=(c, c, c), width=2)
    return ImageChops.screen(fr, g.filter(ImageFilter.GaussianBlur(2)))


for i in range(1, TOTAL + 1):
    src_f = os.path.join(SRC, "frame_%04d.png" % i)
    dst_f = os.path.join(DST, "frame_%04d.png" % i)
    if i <= REVEAL_END:
        fr = Image.open(src_f).convert("RGB")
        fr = ImageChops.multiply(fr, build_mask(i))   # black -> spotlight reveal
        fr = add_sweep(fr, i)
        fr = add_glints(fr, i)
        fr.save(dst_f)
    else:
        shutil.copy(src_f, dst_f)
print("intro FX done -> frames_fx")
