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
# 1. cookies from a signed-in YouTube account, Netscape format. Export from a
#    window you do NOT then sign out of — signing out rotates the session and
#    the file dies with "cookies are no longer valid". Never commit it.
# 2. a JS runtime for the n-challenge:  npm i -g deno
# 3. VIDEO-ONLY DASH (-f 135 / 396). The progressive formats are behind
#    YouTube's SABR rollout and 403 even with valid cookies; video-only DASH
#    is served normally, and we only ever want pixels.
yt-dlp --cookies /tmp/yt.txt --remote-components ejs:npm -f 135 -o v.mp4 "<url>"

# 4. CALIBRATE BY HAND — see below. Three numbers per board layout.
# 5. frames -> occupancy grids  (x0 y0 square fps)
#    2fps, not 0.5 — see "Sampling rate" below
python3 scripts/video-align/scan_video.py v.mp4 /tmp/frames 370 -2 60 2

# 6. grids -> timestamped moves, constrained by the rules
node scripts/video-align/track.mjs /tmp/frames/grids.json
```

## You read the geometry. Code confirms it and measures the colours.

```bash
# the three numbers are YOURS, read off a frame (see below)
python3 scripts/video-align/calibrate.py 370 -2 60 /tmp/frames/f_*.png
# -> {"x0": 370, "y0": -2, "square": 60.0, "orientation": "white",
#     "anchor": "/tmp/frames/f_00015.png"}
```

It scans for the first frame where YOUR numbers actually reproduce the start
position, then measures the six colour classes from that frame. Three
behaviours, all verified:

| input | result |
|---|---|
| correct hand geometry | confirmed, anchor found, orientation `white` |
| geometry one square off | **refused** |
| no start-position frame in range | **refused** |

That middle row is the whole point. A geometry one square out — or carried
across a section boundary onto a resized board — is the exact failure that
killed both automated detectors, and it now cannot pass silently.

**TWO GEOMETRY GUESSERS HAVE DIED HERE. Do not write a third.**
`detect_board.py` failed four ways on appearance. Then fitting to the start
position looked principled and returned a plausible `x=376.6 y=-6.6 sq=60.75`
on the pilot — and produced NO FIT at all on that same frame rescaled to
640x360 and 1024x576. Videos arrive at whatever resolution YouTube serves, so
that would silently skip most of a corpus. David, having watched it:
*"keep doing it yourself, no bots. it seems to work better that way."*

## Reading the geometry by eye — the standard procedure

David 2026-08-17: *"maybe aligning by hand yourself is the way to go. do not
rely on bots?"* — and he was right, after a detector had already burned a
session failing.

The geometry is THREE NUMBERS per board layout, and reading them off a frame
takes seconds, because you can see the board. Automating that is replacing the
one part of this job that is genuinely easy. `detect_board.py` is kept for
reference and is NOT trustworthy (see its docstring for the four scoring
functions that each looked right and measured wrong).

The reliable procedure, which is how the numbers below were found:

1. Extract one frame from the section and LOOK at it.
2. Read the position off it by eye.
3. Let code find the geometry that reproduces that position — search a small
   grid of `(x0, y0, sq)` around your estimate and keep the one with fewest
   mismatches against the position you read. This is hand alignment with a
   machine check, not a guess: you supply the truth, code confirms the numbers.

On the pilot that lands in one pass: `x=370 y=-2 sq=60.0`, **63 of 64 squares
correct**. The single miss was d1 reading black — the exact fixed bias
described above, which `track.mjs`'s `calibrate()` then found and subtracted on
its own (`c1(b->w) d1(b->w)`). Do not chase that last square by hand.

**Every video needs this more than once.** David 2026-08-17: *"he does also
change board size when switching from play to the review section, and the board
also changes a third time when he shows example games."* So geometry is
per-SECTION, not per-video — calibrate each layout separately and scan its
range. A geometry carried across a section boundary reads a board that is no
longer there.

## ONE MISREAD SQUARE CAN COST A WHOLE VIDEO — and it will look like a format problem

Three uploads tracked 0-4 plies and every plausible story for it was wrong:
blitz outrunning the sampler (no — 140 of 196 gaps between settled positions
were a single ply), search depth (no — MAX_PLY 6 changed nothing), boards too
annotated to settle (no — 197 settled positions is not "never settles").

The cause was **d1 reading black with a white queen on it**, in every frame from
t=112 on. One phantom piece means no target grid can match a legal position, so
the tracker stalls immediately and permanently. It presents exactly like "this
kind of video does not work".

`calibrate` in `track.mjs` should have caught it and could not, because it
inspected only the EIGHT most common grids. On a video where the teacher lingers
on positions those are all deep middlegame boards (128-248 occurrences each),
while start-position frames are spread thin across many near-identical grids.
Searching ALL grids, most-common first, finds the biased start immediately:

    French       4 -> 82 plies      Sicilian Alapin   0 -> 62
    Scandinavian 0 -> 16            pilot unchanged at 153

**And a common early position is not a biased start position.** No distance
threshold separates them — a London video calibrated against the board after
1.d4 d5 and "corrected" d2/d4/d5/d7, erasing real pawns; tightening the
threshold just moved it to 1.d4. The RULES separate them: a real position is
reachable from the start by legal moves, a read bias is not. A candidate
chess.js can explain as a played line is skipped.

So when a video refuses: diff a settled grid against the position the tracker
believes it is at, and look for a square that is wrong in EVERY frame. Do that
before concluding anything about the source material.

## Verified end-to-end — FULL VIDEO (2026-08-17, hand-calibrated)

All 27 minutes of *Trashing the Traxler* at 2fps:

    3,245 frames -> 325 settled positions -> 153 plies, 31 rewinds

against the original pilot's 49 plies and 15 rewinds. Geometry `x=370 y=-2
sq=60` held for the entire video — no blank chunk anywhere — so this one does
NOT resize its board, though others do and each section must still be checked.

Read in 3-minute chunks, deleting frames as it goes: 3,245 PNGs is ~1GB, and
there is no reason to hold them.

The strongest evidence the reads are right is that the moves are known theory.
The tracker recovers the Traxler mate exactly:

    Nxf7 Bxf2+ Kxf2 Nxe4+ Ke3 Qh4 Nxh8 Qf4+ Ke2 Qf2+ Kd3 Nc5+ Kc3 Qd4#

Before the colour calibration that stretch came out as a garbled three-ply
jump. Every move is chess.js-legal from its predecessor, and no grid that fails
to match a legal move is ever believed.

The earlier 7-minute run, for reference — 840 frames -> 71 settled positions:

    t=81    ply 1-9   e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5   the Fried Liver
    t=134.5 << rewind to ply 7
    t=136.5 ply 8     Bc5                                  the Traxler
    t=158   ply 9-15  Nxf7 Bxf2+ Kxf2 Nxe4+ Ke3 Qh4 Nxh8   the counterattack
    t=219.5 << rewind to ply 8
    t=224.5 ply 9     Bxf7+                                White's refutation

Cost, measured on the full 27-minute video at 480p: download ~40s, frame
extraction ~96s, board reads 7.1ms/frame (~23s), tracking seconds. Roughly
**3 minutes per video**, which parallelises. Frame extraction should stream
rather than write PNGs — 3,244 frames is ~1GB per video on disk.

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

- **Joining to the notes — and it is blocked on the CORPUS, not on video.**
  Timestamp -> FEN works. The notes have no timestamp to join it to: **0 of
  11,426** carry `t`. The field was only added to `distill-v2` on 2026-08-16,
  after all 421 videos had been distilled.

  It cannot be recovered from the shipped corpus. Measured: 10,144 notes have
  no position and an empty `lineSan`, so their chunk is unidentifiable; the
  1,152 positioned ones had `lineSan` REWRITTEN by the anchor pass, so it no
  longer names the chunk; the remaining 130 are `inferred`, which
  `isVerifiedPosition` rejects anyway. So the join needs an **additive**
  re-distill — additive because note ids are content digests, and regenerating
  prose would orphan the 268 hand-written spoken forms.

- **Why the video is needed at all**, since the transcript already has the
  words: the transcript aligner positions nothing. Measured across 6 videos,
  **0 of 52 chunks** got a DB alignment, consistent with the shipped corpus's
  130 `inferred` notes from 421 videos. That is why ~89% of the corpus cannot
  fire at a specific move.

- **What the board adds over just reading the transcript** (David asked, and it
  is a fair question — the move ORDER is largely readable): per-ply
  TIMESTAMPS, which are the join key; the REWINDS, 15 in the pilot, which are
  the branch points where the teaching actually happens; and PROOF, since a
  position read from pixels is a measurement rather than an assertion. The
  board is not doing the thinking here, it is doing the verifying — the same
  role Stockfish plays for gems.

- **Orientation.** A board shown from Black's side is not yet handled. Read it
  off the frame when calibrating that section; it is one more thing you can
  simply see.
