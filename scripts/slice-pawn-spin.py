#!/usr/bin/env python3
"""Slice the rogue dagger-spin sheet into a 4-frame spin-attack for the pawn.

Source: rpg-cast-src/frames/pawn-dagger-spin-sheet.png (704x1525) — David's
"Rogue Dagger-Spin: All-Around Perspective" render. We take four CLEAN
rotation panels (Front → Left Side → Back → Right Side) so cycling them reads
as the rogue physically spinning 360° in place. Figures only — the panel's
baked swoosh trails are dropped here and re-drawn as an animated procedural
overlay on the board (RpgChessBoard SwooshRing), which animates better and
slices cleaner. David: "keep the swooshes" → the board paints them live.

Output: public/rpg/cast/frames/pawn-spin-<idx>-<light|dark>.png
"""
import os

from PIL import Image
from rembg import remove

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'rpg-cast-src', 'frames', 'pawn-dagger-spin-sheet.png')
OUT = os.path.join(ROOT, 'public', 'rpg', 'cast', 'frames')

ENEMY = (150, 1.10, 0.82)  # purple preset from process-cast.py

# (x0, y0, x1, y1) figure-only panels (cropped above the pedestal + caption),
# in 360° rotation order so cycling them spins the rogue.
PANELS = [
    (20, 68, 345, 352),     # 0  Front View (Swing Start)
    (20, 430, 345, 690),    # 1  Left Side View
    (20, 1150, 345, 1408),  # 2  Back View (Swing Mid)
    (360, 430, 685, 690),   # 3  Right Side View
]


def recolor(img: Image.Image) -> Image.Image:
    hue_shift, sat, val = ENEMY
    a = img.split()[3]
    h, s, v = img.convert('RGB').convert('HSV').split()
    h = h.point(lambda p: (p + hue_shift) % 256)
    s = s.point(lambda p: min(255, int(p * sat)))
    v = v.point(lambda p: min(255, int(p * val)))
    out = Image.merge('HSV', (h, s, v)).convert('RGBA')
    out.putalpha(a)
    return out


def strip_figure(cell: Image.Image) -> Image.Image:
    """rembg figure mask — drops the dark bg and the faint swoosh arcs."""
    cut = remove(cell).convert('RGBA')
    bbox = cut.getbbox()
    return cut.crop(bbox) if bbox else cut


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(SRC).convert('RGB')
    print(f'slicing pawn-dagger-spin-sheet.png {sheet.size}…', flush=True)
    figs = []
    for box in PANELS:
        cell = sheet.crop(box)
        cell = cell.resize((cell.width * 2, cell.height * 2), Image.LANCZOS)
        figs.append(strip_figure(cell))
    pad = 20
    cw = max(f.width for f in figs) + pad * 2
    ch = max(f.height for f in figs) + pad * 2
    for idx, fig in enumerate(figs):
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.paste(fig, ((cw - fig.width) // 2, ch - fig.height - pad), fig)
        canvas.save(os.path.join(OUT, f'pawn-spin-{idx}-light.png'))
        recolor(canvas).save(os.path.join(OUT, f'pawn-spin-{idx}-dark.png'))
        print(f'  pawn-spin-{idx}: light + dark  ({fig.width}x{fig.height})', flush=True)
    print('done.', flush=True)


if __name__ == '__main__':
    main()
