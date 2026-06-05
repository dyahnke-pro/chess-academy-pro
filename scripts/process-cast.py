#!/usr/bin/env python3
"""Process the modern character renders into game-ready piece tokens.

For each source render in rpg-cast-src/ (David's AI-generated gold cast):
  1. Strip the background with rembg (U2Net) → transparent PNG.
  2. Emit the LIGHT (gold) token to public/rpg/cast/<role>-light.png.
  3. Derive the DARK (enemy-army) token by recoloring (hue shift + darken)
     → public/rpg/cast/<role>-dark.png.

So only ONE gold cast needs to be generated; the opposing army is derived.

Usage:
  python3 scripts/process-cast.py            # default enemy color = purple
  python3 scripts/process-cast.py crimson    # or: purple | crimson | steel
"""
import glob
import os
import sys

from PIL import Image
from rembg import remove

SRC = os.path.join(os.path.dirname(__file__), '..', 'rpg-cast-src')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'rpg', 'cast')

# Enemy-army recolor presets: (hue_shift 0-255, saturation x, value x).
ENEMY = {
    'purple': (150, 1.10, 0.82),
    'crimson': (205, 1.15, 0.92),
    'steel': (120, 0.18, 0.95),
}


def recolor(img: Image.Image, hue_shift: int, sat: float, val: float) -> Image.Image:
    a = img.split()[3]
    h, s, v = img.convert('RGB').convert('HSV').split()
    h = h.point(lambda p: (p + hue_shift) % 256)
    s = s.point(lambda p: min(255, int(p * sat)))
    v = v.point(lambda p: min(255, int(p * val)))
    out = Image.merge('HSV', (h, s, v)).convert('RGBA')
    out.putalpha(a)
    return out


def main() -> None:
    enemy = sys.argv[1] if len(sys.argv) > 1 else 'purple'
    if enemy not in ENEMY:
        print(f'unknown enemy color {enemy}; use one of {list(ENEMY)}')
        sys.exit(1)
    os.makedirs(OUT, exist_ok=True)
    srcs = sorted(glob.glob(os.path.join(SRC, '*-light.png')))
    print(f'processing {len(srcs)} renders (enemy={enemy})…', flush=True)
    for f in srcs:
        role = os.path.basename(f).replace('-light.png', '')
        cut = remove(Image.open(f)).convert('RGBA')
        cut.save(os.path.join(OUT, f'{role}-light.png'))
        recolor(cut, *ENEMY[enemy]).save(os.path.join(OUT, f'{role}-dark.png'))
        print(f'  {role}: light + dark', flush=True)
    print('done.', flush=True)


if __name__ == '__main__':
    main()
