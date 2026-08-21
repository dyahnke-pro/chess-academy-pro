"""Video -> occupancy grids, with frames STREAMED rather than written to disk.

Same reading as `scan_video.py`; the difference is where the pixels live. The
file-based scanner extracts every sampled frame as a PNG first, which is ~7,800
files and ~2.6GB for one 65-minute lesson. That is fine for the six videos the
pipeline was proven on and does not survive a corpus: 34 videos need ~90GB
against 23GB free, and the failure arrives as a half-finished scan with no disk
rather than as an error anyone can read.

Here ffmpeg writes raw 8-bit grayscale to a pipe and each frame is read, scored
and dropped. Disk stays flat at the size of one frame no matter how long the
video or how many run at once, and the PNG encode/decode round trip goes away.

READS UNCALIBRATED BY DEFAULT, because that is what produced every build we
trust. `scan_video.py` calls the plain `read_board`, and `track.mjs` then finds
and subtracts the fixed per-square biases itself — those two halves are tuned
against each other. Swapping in the colour-class reader here would have changed
the pixel SOURCE and the READING in one step, so any difference in the output
could not be attributed to either. `--calibrated` selects the other reader for
measuring them against each other on the same video.

Usage: python3 scan_stream.py <video> <out.json> <x0> <y0> <sq> [fps] [--calibrated]
                              [--anchor=<png>]

--orient=<white|black> seeds the INITIAL orientation when the scanned range
opens mid-game so there is no start frame to read it from — the Caro-Kann
upload joins its games in progress, Black-oriented, and its only start flash is
the white-oriented new-game preview. The value is read off a frame BY EYE (the
doctrine's rule), and orientation still re-reads at every start position, so a
later section that flips is still caught.

--anchor seeds the colour calibration from a HAND-VERIFIED start-position frame
extracted separately (ffmpeg -ss). It exists because the in-stream search can
have nothing to find: the Ruy "Bishop Sac" upload's only pristine start lives in
the t=0 keyframe — the fps-filtered stream's first frame already has 1.e4 played
— and every later start reads 31/32 under the plain margin. looks_like_start
stays STRICT (the doctrine says calibrate the OCR, never loosen the matcher):
the anchor frame must read back as a perfect start after trial calibration or
the scan refuses loudly, same as ever. Orientation still re-reads at every
start position in the stream.
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from read_board import (  # noqa: E402
    calibrate_from_start_arr,
    looks_like_start,
    read_board_arr,
    read_board_calibrated_arr,
    try_calibrate,
)
from read_board import orientation_from_luminance  # noqa: E402


def flip(grid):
    """Rotate a grid 180 degrees — what a board shown from Black's side needs.

    THIS IS WHY FOURTEEN PULLS 'FAILED ON GEOMETRY' AND SIX TRACKED NONSENSE.
    He plays Black in most speedruns, so chess.com draws the board from his side:
    rank 1 at the top, files h..a left to right. The geometry is IDENTICAL — same
    x, y and square size — so every geometry check passed, and `looks_like_start`
    passed too because two full ranks at each end is symmetric under a half turn.
    Only COLOUR distinguishes the two, which is exactly what `orientation_of`
    reads.

    Unflipped, every square maps to its mirror. Sometimes that matches no legal
    move and the video is refused; worse, sometimes it matches a legal SEQUENCE
    that never happened — a King's Gambit lesson tracked as `d3 c5 d4 d5`, every
    move legal, the whole line false. Refusal was the lucky outcome.
    """
    return [row[::-1] for row in grid[::-1]]


def dimensions(video):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=width,height', '-of', 'csv=p=0', video],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    w, h = out.split(',')[:2]
    return int(w), int(h)


def stream(video, fps, w, h):
    """Yield (index, grayscale frame) without touching disk."""
    proc = subprocess.Popen(
        ['ffmpeg', '-loglevel', 'error', '-i', video,
         '-vf', f'fps={fps}', '-pix_fmt', 'gray', '-f', 'rawvideo', '-'],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    size = w * h
    i = 0
    try:
        while True:
            buf = proc.stdout.read(size)
            if len(buf) < size:
                break
            yield i, np.frombuffer(buf, dtype=np.uint8).reshape(h, w).astype(np.float64)
            i += 1
    finally:
        proc.stdout.close()
        proc.wait()


def load_anchor(path, x0, y0, sq):
    """Calibration seeded from a hand-verified start frame, or die loudly.

    The frame arrives as a PNG extracted with `ffmpeg -ss` because that decode
    can differ from the fps-filtered stream's — the Gti01VN0zXA keyframe at t=0
    is a pristine start while the stream's frame 0 already shows 1.e4.
    """
    proc = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-i', path, '-pix_fmt', 'gray', '-f', 'rawvideo', '-'],
        capture_output=True, check=True,
    )
    w, h = dimensions(path)
    g = np.frombuffer(proc.stdout, dtype=np.uint8).reshape(h, w).astype(np.float64)
    orient = orientation_from_luminance(g, x0, y0, sq)
    if orient is None:
        print(f'{path}: anchor frame has no readable orientation — REFUSED')
        sys.exit(2)
    cal = calibrate_from_start_arr(g, x0, y0, sq, orient)
    back = read_board_calibrated_arr(g, x0, y0, sq, cal)
    if not looks_like_start(back):
        print(f'{path}: anchor frame does not read back as a start position — REFUSED')
        sys.exit(2)
    print(f'calibrated from anchor {path}, orientation={orient}', flush=True)
    return cal, orient


# How far past the start we will still calibrate from, in squares of occupancy.
# Each ply moves one piece, so this reaches roughly the first two moves, and a
# middlegame differs by dozens of squares — nothing but the opening can pass.
NEAR_START_TOLERANCE = 4

# Frames dropped before calibration that are worth a second decode to recover.
# 60 frames is 30s at the standard 2fps — below that there is nothing in the
# head worth a pass; above it, a lesson is losing real teaching.
LATE_CALIBRATION = 60


def scan(video, x0, y0, sq, fps, calibrated=False, anchor=None):
    w, h = dimensions(video)
    rows = []
    near = None
    cal_frame = None
    cal, orient = (anchor if anchor else (None, None))
    for i, g in stream(video, fps, w, h):
        if not calibrated:
            grid = read_board_arr(g, x0, y0, sq)
        else:
            # The calibration frame is SEARCHED for, never assumed at t=0
            # (David: "he starts most times with old games").
            #
            # ASSUME the frame is the start, calibrate from it, and read it BACK
            # — it reproduces the start position only if it really was one. This
            # is `calibrate_section`'s test and it is self-consistent, which
            # matters because the obvious alternative is circular: using the
            # UNCALIBRATED reader to spot the start cannot work on precisely the
            # themes that need calibrating. Measured here — the Rossolimo upload
            # reads as junk uncalibrated (its old grids were all-black, which is
            # why it tracked 0 games), so a start-frame search resting on that
            # reader finds nothing and the video is refused for the wrong reason.
            if cal is None:
                got = try_calibrate(g, x0, y0, sq)
                if got is None:
                    continue
                trial, trial_orient, d = got
                if d:
                    # REMEMBER THE CLOSEST NEAR-START, in case this lesson never
                    # shows an untouched one. Some join their game already in
                    # progress — measured on K8QMjqu0_MY, the board is a move in
                    # by the first frame that is not an intro animation — and an
                    # exact-only search then runs the whole video and refuses,
                    # blaming geometry that is correct. The colour centroids are
                    # medians over ~16 cells per class, so one or two squares in
                    # the wrong class cannot move them. See NEAR_START_TOLERANCE.
                    if d <= NEAR_START_TOLERANCE and (near is None or d < near[0]):
                        near = (d, i, trial, trial_orient)
                    continue
                cal, orient = trial, trial_orient
                cal_frame = i
                print(f'calibrated at frame {i} (t={i / fps:.1f}s), orientation={orient}', flush=True)
            grid = read_board_calibrated_arr(g, x0, y0, sq, cal)
            # ORIENTATION IS RE-READ AT EVERY START POSITION, never fixed once
            # for the file. A lesson opens with an old game, then plays his own,
            # then walks example games — and he is Black in most speedruns, so
            # the board turns over partway through. Measured on the Panov upload:
            # it calibrates `white` at 7.5s and is unmistakably Black-oriented by
            # t=600. Deciding once gets the whole second half mirrored.
            #
            # A start position is the only frame orientation can be read from —
            # occupancy is symmetric under a half turn, so only the COLOUR of the
            # two full ranks resolves it — and it is also exactly where the
            # tracker segments games, so the two agree by construction.
            if looks_like_start(grid):
                fresh = orientation_from_luminance(g, x0, y0, sq)
                if fresh is not None and fresh != orient:
                    print(f'  orientation -> {fresh} at t={i / fps:.1f}s', flush=True)
                    orient = fresh
            if orient == 'black':
                grid = flip(grid)
        rows.append({'t': round(i / fps, 1), 'grid': grid})

    # FRAMES BEFORE CALIBRATION ARE DROPPED, so a lesson that reaches its first
    # start position late loses everything up to it. Measured on K8QMjqu0_MY:
    # the exact start arrives at t=2206 of a 2486s upload, and the first pass
    # kept 560 grids out of ~4,900 — 37 minutes of teaching discarded, silently,
    # by a scan that reported success. Once the colour classes are known they are
    # known for the whole file, so a second decode recovers all of it.
    #
    # It runs in two cases: nothing calibrated at all but a near-start was seen
    # (otherwise the video is refused outright), or calibration landed late
    # enough that the dropped head is worth a pass. Not for a video that
    # calibrates in its first seconds, where there is nothing to recover.
    recover = calibrated and cal is None and near is not None
    if recover:
        d, i0, cal, orient = near
        print(f'no exact start position; calibrated {d} square(s) past the start '
              f'at frame {i0}, orientation={orient}', flush=True)
    elif calibrated and cal is not None and cal_frame is not None and cal_frame > LATE_CALIBRATION:
        recover = True
        print(f'calibrated late (frame {cal_frame}); re-reading from the top', flush=True)
    if recover:
        rows = []
        for i, g in stream(video, fps, w, h):
            grid = read_board_calibrated_arr(g, x0, y0, sq, cal)
            if looks_like_start(grid):
                fresh = orientation_from_luminance(g, x0, y0, sq)
                if fresh is not None and fresh != orient:
                    print(f'  orientation -> {fresh} at t={i / fps:.1f}s', flush=True)
                    orient = fresh
            if orient == 'black':
                grid = flip(grid)
            rows.append({'t': round(i / fps, 1), 'grid': grid})
    return rows


if __name__ == '__main__':
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    calibrated = '--calibrated' in sys.argv
    anchor_path = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--anchor=')), None)
    orient_seed = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--orient=')), None)
    if orient_seed not in (None, 'white', 'black'):
        print(f'--orient must be white or black, got {orient_seed}')
        sys.exit(2)
    video, out = argv[0], argv[1]
    x0, y0, sq = float(argv[2]), float(argv[3]), float(argv[4])
    fps = float(argv[5]) if len(argv) > 5 else 2.0
    anchor = load_anchor(anchor_path, x0, y0, sq) if anchor_path else None
    if anchor and orient_seed:
        anchor = (anchor[0], orient_seed)
    grids = scan(video, x0, y0, sq, fps, calibrated or anchor is not None, anchor)
    if not grids:
        print(f'{video}: nothing read under geometry {x0},{y0},{sq} — REFUSED')
        sys.exit(2)
    json.dump(grids, open(out, 'w'))
    print(f'{video}: {len(grids)} grids -> {out}')
