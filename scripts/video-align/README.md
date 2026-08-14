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
# geometry comes from the detector; 2fps, not 0.5 — see "Sampling rate" below
python3 scripts/video-align/detect_board.py /tmp/frames/f_00001.png
python3 scripts/video-align/scan_video.py v.mp4 /tmp/frames 284 -2.4 44.4 2

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

## Teaching videos REWIND — this is the thing to understand

The tracker first stalled at ply 9 of a 27-minute video, and the cause was not
the OCR. At t=134s the d7 pawn was home again and the e4 pawn was back: a
position from four plies EARLIER. He had taken the moves back to show a
different continuation, which is what a lesson does constantly. A forward-only
tracker reads that as an impossible jump and never recovers.

Remembering every position the game has visited, and treating a match as a
rewind, took the pilot from **9 plies to 49** — and recovered the shape of the
lesson itself:

    ply 1-9    e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5   the Fried Liver
    << rewind to ply 7
    ply 8      Bc5                                  the Traxler
    ply 9-10   Nxf7 Bxf2+                           the counterattack
    << rewind to ply 8
    ply 9      Bxf7+                                White's refutation

15 rewinds in one video. **The rewind points are the valuable part**: a branch
point is exactly where a teacher stops to explain why, so those timestamps are
the ones most likely to carry teaching worth positioning.

## Sampling rate matters more than search cleverness

At 0.5fps, 67 of 154 gaps between settled positions were 7+ squares wide —
several plies had passed, and explaining them needs a deep search that explodes
combinatorially. At **2fps** most gaps are a single move. Sample faster before
making the search smarter.

## Not done yet

- **Orientation.** A board shown from Black's side is not yet detected.
- **Validation across themes.** The detector is proven on one chess.com layout.
  Before running at scale it needs to earn its keep on several videos with
  different boards — a confidently wrong geometry produces confidently wrong
  positions. The tracker's exact-match rule is the backstop (a bad grid matches
  no legal move and is dropped), but that is the last line, not a substitute.
- **Joining to the notes.** Timestamp -> FEN exists now; mapping distilled
  notes onto it is the remaining step.
