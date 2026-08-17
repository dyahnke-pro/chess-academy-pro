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


def scan(video, x0, y0, sq, fps, calibrated=False):
    w, h = dimensions(video)
    rows = []
    cal = None
    orient = None
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
                # ORIENTATION FIRST, FROM RAW LUMINANCE — the calibration needs
                # it, because labelling the two full ranks the wrong way round
                # inverts every colour and then reads back as self-consistent.
                trial_orient = orientation_from_luminance(g, x0, y0, sq)
                if trial_orient is None:
                    continue
                trial = calibrate_from_start_arr(g, x0, y0, sq, trial_orient)
                start = read_board_calibrated_arr(g, x0, y0, sq, trial)
                if not looks_like_start(start):
                    continue
                cal, orient = trial, trial_orient
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
    return rows


if __name__ == '__main__':
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    calibrated = '--calibrated' in sys.argv
    video, out = argv[0], argv[1]
    x0, y0, sq = float(argv[2]), float(argv[3]), float(argv[4])
    fps = float(argv[5]) if len(argv) > 5 else 2.0
    grids = scan(video, x0, y0, sq, fps, calibrated)
    if not grids:
        print(f'{video}: nothing read under geometry {x0},{y0},{sq} — REFUSED')
        sys.exit(2)
    json.dump(grids, open(out, 'w'))
    print(f'{video}: {len(grids)} grids -> {out}')
