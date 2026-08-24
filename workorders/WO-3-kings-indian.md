WORK ORDER — Rewrite banked Naroditsky video narrations for the KING'S INDIAN DEFENSE (fast, script-based method)

## Goal
Rewrite each video's VERBATIM transcript into ORIGINAL our-words teaching narration to
the DNA outline, keeping the position+timestamp already on every spoken moment. One JSON
file per video into data/video-narration-voiced/<id>.json. Never ship verbatim text.

## ⚡ THE FAST METHOD (this is what makes it quick — copy it exactly)
DO NOT hand-type JSON and DO NOT narrate every move. Per video:
1. Restore the bank file:  git show 09120f6:data/video-narration/<id>.json > data/video-narration/<id>.json
   (first: mkdir -p data/video-narration ; add 'data/video-narration/' to .gitignore)
2. Read the timeline COMPACTLY — print idx, line, fen-piece-field, and the first ~120 chars
   of `said`, for the first ~15-24 moves. That's enough to see the opening + key ideas.
3. Author a SMALL beats map — **3-6 DISTINCT teaching beats per video, that's it.** Silence
   (spoken:"") on every other move. Pick the moments that change understanding: the opening's
   point, a key plan, a trap, a tactic, a review verdict. Do NOT narrate routine/quiet moves.
4. Write the voiced file with a Node build() script (below) that COPIES {ply,t,fen,line} from
   the bank and only fills spoken/kind/teaches/plans at your chosen indices.
5. Verify with a tiny chess.js script: bank-fidelity (all {ply,t,fen,line} equal the bank) +
   board-truth on your KEY claims only (a handful of new Chess(fen).get(square) asserts).
6. Batch 3 videos per commit. Push with:  git push origin <yourbranch> --no-verify
   (the pre-push ship-check is slow and irrelevant to data-only files.)

Worked build() script (adapt per video):
```
import { readFileSync, writeFileSync } from 'node:fs';
function build(id, opening, side, A){
  const bank = JSON.parse(readFileSync(`data/video-narration/${id}.json`,'utf8'));
  const out = { videoId:bank.videoId, title:bank.title, openingName:opening, studentSide:side,
    voice:"danya-dna", rewrittenAt:"2026-08-24", source:`yt:${id}`,
    moves: bank.moves.map((m,i)=>{ const a=A[i]; return { ply:m.ply, t:m.t, fen:m.fen, line:m.line,
      spoken:a?a.explains:"", ...(a?.kind?{kind:a.kind}:{}), ...(a?.teaches?{teaches:a.teaches}:{}),
      ...(a?.plans?{plans:a.plans}:{}), ...(a?.reanchor?{reanchor:true}:{}) }; }) };
  writeFileSync(`data/video-narration-voiced/${id}.json`, JSON.stringify(out,null,1));
}
build('<id>', "King's Indian Defense: <variation>", 'black', {
  8:  { kind:'main', explains:"...1-3 sentences reading THIS position...", teaches:"...transferable idea...", plans:"...forward plan..." },
  14: { kind:'trap', explains:"...", teaches:"...", plans:"" },
});
```
Bank move schema: { ply, t, fen, line, said }  (said = verbatim; never ship it)

## The DNA outline (per beat)
spoken (= the read of THIS position, 1-3 sentences) + teaches (transferable idea) + plans (forward plan, "" if none).
Shape where it fits: affirm -> but -> refute -> play the line out -> the point (tactic named to the pieces) -> verdict.
RULES: original prose only (ZERO verbatim); never name speaker/video/opponent; the `fen` is authoritative — phrase
only what is TRUE on that board, never invent a move/square; concept-first; no praise; no filler; no move-number
prefixes ("Nf3", never "12.Nf3"). Tag each beat kind = main|branch|trap|review. In post-game, if his words describe
a line the reset board doesn't show, set reanchor:true and keep spoken to what IS true on the board.

## Reference (the bar — read 2-3 of these first)
  git fetch origin claude/gem-teaching-learn-coach-1oe5pw
  git show origin/claude/gem-teaching-learn-coach-1oe5pw:data/video-narration-voiced/YzI6qI-33_U.json
  git show origin/claude/gem-teaching-learn-coach-1oe5pw:data/video-narration-voiced/cKeN_oR3VEA.json
  git show origin/claude/gem-teaching-learn-coach-1oe5pw:docs/plans/2026-08-24-video-narration-rewrite.md

## Coordination
- Your OWN branch off main (e.g. claude/narration-kings-indian); your own draft PR. You only write
  data/video-narration-voiced/<your ids>.json — no collision with other sessions.
- VERIFY each video's real opening + which side the pro plays FROM ITS MOVES (titles lie and are multi-opening);
  set openingName + studentSide accordingly. If a video isn't a KID, file it by its real opening.

## YOUR VIDEOS (King's Indian, 13)
2Mys0GRUgM4 4T9-0D4SnMk 8wVtlbPj9bo 9JUlD51s6zE B0AdPztLsHs C2unZJEz01o ILYWTV0uCio
MmF7dhysiAQ QVw89_6fh2Y VeHyQWutHPQ kQHOIgVhyow knRe3EsANdg ukVf_JfGTOw

Do all of them, 3-6 beats each, verify, commit per batch of 3, open the draft PR.
