# geometryReads — card

## A. Identity
- `geometryReads(ctx)` — `src/services/tacticGeometry.ts:743-757`, runs 13 readers in order: `pinnerIsPinned` :173, `falseMateBlock` :217, `interferenceCut` :254, `clearanceTempo` :297, `decoyDeflection` :341, `discoveryAudit` :390, `zwischenzugRefuted` :435, `forkForPlan` :477, `kickFails` :518, `counterfactualFork` :587, `pawnBlockGone` :622, `interposeFacing` :667, `loadedLine` :703. Also `geometryMotif` :758 (the classifier's step 1b — dual-use).
- `GeometryContext` :56: `fen`, `me`, `pv` (engine best line), `lastOpponentMove`, `register` live|review, `played` (review).
- Board computer `tacticGeometry` — `src/services/boardComputers.ts:3292-3305`, kind `tactic`, `heldForm` = `idea` (the move-free version), seat always 'student'.
- Census: 90 fired / 72 said (lesson 72, review 18). Dominant line: kickFails ("kicking it with the g-pawn would not have worked: the bishop simply takes it, winning a pawn") and clearanceTempo.

## B. Facts
### B1. Handed over (`GeometryRead`)
`act` (one of 13), `text` (live/review tense), `idea` (move-free habit sentence), `ideaSquares`, `namesMove`, `squares`, `proof`, `stakes`, `motif` (TacticType or null), `claim`.
### B2. Dropped
- Most readers compute the GAIN (`pvGain`) and put it in `stakes` but not in words (interference, clearance, decoy).
- `kickFails`: `net` is said ("winning a pawn") but the KICK being the opponent's natural move and the punish move are only in text.
- `discoveryAudit`/`falseMateBlock` (the two that explain the PLAYED move in review) don't state the loss in material, only the geometry.
- Seat: every read is built from the student's seat (studentMoves(ctx)) — the opponent's geometry (their clearance/decoy against the student) is never read.
### B3. Cheap
- Opponent seat: call each reader with `me = them` on the board where they are to move and `pv` = their best line (the saved read after the student's move) → "their decoy on b5 won your queen".
- Words for the gain: `pvGain` already returns pawns → material word.
### B4. Gates
Student to move (all); `register` live vs review splits: live = the engine's move as advice (names the move → held by `namesMove`), review = "would have". Gains: interference ≥ 2, clearance ≥ 1, decoy/deflection ≥ 2 with ≥ 3-ply pv, zwischenzug owed ≥ 3, forkForPlan gain ≤ 0 (plan, not material); kickFails net from the punish. `pinnerIsPinned` live only.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | `idea` (e.g. "One of their pieces is doing a job — make it take something, and the job goes undone.") | idea exists for 8 of 13 readers (interference :285, clearance :328, decoy :372, deflection :380, zwischenzug :468, forkForPlan :507, kickFails :577, pawnBlockGone :656, interposeFacing :691); missing for pinnerIsPinned, falseMateBlock, discoveryAudit, counterfactualFork, loadedLine |
| CONSEQUENCE | partly | `stakes` / text | gain in words |
| BETTER MOVE + JOB | yes (review register) | `text` with `namesMove` ("First b5 was the way: once their bishop took on b5, it no longer guarded …") | must be gated to after the move |
| HABIT | partly | some `idea`s end on a habit ("Before you post a piece, always check that kick.") | spotCue by `motif` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GE-1 | knowledge (deflection) | S missed | act=deflection, errorWhy `missed` with best=pv[0] | r.piece, m2.to | "A piece doing a job can be made to take something, and the job goes undone. Their bishop guarded d7; drawing it to b5 left d7 open." | gain | "b5 was the move — the bait that pulls the bishop off d7." (review text) | spotCue deflection | after, past-only | gain < 2 | H |
| GE-2 | knowledge (decoy) | S missed | act=decoy | — | "A piece that has to take can be lured onto a bad square. Look for the bait first." | gain | review text | spotCue deflection | after | — | H |
| GE-3 | knowledge (interference) | S missed | act=interference | d, g | "A guard that works along a line can be cut: drop a piece on the line between them." | "the knight loses its guard and falls" | review text | spotCue interference | after | gain < 2 | H |
| GE-4 | knowledge (clearance) | S missed | act=clearance | blocker, slider, target | "When your own piece blocks your long piece, move it with a threat and the line opens." / "Your bishop on g5 was in your queen's way; moving it with a hit on the queen opened g6." | pin/hangs | review text | spotCue clearance | after | gain < 1 | H |
| GE-5 | prevent (kick refuted) | S's kick lost material | act=kickFails seen from OPPONENT's piece (B3: reader run on their post), or S played the kick | kick, punish | "Before you kick a piece with a pawn, check what it takes on the way out. Kicking the bishop with the g-pawn just hands it the pawn." | net | errorWhy best | "Before every pawn kick, ask what the kicked piece can take." | after | kick not played | C (seat) |
| GE-6 | evaluate (played move failed — discovery) | S played the kick | act=discovery-audit (review, played) | n, back, front, exit | "A pawn kick that hits a piece in front of their long piece opens that line. Your c3 kicked the knight off the bishop's diagonal onto your queen." | material lost (B2) | errorWhy best | "Before you kick a piece, check every square it can land on." | after | — | H |
| GE-7 | evaluate (check isn't mate) | S played a check | act=false-mate-block | m.to, slider, escapes | "A checking piece can block your own cover. Your knight check landed between your rook and e7, and the king walked out there." | | errorWhy best | spotCue mate | after | — | H |
| GE-8 | calculate (zwischenzug refuted) | S's move gave back material to their in-between check | act=zwischenzug-refuted on fenBefore, S played other | owedAt | "Their in-between check looks scary — follow it one move further before you give anything back. The king step kept your knight." | owed | review text (king step) | spotCue zwischenzug | after | — | H |
| GE-9 | strategize (fork for a plan) | S missed | act=fork-for-plan | loosened | "A double attack that wins nothing can still loosen something. After their answer, the pawn on d5 has no guard." | | review text | | Review | gain > 0 (→ material card) | H |
| GE-10 | knowledge (pawn can't block) | both | act=pawn-block-gone | i, passed | "A pawn that has passed a square can never come back to block a check there." | | | | Review | — | H |
| GE-11 | knowledge (loaded line) | O seat | act=loaded-line, their pawn loaded | p, s | "A pawn alone in front of their long piece is loaded: when it moves, the piece behind gives check." | "it moves with tempo" | | spotCue discovered-check | after S's mistake that allowed it | — | H |
| GE-12 | knowledge (interpose) | both | act=interpose | — | "Two long pieces facing each other: a piece stepped in between changes who controls the line." | | | | Review | — | H |
| GE-13 | identify (pinner pinned) | S | act=pinner-pinned (live) | — | "Their bishop can't pin you from c5 — it's pinned to its own king." | | | | Review/chat (live only, not a mistake turn) | — | H |
| GE-14 | knowledge (counterfactual fork) | S | act=counterfactual-fork | — | "Keep the knight check in mind: if their queen ever lands on e4, it forks." | | | | Review/chat only | — | H |
| GE-OPP | their plan (any act, O seat) | O | B3 reader with me=O | | "Their quiet move set up an interference you could have stopped." | | errorWhy best | | after S's mistake | — | C |
| GE-REC | record | — | motif tag | | RED/GREY full; AMBER the `idea` alone; GREEN silent | | | | | | holdRate |
n/a: phase (any; pawnBlockGone opening-heavy, no rule computed).

## E. Mistake link
- costReason `missed` (S) whose best line is one of these geometries → GE-1/2/3/4/8/9 supply LESSON (`idea`) + BETTER-MOVE (review text). This is the main BETTER-MOVE+JOB source for line motifs detectTacticType names via `geometryMotif` (step 1b) — same reader, so the record and the lesson agree.
- S's played move failed: discoveryAudit (GE-6), falseMateBlock (GE-7), kick (GE-5).
- costReason `allowed` with O's geometry → GE-OPP (needs B3).

## F. Build changes
1. tacticGeometry.ts — add `idea` (move-free lesson) to the 5 readers that lack it: pinnerIsPinned :173, falseMateBlock :217, discoveryAudit :390, counterfactualFork :587, loadedLine :703 (pawnBlockGone already has one, :656).
2. Add `gain` in words to `GeometryRead` (from `stakes.points` via the one material-word helper).
3. Opponent seat: `geometryReads({ ...ctx, me: them, fen: boardTheyMoveFrom, pv: theirBestLine })` — readers only check `studentMoves(ctx)` against `ctx.me`, so a seat flip is a call-site change (boardComputers.ts:3292-3305 passes the student seat) → GE-OPP.
4. Recipe table: key `geometry:<act>`; LESSON = `idea`, BETTER-MOVE = review-register text (gated by `pastBetterNameable`); kill the live-register text in Learn (names the move before it's played).
5. kickFails as a STUDENT mistake: today it reads the opponent's kick on the student's post; add the reverse read on the student's own played pawn kick (`ctx.played` in review).

## G. Proof boards
- Text (lines-0, lesson/review): "After the bishop taking on f4, kicking it with the g-pawn would not have worked: the bishop simply takes it, winning a pawn." (GE-5 shape); "Your bishop on g5 was in your queen's way. It could have left with tempo: the bishop to e3, hitting their queen, opening the queen's line onto their pawn on g6, pinning it to their king." (GE-4).
- No voiced-board fires extracted for this computer in boards-?.jsonl (run boards.mjs with geometryReads if needed).

## H. Open questions
1. GE-13/GE-14 (live-only reads, no mistake attached): delete from Learn entirely under mistakes-only, keep for chat?
