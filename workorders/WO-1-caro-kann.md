WORK ORDER — Rewrite the banked Naroditsky video narrations for the CARO-KANN (our own words, DNA outline)

## Goal
For each video listed below, rewrite the pro's VERBATIM transcript into ORIGINAL,
our-words teaching narration, keeping the position + timestamp already attached to
every spoken moment. Output one JSON file per video. Do NOT ship verbatim text.

## Background (why this exists)
`data/video-narration/<id>.json` is a "bank": for every spoken moment it carries
the exact board (`fen`, read off the video pixels) synchronized with what the pro
said (`said`, raw auto-caption) and the timestamp (`t`, seconds). The board was
tracked through the pro's rewinds/analysis too. The rewrite (verbatim -> our
words) was never done. That's this WO. Author by WALKING THE SYNCHRONIZED
TIMELINE in order — board + words together — and narrate what's true on the board
at each moment.

The bank was committed then removed from the tree; recover each file from git:
  mkdir -p data/video-narration
  grep -qxF 'data/video-narration/' .gitignore || echo 'data/video-narration/' >> .gitignore   # keep verbatim OUT of the tree
  git show 09120f6:data/video-narration/<id>.json > data/video-narration/<id>.json

Bank move schema: { ply, t, fen, line, said }  (said = verbatim; NEVER ship it)

## The DNA outline (the standard for every narration)
Per anchored position you narrate:
  - spoken  (= explains): 1-3 sentences reading THIS position (what matters, why)
  - teaches: the transferable idea
  - plans:   the forward plan ("" if none)
Spoken-beat shape where it fits: affirm -> but -> refute -> play the line out ->
the point (tactic named to the pieces) -> verdict.
ABSOLUTE RULES: original prose only (ZERO verbatim/near-paraphrase of `said`);
never name the speaker/video/opponent; the `fen` is authoritative — phrase only
what is TRUE on that board, never invent a move/square; concept-first; no praise;
no filler; no move-number prefixes ("Nf3", never "12.Nf3"). Silence (spoken:"")
on routine/duplicate/quick moves — save voice for moments that change understanding.

## Entire video, incl. post-game review
Narrate the WHOLE video, not just the live game. The post-game review is where the
pro explains TRAPS and ALTERNATIVE LINES — that's our walkthrough material. Tag
each narrated beat: kind = "main" (live game) | "branch" (an analysis line he plays
out) | "trap" (a named trap he demonstrates) | "review" (a retrospective point).
In post-game he sometimes TALKS about a line while the board shows a DIFFERENT
reset position — if his words don't match the `fen`, set `reanchor: true` on that
beat and keep `spoken` to what IS true on the board (don't file a false claim).

## Output — a distinctly labeled folder
Write `data/video-narration-voiced/<id>.json`:
  { videoId, title, openingName, voice:"danya-dna", rewrittenAt:"<YYYY-MM-DD>",
    source:"yt:<id>",
    moves: [ { ply, t, fen, line,  // COPY these from the bank, untouched
               spoken, kind?, teaches?, plans?, reanchor? } , ... ] }

## VERIFY every file before committing (two hard gates)
  1. bank-fidelity: each move's {ply,t,fen,line} equals the bank's exactly.
  2. board-truth: every piece/square your `spoken` names is TRUE on that move's fen
     (load with chess.js `new Chess(fen)` and assert). Fix or drop any that fail.
Reference verifier pattern is in the proof files (below).

## Reference (the quality bar — read these first)
First fetch my branch, then read the reference files (PR #909):
  git fetch origin claude/gem-teaching-learn-coach-1oe5pw
  git show origin/claude/gem-teaching-learn-coach-1oe5pw:data/video-narration-voiced/YzI6qI-33_U.json
  git show origin/claude/gem-teaching-learn-coach-1oe5pw:data/video-narration-voiced/qfiO5HGBWWc.json
  git show origin/claude/gem-teaching-learn-coach-1oe5pw:docs/plans/2026-08-24-video-narration-rewrite.md
Match that voice/depth exactly.

## Coordination
- Work on your OWN branch off main (e.g. `claude/narration-caro-kann`); open your
  own draft PR. You only write `data/video-narration-voiced/<your ids>.json` — no
  conflict with other sessions.
- VERIFY each video's real opening FROM ITS MOVES before authoring (titles lie —
  one "Dragon" title was actually a Moscow game). If a listed video's GAME isn't a
  Caro-Kann, set its `openingName` to the real opening and note it; don't force it.

## YOUR VIDEOS (Caro-Kann, 22)
0ipLPOAN_m8 475QvJRimkI 4GIsh7cTsHc 898k4qkY0vg B7r1bgPEyIQ CQFSXmfxMV8
Jt5bST3j-Cw KV90PAgPO2A UXKY-hKJs6Q UiNSl_OnvDQ Zko_JUK06vM cPVp5TWZR0w
fz9td9L2uIo gyOxMMJWiYg i8G7wozMNcU iuLI_EUlgvE k4T6TJGOSA0 kO4qTTR0B7o
mCzuNeWLYBs rkoC8ZlqOII zprg2WbmgzQ
(B7r1bgPEyIQ / UXKY-hKJs6Q are multi-opening titles — file by the actual game.)

Do all of them. Verify each. Commit per video with a clear message. Open the draft PR.
