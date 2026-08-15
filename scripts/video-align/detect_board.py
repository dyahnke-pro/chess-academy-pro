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


def checker_score(g, x0, y0, sq):
    """How much this grid looks like a CHECKERBOARD.

    Flatness alone was the wrong objective and it failed on the second video:
    a grid laid over the flat dark UI panel beside the board has near-zero std
    in every cell, so it beat the true geometry outright (the detector returned
    x=288 y=-28.8 sq=42.8, and the tracker got 0 plies from 9,547 frames).
    Uniformity is necessary but it is not distinctive — a blank wall is uniform.

    A chessboard has a property a wall does not: cells alternate between two
    colours in a fixed pattern. So score the SEPARATION between the two colour
    classes minus their internal spread. A misaligned grid mixes both colours
    into every cell, which collapses the separation, and a flat background has
    no separation to begin with.

    Sampling is a BORDER RING rather than the cell centre, because the centre is
    where the piece sits and a piece would otherwise be read as square colour.
    """
    H, W = g.shape
    vals = np.zeros((8, 8))
    for r in range(8):
        for c in range(8):
            cy, cx = y0 + r * sq, x0 + c * sq
            y1, y2 = int(max(0, cy + 0.10 * sq)), int(min(H, cy + 0.90 * sq))
            x1, x2 = int(max(0, cx + 0.10 * sq)), int(min(W, cx + 0.90 * sq))
            if y2 - y1 < 6 or x2 - x1 < 6:
                return -1e9
            cell = g[y1:y2, x1:x2]
            ring = np.concatenate([
                cell[0:3, :].ravel(), cell[-3:, :].ravel(),
                cell[:, 0:3].ravel(), cell[:, -3:].ravel(),
            ])
            vals[r, c] = np.median(ring)
    light_mask = (np.add.outer(np.arange(8), np.arange(8)) % 2 == 0)
    light, dark = vals[light_mask], vals[~light_mask]
    return float(abs(light.mean() - dark.mean()) - (light.std() + dark.std()))


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


def detect_many(paths):
    """Geometry agreed on by SEVERAL frames, which is the only kind to trust.

    One frame is not enough and the failure is not subtle: on the second pilot
    video a frame at 2:30 gave the true board (x=279 sq=45.9, verified against a
    grid overlay) and a frame at 10:00 gave x=6.5 sq=32.7 — the webcam panel,
    scored confidently. A stream cuts to full-screen analysis, to a talking
    head, to a title card, and any of those can host a plausible checkerboard
    ridge.

    The board does not move between scenes, so agreement across frames is the
    signal: take the candidate whose square size the most frames agree on, and
    among those the best-scoring. A video where no two frames agree returns
    nothing rather than a guess.
    """
    got = [d for d in (detect(p) for p in paths) if d]
    if not got:
        return None
    # Cluster on square size — the parameter a wrong scene gets most wrong.
    clusters = []
    for cand in sorted(got, key=lambda c: -c[0]):
        for cl in clusters:
            if abs(cl[0][3] - cand[3]) <= 1.5:
                cl.append(cand)
                break
        else:
            clusters.append([cand])
    clusters.sort(key=lambda cl: (-len(cl), -cl[0][0]))
    best_cluster = clusters[0]
    if len(best_cluster) < 2 and len(paths) > 2:
        return None  # nothing agreed — refuse rather than guess
    return best_cluster[0]


def detect(path, rows_to_try=(0.72, 0.62, 0.52, 0.42, 0.82)):
    full = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
    # COARSE ON A HALF-SIZE IMAGE. The sweep cost is dominated by how many
    # candidate origins exist, and halving the image quarters them: 4 minutes a
    # frame becomes about one. At 421 videos and several frames each, the slow
    # version is not a pipeline, it is a weekend.
    small = np.asarray(
        Image.open(path).convert('L').resize(
            (full.shape[1] // 2, full.shape[0] // 2), Image.BILINEAR),
        dtype=np.float64,
    )
    coarse = _detect_at(small, rows_to_try)
    if coarse is None:
        return None
    _, cx, cy, cs = coarse
    return _refine(full, cx * 2, cy * 2, cs * 2)


def _refine(g, x0, y0, sq):
    best = None
    for s in np.arange(sq - 1.2, sq + 1.21, 0.1):
        for x in np.arange(x0 - 5, x0 + 5.01, 0.5):
            for y in np.arange(y0 - 5, y0 + 5.01, 0.5):
                f = checker_score(g, x, y, s)
                if best is None or f > best[0]:
                    best = (f, float(x), float(y), float(s))
    return best


def _detect_at(g, rows_to_try):
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
    # COARSE-TO-FINE, because the full-resolution sweep does not finish. Scoring
    # is 64 array slices per candidate, and a 0.2px pitch grid over every origin
    # is tens of millions of them — the first attempt was killed at 15 minutes
    # on one frame, which at 421 videos is not a pipeline. The coarse pass finds
    # the square to within a couple of pixels and the fine pass earns the
    # decimals, at a fraction of the cost.
    def sweep(s_range, x_range, y_range):
        found = None
        for s in s_range:
            span = s * 8
            for x0 in x_range:
                if x0 + span > W + s * 0.6:
                    continue
                for y0 in y_range:
                    f = checker_score(g, x0, y0, s)
                    if found is None or f > found[0]:
                        found = (f, float(x0), float(y0), float(s))
        return found

    return sweep(
        np.arange(max(6.0, sq - 3.0), sq + 3.01, 0.5),
        np.arange(0, max(1.0, W - sq * 4.8), 2.0),
        np.arange(-sq, min(H - sq * 4.8, H * 0.5), 2.0),
    )


if __name__ == '__main__':
    paths = sys.argv[1:]
    got = detect_many(paths) if len(paths) > 1 else detect(paths[0])
    if not got:
        print('no board found')
        sys.exit(1)
    f, x0, y0, sq = got
    print(f'x={x0:.1f} y={y0:.1f} square={sq:.2f} checker={f:.2f}')
