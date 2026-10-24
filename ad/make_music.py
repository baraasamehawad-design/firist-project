"""
Original royalty-free soundtrack generator for the Syntactic Play ad.

Synthesizes a subtle, lightly-funky chill-groove bed (no samples, no copyright):
soft Rhodes-style 7th chords, a syncopated bassline, and a quiet kick/snare/hat
groove with a touch of swing. Pure Python stdlib — no numpy.

RUN:
    "C:\\Python314\\python.exe" make_music.py
OUTPUT:
    ./music.wav   (stereo 44.1k, length matches the 10s ad)
"""

import wave
import struct
import math
import random
import os

SR = 44100
BPM = 96
BEAT = 60.0 / BPM          # 0.625 s
BAR = 4 * BEAT             # 2.5 s
DUR = float(os.environ.get("AD_MUSIC_DUR", "10"))   # seconds (override per ad length)
BARS = int(math.ceil(DUR / BAR)) + 1                 # enough bars to cover DUR
N = int(SR * DUR)
SWING = 0.055 * BEAT       # subtle groove on the off-beats

random.seed(11)
buf = [0.0] * N

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "music.wav")


def midi(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))


def add(idx, v):
    if 0 <= idx < N:
        buf[idx] += v


def adsr(i, n, a, d, s, r):
    if i < a:
        return i / a if a else 1.0
    if i < a + d:
        return 1.0 - (1.0 - s) * (i - a) / d if d else s
    rel = n - r
    if i < rel:
        return s
    return s * max(0.0, 1.0 - (i - rel) / r) if r else 0.0


def tone(start_t, dur_t, freq, amp, a=0.02, d=0.2, s=0.6, r=0.3, kind="rhodes"):
    start = int(start_t * SR)
    n = int(dur_t * SR)
    ai, di, ri = int(a * SR), int(d * SR), int(r * SR)
    for i in range(n):
        e = adsr(i, n, ai, di, s, ri)
        if e <= 0.0:
            continue
        ph = 2 * math.pi * freq * (i / SR)
        if kind == "rhodes":          # sine + soft harmonics = electric-piano-ish
            v = math.sin(ph) + 0.18 * math.sin(2 * ph) + 0.06 * math.sin(3 * ph)
        elif kind == "tri":           # triangle = warm bass
            v = (2.0 / math.pi) * math.asin(math.sin(ph))
        else:
            v = math.sin(ph)
        add(start + i, amp * e * v)


def kick(start_t, amp=0.7):
    start = int(start_t * SR)
    n = int(0.22 * SR)
    for i in range(n):
        t = i / SR
        f = 110.0 * math.exp(-t * 30.0) + 45.0      # pitch drop
        v = math.sin(2 * math.pi * f * t)
        add(start + i, amp * math.exp(-t * 16.0) * v)


def hat(start_t, amp=0.14):
    start = int(start_t * SR)
    n = int(0.05 * SR)
    for i in range(n):
        t = i / SR
        add(start + i, amp * math.exp(-t * 120.0) * (random.random() * 2 - 1))


def snare(start_t, amp=0.3):
    start = int(start_t * SR)
    n = int(0.14 * SR)
    for i in range(n):
        t = i / SR
        e = math.exp(-t * 22.0)
        noise = random.random() * 2 - 1
        body = math.sin(2 * math.pi * 190.0 * t)
        add(start + i, amp * e * (0.7 * noise + 0.3 * body))


# ── Arrangement: I–vi–ii–V in C (Cmaj7 · Am7 · Dm7 · G7) ─────────────────────
CHORDS = [
    [60, 64, 67, 71],   # Cmaj7
    [57, 60, 64, 67],   # Am7
    [62, 65, 69, 72],   # Dm7
    [55, 59, 62, 65],   # G7
]
BASS = [36, 33, 38, 43]  # C2 · A1 · D2 · G2

for b in range(BARS):
    bar_t = b * BAR

    # Rhodes chord — slight per-note stagger to humanize the voicing
    for j, note in enumerate(CHORDS[b % len(CHORDS)]):
        tone(bar_t + j * 0.012, BAR * 0.96, midi(note), 0.11,
             a=0.03, d=0.35, s=0.55, r=0.5, kind="rhodes")

    # Syncopated bass groove (swing on the off-beats) — the "subtle funk"
    root = BASS[b % len(BASS)]
    bass_hits = [
        (0.0, 0.9, root),
        (1.5, 0.4, root),
        (2.5, 0.4, root + 12),
        (3.5, 0.4, root + 7),
    ]
    for beat, dur, n in bass_hits:
        sw = SWING if (beat % 1.0) else 0.0
        tone(bar_t + beat * BEAT + sw, dur * BEAT, midi(n), 0.5,
             a=0.008, d=0.12, s=0.7, r=0.12, kind="tri")

    # Light groove: kick on 1 & 3, snare backbeat on 2 & 4, hats on the off-beats
    kick(bar_t + 0.0 * BEAT)
    kick(bar_t + 2.0 * BEAT, amp=0.6)
    snare(bar_t + 1.0 * BEAT)
    snare(bar_t + 3.0 * BEAT)
    for off in (0.5, 1.5, 2.5, 3.5):
        hat(bar_t + off * BEAT + SWING, amp=0.12)


# ── Light feedback delay for space, then fades + soft limiter ────────────────
d = int(0.18 * SR)
for i in range(d, N):
    buf[i] += 0.2 * buf[i - d]

peak = max(1e-6, max(abs(x) for x in buf))
gain = 0.82 / peak
fi, fo = int(0.25 * SR), int(0.8 * SR)
for i in range(N):
    g = gain
    if i < fi:
        g *= i / fi
    if i > N - fo:
        g *= max(0.0, (N - i) / fo)
    buf[i] = math.tanh(buf[i] * g)   # soft clip

# ── Write stereo 16-bit WAV ──────────────────────────────────────────────────
frames = bytearray()
for x in buf:
    s = max(-32767, min(32767, int(x * 32767)))
    frames += struct.pack("<hh", s, s)

with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(bytes(frames))

print("Wrote", OUT, "(%.1fs)" % DUR)
