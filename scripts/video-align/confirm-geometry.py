"""confirm-geometry — find the numbers BEFORE paying for a scan.

A scan reads every frame of the video, so trying a geometry costs ten minutes
and trying four costs forty. That is why `harvest-local` could only afford a
short list of hand-read layouts, and why a video two pixels off any of them was
parked: the search was priced per full decode.

It does not have to be. Calibration only ever needed a HANDFUL of frames — it
is looking for one that shows the start position — and ffmpeg can seek those in
seconds. So sample first, confirm the numbers, then scan exactly once.

WHAT THIS IS NOT: a geometry detector. Two of those have died here (see
`detect_board.py` and `fit_geometry_to_start`), and this does not repeat them.
It searches a small neighbourhood around layouts a PERSON read off a frame, and
every candidate is confirmed by `calibrate_section` against the start position —
so a wrong one is refused rather than believed. The neighbourhood exists because
the same layout drifts a pixel or two between encodes: measured on
`K8QMjqu0_MY`, the board sits at 372,0,60.25 where the scaled lab numbers give
370,-2,60, and that difference alone was the whole reason a Master Class scanned
to zero tracked games.

Usage: python3 confirm-geometry.py <video> [--quiet]
Prints "x0,y0,sq" on success; exits 1 when nothing confirms.
"""
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calibrate import calibrate_section  # noqa: E402

# The hand-read layouts, at 854 wide. Scaled by the frame's own width.
LAYOUTS = [
    (370.0, -2.0, 60.0),    # lab / speedrun — board right, beside the webcam
    (4.0, 4.0, 58.7),       # 2019 uploads — board left, wooden, header right
    (427.0, 26.7, 53.4),    # co-stream — board right, larger, under a player bar
]
# Per-encode drift around a layout. Small on purpose: this corrects a couple of
# pixels, it does not go looking for a board somewhere else in the frame.
DX = (0.0, 2.0, -2.0, 4.0, -4.0)
DY = (0.0, 2.0, -2.0, 4.0, -4.0)
DS = (0.0, 0.25, -0.25, 0.5, -0.5)


def duration(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
        capture_output=True, text=True,
    ).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def width(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
         'stream=width', '-of', 'csv=p=0', path],
        capture_output=True, text=True,
    ).stdout.strip()
    try:
        return int(out)
    except ValueError:
        return 854


def sample(path, out_dir, dur):
    """Frames where a start position is likely, cheaply.

    Dense over the first two minutes because most lessons open on one, then
    spread across the rest because plenty do not — a speedrun's next game starts
    whenever the last one ended, and a lesson may open on an old game. A start
    position lasts only a few seconds, so a coarse grid alone walks past them:
    75 frames spanning fifty minutes missed every one on a two-hour match.
    """
    times = [t / 2 for t in range(0, 240)]                      # 0-120s at 0.5s
    if dur > 120:
        step = max(5.0, (dur - 120) / 260)
        t = 120.0
        while t < dur - 2:
            times.append(t)
            t += step
    paths = []
    for i, t in enumerate(times):
        p = os.path.join(out_dir, f'{i:05d}.png')
        r = subprocess.run(
            ['ffmpeg', '-loglevel', 'error', '-ss', f'{t:.2f}', '-i', path,
             '-frames:v', '1', p, '-y'], capture_output=True,
        )
        if r.returncode == 0 and os.path.exists(p):
            paths.append(p)
    return paths


def confirm(video, quiet=False):
    w = width(video)
    r = w / 854.0
    with tempfile.TemporaryDirectory() as tmp:
        frames = sample(video, tmp, duration(video))
        if not frames:
            return None
        for lx, ly, ls in LAYOUTS:
            for ds in DS:
                for dx in DX:
                    for dy in DY:
                        x0, y0, sq = (lx + dx) * r, (ly + dy) * r, (ls + ds) * r
                        got = calibrate_section(frames, x0, y0, sq)
                        if got:
                            if not quiet:
                                print(f'confirmed {x0:.2f},{y0:.2f},{sq:.2f} '
                                      f'({got["orientation"]}) on {len(frames)} sampled frames',
                                      file=sys.stderr)
                            return x0, y0, sq
    return None


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print('usage: confirm-geometry.py <video> [--quiet]', file=sys.stderr)
        sys.exit(2)
    got = confirm(args[0], quiet='--quiet' in sys.argv)
    if not got:
        print('no hand-read layout reproduced the start position', file=sys.stderr)
        sys.exit(1)
    print(f'{got[0]:.4f},{got[1]:.4f},{got[2]:.4f}')
