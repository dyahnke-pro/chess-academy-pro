# Naroditsky Teaching DNA — measured pattern spec (2026-08-21)

Pulled from `data/video-narration/*` — **147 Naroditsky lessons, 7,360
narrated positions, 488,678 words**, position-paired (FEN + move + what he
said). Every % below is a real count, re-runnable, not remembered.

Artifact (readable): https://claude.ai/code/artifact/873f44e2-a6d8-4164-9838-d6e0e2d7d873

## Philosophy (one line)
The position is the teacher; the coach narrates the tension inside it. He
rarely states a truth cold — he sets up the move you'd *want* to play, then
turns on it. Teaching by contrast, not by lecture.

Five convictions from the numbers:
- Concrete beats abstract ~5:1 (calculation 28% vs principle 5%).
- Always the why — explicit causal clause on 26% of positions.
- Think out loud, fallibly — uncertainty 21%, self-correction 14%.
- Coach the opponent too — prophylaxis threaded through commentary.
- Delight is a spike (2.8%), not a drip. Rare on purpose.

## The move-set, by frequency (share of narrated positions)
| move | % | videos |
|---|---|---|
| contrast / but-turn | 33.3 | 147/147 |
| concrete calculation | 27.8 | 146/147 |
| explicit why | 25.6 | 147/147 |
| honest uncertainty | 21.0 | 146/147 |
| self-correction | 13.5 | 143/147 |
| evaluation verdict | 10.0 | 139/147 |
| rhetorical question to student | 9.3 | 135/147 |
| named concept in context | 8.3 | 141/147 |
| direct attention | 8.3 | 139/147 |
| plan / itinerary | 7.3 | 137/147 |
| student-level meta | 4.8 | 130/147 |
| delight | 2.8 | 91/147 |

## Arc (deciles) — a lesson is not flat
Calculation stays hot throughout; the evaluation verdict nearly doubles in
the final tenth (10%→18%); student-meta bookends (intro + wrap). Open on the
trap, calculate the middle, land a clear verdict at the end.

## The outline the app follows (per-move beat template)
G0-clean: code computes every fact; the template only picks the frame.
1. Point the eye, name the move's job (move mechanics + lead-the-eye arrow)
2. **The but-turn** (engine 2nd-line vs best; verify tempting line legal) — signature beat
3. The why — causal clause(s), each named square board-verified (multi-reason OK)
4. What the opponent wants (threat/gem detection)
5. The itinerary — sparingly (PV plan / farmed note)
6. A verdict, building — light early, decisive at terminus (engine eval, student POV)
7. Earn a principle — only after the concrete line showed it
8. A delight spike — at most once per lesson

Voice rules over every beat: ask before you reveal (honesty contract);
model thinking not omniscience (hedge only over genuinely double-edged
positions — never over something code can compute); no interface talk / no
move-restatement / no reflexive praise; two registers, one arc.

## One sentence for the engine
Take the move the student would *want* to play, turn on it with a concrete
line, give the *real* reason, name what the opponent wanted — and only then,
if the position earned it, the principle.

## Reproduce the numbers
Scripts in `/tmp/danya/` this session (ngram/rhetoric/arc/bookend passes over
`data/video-narration/`). Corpus = the 147 ids in `data/video-queues/naroditsky.txt`
that have a `data/video-narration/<id>.json`.
