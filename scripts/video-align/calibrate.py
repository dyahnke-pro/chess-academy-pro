"""Per-video geometry calibration — because every video's board is a different size.

David 2026-08-17: *"the chess board in each video is a different size and needs
recalibrating each time."*

`detect_board.py` already derives geometry from square edges, but the pipeline
made you run it on ONE frame by hand and paste `x0 y0 sq` into `scan_video.py`,
once per video. Two things are wrong with that:

  * It is manual, so it does not scale past a pilot.
  * It trusts a SINGLE frame. A frame caught mid-animation, on a talking-head
    cut, or on a rank crowded with pieces gives a plausible-looking pitch that
    is simply wrong — and a confidently wrong geometry produces confidently
    wrong positions, which is the one failure mode this pipeline must never
    have (G3: silence over invention).

So calibration samples MANY frames and requires them to AGREE. Frames that
disagree are not averaged into a compromise — a compromise between two wrong
geometries is a third wrong geometry. They are counted, and if too few agree the
whole video is refused.

WHY AGREEMENT IS THE RIGHT TEST. The board is static for the whole video: its
size and origin cannot change between frames, only its contents can. So pitch
measured on frame 40 and frame 900 must match to within rounding. When they do
not, the detector is reading something else — a scene cut, an overlay, a
different camera — and that is worth failing on rather than guessing through.

ORIENTATION. Not previously detected (the README lists it as open). Occupancy
alone cannot tell you which way the board faces: the start position is
occupancy-symmetric under a 180° rotation. COLOUR can — at the start position
the two ranks nearest the viewer are the near player's pieces. So orientation is
read only from frames that actually show the untouched start layout, and stays
`None` when no such frame exists rather than defaulting to white, because
defaulting would silently mirror every square of a Black-side lesson.
"""
import sys
import json
from collections import Counter

import numpy as np
from PIL import Image

from detect_board import detect
from read_board import read_board

# How far two pitch measurements may sit apart and still count as the same
# board. Pitch is measured as a median of transition gaps, so it carries
# sub-pixel noise; 0.6px is comfortably above that and far below the ~4px gap
# that separates genuinely different geometries.
PITCH_TOL = 0.6
# Origin tolerance is looser: x0/y0 are refined against flatness, which has a
# broad optimum when a rank happens to be full of pieces.
ORIGIN_TOL = 2.5
# Below this fraction of sampled frames agreeing, refuse the video. Talking-head
# intros, sponsor reads and full-screen graphics are all normal, so a healthy
# video still fails plenty of frames — but a board that is really there holds a
# clear majority of the frames that produced any reading at all.
MIN_AGREEMENT = 0.6

# The start position as an occupancy+colour grid, top row first, from White's
# view. Used only to decide orientation.
START_WHITE_BOTTOM = ['bbbbbbbb', 'bbbbbbbb', '........', '........',
                      '........', '........', 'wwwwwwww', 'wwwwwwww']


def _cluster(values, tol):
    """Largest group of values that all sit within `tol` of its median.

    Deliberately not k-means or a histogram: there is exactly one right answer
    here and everything else is junk, so the question is only "which value do
    most frames repeat", not "how does this distribute".
    """
    best = []
    for v in values:
        group = [w for w in values if abs(w - v) <= tol]
        if len(group) > len(best):
            best = group
    return best


def _looks_like_start(grid):
    """Two full ranks at each end, four empty ranks between — the start layout,
    read as occupancy only so it holds for either orientation."""
    occ = [''.join('x' if c in 'wb' else '.' for c in row) for row in grid]
    return (occ[0] == occ[1] == 'xxxxxxxx' and occ[6] == occ[7] == 'xxxxxxxx'
            and all(r == '........' for r in occ[2:6]))


def orientation_from(grid):
    """'white' if White sits at the bottom, 'black' if flipped, else None.

    Only meaningful on a start-position frame; the caller enforces that.
    """
    if not _looks_like_start(grid):
        return None
    near = ''.join(grid[6]) + ''.join(grid[7])
    far = ''.join(grid[0]) + ''.join(grid[1])
    near_w, far_w = near.count('w'), far.count('w')
    near_b, far_b = near.count('b'), far.count('b')
    # Require a decisive majority both ways; a washed-out theme that reads half
    # the pieces as the wrong colour should abstain, not guess.
    if near_w >= 12 and far_b >= 12:
        return 'white'
    if near_b >= 12 and far_w >= 12:
        return 'black'
    return None


def calibrate(frame_paths):
    """Consensus geometry over many frames, or None if they do not agree.

    Returns {x0, y0, square, orientation, agreement, frames_read, frames_used}.
    """
    readings = []
    for p in frame_paths:
        got = detect(p)
        if got:
            _flat, x0, y0, sq = got
            readings.append((x0, y0, sq, p))
    if not readings:
        return None

    # PITCH FIRST. It is the most reliable of the three — it comes from counting
    # colour transitions across a whole rank, so it survives pieces and
    # highlights that would move an origin estimate.
    pitch_group = _cluster([r[2] for r in readings], PITCH_TOL)
    if len(pitch_group) / len(readings) < MIN_AGREEMENT:
        return None
    sq = float(np.median(pitch_group))

    # Then the origin, but only among frames that already agreed on pitch: a
    # frame with the wrong pitch has a meaningless origin and must not vote.
    on_pitch = [r for r in readings if abs(r[2] - sq) <= PITCH_TOL]
    xs = _cluster([r[0] for r in on_pitch], ORIGIN_TOL)
    ys = _cluster([r[1] for r in on_pitch], ORIGIN_TOL)
    if not xs or not ys:
        return None
    x0, y0 = float(np.median(xs)), float(np.median(ys))

    agreed = [r for r in on_pitch
              if abs(r[0] - x0) <= ORIGIN_TOL and abs(r[1] - y0) <= ORIGIN_TOL]
    agreement = len(agreed) / len(readings)
    if agreement < MIN_AGREEMENT:
        return None

    # ORIENTATION, from whichever agreed frames show the untouched start. Most
    # videos open on one; those that do not simply get None, and the tracker
    # keeps its current White-at-bottom assumption explicitly rather than
    # silently.
    votes = Counter()
    for _x, _y, _s, path in agreed:
        o = orientation_from(read_board(path, x0, y0, sq))
        if o:
            votes[o] += 1
    orientation = votes.most_common(1)[0][0] if votes else None

    return {
        'x0': round(x0, 2),
        'y0': round(y0, 2),
        'square': round(sq, 2),
        'orientation': orientation,
        'agreement': round(agreement, 3),
        'frames_read': len(readings),
        'frames_used': len(agreed),
    }


if __name__ == '__main__':
    got = calibrate(sys.argv[1:])
    if not got:
        # A refusal is a RESULT, not a crash: it means this video's frames did
        # not agree on a board, and the correct next step is to look at them,
        # never to loosen the tolerance until something comes out.
        print('no agreed board geometry', file=sys.stderr)
        sys.exit(1)
    print(json.dumps(got))
