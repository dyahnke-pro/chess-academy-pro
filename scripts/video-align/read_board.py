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


def _cell_features(g, x0, y0, sq):
    """(mean, std) per cell — the two numbers that separate the three classes.

    Mean alone cannot: a white piece on a LIGHT square averages out close to the
    empty light square itself, because its bright fill and its dark outline pull
    in opposite directions. Std is what tells them apart — an empty square is
    flat, and any piece carries a fill/outline edge.
    """
    import numpy as np
    cs = _cells(g, x0, y0, sq)
    mean = np.zeros((8, 8))
    std = np.zeros((8, 8))
    for r in range(8):
        for c in range(8):
            p = cs[r, c]
            mean[r, c] = p.mean() if p.size else 0.0
            std[r, c] = p.std() if p.size else 0.0
    return mean, std


def read_board_calibrated_arr(g, x0, y0, sq, cal):
    """`read_board_calibrated` on an array already in memory.

    Exists so frames can be STREAMED from ffmpeg instead of written to disk.
    Measured on this corpus: 2fps over a ~65-minute lesson is ~7,800 PNGs at
    ~2.6GB, so scanning the 34 downloaded videos the file-based way needs ~90GB
    against 23GB free — the pipeline worked at six videos and silently did not
    scale past about eight. Nothing about the reading changes; only where the
    pixels come from.
    """
    import numpy as np
    mean, std = _cell_features(g, x0, y0, sq)
    idx = np.indices((8, 8)).sum(axis=0) % 2
    out = []
    for r in range(8):
        row = ''
        for c in range(8):
            parity = idx[r, c]
            best, bestd = '.', None
            for label in ('b', 'w', '.'):
                cm, cs_ = cal[(parity, label)]
                d = (mean[r, c] - cm) ** 2 + 3.0 * (std[r, c] - cs_) ** 2
                if bestd is None or d < bestd:
                    best, bestd = label, d
            row += best
        out.append(row)
    return out


def calibrate_from_start_arr(g, x0, y0, sq):
    """`calibrate_from_start` on an array already in memory."""
    import numpy as np
    mean, std = _cell_features(g, x0, y0, sq)
    idx = np.indices((8, 8)).sum(axis=0) % 2
    rows = {'b': [0, 1], 'w': [6, 7], '.': [2, 3, 4, 5]}
    cal = {}
    for parity in (0, 1):
        for label, rs in rows.items():
            m = [mean[r, c] for r in rs for c in range(8) if idx[r, c] == parity]
            s = [std[r, c] for r in rs for c in range(8) if idx[r, c] == parity]
            cal[(parity, label)] = (float(np.median(m)), float(np.median(s)))
    return cal


def read_board_arr(g, x0, y0, sq):
    """`read_board` (uncalibrated) on an array already in memory."""
    import numpy as np
    cs = _cells(g, x0, y0, sq)
    lum = np.array([[cs[r, c].mean() for c in range(8)] for r in range(8)])
    idx = np.indices((8, 8)).sum(axis=0) % 2
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
            bright = int((p > light_sq + MARGIN).sum())
            dark = int((p < dark_sq - MARGIN).sum())
            if max(bright, dark) < p.size * 0.06:
                row += '.'
            else:
                row += 'w' if bright > dark else 'b'
        rows.append(row)
    return rows


def calibrate_from_start(path, x0, y0, sq):
    """Learn the three classes from a frame KNOWN to show the start position.

    The fixed +/-25 margin in `read_board` is theme-specific and inverts on
    boards whose light square is nearly as bright as a white piece: measured on
    a chess.com blue/cream layout, white pieces on light squares scored more
    DARK pixels (their outline) than BRIGHT (their fill over cream), so g7, a1,
    c1, e1, h1, b2, f2 and h2 all read as BLACK. Grids that wrong match no legal
    move, so the tracker silently dropped most of the video — 71 settled
    positions out of 840 frames.

    Nothing needs to be tuned, because a start-position frame states the answer:
    ranks 7-8 are black pieces, ranks 1-2 are white, ranks 3-6 are empty, and
    each of those appears on BOTH square colours. So it yields six labelled
    centroids — three classes x two parities — measured from this video's own
    pixels. Find the frame with `looks_like_start`; never assume t=0 (David:
    "he starts most times with old games").
    """
    import numpy as np
    from PIL import Image
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
    mean, std = _cell_features(g, x0, y0, sq)
    idx = np.indices((8, 8)).sum(axis=0) % 2
    rows = {'b': [0, 1], 'w': [6, 7], '.': [2, 3, 4, 5]}
    cal = {}
    for parity in (0, 1):
        for label, rs in rows.items():
            m = [mean[r, c] for r in rs for c in range(8) if idx[r, c] == parity]
            s = [std[r, c] for r in rs for c in range(8) if idx[r, c] == parity]
            cal[(parity, label)] = (float(np.median(m)), float(np.median(s)))
    return cal


def read_board_calibrated(path, x0, y0, sq, cal):
    """Occupancy+colour by nearest labelled centroid, per square parity."""
    import numpy as np
    from PIL import Image
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
    mean, std = _cell_features(g, x0, y0, sq)
    idx = np.indices((8, 8)).sum(axis=0) % 2
    out = []
    for r in range(8):
        row = ''
        for c in range(8):
            parity = idx[r, c]
            best, bestd = '.', None
            for label in ('b', 'w', '.'):
                cm, cs_ = cal[(parity, label)]
                # Std is the occupancy signal and deserves equal weight to mean
                # despite its smaller range, so it is scaled up rather than
                # being swamped by a few grey levels of brightness drift.
                d = (mean[r, c] - cm) ** 2 + 3.0 * (std[r, c] - cs_) ** 2
                if bestd is None or d < bestd:
                    best, bestd = label, d
            row += best
        out.append(row)
    return out


def looks_like_start(grid):
    """Two full ranks at each end, four empty between — orientation-independent."""
    occ = [''.join('x' if c in 'wb' else '.' for c in row) for row in grid]
    return (occ[0] == occ[1] == 'xxxxxxxx' and occ[6] == occ[7] == 'xxxxxxxx'
            and all(r == '........' for r in occ[2:6]))
