# video-grids — the raw board reads, kept

The grid is what the scanner saw: every settled occupancy grid it found in a
video, before chess.js turned them into a line. It is kept because **it is what
a re-track needs**, and re-tracking is not hypothetical — `srNXYAsaX7I` recorded
113 plies of a real, legal, correctly-named opening over a video that was
playing something else entirely.

Deleting the grid meant the only route to a fix was re-downloading the video,
which needs live cookies and a rate limit that is frequently refusing. Keeping
it costs almost nothing: 448KB of JSON gzips to 16KB.

Re-track from one with:

```bash
zcat data/video-grids/<id>.json.gz > /tmp/g.json
VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/build.mjs <id> /tmp/g.json "<title>" "<x,y,sq>"
```

If the grid itself is wrong — bad geometry, or colour classes learned from a
flipped board — the video does have to come back. Read the geometry off a frame
by eye per section and confirm it with `calibrate.py` before re-scanning.
