# whyItFailed — card (the failure mechanism kinds)

## A. Identity
- `whyItFailed({fenBefore, playedSan, studentColor, playedLineUci})` — `src/services/whyItFailed.ts:178-501`; helpers `seeInitiate` :104, `seeGain` :160, `captureNet` :167, `pinnedToMore` :140, `counterWinsBack` :124, `attackedFrom` :71.
- Called ONLY from `inaccuracyCall.ts` (gate `oneErrorComputer.gate`): `errorWhy` :1339 (`failedRaw`, when `caused && allowedMate === null`) and `moveLossMechanism` :1220 (a try's loss, weighedMoves).
- Mover-generic: `studentColor` = the mover's colour, so it explains either seat's mistake.

## B. Facts
### B1. Handed over (`WhyItFailed`, :43-63)
`line` (past-tense sentence), `squares` (target, refuter), `lost` (where material was lost, or null — REQUIRED), `missed?` (the line when the reply didn't take), `kind`:
- `held-by-defender` (two shapes: a capture that loses after recaptures :282-289; an eyed target the guard holds :427-434)
- `lost-the-piece` (moved piece left hanging, costs ≥ piece value − 1) :295-303
- `abandoned-defender` (moving it removed the only guard of another piece) :311-356
- `abandoned-square` (moving it uncovered a knight-fork square their reply reaches) :358-386
- `answered-by-tactic` (target unguarded but their in-between check hits the attacker) :437-461
- **`walks-into-fork` — DECLARED (:62) BUT NEVER RETURNED.** No branch produces it; the mistake-cause enum the WO plan names ("whyItFailed kinds incl. walks-into-fork") has a dead member. A move that lets a reply fork two pieces (not via an abandoned square) has no kind.
### B2. Dropped
- `studentDown` / `proof.ledger` (the settled net, :207-208) — the material in pieces exists as `named` only in prose.
- In `abandoned-defender`: whether other defenders remained (two line variants) — chosen in prose only.
- `pinsTarget` / `realGuards` filters (:403-404) — "a pinned guard doesn't hold" computed, used only as a gate.
- The `gambitFile` exclusion (:274) — "this is a gambit pawn, not a blunder" is a teaching fact silenced.
### B3. Cheap
- `walks-into-fork`: after the played move, the engine's first reply `r` (playedLineUci[0]) lands a fork per `verifyForkOnBoard`/`computePlyFacts(...).tacticLanded === 'fork'`, AND the same reply on the board before the move (sideToMoveAs(fenBefore, them)) does not fork → kind `walks-into-fork`, squares = [r.to, ...targets]. Same shape as `abandoned-square` minus the "your piece guarded the square" condition.
- `ignored-threat` (needed by secondAttacker SA-1, pinPressure PP-1, latentFork LF-2): the loss existed before the move (`causedByTheMove` false) AND the played move did not stop it → today errorWhy says nothing caused; add as a kind.
### B4. Gates
Student to move on fenBefore; playedSan legal; outcome only from the engine line (WO-OUTCOME-01): `lineTakes(sq)`; gambit pawn excluded; lost-the-piece only when the loss ≥ piece value − 1; abandoned-defender: the swap is new, clean (no counter-win back); abandoned-square: the fork exists after the reply only because the guard left; held-by-defender (eyed): non-capture, nothing lost on the line, swap −1..−2, real (unpinned) guard, target not pinned; answered-by-tactic: no guards and a checking reply hitting the attacker. errorWhy drops `held-by-defender` (eyed) when the better move's line wins material (:1344-1350).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | `line` is a CONSEQUENCE sentence (board restatement: "That left your knight on h4 hanging — the bishop on f6 just takes it") | the rule per kind (D) |
| CONSEQUENCE | yes | `line`, `lost` | — |
| BETTER MOVE + JOB | n/a | errorWhy's `should` | — |
| HABIT | no | — | per kind (D) |

## D. Lesson recipes (one per kind — the LESSON + HABIT halves; `line` is the CONSEQUENCE)
| id | kind | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WF-1 | held-by-defender (capture) | S/O | kind & captured | victim, recapturer | "A piece is only free if nothing can take back." / "Before you grab, check every recapture." (+ "The pawn on f7 was guarded by the king.") | `line` | errorWhy `should` | "Before you grab, check every recapture." | after; never "your capture" naming the move → "That capture" | gambit | H |
| WF-2 | held-by-defender (eyed) | S | eyed variant | target, guard | "An attack is only a threat if the trade wins: count what you give for what you take." | `line` | should | "Before you attack a piece, count: attackers, defenders, and what each costs." | after | better line wins material (errorWhy drops it) | H |
| WF-3 | lost-the-piece | S/O | kind | piece, taker | "Before you put a piece on a square, check that the square is safe." | `line` | should | spotCue free-piece `landing-square` | after | — | H |
| WF-4 | abandoned-defender | S/O | kind | moved piece, guarded piece | "Before a piece moves, ask what it is guarding." / "A guard that leaves takes its job with it." | `line` | should | "Before a piece moves, ask what it is guarding." | after | — | H |
| WF-5 | abandoned-square | S/O | kind | guard, fork square, targets | "A piece can guard a square, not just a piece: your bishop on d2 kept the knight off e3." | `line` (fork two moves away) | should | spotCue fork `knight` (theirs) | after | — | H |
| WF-6 | answered-by-tactic | S/O | kind | target, check | "A free piece isn't free if they have a check first: count tempo, not just material." | `line` | should | "Before you grab, look at their checks." | after | — | H |
| WF-7 | walks-into-fork (NEW) | S/O | B3 | reply, targets | "Before you move, check the squares their pieces can jump to: one reply here hit two of yours." | "Only one could be saved." | should | spotCue fork `general` | after | the fork existed before (not caused) | C |
| WF-8 | ignored-threat (NEW) | S | B3 | threat | "A threat doesn't go away by itself: answer it or make a bigger one." | "The knight on d4 fell to the attack you left." | should | "After every move of theirs, ask what it attacks." | after | — | C |
| WF-9 | gambit (silenced today) | S | gambitFile true | — | "Giving a pawn to open their king isn't hanging it — it's a gambit; the question is whether the attack comes." | | | | Review | eval says it fails → still errorWhy cost | B2 |
| WF-REC | record | — | kind → skill (hung-material, missed-opponents-threat, missed-their-fork…) | | RED/GREY full; AMBER one clause (the HABIT alone); GREEN silent | | | | | | holdRate |
n/a: phase/plan/strategize — mechanism computer.

## E. Mistake link
- It is one of the three halves of the ONE error computer (`errorWhy`): kinds WF-1..WF-6 attach to every material mistake turn it explains; WF-7/WF-8 are the gaps the cards in this family found.
- Kind → skill tag for the record (owed mapping): held-by-defender → `hung-material`; lost-the-piece → `hung-material`; abandoned-defender → `hung-material`; abandoned-square → `missed-their-fork`; answered-by-tactic → `missed-opponents-threat`; walks-into-fork → `missed-their-fork`; ignored-threat → `missed-opponents-threat`.

## F. Build changes
1. whyItFailed.ts:62 — either implement `walks-into-fork` (B3, after the abandoned-square block :386) or delete the member; the WO plan names it in `MistakeCause`, so implement.
2. Add kind `ignored-threat`: computed in errorWhy (it owns `causedByTheMove`): the loss was not caused AND the played move did not stop it → recipe WF-8 (consumes secondAttacker/pinPressure/latentFork as the threat's lesson).
3. Return `ledger: {took, gave, netPawns}` and `pinnedGuard` flags typed (B2) instead of prose-only.
4. Export `kind` through errorWhy as part of `MistakeCause` (Phase 2 F1); `line` becomes the CONSEQUENCE field; the recipe adds LESSON + HABIT by kind (D) — no new prose in this file.
5. Gambit: return `{kind: 'gambit'}` instead of `null` (:274) so Review can say WF-9; Learn ignores it unless cost.

## G. Proof boards
- Code comments carry the hand-walk boards: 23.Nh4 oct3g (lost-the-piece guard ≥ piece−1), 13.Bc3 David's Learn game 2026-10-20 (abandoned-square, e3 fork of d1/f1), Smith-Morra 8.Bxf7+ (held-by-defender, `lost` f7), walk 2026-09-30 d6 queen (abandoned-defender newness), Naroditsky a5 (gambit).
- Not run here (needs the saved engine line per move; g-*.jsonl carry reads but mapping ply→line is the tape step).

## H. Open questions
1. WF-9: should a gambit pawn the engine says fails be taught as "a gambit that didn't work" rather than "hanging"? (Behaviour.)
