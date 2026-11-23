# Card — `chainBase` (family F)

### A. Identity
- `chainBase(fenBefore, san, mine)` — `src/services/chainBase.ts:73-132`; `isChainBase` :57 (THE one base definition, also read by `pawnBreak`), `baseOf` :66, `pawnGuards` :48.
- Adapter `boardComputers.ts:6787-6815`, kind `judgement` (FACT_GROUP structure), stakes `{points: gain, plies: 1}` on a hit. Claims join `pressure` (`moveIdeaClaim`) and `loose:<sq>`.
- Surfaces: lesson, learn (via thought), review, play-read, chat, tactics-read, think; weaknesses: not.
- Census: 38 fired / 27 said; not-said: already-said 11.

### B. Facts
- **B1** `ChainBaseRead` :26-36: `act` 'guarded'|'hit', `mine` (mover's seat), `gain` (SEE pawns won on the base after a hit), `loose` (no guard at all), `squares` [piece square, base, held pawns], `key`.
- **B2 dropped**
  - GUARDED branch: `legalSeeGainFor(fenBefore, sq, them)` (:100) — how much the base was LOST BY before the move (the threat the move parried) — dropped; only the boolean gate survives. That number is the CONSEQUENCE of not guarding ("they were winning d4").
  - The enemy attackers on the base (`after.attackers(sq, them)` :99) — WHO was hitting it — dropped.
  - HIT branch: the defender count (`after.attackers(sq, them).length`, :112) is reduced to the boolean `loose`; the number is dropped.
  - `held` tip pawns are kept, but "which pawn falls next" after the base goes (the tip loses its only pawn guard) is not exposed as a consequence field.
- **B3 cheap**
  - The **missed** version (the mistake): on fenBefore, is a base of the mover's chain attacked and lost by the count (`legalSeeGainFor(fenBefore, base, them) ≥ 1`) and the PLAYED move did not guard it? Today only a move that DOES guard fires — the computer never sees the student who walked past. Loop `isChainBase` over the mover's pawns on fenBefore, check SEE after the played move.
  - The **pawn lever** that can attack the base (join `pawnBreak`'s `strikesBase`) for the plan angle.
  - After the base falls: does the tip become isolated/backward (`findWeakPawns` on the board after the SEE line)?
- **B4 gates**: piece move only, no pawn/king/capture (:77); GUARDED: the base is a base and holds a tip (`baseOf` :66 — tip has exactly one pawn guard), piece newly reaches it (:98), enemy attacks it (:99), lost before (`≥1` pawn) and held after (`≤0`) (:100). HIT: newly reaches, gain ≥ 1 after, ≤ 0 before (:109-110).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes (rule half) | act + base + tip ("lose d4 and e5 has no pawn behind it") | the general rule clause "a chain is held from its base" is wordable from `act` alone |
| CONSEQUENCE | partly | `gain`, `loose`, tip | the before-move loss on GUARDED; which pawn falls next |
| BETTER MOVE + JOB | no | — | only the *missed* variant (B3) has a better move: the engine move that guards/hits the base |
| HABIT | no | — | skill tie (e.g. `created-pawn-weakness`/`missed-opponents-threat`) |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CB1 | prevent (missed guard) | S | B3-missed: S base `b` lost by count on fenBefore, still lost after S's move, cost ≥ mistake | b, tip | "A pawn chain is held from its base: d4 holds e5, and nothing else does." / "The base of a chain is the one pawn no pawn guards — d4 was hanging, and e5 leans on it." | "Lose d4 and e5 is next." (tip loses its last pawn guard) | "Be3 kept it, adding the guard d4 needed." (engine best, if it guards b) | "Before every move, check the base of your chains: is it attacked more than it's guarded?" | after the move only | best move not guarding b → drop BM slot | C (B3) |
| CB2 | consequence — their hit landed | O hits S | act=hit, mine=false, gain ≥1, and S's previous move allowed it (cost ≥ mistake) | piece, base, tip, gain | "Attack a pawn chain at its base: their knight on c6 does exactly that to d4." / "Their knight went after the base of your chain — d4 is short of guards, and it holds e5." | `gain`→"d4 falls first, and e5 is weak after it." | the S move that guarded it (Review/after) | CB1 habit | after the move | gain<1 | H + C prev-move cost |
| CB3 | own plan — hit theirs | S | act=hit, mine=true (a good move, not a mistake) | | "Attack a pawn chain at its base: your rook goes after d3, and d3 holds e4." | `gain` | — | — | Review/chat only (good move); Learn only as the BM slot of another mistake | not a mistake turn | H |
| CB4 | knowledge — base vs head | either | act any | | "The base is the weak point of a chain, the head is the strong one: hit the base, not the head." | — | — | — | Review/chat | — | H |
| CB5 | combine — lever | either | B3-lever: a pawn break hits the same base (pawnBreak.strikesBase) | | "Pawns attack chains best: the c5 break hits the base on d4 too, and a pawn can't be chased off." | — | — | — | Review | both name same square | C join |
| CB6 | strategize — "bad bishops defend good pawns" | S | GUARDED by a bishop that `findPieceQuality` calls bad | | "A bad bishop still does a job: guarding the base of your chain." | — | — | — | Review/chat | quality read agrees | C |
| CB7 | record | — | RED/GREY full CB1; AMBER "The base of your chain was loose."; GREEN silent | | | | | | | | |
- Not applying: endgame phase (no special lesson — the same rule; covered by CB1); counterfactual on a good guard (not a mistake).

### E. Mistake link
- CB1: S's move left a lost base → `costReason` kind `allowed` (material: the pawn) — today `whyItFailed`/costReason names the pawn as lost but not *as a chain base*; CB1 is the lesson for that cause when the lost pawn `isChainBase`.
- CB2: the same cause read from the opponent's hitting move (seat O's threat landed).
- CB3-CB6: Review/chat only.

### F. Build changes
1. `chainBase.ts:26-36` — add `lostBefore: number|null` (GUARDED, from :100) and `defenders: number` (HIT, :112) and `attackers: Square[]`.
2. New `missedChainBase(fenBefore, san, mover)` in `chainBase.ts`: the mover's base attacked and lost by SEE on fenBefore and still lost after the played move → `{ base, tip, attackers, gain }`. This is the mistake trigger (CB1). Miss board: any board where a base hangs and the student plays elsewhere (find one in the 12 games during the build — none proven here). Guard: base defended by a pawn (isChainBase false).
3. A `MistakeCause` refinement: costReason `allowed` + lost pawn `isChainBase` → recipe CB1 (in `mistakeLesson`).
4. Keep the computer's prose as Review/chat fallback; Learn words come from the recipe table.

### G. Proof boards
- GUARDED fires: `vc-1rcEbI44WqE-13` (`r1bqkb1r/ppp1pppp/1nn5/4P3/2PP4/4B3/PP4PP/RN1QKBNR b`) "Your dark-squared bishop covers d4 … only pawn holding e5"; `vc-_4xbS0Crtic-22` (queen covers h6, holds g5).
- HIT fires: `vc-1rcEbI44WqE-12` (their Nc6 hits d4, short of guards — the CB2 board, seat O); `vc-1Rejj6niwvo-18` (Nd4 after c2, nothing guards it).
- Guard: a base also guarded by a pawn (isChainBase false); a capture move (:77).
- No pure run made (census rows suffice).

### H. Open questions
1. Is the GUARDED good move ever a Learn line (it's not a mistake)? Plan says no — confirm Review/chat only.
