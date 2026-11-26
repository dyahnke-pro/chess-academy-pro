# CARD — `knownSlip` (the known club mistake and its punishment)

## A. Identity
`src/services/knownSlips.ts:201` `knownSlip(ctx: KnownSlipContext)` → `KnownSlipRead {key, text, proof, squares, stakes, seat, namesStudentMove, heldForm?}`; the index `clubGemBoards` (mined offline: slips club players under 1600 play + punishment to a quiet board, verified by a second read, G3); `isWeaponGem` (trap bar F04: ≥ a piece or mate), `isKnownSlipGem`. Two modes: `reached` (the board holds a slip, the side to move did something else) and `played` (the side played the slip). Registry `boardComputers.ts:70, 1641`. Census 72/63 (lesson 41, review 31), kinds `trap-ahead` 57, `common-wrong` 15.
- ⚠ Header (`:18-20`) says "Learn is NOT decided (the gems stay off Learn, David 2026-10-29), so no Learn file reads this module" — yet `CoachTeachPage.tsx` reads it through the registry (`readBoardAll('slipsOnLine', …)` `:10153`, spoken as lane `knownSlip` `:10297`; no direct import, which is why the import-scanning gate passes) and the census has 41 Learn lines. Contradiction with CLAUDE.md "BOTH ARE TAUGHT ON THE OPENING PAGES ONLY" (gate `gemCrushLines.computed.test.ts`). Owner question H1.

## B. Facts
- **B1** slip, punishment, outcome (mate / "you win a pawn" / "the better game"), stakes from `gem.endCp`, seat, held form (punishment held when it is the student's to find).
- **B2 dropped:** `gem.juice` (the miner's ranking), the club share (deliberately not said: "A REASON, NOT A STATISTIC"); the punishment's WHY (what Nxf7 does — a fork? a discovered attack?) is not read — the line says "after Nxf7 they win a rook", the mechanism is missing.
- **B3 cheap:** the motif of the punishment line via the one classifier (`detectTacticType` / `costReason.motif` over `[slip, ...punishSeq]`) → the general lesson.
- **B4 gates:** proof must play (`legalLineProof`, ≥2 plies, `:223`); trap only on `isWeaponGem`; said-next guard (`:215`); verdict already said the punishment → short form.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | the motif (B3); "a known mistake" is a label, not a lesson |
| CONSEQUENCE | yes | outcome + line | — |
| BETTER MOVE + JOB | no | — | (errorWhy's) |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KS1 | knowledge (named/known pattern) + motif | S mistake | `played`, slipBy student | motif, punish | "Some moves are known traps: the bishop out to c5 here lets Nxf7 fork the queen and the rook. [motif lesson from errorWhy E10]" (no "club players play" — a share is not a reason) | "after Nxf7 they win a rook" | errorWhy better | motif habit | the slip is not named (it is the move just played): "Your move walks into a known trap: Nxf7 forks your queen and rook." | only if errorWhy also calls it a mistake (cost) | H + C (motif) |
| KS2 | punish their slip | O mistake | `played`, slipBy opponent | | "That's a known mistake at club level." (heldForm — punishment held) | | | | held punishment until the student plays or misses it | `punishIsTheirsToFind` | H |
| KS3 | reached (warning) | S/O | `reached` | | before-move warning — not a mistake turn → silent in mistakes-only Learn | | | | silent | | H |

## E. Mistake link
errorWhy `allowed-tactic` (motif from the gem's line) when the student's slip is a known gem; O-seat known slip = the student's chance (KS2).

## F. Build changes
1. Resolve the Learn contradiction (H1): either the census Learn lines are a leak to remove (header and CLAUDE.md say gems stay off Learn), or Learn keeps KS1/KS2 and the header + CLAUDE.md change.
2. Add `motif` to `KnownSlipRead` (B3), read by the recipe.
3. KS3 (`reached`) leaves Learn (before-move).

## G. Proof boards
- Census Learn: "…Bc5 is a known mistake on this board, and after Nxf7 they win a rook." (`lines-2.jsonl:7224`, not said); "Here, …Qh4 is a known mistake at club level: after Nf3 they win a pawn." (`lines-2.jsonl:5405`, said); Review: "Ke1 is a known trap on this board, and after …Qh4+ you win a rook and a pawn for a knight." (`lines-2.jsonl:6249`).

## H. Open questions
1. Known slips / gems in Learn at all? (Code header + CLAUDE.md say opening pages only; census shows 41 Learn lines.)
2. KS2: hold the punishment always in Learn (David 2026-11-16 Caro comment says yes).
