"""
Recreates the Code Academy logo as a real PNG file (transparent background),
since the original couldn't be transferred from chat. Pure Pillow — supersampled
for smooth edges. Faithful approximation: hexagon tech-shield emblem (brackets +
ascending bars + binary + book) over the CODE ACADEMY wordmark + tagline.

RUN:  "C:\\Python314\\python.exe" make_logo.py   ->   logo.png
"""
from PIL import Image, ImageDraw, ImageFont
import os

SS = 3                      # supersample factor for anti-aliasing
W, H = 1320, 1040
NAVY = (30, 58, 95)
BLUE = (46, 109, 164)
BLUE2 = (59, 130, 196)
LBLUE = (91, 155, 213)
ORANGE = (240, 150, 16)
TAG_COL = (59, 90, 128)
OUT_NAME = "logo.png"

# LOGO_LIGHT=1 -> light palette so the logo reads on a dark background (no card)
if os.environ.get("LOGO_LIGHT") == "1":
    NAVY = (236, 244, 255)      # wordmark -> near-white
    BLUE = (120, 180, 236)
    BLUE2 = (150, 202, 246)
    LBLUE = (188, 220, 250)
    TAG_COL = (150, 188, 228)
    OUT_NAME = "logo_light.png"

img = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
d = ImageDraw.Draw(img)


def S(*v):
    return tuple(x * SS for x in v) if len(v) > 1 else v[0] * SS


def font(path_options, size):
    for p in path_options:
        if os.path.exists(p):
            return ImageFont.truetype(p, size * SS)
    return ImageFont.load_default()


F_BOLD = font(["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"], 150)
F_TAG = font(["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"], 34)
F_BIN = font(["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf"], 26)


def line(pts, fill, w):
    d.line([S(*p) for p in pts], fill=fill, width=int(w * SS), joint="curve")


def poly(pts, fill):
    d.polygon([S(*p) for p in pts], fill=fill)


def rect(x0, y0, x1, y1, fill):
    d.rectangle([S(min(x0, x1), min(y0, y1)), S(max(x0, x1), max(y0, y1))], fill=fill)


# ── Emblem: hexagon shield (flat top/bottom, points left/right) ──────────────
cx, cy = 660, 300
hexpts = [(cx - 95, cy - 165), (cx + 95, cy - 165), (cx + 190, cy),
          (cx + 95, cy + 165), (cx - 95, cy + 165), (cx - 190, cy)]
line(hexpts + [hexpts[0]], BLUE, 22)
line([(cx - 95, cy - 165), (cx + 95, cy - 165), (cx + 190, cy)], BLUE2, 22)  # lighter top edge

# open-book base
poly([(cx - 100, cy + 130), (cx, cy + 150), (cx, cy + 192), (cx - 100, cy + 172)], BLUE2)
poly([(cx + 100, cy + 130), (cx, cy + 150), (cx, cy + 192), (cx + 100, cy + 172)], BLUE)

# orange code brackets  < ... >
line([(cx - 58, cy - 92), (cx - 112, cy), (cx - 58, cy + 92)], ORANGE, 22)
line([(cx + 58, cy - 92), (cx + 112, cy), (cx + 58, cy + 92)], ORANGE, 22)

# ascending bars (cityscape / data)
rect(cx - 42, cy + 40, cx - 22, cy - 5, NAVY)
rect(cx - 14, cy + 40, cx + 6, cy - 35, BLUE)
rect(cx + 14, cy + 40, cx + 34, cy - 70, BLUE2)
# rising pixels
rect(cx + 40, cy - 52, cx + 58, cy - 34, LBLUE)
rect(cx + 62, cy - 78, cx + 80, cy - 60, LBLUE)

# binary down the left inner edge
for i, ch in enumerate("101011"):
    d.text(S(cx - 168, cy - 86 + i * 30), ch, font=F_BIN, fill=BLUE)


# ── Wordmark + tagline (letter-spaced, centered) ─────────────────────────────
def spaced(text, y, fnt, fill, sp):
    widths = [d.textlength(c, font=fnt) for c in text]
    total = sum(widths) + sp * SS * (len(text) - 1)
    x = (W * SS - total) / 2
    for c, w in zip(text, widths):
        d.text((x, y * SS), c, font=fnt, fill=fill)
        x += w + sp * SS


spaced("CODE ACADEMY", 640, F_BOLD, NAVY, 10)
spaced("FUELING THE FUTURE, BRIGHT MINDS THROUGH CODE", 840, F_TAG, TAG_COL, 6)

# ── Downsample for AA + save ─────────────────────────────────────────────────
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), OUT_NAME)
img.resize((W, H), Image.LANCZOS).save(out)
print("Wrote", out)
