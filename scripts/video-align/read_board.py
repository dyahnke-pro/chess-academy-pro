"""Occupancy + colour, judged against ABSOLUTE board colours.

Two systematic errors in the first cut, both from the same mistake — deciding
colour RELATIVE to the square a piece happens to stand on:

  ranks 1-2 alternated w/b   a white pawn is brighter than a light square but
                             far brighter than a dark one, so a parity-relative
                             test flips with the square underneath it.
  c4 and f7 read as pieces   they are the last-move HIGHLIGHT (light blue).
                             A highlight is a uniform square of a third colour,
                             which a two-colour model can only call "occupied".

The physical truth is simpler and parity-free: a white piece contains pixels
brighter than ANY board square, a black piece contains pixels darker than any,
and an empty square — highlighted or not — contains neither.
"""
import numpy as np
from PIL import Image

PAD = 0.30
MARGIN = 25.0


def _cells(g, x0, y0, sq):
    H, W = g.shape
    out = np.empty((8, 8), dtype=object)
    for r in range(8):
        for c in range(8):
            cy, cx = y0 + (r + 0.5) * sq, x0 + (c + 0.5) * sq
            h = sq * PAD
            y1, y2 = max(0, int(cy - h)), min(H, int(cy + h))
            x1, x2 = max(0, int(cx - h)), min(W, int(cx + h))
            out[r, c] = g[y1:y2, x1:x2] if (y2 > y1 and x2 > x1) else np.zeros((1, 1))
    return out


def read_board(path, x0, y0, sq):
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
    cs = _cells(g, x0, y0, sq)
    lum = np.array([[cs[r, c].mean() for c in range(8)] for r in range(8)])
    idx = np.indices((8, 8)).sum(axis=0) % 2
    # The two board colours, by parity median — most squares are empty, so the
    # median lands on the true square colour while a mean is dragged by pieces.
    a, b = np.median(lum[idx == 0]), np.median(lum[idx == 1])
    dark_sq, light_sq = min(a, b), max(a, b)

    rows = []
    for r in range(8):
        row = ''
        for c in range(8):
            p = cs[r, c]
            if p.size < 4:
                row += '?'
                continue
            # AREA, not extremes. Every piece in this set is a fill with a
            # CONTRASTING outline, so a white piece contains near-black outline
            # pixels and a black piece contains near-white ones — both extremes
            # fire for both colours, and comparing the extremes picked black
            # every time simply because the dark range is wider. The fill is
            # what the eye reads, and the fill is the larger area.
            bright = int((p > light_sq + MARGIN).sum())
            dark = int((p < dark_sq - MARGIN).sum())
            total = p.size
            if max(bright, dark) < total * 0.06:
                row += '.'                        # empty, highlighted or not
            else:
                row += 'w' if bright > dark else 'b'
        rows.append(row)
    return rows


if __name__ == '__main__':
    import sys
    for r in read_board(sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])):
        print(r)
