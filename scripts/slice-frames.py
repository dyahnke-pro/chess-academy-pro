#!/usr/bin/env python3
"""Slice David's AI-generated attack sheets into game-ready frame tokens.

Each character sheet shows a multi-phase attack (front view + back view). We
cut 4 representative phases per face to match the 4-frame attack player
(idx 0..3), strip the background, and bottom-anchor each on a per-face canvas
so feet land on a constant baseline and only the weapon swings (stable body).

Sources: rpg-cast-src/frames/<role>-attack-sheet.png
Output:  public/rpg/cast/frames/<role>-<face>-<idx>-<light|dark>.png

Pipeline per cell (mirrors scripts/process-cast.py):
  crop ABOVE the caption text -> 2x LANCZOS -> rembg strip -> alpha bbox crop
  -> paste bottom-aligned + h-centered on a per-face canvas -> light + dark.

Usage:  python3 scripts/slice-frames.py [role ...]   (default: all roles)
"""
import os
import sys

from PIL import Image
from rembg import remove

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'rpg-cast-src', 'frames')
OUT = os.path.join(ROOT, 'public', 'rpg', 'cast', 'frames')

ENEMY = (150, 1.10, 0.82)  # purple preset from process-cast.py

# Per-character grid. cols = x-ranges of the 4 columns; front/back = list of
# (col_index, (y0, y1)) cells, y1 stopping ABOVE the caption text. We pick 4
# phases per face. For an 8-phase front sheet we sample Ready / Wind-Up /
# Impact / Follow-Through.
CHARACTERS = {
    'knight': {
        'cols': [(4, 252), (260, 508), (516, 764), (772, 1020)],
        'front': [(0, (6, 236)), (2, (6, 236)), (0, (240, 462)), (2, (240, 462))],
        'back': [(0, (572, 910)), (1, (572, 910)), (2, (572, 910)), (3, (572, 910))],
    },
    'bishop': {
        'cols': [(4, 226), (234, 456), (464, 685), (693, 915)],
        'front': [(0, (8, 482)), (1, (8, 482)), (2, (8, 482)), (3, (8, 482))],
        'back': [(0, (538, 1082)), (1, (538, 1082)), (2, (538, 1082)), (3, (538, 1082))],
    },
}


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


def strip_cell(sheet: Image.Image, cols: list, col: int, yr: tuple[int, int]) -> Image.Image:
    x0, x1 = cols[col]
    y0, y1 = yr
    cell = sheet.crop((x0, y0, x1, y1))
    cell = cell.resize((cell.width * 2, cell.height * 2), Image.LANCZOS)
    cut = remove(cell).convert('RGBA')
    bbox = cut.getbbox()
    return cut.crop(bbox) if bbox else cut


def build_face(sheet: Image.Image, role: str, cols: list, face: str, cells: list) -> None:
    figs = [strip_cell(sheet, cols, c, yr) for c, yr in cells]
    pad = 16
    cw = max(f.width for f in figs) + pad * 2
    ch = max(f.height for f in figs) + pad
    for idx, fig in enumerate(figs):
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        x = (cw - fig.width) // 2
        y = ch - fig.height - 2
        canvas.paste(fig, (x, y), fig)
        canvas.save(os.path.join(OUT, f'{role}-{face}-{idx}-light.png'))
        recolor(canvas).save(os.path.join(OUT, f'{role}-{face}-{idx}-dark.png'))
        print(f'  {role}-{face}-{idx}: light + dark  ({fig.width}x{fig.height})', flush=True)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    roles = sys.argv[1:] or list(CHARACTERS)
    for role in roles:
        cfg = CHARACTERS[role]
        sheet = Image.open(os.path.join(SRC, f'{role}-attack-sheet.png')).convert('RGB')
        print(f'slicing {role}-attack-sheet.png {sheet.size}…', flush=True)
        build_face(sheet, role, cfg['cols'], 'front', cfg['front'])
        build_face(sheet, role, cfg['cols'], 'back', cfg['back'])
    print('done.', flush=True)


if __name__ == '__main__':
    main()
