# detectLatentFork — card

## A. Identity
- `detectLatentFork(fen, forker)` — `src/services/latentFork.ts:158-247`; clause `latentForkClause` :256-270.
- Board computer `latentFork` — `src/services/boardComputers.ts:2886-2908`, kind `latent-chance`, skill `missed-your-fork` / `missed-their-fork`, surfaces `LIVE_READ` (Learn + chat), weaknesses wired via `moveInsight.ts`.
- Also called by `whyItFailed` (`abandoned-square`, whyItFailed.ts:345-380) — the ONE mistake path that reads it.
- Census: 55 fired / 47 said (learn 18, chat 37); 19 voiced boards.

## B. Facts
### B1. Handed over (`LatentFork`, :75)
`square` (fork square), `from` (knight now), `moves` (exactly 2 — `MAX_TEMPO`), `targets[]` (square+piece, richest first), `forker`, `via` (safe first hop).
### B2. Dropped
- `via` is computed and deliberately withheld from words (boardComputers.ts:2898 "the route is withheld"; latentFork.ts:271-274) — fine for before-move, but AFTER a miss the route is the lesson.
- `landingIsSafe` verdict on the fork square (:218) — the reason it is a real fork (nothing cheap guards the square) is not said.
- Which target is the one actually lost (richest non-king — `targets` sorted :227) is not named as the loss.
### B3. Cheap
- The prevention move: for the opponent's fork, the student's legal moves that cover `square` or `via` (chess.js `attackers` after each move) → BETTER-MOVE job "it covered c2".
- Whether the student's last move CREATED it: run on fenBefore (whyItFailed already does this for guards, :355-370) → caused vs pre-existing.
- Whether the opponent's last move started the route (their move's `to` === `via`).
### B4. Gates
- Exactly 2 quiet moves (:67 `MAX_TEMPO = 2`, :214); knight must be able to move (:180); ≥2 targets worth more than a knight or king (:188, :203-205); empty landing square (:192); landing safe (:218); safe waypoint (:225).
- Board computer: student's own fork first, else opponent's (boardComputers.ts:2892).
- Known defect: plural wording "their both rooks" (census lines-0) — `names` builder :262 emits "both rooks" and :271/:274 prefix it with "their"/"your" ("their both rooks").

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | square, targets | rule ("a knight two hops away is a fork you can still stop"); today a before-move alert |
| CONSEQUENCE | partly | targets[0..] | "the rook goes" — which piece falls |
| BETTER MOVE + JOB | no | — | B3 prevention move; whyItFailed abandoned-square gives "your bishop was guarding e3" |
| HABIT | no | — | spotCue fork `knight` / `family` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LF-1 | prevent | O fork, S just moved | forker=O, caused by S's move (B3 fenBefore has no fork or a different square) | square, targets, via | "A knight fork is visible two moves early: look where their knight can land, not where it is. Their knight on b4 can reach c2 through a3 and hit your king and rook." / "Knight forks are stopped before the jump. Their knight is two hops from c2, where your king and rook both stand." | "Once it lands, the rook on a1 is lost." | "Your bishop on d2 kept c2 covered — it should have stayed." (whyItFailed abandoned-square line) or "Qd1 was the move — it guarded c2." (B3) | spotCue fork `knight` (theirs) | after S's move, only on a mistake turn (cost from errorWhy) | not caused by S's move; fork square guarded after reply; moves≠2 | H + C |
| LF-2 | recognize (theirs, pre-existing) | O | forker=O, existed before S's move, S's move ignored it and errorWhy cost ≥ mistake | same | "A threat you leave on the board stays: the knight route to c2 was there before your move and still is." | | best move covering square | spotCue | after | errorWhy `causedByTheMove` false → say only if S's move failed to stop it AND cost | C |
| LF-3 | own plan (missed) | S | forker=S, S's move did not start route and cost ≥ inaccuracy (missed-your-fork) | from, via, square | "A fork two moves away is a plan: count the hops. Your knight on d4 reaches c7 in two, through b5, hitting king and rook." | "They'd have had one move to answer, and only one target can be saved." | "Nb5 was the move — first hop to c7." (Learn: only once past — via is no longer the student's to find? → held unless `pastBetterNameable`) | spotCue fork `family` | Review full; Learn after the move: "A fork two moves away is a plan: your knight has one waiting on c7, hitting king and rook." — `via` (b5) and the first hop are HELD while the fork is still playable (they are the student's next move); named only when `pastBetterNameable` | fork no longer available after reply | H (via) |
| LF-4 | their plan (read their move) | O | O's last move === via | via, square | "When their knight takes a strange square, ask where it jumps next. From a3 it eyes c2." | | | | Review only (not a mistake turn by itself) | — | C |
| LF-5 | knowledge (geometry) | both | targets include K+R or Q+R | targets | "A knight attacks pieces that can't attack it back — king, queen, rook all sit one knight-jump from c2." | | | spotCue fork `royal` | | — | H |
| LF-6 | calculate | both | moves=2 | moves | "Two knight moves, one reply in between: they get one move to stop it." | | | | | — | H |
| LF-7 | exception | O | fork square covered by a pawn after their natural reply | — | silent (gate) | | | | | landingIsSafe false | H |
| LF-8 | strategize (remove the forker) | O fork, S just moved | forker=O and S could capture `from` on the board before S's move (`before.attackers(from, student)` non-empty, SEE ≥ 0) | from | "The cheapest way to stop a fork is to remove the forker: their knight on b4 was the only piece that could reach c2." | | "Bxb4 was the move — it took the knight before it could jump." (Review; Learn once past) | "When their knight has a fork two hops away, ask if you can just take the knight." | after S's move | capture loses material (SEE < 0) | C (chess.js attackers + SEE `capturesWinMaterial`) |
| LF-REC | record | — | `missed-their-fork` / `missed-your-fork` hold rate | | RED/GREY full; AMBER "Watch c2 — their knight is two hops away."; GREEN silent | | | | | | holdRate |
n/a: phase — knights fork in every phase, no phase-specific rule computed (endgame stability gate is OWED, :24-27). Combination: with `whyItFailed` abandoned-square (LF-1 better move). Counterfactual = LF-1 (with the bishop on d2 the same reply forks nothing, whyItFailed.ts:360).

## E. Mistake link
- whyItFailed `abandoned-square` (the one producer today) → LF-1, seat O.
- whyItFailed declared `walks-into-fork` (never produced — see whyItFailed card) → LF-1/LF-2.
- costReason `allowed` motif fork (detectTacticType) when the line's fork lands 2+ moves on → LF-2.
- costReason `missed` motif fork → LF-3 seat S.

## F. Build changes
1. latentFork.ts:262 — fix the plural: emit "both their rooks" (owner before quantifier) — or drop the sentence (recipe owns words).
2. latentFork.ts:247 — add `caused` helper `latentForkCreated(fenBefore, fenAfter, forker)` returning the fork only if absent (or different square) on fenBefore → LF-1 condition (pattern already in whyItFailed.ts:355-370; move it to one function both call).
3. Add `preventers(fenAfterMove, fork, student): {san, covers}` (chess.js: each legal student move from the board BEFORE their mistake, does `attackers(square|via)` gain a student piece) → LF-1 BETTER-MOVE job word "guarded c2".
4. boardComputers.ts:2893-2904 — stop speaking the before-move clause in Learn (WO: Learn speaks only after a mistake); hand `LatentFork` + caused flag to `mistakeLesson` recipe `fork-coming`.
5. Expose `via` to Review/Learn-after-move (LF-3) through `pastBetterNameable`, never before.

## G. Proof boards
- LF-1/LF-2 (O seat): vc-1rcEbI44WqE-16 `r3kb1r/pppqpppp/1nn5/4Pb2/2PP4/2N1B3/PP4PP/R2QKBNR w KQkq - 5 9` (student White; said "Watch c2 — a knight lands there in 2 and forks your king and rook").
- LF-3 (S seat): vc-_Y-iXy9b4Ew-25 `r2q1r2/pp2ppbk/2npbnpp/8/4P3/P1NBBN1P/1P1Q1PP1/2R2RK1 b - - 0 13` (b3 fork of queen+rook); vc--4hTQEnwa7s-40 `2kr4/ppp2pp1/2n5/3p4/P3p1bq/BP2P1b1/R1PP2B1/1N1QR1K1 w - - 1 21` (f3, king+rook).
- Guard: the Caro starting-position case (:12-14) — moves ≥ 3 → null.

- **Pure-function run (chess.js only, scratch vitest, deleted after):** `detectLatentFork(after vc-1rcEbI44WqE-16, 'black')` → `{square:c2, from:c6, moves:2, targets:[k e1, r a1], via:b4}` (LF-1 board, matches the said line); `detectLatentFork(after vc-_Y-iXy9b4Ew-25, 'black')` → `{square:b3, from:c6, targets:[q d2, r c1], via:a5}` (LF-3).

## H. Open questions
1. LF-2: when the fork was already on the board before the student's move, does Learn say it on the student's (unrelated) mistake turn, or only if the student's move was the one that failed to stop it?
2. LF-3: a missed own fork two moves away usually costs < a mistake — is "missed a two-move fork plan" a Learn mistake turn at all, or Review only?
