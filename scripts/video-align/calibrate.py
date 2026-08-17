"""Per-video calibration, anchored on the one position we know.

David 2026-08-17: *"the chess board in each video is a different size and needs
recalibrating each time"* — and, on automating it: *"maybe aligning by hand
yourself is the way to go. do not rely on bots?"*

Both are honoured here. Calibration IS per video. And nothing guesses what a
board looks like — the whole procedure is anchored on a frame showing the
STARTING POSITION, where the answer is already known, so every number is fitted
to observed truth rather than inferred from a heuristic.

That distinction is what separates this from `detect_board.py`, which tried to
recognise a board from appearance alone and failed four different ways (see its
docstring). A start-position frame makes the problem trivial in comparison:

  GEOMETRY — occupancy at the start is known (two full ranks at each end, four
  empty between) and occupancy can be judged by VARIANCE alone: an empty square
  is flat, an occupied one carries a fill/outline edge. Colour never enters, so
  this breaks the chicken-and-egg where colour calibration needed geometry and
  geometry needed colour. Score a candidate grid by the MARGIN between the
  quietest piece and the loudest empty square; a grid that merely looks close
  cannot beat one that truly separates them.

  COLOUR — the same frame labels six classes for free: black pieces, white
  pieces and empty squares, each on both square parities. `read_board`'s fixed
  +/-25 margin is theme-specific and inverts on boards whose light square is
  nearly as bright as a white piece; measured centroids never do.

FIND THE ANCHOR, NEVER ASSUME t=0. David: *"he starts most times with old games
before jumping to youtube"*, so the opening seconds may show an unrelated game
— and notes from that stretch belong to ITS positions, not the taught line.
`looks_like_start` keys on occupancy only, so it holds for a flipped board too.

WHEN THERE IS NO START FRAME, this returns None and you calibrate that section
by eye — read the position off it and search a small grid of (x0, y0, sq) for
the numbers that reproduce what you read. Verified equivalent: on the pilot,
hand calibration gave x=370 y=-2 sq=60 and this fit gave x=376.6 y=-6.6
sq=60.75, and the two produce IDENTICAL reads on a deep middlegame frame.
"""
import sys
import json

import numpy as np
from PIL import Image

from detect_board import Cells
from read_board import calibrate_from_start, read_board_calibrated, looks_like_start

# Square sizes worth considering. Below ~20px the centre sample is too small to
# judge occupancy; above ~100px the board would exceed a 480p frame.
SQ_LO, SQ_HI = 20.0, 100.0


def start_score(cells, x0, y0, sq):
    """How cleanly this grid splits the start position's pieces from its gaps."""
    _mean, std = cells.stats(x0, y0, sq)
    if np.isnan(std).any():
        return -1e9
    occupied = np.r_[std[0], std[1], std[6], std[7]]
    empty = np.r_[std[2], std[3], std[4], std[5]]
    return float(occupied.min() - empty.max())


def fit_geometry_to_start(path, sq_lo=SQ_LO, sq_hi=SQ_HI):
    """(score, x0, y0, sq) for a frame known to show the start position.

    Coarse sweep then refine. Uses summed-area cell stats so each candidate is
    O(1) — the plain nested-loop version took over 560s and timed out, the same
    mistake `detect_board`'s original origin search made.
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
    # A non-positive margin means some "empty" square was busier than some
    # "piece" — this frame is not a start position, or not a board. Fail closed.
    if best is None or best[0] <= 0:
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


def calibrate_video(frame_paths):
    """Fit on the FIRST frame that reproduces the start position.

    Returns {x0, y0, square, orientation, anchor, score} or None. Scans in order,
    so it takes the earliest anchor; pass a section's frames to calibrate that
    section when a video resizes its board partway through.
    """
    for path in frame_paths:
        got = fit_geometry_to_start(path)
        if not got:
            continue
        score, x0, y0, sq = got
        cal = calibrate_from_start(path, x0, y0, sq)
        grid = read_board_calibrated(path, x0, y0, sq, cal)
        # The fit maximised a variance margin; this asks the far stricter
        # question of whether the calibrated read actually IS the start layout.
        if not looks_like_start(grid):
            continue
        return {
            'x0': round(x0, 2), 'y0': round(y0, 2), 'square': round(sq, 2),
            'orientation': orientation_of(grid),
            'anchor': path, 'score': round(score, 2),
        }
    return None


if __name__ == '__main__':
    got = calibrate_video(sys.argv[1:])
    if not got:
        # A refusal is a RESULT: no frame in this range showed a start position,
        # so calibrate the section by eye rather than loosening anything.
        print('no start-position frame found — calibrate by eye', file=sys.stderr)
        sys.exit(1)
    print(json.dumps(got))
