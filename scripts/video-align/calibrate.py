"""Per-video calibration, anchored on the one position we know.

David 2026-08-17: *"the chess board in each video is a different size and needs
recalibrating each time"* — and, on automating it: *"maybe aligning by hand
yourself is the way to go. do not rely on bots?"*

THE SPLIT, AND WHY IT IS WHERE IT IS:

  GEOMETRY IS READ BY EYE. Three numbers per board layout, and you can see the
  board, so this takes seconds. David again, after watching an automated fit
  fail: *"keep doing it yourself, no bots. it seems to work better that way"* —
  and the measurements agree with him. Hand calibration got x=370 y=-2 sq=60 on
  the pilot's first pass, 63 of 64 squares. The automated fit below scored a
  plausible-looking x=376.6 y=-6.6 sq=60.75 on that same frame and then FAILED
  OUTRIGHT on the identical frame rescaled to 640x360 and to 1024x576. A
  procedure that survives one resolution by luck is not a procedure, and this is
  the second geometry guesser to die this way (see `detect_board.py`).

  COLOUR IS MEASURED, NOT GUESSED — and that is a different thing entirely. Once
  you supply the geometry, a start-position frame LABELS six classes outright:
  black pieces, white pieces and empty squares, each on both square parities.
  Nothing is inferred from appearance; the layout states the answer. This is
  load-bearing, not a nicety: `read_board`'s fixed +/-25 margin is theme-specific
  and INVERTS on boards whose light square is nearly as bright as a white piece,
  which cost the pilot most of its video. Measuring instead took it from 71
  settled positions to 325, and from 49 plies to 153.

FIND THE ANCHOR, NEVER ASSUME t=0. David: *"he starts most times with old games
before jumping to youtube"*, so the opening seconds may show an unrelated game
— and notes from that stretch belong to ITS positions, not the taught line.
`looks_like_start` keys on occupancy only, so it holds for a flipped board too.

So the working loop is: YOU read the geometry off a frame, `calibrate_section`
confirms it by checking the calibrated read really is the start position, and
the colour classes come from that same frame. You supply the truth; code checks
it and measures the rest.
"""
import sys
import json

import numpy as np
from PIL import Image

from detect_board import Cells
from read_board import try_calibrate

# Square sizes worth considering. Below ~20px the centre sample is too small to
# judge occupancy; above ~100px the board would exceed a 480p frame.
SQ_LO, SQ_HI = 20.0, 100.0


def start_score(cells, x0, y0, sq):
    """How cleanly this grid splits the start position's pieces from its gaps.

    ACCURACY UNDER THE BEST THRESHOLD, not a min-max margin. The first version
    scored `occupied.min() - empty.max()`, demanding the quietest piece beat the
    NOISIEST empty square — a single bad cell vetoes the whole grid. It happened
    to hold at 854x480 and then failed completely on the SAME frame rescaled to
    640x360 and 1024x576, where a 0.28-pad sample is only ~12px across and one
    empty square always carries enough interpolation noise to spoil it. A
    criterion that survives one resolution by luck is not a criterion.

    Counting correctly-classified cells is robust to a few bad ones while still
    failing closed: a region that is not a start position cannot get 32 busy
    cells at the ends and 32 flat ones in the middle at ANY threshold.
    """
    _mean, std = cells.stats(x0, y0, sq)
    if np.isnan(std).any():
        return -1e9
    occupied = np.r_[std[0], std[1], std[6], std[7]]
    empty = np.r_[std[2], std[3], std[4], std[5]]
    best = 0.0
    # Candidate thresholds are the observed values themselves — the optimum
    # always sits at one of them, so nothing is gained by sweeping a range.
    for t in np.unique(np.r_[occupied, empty]):
        acc = (float((occupied > t).sum()) + float((empty <= t).sum())) / 64.0
        if acc > best:
            best = acc
    return best


# A start position must be almost perfectly separable. Below this, the frame is
# something else and calibration refuses rather than fitting noise.
MIN_START_ACCURACY = 0.95

# How far past the start we will still calibrate from, in squares of occupancy.
# Each ply moves one piece, so this reaches roughly the first two moves — and a
# middlegame differs by dozens of squares, so nothing but the opening can pass.
# It exists because a lesson that joins its game already in progress otherwise
# refuses outright, with a message blaming geometry that is in fact correct.
NEAR_START_TOLERANCE = 4


def fit_geometry_to_start(path, sq_lo=SQ_LO, sq_hi=SQ_HI):
    """🚧 FAILED EXPERIMENT — kept as a record, NOT on the working path.

    Searching for the geometry that best reproduces the start position looked
    principled: it fits to known truth rather than recognising a board, and on
    the pilot's 854x480 anchor it returned x=376.6 y=-6.6 sq=60.75, whose reads
    were identical to the hand values on a deep middlegame frame.

    Then the same frame, rescaled to 640x360 and 1024x576, produced NO FIT at
    all. Videos arrive at whatever resolution YouTube serves, so a fitter that
    only works at one is worse than useless — it would silently skip most of a
    corpus. Read the geometry by eye instead; use `calibrate_section` to confirm
    it.
    """
    g = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
    H, W = g.shape
    cells = Cells(g)
    best = None
    for sq in np.arange(sq_lo, sq_hi, 1.0):
        span = sq * 8
        if span > max(H, W) * 1.6:
            break
        for x0 in np.arange(-sq, W - span * 0.5, max(2.0, sq / 8)):
            for y0 in np.arange(-sq, H - span * 0.5, max(2.0, sq / 8)):
                s = start_score(cells, x0, y0, sq)
                if best is None or s > best[0]:
                    best = (s, float(x0), float(y0), float(sq))
    # Not separable enough to be a start position — not a board, or not the
    # start. Fail closed rather than fitting noise.
    if best is None or best[0] < MIN_START_ACCURACY:
        return None
    _s, bx, by, bs = best
    for sq in np.arange(bs - 1.5, bs + 1.51, 0.25):
        for x0 in np.arange(bx - 3, bx + 3.01, 0.5):
            for y0 in np.arange(by - 3, by + 3.01, 0.5):
                v = start_score(cells, x0, y0, sq)
                if v > best[0]:
                    best = (v, float(x0), float(y0), float(sq))
    return best


def orientation_of(grid):
    """'white' if White is at the bottom, 'black' if flipped, else None.

    Only meaningful on a start-position grid, since occupancy there is symmetric
    under a 180 degree turn and only COLOUR resolves it. Abstains on a washed-out
    read rather than guessing — a wrong answer mirrors every square of a
    Black-side lesson.
    """
    near = grid[6] + grid[7]
    far = grid[0] + grid[1]
    if near.count('w') >= 12 and far.count('b') >= 12:
        return 'white'
    if near.count('b') >= 12 and far.count('w') >= 12:
        return 'black'
    return None


def calibrate_section(frame_paths, x0, y0, sq):
    """Confirm HAND-READ geometry and measure the colour classes from it.

    This is the machine half of hand alignment: you supply (x0, y0, sq) read off
    a frame, and this finds the first frame where those numbers actually
    reproduce the start position, then takes the six colour centroids from it.

    Confirmation is the point. A geometry that is a square out, or carried
    across a section boundary onto a board that has been resized, will not read
    as the start position — so it is refused here instead of quietly producing
    wrong squares for the rest of the video.

    The anchor is SEARCHED for, never assumed at t=0 (David: "he starts most
    times with old games"). Returns a dict, or None if these numbers never
    reproduce the start — in which case re-read them off a frame, or the section
    genuinely has no start position and you calibrate it from a position you
    read by eye instead.
    """
    # An exact start position is the best anchor, so take one if the video shows
    # one. Only if the whole pass finds none do we fall back to the closest
    # near-start frame — see NEAR_START_TOLERANCE.
    fallback = None
    for path in frame_paths:
        try:
            g = np.asarray(Image.open(path).convert('L'), dtype=np.float64)
        except Exception:
            continue
        got = try_calibrate(g, x0, y0, sq)
        if got is None:
            continue
        cal, orient, diff = got
        if diff:
            if diff <= NEAR_START_TOLERANCE and (fallback is None or diff < fallback[0]):
                fallback = (diff, path, cal, orient)
            continue
        return {
            'x0': x0, 'y0': y0, 'square': sq, 'orientation': orient,
            'anchor': path, 'cal': {f'{k[0]}{k[1]}': v for k, v in cal.items()},
        }
    if fallback is not None:
        _d, path, cal, orient = fallback
        return {
            'x0': x0, 'y0': y0, 'square': sq, 'orientation': orient,
            'anchor': path, 'cal': {f'{k[0]}{k[1]}': v for k, v in cal.items()},
        }
    return None


if __name__ == '__main__':
    # usage: calibrate.py <x0> <y0> <sq> <frame.png> [more frames...]
    x0, y0, sq = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
    got = calibrate_section(sys.argv[4:], x0, y0, sq)
    if not got:
        # A refusal is a RESULT: these numbers never reproduced the start
        # position. Re-read the geometry off a frame; never loosen anything.
        print('geometry never reproduced the start position', file=sys.stderr)
        sys.exit(1)
    print(json.dumps({k: v for k, v in got.items() if k != 'cal'}))
