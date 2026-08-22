"""Find the board geometry from square EDGES, not by fitting a box.

The first detector scored candidate rectangles on checker contrast and searched
only boxes that fit INSIDE the frame. Both choices were wrong:

  * The board can extend past the frame edge. In the pilot it starts above the
    top (y=-3) and is clipped at the bottom, so the best in-frame fit was 45.5px
    when the truth was 45.2px starting 45px further left — close enough to look
    plausible, far enough that every cell straddled two real squares and empty
    squares came back with std ~55 instead of ~0.
  * Checker contrast is maximised by many near-miss alignments. Empty-square
    FLATNESS is not: it collapses the moment a cell spans a colour boundary.

So this measures the square PITCH directly — scan a rank for colour
transitions, and the gaps between them ARE the square size — then locks the
origin by testing which offset makes the emptiest cells flattest. That is how
the pilot geometry was found by hand; this is the same procedure, automated.
"""
import sys
import numpy as np
from PIL import Image


def transitions(line, thresh=18.0, min_gap=6):
    """Positions where intensity jumps — i.e. square boundaries along a scan."""
    d = np.abs(np.diff(line))
    out = []
    for i, v in enumerate(d):
        if v > thresh and (not out or (i + 1) - out[-1] > min_gap):
            out.append(i + 1)
    return out


def pitch_from(line):
    """Median gap between transitions, which is the square size. Median beats
    mean here: a piece sitting on the scan line adds spurious edges, and those
    contribute outlier gaps that a mean would absorb."""
    ts = transitions(line)
    if len(ts) < 4:
        return None, []
    gaps = np.diff(ts)
    good = gaps[(gaps > 12) & (gaps < 140)]
    return (float(np.median(good)), ts) if len(good) >= 3 else (None, ts)


def flatness(g, x0, y0, sq, pad=0.28):
    """Mean std of the 20 flattest cells. A correct grid puts each cell wholly
    inside one square, and an empty square is nearly uniform."""
    H, W = g.shape
    stds = []
    for r in range(8):
        for c in range(8):
            cy, cx = y0 + (r + 0.5) * sq, x0 + (c + 0.5) * sq
            h = sq * pad
            y1, y2 = max(0, int(cy - h)), min(H, int(cy + h))
            x1, x2 = max(0, int(cx - h)), min(W, int(cx + h))
            if y2 - y1 < 4 or x2 - x1 < 4:
                continue
            stds.append(g[y1:y2, x1:x2].std())
    if len(stds) < 24:
        return 1e9
    return float(np.mean(sorted(stds)[:20]))


def detect(path, rows_to_try=(0.72, 0.62, 0.52, 0.42, 0.82)):
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
    H, W = g.shape

    # PITCH: scan several horizontal bands and take the most agreed-on gap.
    # A band crossing a rank full of pieces gives junk, so try a few and let
    # the median across bands decide.
    pitches = []
    for frac in rows_to_try:
        y = int(H * frac)
        band = g[max(0, y - 6):y + 6, :].mean(axis=0)
        p, _ = pitch_from(band)
        if p:
            pitches.append(p)
    if not pitches:
        return None
    sq = float(np.median(pitches))

    # ORIGIN: a board is 8 squares wide, so x0 is fixed modulo the pitch. Try
    # every offset within one square (and a small range of pitches around the
    # measured one, since the median is not exact) and keep the flattest.
    best = None
    for s in np.arange(sq - 1.2, sq + 1.21, 0.2):
        span = s * 8
        for x0 in np.arange(0, W - span * 0.6, 1.0):
            if x0 + span > W + s * 0.6:
                continue
            for y0 in np.arange(-s, min(H - span * 0.6, H * 0.5), 2.0):
                f = flatness(g, x0, y0, s)
                if best is None or f < best[0]:
                    best = (f, float(x0), float(y0), float(s))
    if best is None:
        return None
    # fine pass on the origin only
    f0, bx, by, bs = best
    for x0 in np.arange(bx - 2, bx + 2.01, 0.4):
        for y0 in np.arange(by - 2, by + 2.01, 0.4):
            f = flatness(g, x0, y0, bs)
            if f < best[0]:
                best = (f, float(x0), float(y0), bs)
    return best


if __name__ == '__main__':
    got = detect(sys.argv[1])
    if not got:
        print('no board found')
        sys.exit(1)
    f, x0, y0, sq = got
    print(f'x={x0:.1f} y={y0:.1f} square={sq:.2f} flatness={f:.2f}')
