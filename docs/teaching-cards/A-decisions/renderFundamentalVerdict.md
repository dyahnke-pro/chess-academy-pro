# renderFundamentalVerdict — the fundamental the move broke, and the habit

## A. Identity
- `src/services/principleVoice.ts:809` `renderFundamentalVerdict(attrs, {ply, seen, replySan})` → `{ diagnosis, how }`; per-id renderers `fullVerdict` :243 (switch over ~45 `FundamentalId`s, 2–3 rotated stems each), `shortVerdict` :713 (repeat), `fundamentalHow` :178 (the habit), `missedPunish` :850 (a hung piece they did not take), recap `renderFundamentalsRecap` :930.
- Inputs from `principleAttribution.ts` (`PrincipleAttribution { id, facts, evidence }`; ids `FUNDAMENTAL_IDS` :52, tag map `FUNDAMENTAL_TAG` :101).
- Registry `fundamentalVerdict` `boardComputers.ts:2117-2130` (`verdictFact` :8279), kind `principle`, two facts (diagnosis / how), claims `fundamental:<id>` / `fundamental-how:<id>`, seat student. Also `learnFundamentalNarration.ts`, `misconceptionClassifier.ts`. Census 66/66 (review).

## B. Facts
- B1: two strings; the attribution's `facts` (piece, square, kick, better, line, homeMinors, guards, situation…) ride in, only words come out.
- B2 dropped: `a.id` per diagnosis sentence (the registry keeps only `attrs[0].id` in the claim, :8285 — a second attribution's id is lost); `a.facts.better` (the better move) is woven in; `a.evidence.pvMoves` (`renderPvEvidence` exists but is separate).
- B3 cheap: nothing new — the attribution already holds the facts. Splitting text into LESSON / CONSEQUENCE / BETTER fields per id is a re-render, not a calculation.
- B4: first appearance → full + how (`seen` ledger); repeat → short stem (no how); `missedPunish` when replySan did not take (:850); `VERDICT_WITHOUT_BETTER` when `better` is empty.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | e.g. `loose-piece`: "Loose pieces drop off: the bishop on c5 is left hanging, and after Bxc5 nothing can take back." / `traded-active-for-passive`: "Trade your worst piece for their best, not the reverse." | closest of the family to the target shape; some stems lead with the board ("That's the same knight for the third time") |
| CONSEQUENCE | yes | inside the stem ("your next move has to answer it") | |
| BETTER MOVE + JOB | partly | `f.better` named in some ids ("neglected-development": "…this was the moment for Nc3") — no job | job from deliberation `bestWhy` |
| HABIT | yes | `how` with HOW_STEMS ("Next time: …") | rotated stems (CLAUDE.md wants habit words fixed); record gate is `seen` (once a game), not the hold rate |

## D. Lesson recipes (per fundamental family; ids in principleAttribution)
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FV1 | loose-piece / ignored-threat | S | attribution | piece, sq, kick | "Loose pieces drop off: your {piece} on {sq} had nothing to take back." | "{kick} wins it." | better + job | how (fixed) | after move | `missedPunish` when they didn't take → past "they missed it" | H |
| FV2 | tempo / development (same-piece-twice, tempo-handed, neglected-development, early-queen-sortie, knights-before-bishops) | S | | homeMinors, kick | "In the opening every move should bring a new piece out. Your {piece} moved again while {homeMinors} still sat at home." | "{kick} comes with a hit on your {target}." | better | how | after | opening only (attribution gates) | H |
| FV3 | trades (traded-active-for-passive, wrong-trade-for-material) | S | | piece, situation | "Trade your worst piece for their best, never the reverse." / "Ahead in material, trade pieces; behind, keep them on." | | better | how | after | | H |
| FV4 | structure (created-pawn-weakness, overextended-pawn, weakened-king-shield, capture-toward-centre) | S | | pawn | "A pawn move is forever: the squares it stops guarding never come back. {squares} are holes now." | | better | how | after | | H |
| FV5 | endgame (passive-king-endgame, lost-the-opposition, passive-rook-endgame, rook-in-front-of-passer, passed-pawn-neglected) | S | ending | | "In the endgame the king is a fighting piece." / "Rooks belong behind passed pawns." | | better | how | after | ending | H |
| FV6 | calculation (passive-when-forcing-existed, calculation-depth, walked-into-tactic, overvalued-attack) | S | | line | "When a forcing win is on, play it before anything quiet." | line | better | how | after | | H |
| FV7 | pins/guards (missed/ignored-pin-pressure, missed/ignored-guard-removal, missed/ignored-pin-break) | both seats encoded in the id (missed = theirs to take, ignored = yours) | | | "A pinned piece can't escape: pile on it." / "A piece with one guard falls when you chase the guard." | | better | how | after | | H |
| FV8 | opponent seat | O | n/a today — attribution runs on the student's flagged move; the opponent's mistake would need the same pipeline on their move | | | | | | | | C (pipeline on O moves) |
| FV9 | record | S | | | RED/GREY full + how · AMBER the `shortVerdict` stem · GREEN silent | | | | | | H |

## E. Mistake link
- errorWhy names (D1): loose-piece → `left-hanging` (E6); ignored-threat → `allowed-capture`/`allowed-threat` (E11/E12); walked-into-tactic → `allowed-tactic` (E10); passive-when-forcing-existed → `missed-win` (E14); trade/tempo/structure/endgame ids → `positional` (E15) by `FUNDAMENTAL_TAG`.
- This is a mistake-cause computer in its own right: each FundamentalId is a cause, filed under `FUNDAMENTAL_TAG`. Map to the one error computer's causes: loose-piece→`lost-the-piece`/`allowed`; ignored-threat→`allowed` (standing threat); walked-into-tactic→`allowed` motif; passive-when-forcing-existed→`missed`; tempo/structure/trade ids → positionalReason kinds (`pawn-weakened`, `piece-offside`, …) or new positional causes.

## F. Build changes
1. Return typed parts per attribution: `{ id, lesson, consequence, better: string|null, how }` instead of joined strings (principleVoice.ts:809-840); the claim keeps EVERY id, not `attrs[0]` (`boardComputers.ts:8285`).
2. HOW stems (`HOW_STEMS` :160) → one fixed lead per habit (habit words never rotate); gate on the hold-rate record (FV9) instead of `seen` only.
3. Build the MistakeCause ↔ FundamentalId map once (`Record<FundamentalId, MistakeCause>`), so a fundamental and the error computer never teach the same miss twice.
4. Rewrite the board-led stems (e.g. `same-piece-twice` "That's the same knight for the third time…") to lesson-first: "In the opening, a new move wants a new piece: …".
5. FV8: run attribution on the opponent's flagged moves (separate WO; behaviour question H).

## G. Proof boards
- Review lines (said 66): "Next time: end every move with a count … A guard does not help when the attacker is cheaper than the piece." (FV1 guarded); "A forcing win was on the board with Rxe5, and a quiet move walked past it." (FV6).
- Not run in the scratch (attributions come from the analysis pipeline, not a pure board call).

## H. Open questions
- FV8: should the opponent's broken fundamentals be taught in Learn ("they moved the same knight three times — punish it")?
