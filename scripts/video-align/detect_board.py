"""Find the board geometry from square EDGES, not by fitting a box.

🚧 STATUS 2026-08-17: FAST NOW, NOT CORRECT YET. `test_calibrate.py` fails 8 of
13 — including clean synthetic boards — so this must NOT be used to position
corpus notes until it passes. It is committed for the speedup and, mostly, for
the four dead ends below, each of which looked right and was measured wrong.

What IS fixed: the search was unrunnable (one 854x480 frame produced no answer
in over ten minutes, because the origin sweep was ~1.1M flatness evaluations).
Deriving pitch and phase from the transitions instead took it to ~5s/frame.

WHAT IS STILL BROKEN — the scoring function. Four candidates, four failures,
all measured on the pilot video and on rendered fixtures:

  1. minimise FLATNESS — degenerate. A blank region scores a perfect 0.00, so
     it prefers stage backdrop to board; where it does find the right 59px
     pitch it still slides one square off, because a window whose first column
     is empty backdrop is FLATTER than one full of chess.
  2. maximise CONTRAST — degenerate the other way. Black-on-white overlay text
     alternates harder than any board, so it lands on the name card and the
     donor ticker (pitches of 16-20px on every frame).
  3. maximise SEPARATION / WITHIN-PARITY SPREAD — breaks on dense positions.
     Sound in principle (a board's light squares all match each other, text
     does not), but at the STARTING POSITION half the squares are occupied, so
     the spread is 50% outliers — precisely the breakdown point of the median
     it is built on. It rejects clean start-position boards outright.
  4. rank lattice runs by LENGTH — picks the overlay. The board's ninth
     boundary is often the frame edge, giving 8 hits, while a webcam-panel run
     gives 9 and wins.

The next thing to try is scoring the LATTICE LINES rather than the cells: sum
gradient magnitude along the 9+9 candidate boundary lines. A board makes long
straight edges at exactly the lattice spacing; pieces and text do not make
full-length straight lines, and occupancy cannot wash it out — which is the
property all four attempts above lacked.

The negative controls already pass (blank frames and disagreeing frames are
both refused), so the failure mode is silence, never an invented board.

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


class Cells:
    """Cell means and stds in O(1) each, via summed-area tables.

    Scoring had to get cheap before it could get correct. The true geometry
    ALWAYS won on contrast when it was measured — 121.09 against the impostor's
    117.55 — it simply never reached the candidate list, because its ninth
    boundary is the frame edge (8 hits) while overlay runs score 9 and crowded
    it out of a 24-deep shortlist. Widening the shortlist is the fix, and that
    multiplies the number of candidates to score by an order of magnitude.

    Recomputing 64 cell means per candidate from raw pixels makes that
    unaffordable. Two integral images make each cell a four-corner lookup
    regardless of square size, so the search can afford to keep every plausible
    lattice and let the score decide — which is what it is good at.
    """

    def __init__(self, g):
        self.g = g
        self.H, self.W = g.shape
        self.s1 = np.pad(g.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
        self.s2 = np.pad((g * g).cumsum(0).cumsum(1), ((1, 0), (1, 0)))

    def _box(self, table, y1, y2, x1, x2):
        return (table[y2, x2] - table[y1, x2] - table[y2, x1] + table[y1, x1])

    def stats(self, x0, y0, sq, pad=0.28):
        """(means, stds) as 8x8 arrays; NaN where the cell is off-frame."""
        r = np.arange(8)
        cy = y0 + (r + 0.5) * sq
        cx = x0 + (r + 0.5) * sq
        h = sq * pad
        y1 = np.clip((cy - h).astype(int), 0, self.H)
        y2 = np.clip((cy + h).astype(int), 0, self.H)
        x1 = np.clip((cx - h).astype(int), 0, self.W)
        x2 = np.clip((cx + h).astype(int), 0, self.W)
        Y1, X1 = np.meshgrid(y1, x1, indexing='ij')
        Y2, X2 = np.meshgrid(y2, x2, indexing='ij')
        n = (Y2 - Y1) * (X2 - X1)
        ok = (Y2 - Y1 >= 4) & (X2 - X1 >= 4)
        n_safe = np.where(ok, n, 1)
        tot = self._box(self.s1, Y1, Y2, X1, X2)
        tot2 = self._box(self.s2, Y1, Y2, X1, X2)
        mean = tot / n_safe
        var = np.maximum(tot2 / n_safe - mean * mean, 0.0)
        return (np.where(ok, mean, np.nan), np.where(ok, np.sqrt(var), np.nan))


def score_geometry(cells, x0, y0, sq):
    """(contrast, flatness) for a candidate grid — the two numbers that decide.

    Contrast is what the board maximises; flatness is only a veto that the cells
    sit inside squares rather than across their boundaries. See the selection
    comment in `detect` for why it is that way round and not the reverse.
    """
    mean, std = cells.stats(x0, y0, sq)
    idx = np.indices((8, 8)).sum(axis=0) % 2
    a, b = mean[idx == 0], mean[idx == 1]
    a, b = a[~np.isnan(a)], b[~np.isnan(b)]
    if len(a) < 12 or len(b) < 12:
        return 0.0, 1e9
    finite = std[~np.isnan(std)]
    if len(finite) < 24:
        return 0.0, 1e9
    # SEPARATION RELATIVE TO WITHIN-PARITY SPREAD, not separation alone. Raw
    # contrast is degenerate in the other direction from flatness: the overlay's
    # black-on-white text alternates far harder than any board, so maximising
    # contrast walked straight off the board and onto the name card and the
    # donor ticker — pitches of 16-20px, every frame.
    #
    # What actually characterises a chessboard is UNIFORMITY WITHIN each colour:
    # every light square is the same light, every dark square the same dark.
    # Text has enormous contrast and enormous within-group scatter, so dividing
    # one by the other separates them cleanly. MAD rather than std because the
    # occupied squares are legitimate outliers that must not be allowed to vote.
    ma = float(np.median(np.abs(a - np.median(a))))
    mb = float(np.median(np.abs(b - np.median(b))))
    sep = float(abs(np.median(a) - np.median(b)))
    return (sep / (ma + mb + 1.0), float(np.mean(np.sort(finite)[:20])))


def checker_contrast(g, x0, y0, sq, pad=0.28):
    """Gap between the two square colours, by parity median.

    FLATNESS ALONE IS DEGENERATE, and this is the guard against that. A solid
    region — the dark stage background, a black overlay panel, a letterbox bar —
    has flatness 0.0, which is a PERFECT score, so an unconstrained search
    reliably prefers blank space to the actual board. Measured on the pilot
    video after the origin search was made fast enough to run at all: seven of
    seven sampled frames returned flatness 0.0 with pitches scattered from 23px
    to 59px, i.e. seven confident readings of no board whatsoever.

    A chessboard is defined by its alternation, so requiring the two parities to
    differ is what makes "board" mean board. Median rather than mean because
    most squares are empty but the occupied ones are far from the square colour.
    """
    H, W = g.shape
    means = np.full((8, 8), np.nan)
    for r in range(8):
        for c in range(8):
            cy, cx = y0 + (r + 0.5) * sq, x0 + (c + 0.5) * sq
            h = sq * pad
            y1, y2 = max(0, int(cy - h)), min(H, int(cy + h))
            x1, x2 = max(0, int(cx - h)), min(W, int(cx + h))
            if y2 - y1 >= 4 and x2 - x1 >= 4:
                means[r, c] = g[y1:y2, x1:x2].mean()
    idx = np.indices((8, 8)).sum(axis=0) % 2
    a, b = means[idx == 0], means[idx == 1]
    a, b = a[~np.isnan(a)], b[~np.isnan(b)]
    if len(a) < 12 or len(b) < 12:
        return 0.0
    return float(abs(np.median(a) - np.median(b)))


# Minimum separation between the two square colours. The low-contrast board in
# the fixture set sits at ~32 grey levels and real themes are far wider, while
# blank regions score ~0 — so this cleanly separates board from background
# without being tight enough to reject a washed-out stream.
MIN_CONTRAST = 3.0
# Flatness is a VETO, not a score. A correct grid puts each cell wholly inside
# one square; when a cell straddles a boundary its std jumps by an order of
# magnitude. This only has to separate "inside a square" from "across two", so
# it sits well above clean-board readings (~0-2) and well below straddling ones.
MAX_FLATNESS = 12.0


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


def _phase(positions, pitch):
    """Where the square boundaries sit WITHIN one pitch, as a circular mean.

    A plain mean of `p % pitch` is wrong: values just under the pitch and just
    over zero are neighbours on a circle but average to the middle, which is the
    one answer that is certainly incorrect. Averaging unit vectors instead
    handles the wrap correctly.
    """
    if len(positions) == 0:
        return 0.0
    ang = 2 * np.pi * (np.asarray(positions, dtype=np.float64) % pitch) / pitch
    m = np.arctan2(np.sin(ang).mean(), np.cos(ang).mean())
    return float((m / (2 * np.pi)) * pitch % pitch)


def lattice_fit(positions, lo=15.0, hi=140.0, step=0.25, tol=2.6, need=7, cap=120):
    """Find the run of EVENLY SPACED boundaries — the board — inside a pile of
    transitions that also contains everything else on screen.

    Taking a median of per-band pitches does not survive a real stream. Measured
    on the pilot's five scan bands: only one crossed clean board and reported
    60px; the other four crossed the webcam panel, the donor ticker and the name
    card, reporting 24, 29, 19.5 and 18. The median of those is 24, so the
    detector spent every frame describing an overlay.

    What separates board from clutter is not magnitude, it is REGULARITY: a
    board contributes nine boundaries in near-perfect arithmetic progression,
    and text contributes many boundaries in none. So each transition is tried as
    a left edge against each candidate pitch, and the winner is the pair
    explaining the longest consecutive run.

    Harmonics fall out for free, which the earlier flatness search could not
    manage: at half pitch every other lattice point lands mid-square where there
    is no boundary, so the run breaks at the second step instead of scoring
    twice as well.

    Returns candidates [(start, pitch, support), ...], best support first.

    A LIST, not a winner, and that distinction is load-bearing. Ranking by run
    length alone picks the wrong run: on the pilot the webcam panel yields a
    9-point progression at 100px while the real board — clipped by the right
    frame edge — yields only 8 at 60px, so the overlay wins outright. Neither
    axis can tell alone. The board is the candidate whose pitch the OTHER axis
    also sees, because squares are square, so the caller resolves it.
    """
    if len(positions) < need:
        return []
    pos = np.asarray(sorted(set(positions)), dtype=np.float64)
    found = {}
    for p in np.arange(lo, hi + 1e-9, step):
        for t0 in pos:
            # Nine boundaries bound eight squares. Count from this anchor.
            hits = 0
            for k in range(9):
                if np.any(np.abs(pos - (t0 + k * p)) <= tol):
                    hits += 1
                else:
                    break
            if hits >= need:
                key = (round(t0), round(p * 2) / 2)
                if hits > found.get(key, (0,))[0]:
                    found[key] = (hits, float(t0), float(p))
    out = [(t0, p, h) for (h, t0, p) in sorted(found.values(), reverse=True)]
    return out[:cap]


def _edge_candidates(positions, phase, sq, limit, tol=2.5, need=6):
    """Where along this axis the board actually STARTS.

    The phase says where square boundaries fall; it cannot say which eight of
    them are the board, and getting that wrong is not a small error. Measured on
    the pilot: pitch came back correct at 59px while the 8x8 window sat one
    square left of the board, so its first column covered blank stage
    background. Blank scores flatness 0.00 — a PERFECT reading — so the search
    actively preferred the offset that included non-board over the one that did
    not, on every frame.

    Boundaries exist only where the board is, so its extent is already in the
    transitions: walk the lattice and keep the runs whose positions are actually
    supported by a measured transition. A run shorter than `need` is not a
    board edge, and a supported run's start is a real corner.
    """
    if len(positions) == 0:
        return []
    pos = np.asarray(sorted(positions), dtype=np.float64)
    lattice = np.arange(phase - 2 * sq, limit + 2 * sq, sq)
    supported = [bool(np.any(np.abs(pos - p) <= tol)) for p in lattice]

    starts, run = [], 0
    for i, ok in enumerate(supported):
        run = run + 1 if ok else 0
        if run >= need:
            # The board's first boundary is `run-1` steps back from here. Every
            # long-enough run contributes its start; flatness picks between them.
            starts.append(lattice[i - run + 1])
    # De-duplicate to whole-square resolution and keep only origins that put a
    # majority of the board inside the frame.
    out = []
    for s0 in starts:
        if any(abs(s0 - o) < sq * 0.5 for o in out):
            continue
        if -sq <= s0 <= limit - sq * 4:
            out.append(float(s0))
    return out


def detect(path, rows_to_try=(0.72, 0.62, 0.52, 0.42, 0.82),
           cols_to_try=(0.5, 0.35, 0.65, 0.25, 0.75)):
    """Board geometry, from the square boundaries themselves.

    SPEED IS A CORRECTNESS ISSUE HERE, not a nicety. The original search swept
    every (pitch, x0, y0) triple — at 854x480 that is ~1.1M flatness
    evaluations, each measuring 64 cells, and a single 27-minute video needs
    calibration on many frames. Measured: it produced no answer for one frame in
    over ten minutes, which makes the pipeline unrunnable at any scale.

    The sweep was also unnecessary. The transitions that give the PITCH also
    give the PHASE — a board's boundaries repeat every `sq` pixels, so the
    origin is already determined modulo the pitch, and only the whole-square
    offset (which of the ~14 possible board positions across the frame is the
    real one) still has to be chosen. That is ~100 candidates instead of a
    million, and it is the same answer: flatness still picks the winner, it is
    just no longer asked about offsets the edges have already ruled out.
    """
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
    H, W = g.shape

    # PITCH: scan several horizontal bands and take the most agreed-on gap.
    # A band crossing a rank full of pieces gives junk, so try a few and let
    # the median across bands decide.
    xs_all = []
    for frac in rows_to_try:
        y = int(H * frac)
        band = g[max(0, y - 6):y + 6, :].mean(axis=0)
        _p, ts = pitch_from(band)
        xs_all.extend(ts)
    ys_all = []
    for frac in cols_to_try:
        x = int(W * frac)
        band = g[:, max(0, x - 6):x + 6].mean(axis=1)
        _p, ts = pitch_from(band)
        ys_all.extend(ts)

    xc = lattice_fit(xs_all)
    yc = lattice_fit(ys_all, need=6)
    if not xc or not yc:
        return None

    # CROSS-AXIS AGREEMENT, then appearance. Only a real board produces the same
    # pitch on both axes AND an alternating pattern; an overlay run satisfies
    # neither once it has to answer to the other axis.
    # MAXIMISE CONTRAST, do not minimise flatness. Flatness was the objective
    # and it is the wrong one: a uniform region scores a perfect 0.00, so the
    # search preferred blank stage background to the board, and — where it did
    # find the right 59px pitch — preferred the window shifted one square left,
    # because that window's first column is empty backdrop and empty is flatter
    # than chess. Both failures are the same bug rewarding absence of content.
    #
    # Alternation cannot be faked by emptiness. A window covering all eight
    # files shows the full light/dark gap; slide it one square off the board and
    # a column of backdrop dilutes both parity medians, so contrast drops.
    # Flatness keeps a job, but only as a veto: it certifies that cells sit
    # INSIDE squares rather than straddling boundaries.
    cells = Cells(g)
    best = None
    for x_start, px, _hx in xc:
        for y_start, py, _hy in yc:
            if abs(px - py) > 1.5:
                continue
            sq = (px + py) / 2
            for s in np.arange(sq - 0.5, sq + 0.51, 0.25):
                for x0 in [x_start + k * s for k in (-1, 0)]:
                    for y0 in [y_start + k * s for k in (-1, 0)]:
                        c, f = score_geometry(cells, x0, y0, s)
                        if f > MAX_FLATNESS or c < MIN_CONTRAST:
                            continue
                        if best is None or c > best[0]:
                            best = (c, float(x0), float(y0), float(s), f)
    if best is None:
        return None
    bc = best[0]
    bx, by, bs = best[1], best[2], best[3]
    for x0 in np.arange(bx - 2, bx + 2.01, 0.4):
        for y0 in np.arange(by - 2, by + 2.01, 0.4):
            c, f = score_geometry(cells, x0, y0, bs)
            if f <= MAX_FLATNESS and c > bc:
                bc, bx, by = c, float(x0), float(y0)
    return (score_geometry(cells, bx, by, bs)[1], bx, by, bs)


if __name__ == '__main__':
    got = detect(sys.argv[1])
    if not got:
        print('no board found')
        sys.exit(1)
    f, x0, y0, sq = got
    print(f'x={x0:.1f} y={y0:.1f} square={sq:.2f} flatness={f:.2f}')
