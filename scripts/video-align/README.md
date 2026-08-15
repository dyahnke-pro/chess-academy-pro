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

```bash
# 5. timeline + notes -> positions for notes that had none
node scripts/video-align/align-notes.mjs --video ykmGxE9DURo \
     --track /tmp/vidtest/track2.json           # add --apply to write
```

Pilot result on *"Trashing the Traxler"* — `e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5`,
the Two Knights into the Fried Liver, with a timestamp on every ply.

## The join is NOT a timestamp — that claim was wrong

This file used to end with "since every distilled note carries a transcript
timestamp, that is the join: timestamp → FEN". It was written before the field
was checked. **0 of the 11,426 shipped Naroditsky notes carry a timestamp.**
The distiller retains it going forward, but the corpus we already have was
farmed without it, and re-distilling 58,124 notes to recover one field is not
the cheapest route.

Two properties of the corpus replace it, and between them they are enough:

- **ORDER.** Notes come out of a video in transcript order, so their moments
  run forward. That turns a scatter of possible matches into a monotone
  alignment, and it is what separates the same line taught twice.
- **MOVES.** Teaching prose names the moves. The tracker knows which moves were
  on the board and when — rewinds included — so a recited sequence usually
  identifies its own moment.

Three things decide WHICH moment, in this order of authority:

1. **Where the pieces are.** "Dislodge the knight from d4" is a present-tense
   assertion about the board, and it outranks everything else — it locates the
   PLY. Without it, two notes about that knight sat at the position after `d4`,
   before Black's knight had gone there at all.
2. **What was just played**, counting only moves the prose ASSERTS. A move
   introduced by "if" or "after" has not happened, and treating it as history
   files the note one ply late — "if Black plays d5" belongs before d5, not
   after it.
3. **What the line contains**, which locates the segment rather than the ply.

## Nothing enters the corpus on the video's word

The video only ever PROPOSES. A proposal is then certified two ways, and a note
needs one:

- **The claim gate** — `recoverPosition`, the same function `recover-positions`
  already applies to the primary corpus. Every piece-on-square claim must be
  true at the position, and it can also walk the note forward to the exact ply
  it describes.
- **Legality** — a move of a NAMED PIECE to a NAMED SQUARE must be legal, twice
  in sequence, from the proposed board.

The second exists because the first cannot fire here: teaching prose says
"bishop takes d5", not "the bishop on d5", so on the first pilot run every
correct proposal was refused as `no-claims` while naming its position
unmistakably. Legality asks chess instead of phrasing — and it is a real bar,
because a proposal at the wrong moment has the pieces in the wrong places.

Pilot outcome: **12 unpositioned notes → 6 positioned, 0 wrong** on inspection.
Four certified by the strict claim gate, two by legality. The other six name no
verifiable move and stay unpositioned, which is the correct answer for them.

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
- **Validation across themes.** DONE for nine videos — the detector found the
  board on every one, after two fixes it needed: scoring checkerboard
  separation instead of flatness (flatness rewards the blank UI panel), and
  requiring four probe frames to AGREE (one frame at 10:00 confidently found
  the webcam).
## First batch: 9 videos, 38 of 426 unpositioned notes placed (8.9%)

Run dry on 2026-08-15, and reading the output was the point — the FIRST pass
placed 46 and sixteen of them were wrong, in ways no pass-rate would show. A
Sicilian note at `e4 e5`; a London System note on a `Nc3 e5 f4` line; "the
queen on b6 has fulfilled its purpose" at a board where the queen stands on c8.
Three gates now catch each (depth floor, opening scope, placement enforcement,
all described in align-notes.mjs), and every refusal names something
falsifiable — `prose puts a q@b6 that is not there`.

| video | unpositioned | placed | timeline steps |
|---|---|---|---|
| nkDlJMpLezk | 54 | 14 | 75 |
| ykmGxE9DURo | 12 | 6 | 51 |
| JKxlT73xpYo | 48 | 5 | 24 |
| RzfG5SfKRak | 52 | 4 | 36 |
| f8alAsVJRc8 | 47 | 4 | 9 |
| lryqtSMy4pY | 56 | 4 | 24 |
| zEqoGIgzk1E | 48 | 1 | 7 |
| 2jXSWOTKx8M | 44 | 0 | 21 |
| dfu5wt0wwFc | 65 | 0 | 36 |

## The bottleneck is now the TRACKER, and it is sparsity not truncation

Placements track the timeline-step column almost exactly, so the limit is how
many board states get recognised — not the gates, and not the notes.

The tracker does NOT die early: it spans the whole video (t=29 → 1980, t=17.5 →
4694.5). It is SPARSE. A 60-90 minute speedrun contains hundreds of positions
and it recognises nine to seventy-five, so most settled grids match no legal
continuation within `MAX_PLY` of the last known position and are skipped.

That points at read quality rather than search: matching is EXACT by design (a
grid matching no legal move is dropped rather than believed), so a single
misread square costs the whole frame. The right next move is to measure how
many settled grids are one or two squares away from a legal successor before
touching either the matcher or `MAX_PLY` — loosening the matcher without that
number is the mistake this file already warns about twice.

**Do not scale before fixing it.** At four placements a video and eleven
minutes each, 421 videos is seventy-seven hours of compute for ~1,700
positions. The same hours spent on read quality would multiply every video
already processed.

## Also still owed

- **Orientation.** A board shown from Black's side is not yet detected.
- **Notes that name no move** stay unpositioned. Order places them in a window,
  but nothing in them can be checked against a board, so they are refused
  rather than guessed at.
- **A video that never shows the start position tracks nothing.** The tracker
  builds forward and cannot recognise a position it did not walk into.
