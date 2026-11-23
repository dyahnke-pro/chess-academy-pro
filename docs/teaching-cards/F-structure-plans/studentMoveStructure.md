# Card — `studentMoveStructure` (family F)

### A. Identity
- `studentMoveStructure(i)` — `src/services/structureReads.ts:62-116`: a COMPOSITE of 23 move judgements over the student's move (`fenBefore`, `san`, `cpLoss`, `bestSan`, `bestUci`, `reply`, REQUIRED `namesBetterMove` / `namesStudentMoves`). A `standing(...)` wrapper drops a read whose squares the reply changed (`squaresTheReplyChanged` :119). With `namesBetterMove` false a read speaks its `heldForm`.
- Adapter `boardComputers.ts:~2805-2820`, kind `judgement`. Census: 370 / 180 said; not-said **same-idea 166** (subsumed by another producer of the same idea).

### B. Facts — the 23 sub-reads, split by what they are
**MISTAKE judgements (fire only when the move cost)** — these ARE mistake lessons today:
| read | file:line | cost gate | the lesson it already says |
|---|---|---|---|
| rightIdeaWrongPiece | planJudgement.ts:25 | ≥ 30 | "d2 is the right square, but it is the b1 knight's job: Nbd2. Your knight on f3 was guarding e5." |
| keepPlanChangeRoute | planJudgement.ts:62 | ≥ 60 | "The knight jump to X fails. That rules out the route, not the plan: it reaches T through H instead." |
| planOverOneMove | planJudgement.ts:122 | ≥ 40 | "The check is a one-move idea, while Nd5 is the plan: it covers …" |
| dontPlugFile | squareJudgement.ts:314 | ≥ 40 | "Your move plugs your own rook's c-file. Nb5 keeps it open." |
| fileOpenedForDefender | squareJudgement.ts:387 | ≥ 30 + reply | "After their f-pawn takes back on e5, their rook on f8 owns the f-file." |
| enPassantStructure (took) | pawnJudgement.ts:217 | ≥ 50 | "Taking en passant gave up the clamp: your pawn on e5 kept d6 and f6 shut." |
| formationChoice | pawnJudgement.ts:430 | ≥ 50 | "Of the pawn moves, c3 was the one: it makes a chain …, and yours links no pawns." |
| missedDefendsBoth | practicalReads.ts:95 | ≥ 100 | "Your knight and bishop were both loose, and one move guarded them together — Qe2 covered both." |
| queenTradeRead (early) | practicalReads.ts:331 | ≥ 100, 1–2 pawns up | "Only a pawn or two up, the queen trade is no shortcut — it cost you here…" |
**CREDIT reads (fire only when the move was sound)** — Review/chat only under this WO: enPassantStructure (kept, ≤30), fixOnBishopColour, breakTradesWeakPawn (≤40), dontRepair (≤30), semiOutpost (≤30), safeSquareRoute (≤20), formation, pawnFreeze (<50), wedgePaysLater (<50), closedTacticalChance (<50), rooksOnSeventh / kingToCentre / pawnForDevelopment / givePawnBack / defendsBoth / mateThreatWinsMore (< SOUND_CP 50), queenTradeRead (ahead ≥3).
- **B1** `StructureRead` {act, text, squares, proof, key, stakes (costStakes on the mistake reads), held?, heldForm?}.
- **B2 dropped**: rightIdeaWrongPiece's `dropped` (the piece the wrong piece abandoned) survives only as text; planOverOneMove's `gained` squares; dontPlugFile's file; fileOpenedForDefender's rook square — all text-only.
- **B3 cheap**: none needed for the mistake reads — they carry move, better move and why already.
- **B4 gates**: per row above; plus `standing` drops a read the reply made false.

### C. Sentence readiness (the mistake reads)
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | text ("right square, wrong piece"; "a one-move idea vs the plan") | the general clause in its own slot, so the recipe can order lesson → consequence → BM |
| CONSEQUENCE | partly | dropped / gained | — |
| BETTER MOVE + JOB | yes | bestSan + why (held in Learn by `heldForm` — but Learn after the move may name it, carve-out 3) | — |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SM1 | right idea, wrong piece | S | rightIdeaWrongPiece fires | to, best piece, dropped | "The right square can still be the wrong move: ask which piece belongs there." | "Your knight on f3 was guarding e5." (dropped) | "Nbd2 put the other knight there." | "Before a piece moves, ask what it is guarding." | after (BM named — it's past) | | H |
| SM2 | route, not plan | S | keepPlanChangeRoute | | "When a route fails, keep the plan and change the road." | | "…through c4 instead." | | after | | H |
| SM3 | one-move idea | S | planOverOneMove | gained | "A check that gains nothing is a one-move idea; the quiet move that takes the centre is the plan." | | best + gained | "Before a check, ask what it wins." | after | | H |
| SM4 | plugged file | S | dontPlugFile | file | "Don't put a piece in front of your own rook's open file." | | best | | after | | H |
| SM5 | file for the defender | S | fileOpenedForDefender | | "A pawn exchange opens a file, and the side whose rook gets there first owns it: here it's theirs." | | best | | after | | H |
| SM6 | en passant clamp | S | enPassant took | | "Don't release a clamp: your pawn kept d6 and f6 shut." | | best | | after | | H |
| SM7 | formation choice | S | formationChoice | | "Pawns are strongest linked: a chain or a pair beats a pawn on its own." | | best | | after | | H |
| SM8 | two loose, one move | S | missedDefendsBoth | | "When two things are hit, look for the one square that defends them both." | | cover.san | (existing) "look for the square that defends them at once before you move either" | after | | H |
| SM9 | queen trade a pawn up | S | queenTradeRead early | | "A piece up, trade queens freely; with a pawn or two, keep them on unless the trade wins the pawn ending." | | best | | after | | H |
| SM10 | credits | S | credit reads | | (existing) | | | | Review/chat only | | H |
| SM11 | record | — | each read's tag (`held` where present) RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |
- Not applying: O seat — the composite is the student's move only (`theirMoveStructure` is the O side, outside this card's list).

### E. Mistake link
- SM1: `whyItFailed` `abandoned-defender` when `dropped`; else `misplaced-piece`. SM2/SM3: `no-plan` / `missed-tactic`. SM4: `passive-rook`. SM5: concession `file-opened`. SM6/SM7: `pawn-weakened` / `space-conceded`. SM8: `missed-opponents-threat` / costReason `allowed`. SM9: `no-plan` (endgame conversion).

### F. Build changes
1. Split each mistake read's text into typed `lesson` / `consequence` / `better` / `habit` parts (the recipe composes them in the WO order); the credit reads stay whole for Review.
2. `structureReads.ts:113-115` — Learn currently speaks `heldForm` (hides the better move) even AFTER the move; under carve-out 3 the better move is nameable once past (`pastBetterNameable`): pass that flag instead of `namesBetterMove: false`.
3. Route the 9 mistake reads into `mistakeLesson` by their cause (§E); the 14 credit reads leave Learn.
4. Investigate same-idea 166: the reads are subsumed by another producer of the same claim — make the recipe table the one place the claim is worded.

### G. Proof boards
- Census (lesson): `vc-_WmByfLW-3g-9` formation "Your d- and e-pawns stand side by side…" (credit); `vc-_zT8aWZh2x0-48` chain base to look after (credit); `vc--9fPYlSEkJ0-26` safeSquareRoute (credit). Mistake reads: find in the build on David's 12 games (none surfaced in the first dump rows).

### H. Open questions
1. Do any credit reads stay in Learn (e.g. defendsBoth "One move covers both")? Under "mistakes only" — no.
