# Opening-Content Grounding — Fix Plan (2026-06-29)

**Scope (David, locked):** OPENINGS CONTENT ONLY — masterclass + pro-rep
opening lines, lesson sublines, middlegame/endgame plans, mistakes, traps,
gems. The rest of the app (tactics, endgames-as-modules, kids, live coach
chat) is explicitly OUT of scope for this pass ("i dont care about the rest
of the app").

## The disease (why this exists)

Terminal-only soundness checking misses the **decaying-tail bug**: a line
that leaves the opening book and then plays a sub-optimal move that quietly
concedes 1–3 pawns WITHOUT ending in an obvious loss. The Vienna lesson
(`viennaVariations.ts`) is the worked example — it dawdles
`Bd2 → Nh3 → O-O-O → Nf4 → Kb1` while Stockfish wants `d4` at every ply,
eval rotting `+1.05 → −2.03` (David's reported "king slide to the open
file" + "hanging center d-pawn"). Every terminal check passed it because
the line ends ~−1.5, not in disaster.

The intended build standard (build-opening-spine doctrine, G9.1/§rebuild):
**DB-most-played WHILE in book → Stockfish-best ONCE out of book → reach a
sound middlegame.** These lines violate it. The fix is to enforce it.

## The instrument (built + validated 2026-06-29)

`scripts/ci/check-spine-continuation.cjs` — finds each line's book-exit ply
(masters explorer), then compares every student move from there to the
engine's best, flagging any that concede ≥ MARGIN. Validated: catches the
known Caro `Bg4??` hang at 4.57 loss; pinpoints the Vienna bug. Persistent
`spine-eval-cache.json` dedupes shared positions.

## Defect inventory (from the gates)

| Type | Count | Source gate |
|---|---|---|
| Decaying-tail / sub-optimal-move lines | TBD (sweep running) | check-spine-continuation |
| Illegal moves | 2 | groundingLines/Mistakes (Scandinavian `O-O-O`, Naroditsky-Alapin `Nxd5`) |
| Mistake inversions / correct-move-loses | 23 | groundingMistakes |
| Broken / inverted traps | 8 | groundingTraps |
| Broken plan / endgame lines | 12 | groundingPlans (Réti bishop-hangs, Eric-Rosen French drops 2 pawns, …) |
| Intentional cautionary lines (NOT bugs) | ~2 | groundingLessons (Caro smothered-mate "don't do this") |

## The fix recipe (per line — doctrine: moves from DB/engine, LLM writes ONLY prose)

1. Find the divergence ply (first move conceding ≥ threshold vs best).
2. Truncate at the last GOOD ply (before the concession).
3. Re-extend the spine: DB-most-played while in book, then Stockfish-best,
   until a sound middlegame terminus is reached (`build-opening-spine.mjs`).
4. Swap the corrected move sequence into the lesson `.ts` / `repertoire.json`
   / plan JSON.
5. Re-anchor any dependent middlegame plan's `criticalPositionFen` to the new
   terminus (G9.3 Gate C continuity).
6. Re-author the narration beats (`say`/`sayShort`) for the NEW moves —
   grounded (`sources[]`), two registers, lead-the-eye arrows.
7. Re-verify: stage-2 best-move + terminal soundness + narrationAccuracy all
   green.

## Phases

- **Phase 0 — Inventory (in progress).** Finish the stage-2 sweep on (a)
  lesson sublines [running], (b) repertoire main+variations, (c) plan lines.
  Output: the full work-list with divergence ply + engine-best per line.
- **Phase 1 — SKELETON / moves (automatable; G9.3 Gate D: skeleton before
  prose).** Build the re-spine tool; regenerate the sound tail for every
  flagged line. Fix the 2 illegal moves. Re-anchor + re-derive the 12 broken
  plans (endgames grounded in a real master game per the endgame doctrine).
  Re-derive the 23 mistakes (correct = engine-best; wrong = a move that is
  genuinely worse). Triage the 8 traps (quiet-terminal grading) → fix /
  reclassify weapon↔warning / drop. **No narration yet** — all skeletons
  gate-green on best-move + soundness first.
- **Phase 2 — NARRATION (per-line authoring).** Re-write `say`/`sayShort`
  for every re-spined line; grounded, two registers, lead-the-eye; pass
  narrationAccuracy + the coverage gates.
- **Phase 3 — PERMANENT GATE.** Wire stage-2 best-move into ship-check
  (`groundingContinuation` gate) at a sane margin; baseline the current
  backlog, burn down. So a future build cannot reintroduce a decaying tail.
- **Phase 4 — Ship + audit.** Per the post-deploy ritual.

## Expansion mandate — teach as many lines as possible (David 2026-06-29)

Beyond fixing flagged lines, ADD new sublines wherever a real, sound, distinct
branch can be IDENTIFIED — maximize the teaching surface (the Vienna A/B
queen-trade vs …Be6 rook-raid pattern, generalized to every opening).

**Method to identify an addable line (grounded, never padded):** at each branch
point, find candidate continuations two ways —
1. **DB branches** — the masters explorer's alternative moves at that position
   that carry a meaningful share of games (a recognized variation), and
2. **Engine forks** — eval each legal reply; any sound continuation within
   ~0.3–0.5 of the best (a genuinely playable alternative, not a blunder).
A candidate becomes a new subline ONLY if it is (a) sound for the side taught,
(b) distinct in idea/plan from the lines already taught, and (c) groundable
(real DB/engine move + board-true narration + a corpus concept behind the idea).

**Guardrail (unchanged):** empty > invented. A branch I cannot ground or verify
as sound is NOT added. "As many lines as possible" is bounded by soundness and
groundability — never by padding the count. Each added line is authored to the
full locked standard (coach voice, two registers, lead-the-eye, cited sources).

## The locked narration standard (David 2026-06-29)

1. Coach voice — explain the WHY behind each move, to the student.
2. Engine invisible — the position teaches, never "the engine says."
3. Moves grounded — DB-most-played in book, Stockfish-best out of book.
4. Board-facts gated — narrationAccuracy; never name a piece/square not there.
5. Ideas grounded in the books — verified against chess-concepts.json passages
   (checked, not recalled) and cited in sources[].
6. Two registers — full `say` (the why) + ≤8-word `sayShort` cue.
7. Lead-the-eye — arrows/highlights only on squares the narration names.
8. When unsure — leave blank / flag it. Empty > invented.

## Decisions for David

- **Fix threshold.** Recommend: concede ≥ **1.0** = must-fix (re-spine);
  **0.5–1.0** = review band (eyeball — may be a legit thematic move, not
  every one gets changed). ≥1.5 = unambiguous, top priority.
- **Showcase exemption.** A sharp gambit / canonical showcase line whose
  point is a sacrifice stays (it's an honest negative eval, not a bug) —
  same carve-out the soundness sweep already uses.

## Next-session pickup

Sweep output → `spine-continuation-report.json` (gitignored). Re-spine tool
is the Phase-1 deliverable; doesn't exist yet. Gates + baselines live in
`src/data/grounding/`. The instrument scripts are `check-spine-continuation.cjs`
(stage-2), `check-main-lines.cjs` (stage-1 in-book), `build-grounding.cjs`
(terminal soundness cache).
