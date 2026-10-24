"""
Builds the final audio track (NO music): the female voiceover + two spotlight
'click' SFX, padded to the ad length. RUN: python make_audio.py -> final_audio.wav
"""
import wave
import math
import random
import os
import array

AD = os.path.dirname(os.path.abspath(__file__))
SR = 22050
DUR = 18.84
N = int(SR * DUR)
buf = array.array("d", [0.0] * N)

# ── Voiceover ────────────────────────────────────────────────────────────────
vo = wave.open(os.path.join(AD, "voiceover.wav"), "rb")
vch = vo.getnchannels()
raw = vo.readframes(vo.getnframes())
vo.close()
a = array.array("h")
a.frombytes(raw)
if vch == 2:
    a = a[0::2]
for i in range(min(len(a), N)):
    buf[i] += a[i] / 32768.0 * 0.96

# ── Two spotlight clicks (synced to the reveal) ──────────────────────────────
random.seed(3)


def click(t0, amp=0.6):
    s0 = int(t0 * SR)
    n = int(0.05 * SR)
    for i in range(n):
        e = math.exp(-i / SR * 160.0)
        v = (random.random() * 2 - 1) * e + math.sin(2 * math.pi * 2300 * (i / SR)) * e * 0.35
        idx = s0 + i
        if idx < N:
            buf[idx] += amp * v


click(0.30)   # right spotlight
click(0.92)   # left spotlight

# ── Write ────────────────────────────────────────────────────────────────────
out = array.array("h", [0] * N)
for i in range(N):
    x = buf[i]
    out[i] = int(max(-1.0, min(1.0, x)) * 32767)
w = wave.open(os.path.join(AD, "final_audio.wav"), "wb")
w.setnchannels(1)
w.setsampwidth(2)
w.setframerate(SR)
w.writeframes(out.tobytes())
w.close()
print("final_audio.wav %.1fs (voiceover + 2 clicks, no music)" % (N / SR))
