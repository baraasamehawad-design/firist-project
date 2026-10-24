# Syntactic Play — Blender Ad

A short, looping brand ad (glass logo + floating prisms) for **Syntactic Play —
Gamified Coding Education**, in the app's own space-navy / blue / cyan palette.
Generated entirely from a script — no manual Blender work required.

## Render it

```powershell
& "D:\blender\blender.exe" --background --python syntactic_play_ad.py
```

Quick framing test (one still, a few seconds):

```powershell
$env:AD_POSTER_ONLY = "1"
& "D:\blender\blender.exe" --background --python syntactic_play_ad.py
Remove-Item Env:\AD_POSTER_ONLY
```

## Output

Written to `./output/`:

- `syntactic_play_ad.mp4` — H.264, 1920×1080, ~5s @ 24fps
- `poster.png` — a single hero still (thumbnail/poster)

## Customize

Everything is in the `CONFIG` block at the top of `syntactic_play_ad.py`:

| Setting | What it does |
|---|---|
| `TITLE`, `TAGLINE` | the on-screen copy (`TITLE` is two lines so it always fits) |
| `RES` | `(1920,1080)` landscape → switch to `(1080,1920)` for a vertical/story ad |
| `FRAMES`, `FPS` | length & smoothness |
| `SAMPLES` | render quality vs. speed |
| `HEX_BG`, `HEX_BRAND`, `HEX_CYAN`, `HEX_GOLD` | palette (defaults to the app's `#07071a` / `#4a90e2` / `#00c8ff` / `#facc15`) |
| `N_PRISMS` | how many floating glass shapes |

> Verified on Blender 5.1.2 (EEVEE Next), headless. Defensive lookups keep it
> working on 3.6+ through 5.x. For maximum-quality glass/caustics, switch the
> engine to `CYCLES` in `configure_render()` (slower, GPU recommended).
