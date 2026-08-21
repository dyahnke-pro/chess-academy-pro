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
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from calibrate import NEAR_START_TOLERANCE  # noqa: E402
from read_board import try_calibrate  # noqa: E402

# The hand-read layouts, at 854 wide. Scaled by the frame's own width.
LAYOUTS = [
    (370.0, -2.0, 60.0),    # lab / speedrun — board right, beside the webcam
    (4.0, 4.0, 58.7),       # 2019 uploads — board left, wooden, header right
    (427.0, 26.7, 53.4),    # co-stream — board right, larger, under a player bar
]
# Per-encode drift around a layout. Small on purpose: this corrects a couple of
# pixels, it does not go looking for a board somewhere else in the frame.
DRIFT = [(0.0, 0.0, 0.0)]
for _dx in (0.0, 2.0, -2.0):
    for _dy in (0.0, 2.0, -2.0):
        for _ds in (0.0, 0.25, -0.25):
            if (_dx, _dy, _ds) != (0.0, 0.0, 0.0):
                DRIFT.append((_dx, _dy, _ds))


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


def sample_times(dur, dense_n, spread_n):
    """When a start position is likely to be on screen.

    Dense over the opening because most lessons begin on one, then spread over
    the rest because plenty do not — a speedrun's next game starts whenever the
    last ended, and a lesson may open on an old game. A start position lasts only
    a few seconds, so a coarse grid alone walks past them: 75 frames spanning
    fifty minutes missed every one on a two-hour match.
    """
    times = [i * 0.5 for i in range(dense_n)]
    if dur > times[-1] + 4 and spread_n:
        step = (dur - times[-1] - 2) / spread_n
        times += [times[-1] + 2 + i * step for i in range(spread_n)]
    return [t for t in times if t < dur - 0.5]


def frames_at(path, times, out_dir):
    """Seeked frames, loaded once as arrays.

    Loaded ONCE is the point. The first cut re-opened every PNG for every
    candidate geometry — 375 candidates over 500 frames is 187,000 image decodes,
    and it was still grinding on its first video after ten minutes. The pixels do
    not change between candidates; only the grid laid over them does.
    """
    out = []
    for i, t in enumerate(times):
        p = os.path.join(out_dir, f'{i:05d}.png')
        r = subprocess.run(
            ['ffmpeg', '-loglevel', 'error', '-ss', f'{t:.2f}', '-i', path,
             '-frames:v', '1', p, '-y'], capture_output=True,
        )
        if r.returncode == 0 and os.path.exists(p):
            try:
                out.append(np.asarray(Image.open(p).convert('L'), dtype=np.float64))
            except Exception:
                pass
            os.unlink(p)
    return out


def search(frames, r, drift, quiet):
    """First geometry that reproduces a start position, exact preferred."""
    near = None
    for lx, ly, ls in LAYOUTS:
        for dx, dy, ds in drift:
            x0, y0, sq = (lx + dx) * r, (ly + dy) * r, (ls + ds) * r
            for g in frames:
                got = try_calibrate(g, x0, y0, sq)
                if got is None:
                    continue
                _cal, orient, diff = got
                if diff == 0:
                    if not quiet:
                        print(f'confirmed {x0:.2f},{y0:.2f},{sq:.2f} ({orient})', file=sys.stderr)
                    return x0, y0, sq
                if diff <= NEAR_START_TOLERANCE and (near is None or diff < near[0]):
                    near = (diff, x0, y0, sq, orient)
    if near is not None:
        d, x0, y0, sq, orient = near
        if not quiet:
            print(f'confirmed {x0:.2f},{y0:.2f},{sq:.2f} ({orient}), {d} square(s) '
                  f'past the start', file=sys.stderr)
        return x0, y0, sq
    return None


def confirm(video, quiet=False):
    """Base layouts over a wide sample first; drift over a narrow one only if
    that fails. Almost every video is answered by the first phase, so the
    expensive combination — many candidates times many frames — is paid only
    where the alternative is losing the lesson."""
    r = width(video) / 854.0
    dur = duration(video)
    with tempfile.TemporaryDirectory() as tmp:
        wide = frames_at(video, sample_times(dur, 160, 120), tmp)
        if not wide:
            return None
        got = search(wide, r, DRIFT[:1], quiet)
        if got:
            return got
        narrow = wide[::4]
        return search(narrow, r, DRIFT[1:], quiet)


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
