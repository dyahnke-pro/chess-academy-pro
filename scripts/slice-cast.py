#!/usr/bin/env python3
"""Slice the modern chess cast out of the single Ragnarok collector sheet,
strip backgrounds (rembg), upscale, and derive the enemy army by recolor.

Outputs public/rpg/cast/<piece>-{light,dark}.png — full-body token art.
Boxes are tuned to rpg-cast-src/ragnarok-sheet.png (1408x768).
"""
import os
from PIL import Image
from rembg import remove

HERE = os.path.dirname(__file__)
SHEET = os.path.join(HERE, '..', 'rpg-cast-src', 'ragnarok-sheet.png')
OUT = os.path.join(HERE, '..', 'public', 'rpg', 'cast')

BOXES = {
    'king':   (18, 32, 172, 250),
    'queen':  (540, 30, 700, 255),
    'rook':   (1055, 30, 1225, 255),    # Armored
    'knight': (600, 438, 850, 724),     # mounted Wolf Knight
    'bishop': (1148, 503, 1274, 661),   # green Ranger (archer) — cut at the boots (no pedestal)
    'pawn':   (150, 500, 284, 662),     # hooded Rogue — cut at the boots (no pedestal)
}
ENEMY = (150, 1.10, 0.82)  # purple: (hue_shift 0-255, sat x, val x)


def recolor(img, hue_shift, sat, val):
    a = img.split()[3]
    h, s, v = img.convert('RGB').convert('HSV').split()
    h = h.point(lambda p: (p + hue_shift) % 256)
    s = s.point(lambda p: min(255, int(p * sat)))
    v = v.point(lambda p: min(255, int(p * val)))
    out = Image.merge('HSV', (h, s, v)).convert('RGBA')
    out.putalpha(a)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(SHEET).convert('RGB')
    for name, b in BOXES.items():
        cut = remove(im.crop(b)).convert('RGBA')
        cut = cut.resize((cut.width * 3, cut.height * 3), Image.LANCZOS)
        cut.save(os.path.join(OUT, f'{name}-light.png'))
        recolor(cut, *ENEMY).save(os.path.join(OUT, f'{name}-dark.png'))
        print(f'  {name}: light + dark ({cut.width}x{cut.height})', flush=True)
    print('done.')


if __name__ == '__main__':
    main()
