# needs-hand-geometry — scans that refused, waiting on a human eye

A scan refusal is **not** a verdict on the video. It usually means the geometry
or the orientation is wrong for that particular upload, and that is fixable by
looking at one frame — the Danish Gambit refused, then produced 286 plies once
its board was read by hand.

`needs-hand-geometry.txt` lists ids that refused. For each: pull one frame,
LOOK at it, read `x0 y0 sq` off the board, confirm with `calibrate.py`, and
re-scan. Never guess the numbers — two automated detectors have died proving
that, and a wrong guess yields a legal-but-false line rather than an error.

The four listed today were DELETED by an earlier version of `bank-loop.sh`,
which removed a video whenever its scan refused. That was wrong for exactly the
reason above, and it is fixed: refused videos now move to `/tmp/vid-refused/`
and get recorded here. These four need re-downloading before they can be looked
at, which needs live cookies.
