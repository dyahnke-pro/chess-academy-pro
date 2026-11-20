# WO-PICTURE-01 — the facts form one picture of the position, nothing dropped (David 2026-11-19)

David: "We pull all information from many computers but they are only read as single
sources of information. There is nothing that aggregates the information to form a
coherent picture." → "We also need to not drop the lesser valued facts then. Those are
important pieces of the puzzle that help form the details of the picture. Otherwise we
just have an outline" → "Go".

## Why
- **Danya argues; we list.** On the rook-lift board he writes: "hanging on the precipice, but hard to finish him off. …Qf6 is met by Rh5, …c4 fails to Nxg5, so the rook lift." That is four computable facts used as ONE argument: the failed tries are the "but", and the "but" is why the slow move is right. The method is in `scratchpad/danya-how-he-reads.md` (try-and-refute; the verdict comes after the tries).
- **Our decider un-aggregates.** `factSelector` SUBSUMES facts with overlapping squares down to the highest-ranked one and drops the rest. Danya merges the same facts by combining them into the conclusion they support.
- **The measured matrix (Phase 2, 29.9 vs 40.9) lost** because it changed which single facts spoke, never combined any. This WO is not that matrix.

## The rules
1. **The picture keeps every fact.** No fact computed for a board is dropped before the picture is built, the lesser ones included.
2. **A fact attaches to a conclusion only through a computed link.** chess.js says the lever attacks that pawn, the defender guards it, the reply covers that square; the engine says the try fails. Square overlap alone is never a link.
3. **Conclusions are computed from the picture.** The LLM decides nothing (G0).
4. **Lesser facts speak as supports inside the argument.** They are the "because" and the detail, never as standalone lines competing for a slot. The surface decides how deep the supports go (G4.5: no cap — the ranking decides):
   - Learn: the conclusion + its strongest supports;
   - Review and the static read: deeper;
   - "Why?" in chat and Everything mode: the whole chain.
5. **A fact that supports no conclusion stays in the picture** for the next question or the next move. It is never discarded.
6. **Every computer stays as it is.** The picture sits between the computers and the decider.

## The build
**P1 — the index.**
- One shape: every `CoachFact` on a board is keyed by the objects it is about (piece, pawn, square, file, break, king), its side, and its role (asset, liability, threat, resource, try, reply).
- Each computer declares its object and role at emission, a REQUIRED field, so a new computer fails to compile until it answers.
- `src/services/positionPicture.ts`, a leaf.

**P2 — try-and-refute.**
- The tries come from four sources:
  1. the plan's direct attempt (the target and plan computers: a move that hits the target or starts the plan now);
  2. forcing moves;
  3. the human/autopilot move (`humanMove`);
  4. the safe, smaller move from the MultiPV.
- For each try: the engine's reply, what that reply does (the existing move-purpose computers: covers / holds / blocks / takes the square / no follow-up), and the cost as a change in standing band, not material.
- Engine reads cost 3–6 per board. They are budgeted per surface by SOURCE: every source gets its try, so no count cap.

**P3 — the conclusions**, each with its attached supports:
- **Ledger:** each side's working assets and liabilities. A weakness only counts if it is accessible.
- **Counterplay:** their one resource (usually a break), alive or dead by the engine.
- **Target:** the most vulnerable weakness. It needs a lever or route, and attackers that can outnumber the defenders; it is compared against the other candidates.
- **Verdict word:** ledger + counterplay. The engine band is a check, not the source.
- **The "but":** the winning tries that fail.
- **Plan:** the try that survives (planOfTheBoard). **Move:** its first step, with all its jobs.

**P4 — the detail is kept, not dropped. ✅ built 2026-11-19.**
- Found while building: a shared claim key means the SAME idea, so `subsumed` really is a duplicate and stays quiet. The detail that was being lost is a DIFFERENT fact about the same piece.
  - `decide()` swept it below the floor.
  - The static read (`decideRead`) dropped everything but one fact per step.
- **The link is the same piece on the same square of the same board** (`isDetailOf`). A shared empty square or a shared claim never counts.
- **The door:** a swept description linked to a spoken teaching point speaks right after it.
- **The read:** every fact about a step's piece is heard right after that step. It must be a kind the read says at all; withheld squares, restatements and score sheets stay out.
- Tests: `positionPicture.test.ts` and `readDecider.picture.test.ts` (Danya's rook-lift board). Both fail on the old code.

**P5 — the read decider and the composer speak the picture:**
- the conclusions in Danya's step order;
- each conclusion with its supports as "because";
- one idea a sentence, human voice.

**P6 — wire every surface to the one picture:**
- Learn, Review, static read, puzzles, chat, lessons;
- the record path: a conclusion's skill is filed held/broken, both ways.

**P7 — measure, when David allows testing.** Held-out by video, against his ideas:
- verdict partial → said;
- choices silent → said;
- FALSE / RESTATE / REPEAT;
- words per read.

## Order
- Start after the running computer agents land (choices, plan types, new concepts), because the picture is only as good as its facts.
- First P1 + P4 (keep everything, attach instead of drop), then P2 + P3 for the verdict and the refuted tries:
  - his verdict leads on 97 of 202 boards;
  - his choices are 76 ideas, 44 of them silent.

## Guards
- No link without a computed relation (rule 2). A wrongly stapled detail is worse than none.
- A conclusion never outruns its facts. If the ledger has no working asset for either side, the verdict word is the engine band, said plainly.
- No `Math.random`. Phrasings are rotated (`rotateStem`).

## RESUME (2026-11-20, branch `urg-wt`, backed up on origin)
- Merged: picture P5/P6, record path, endings, ledger lever weakness, engine budget, worker read, story wiring, cleanup.
- In flight: one agent fixing the ~40 ship-check failures (commits per group). Ship-check is NOT run until we ship.
- Test next (David: reuse what we have, no engine run): `npx tsx scripts/board-read-stored.ts <article-reads.jsonl> <out.jsonl>` rebuilds today's read from the stored depth-16 lines; grade the saved 673 ideas in `audit-reports/danya-havecheck/ideas-labelled-2026-11-17.json` against it (said / said wrongly / missed + false lines). Tries bench today: 144/240.
- Not pushed to main until David reads the 202 results.
