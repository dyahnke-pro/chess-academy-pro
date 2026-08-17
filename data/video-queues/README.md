# video-queues — what to harvest next, in order

Committed because the queues are derived work that outlives the container, and
because "which videos matter next" is a decision worth keeping rather than
re-making.

- `naroditsky.txt` — remaining Danya videos, opening-teaching playlists first.
- `hangingpawns.txt` — 404 videos, ordered by how much teaching each produced.
  **Next after Danya** (David 2026-08-17). Chosen on measurement, not vibes:
  100% of its notes are opening-tagged and 35% position-keyed, against Saint
  Louis's 23% / 4% despite Saint Louis being three times larger. Every Hanging
  Pawns video is one opening, which is the shape this app teaches in.

**Before harvesting a NEW channel, read its board geometry off a frame by eye**
and confirm it with `calibrate.py`. Danya's `370,-2,60` is his chess.com stream
layout and does not transfer. Guessing it produces grids that match no legal move
(a refusal, harmless) or a legal-but-false line (not harmless) — see the King's
Gambit that tracked `d3 c5 d4 d5`.

## Hanging Pawns — geometry (read by hand 2026-08-17)

    x0=470  y0=67  sq=43.4   orientation: white

Read off a frame by eye and confirmed against the position actually on the board:
**63 of 64 squares**. The single miss is the d1 queen on a dark square — the fixed
bias `track.mjs` subtracts on its own. Do not chase it.

A false start on the way there, worth recording: the video overlays the FULL line
as a caption (`1.e4 e5 … 9.h3`) while the BOARD sits at move 3. Checking geometry
against the caption instead of against the board reported a 16/64 mismatch and
sent me looking for a geometry error that did not exist. Read the board, not the
caption.

## Hanging Pawns — THE REAL BLOCKER, and it is not geometry

**These videos never show the starting position.** They open on a title card and
cut to a set position — the Closed Spanish lesson begins at move 3. Every
calibration path built for Danya keys off a start-position frame:

- `calibrate_from_start` learns its six colour classes from two full ranks;
- `orientation_from_luminance` compares those same two ranks;
- and `track.mjs` tracks a game FORWARD from the initial position, so it has
  nothing to anchor to.

So this set needs a seeded tracker: start from a known line rather than from the
initial position. The line is available — the caption states it, and 35% of the
farmed notes for these videos already carry `lineSan`. That is a design task, not
a tweak, and it should not be bodged: a tracker that guesses its own starting
position is exactly how a legal-but-false line gets produced.

Danya's pipeline works end to end and has 336 videos queued; finish that first.

## Refusal ledgers — why a handled video must never be re-fetched

- `needs-hand-geometry.txt` — the scan refused; the video is parked in
  `/tmp/vid-refused/` because a refusal is usually a fixable geometry or
  orientation problem, not a bad video (the Danish Gambit refused, then gave
  286 plies once its board was read by hand).
- `no-game.txt` — the scan succeeded and the build found no usable game. Often
  correct rather than broken: `GqdveDSL2SA` is a "Miniature Game" upload with
  no continuous play long enough to track.

Both are read by the downloader's skip test. Neither outcome leaves a track
behind, so without them the downloader's "do I already have this" question goes
false the moment the video is deleted and fetches it again on every pass —
`C4xtj2rc0_k` was pulled four times that way, against a request budget David
asked to protect. The supervisor's remaining-count reads the same ledgers, or it
respawns a downloader that has nothing left to do.
