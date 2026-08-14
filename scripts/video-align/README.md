# video-align — read the board off the video, not out of the transcript

David 2026-08-14: *"pull the video and align the narrations."*

## Why this exists

Only **10.4%** of the 64,973 farmed corpus notes carry a position. Everything
else is opening-tagged or concept-tagged, so it can never fire at a specific
move — which is most of why the coach goes quiet mid-game.

The distiller already tries to recover positions from the audio, and
`distill-v2.mjs` documents why that mostly fails:

> *"Captions are unpunctuated, so a move he PLAYS and a square he NAMES
> ('control of d5', 'the f4 idea') are syntactically identical … He is
> TEACHING, so he narrates hypothetical branches constantly ('if he plays f4,
> then g5'). No amount of parsing separates the line played from a line merely
> discussed."*

That ambiguity is a property of speech. **The board does not have it.** The
position is on screen the entire time, so reading the pixels answers the
question the audio cannot.

## The two decisions that make it work

**1. Read OCCUPANCY, never piece type.** Classifying six piece types from a
45px cell is where board OCR usually breaks — and it is unnecessary. We are not
reading a position cold, we are TRACKING from the start, where chess.js already
knows the ~30 legal moves. Each legal move produces a distinct occupancy
pattern, so occupancy alone identifies which move was played. A grid matching
NO legal move is discarded rather than believed, so the failure mode is silence,
never an invented position (G3).

**2. Calibrate the OCR; do not loosen the matcher.** Board themes, piece sets
and the frame crop bias particular squares. In the pilot video a1 and d1 read
black in *every* frame, including the 29 frames showing the untouched start
position. That is a fixed offset, not noise: it is measured once against the
known starting layout and subtracted. The first attempt instead relaxed the
match tolerance, which would have let real misreads through everywhere else.
Calibrated, the tracker accepts only EXACT matches and still works.

## Geometry, and the trap in it

The board may extend past the frame edge. In the pilot it is 361px starting at
x≈279, y≈−3 — above the top and clipped at the bottom. A detector that forces
the board to fit INSIDE the frame lands on the wrong square size, every cell
then straddles two real squares, and empty squares come back with std ~55
instead of ~0. **Derive the geometry from square EDGES** (scan a rank for
colour transitions; the gaps are the square size) rather than fitting a box,
and validate a candidate on empty-square flatness rather than checker contrast.

## Pipeline

```bash
# 1. cookies from a signed-in (throwaway) YouTube account, Netscape format
#    — YouTube blocks datacenter IPs without them. Never commit this file.
# 2. a PO-token provider must be running (bgutil-ytdlp-pot-provider).
yt-dlp --cookies /tmp/yt.txt --remote-components ejs:github -f 396 -o v.mp4 "<url>"

# 3. frames -> occupancy grids  (x0 y0 square fps)
python3 scripts/video-align/scan_video.py v.mp4 /tmp/frames 279.2 -3 45.2 0.5

# 4. grids -> timestamped moves, constrained by the rules
node scripts/video-align/track.mjs /tmp/frames/grids.json
```

Pilot result on *"Trashing the Traxler"* — `e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5`,
the Two Knights into the Fried Liver, with a timestamp on every ply. Since every
distilled note carries a transcript timestamp, that is the join: **timestamp →
FEN**.

## Environment notes (each of these cost real time)

- **ffmpeg + deno** must be installed; yt-dlp needs a JS runtime for the
  n-challenge.
- **The PO-token server needs a one-line patch** behind an egress proxy: its
  axios sets `httpsAgent` but not `proxy: false`, so axios's own env-var proxy
  handling wins and sends a non-CONNECT POST, which a CONNECT-only proxy
  rejects with 405.
- **certifi's CA bundle** must contain the proxy CA *with a separator*. Appended
  without a trailing newline it silently corrupts the last existing cert, and
  every Python HTTPS call fails with `CERTIFICATE_VERIFY_FAILED`.

## Not done yet

- **Multi-game videos.** Tracking stops when the thread breaks. Needs a reset
  when the position returns to the start, and re-acquisition after a gap.
- **Board auto-detection.** The geometry above was derived by hand from edge
  scans; `find()` in `read_board.py` is not yet reliable enough to trust
  unattended.
- **Orientation.** A board shown from Black's side is not yet detected.
