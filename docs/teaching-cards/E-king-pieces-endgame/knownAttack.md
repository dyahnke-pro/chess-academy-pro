# Card — `knownAttack` (the textbook opposite-castling pawn storm)

## A. Identity
- `src/services/attackLibrary.ts:44` `knownAttack(fen, me, studentCp)`; one entry `opposite-storm`; hook from `moveInsight.pawnHook`. Registry `boardComputers.ts:5971`, kind `attack-pattern`, Learn via `thinkAloud.ts`.
- Census: 20 fired / 10 said, all on Danya boards (held already-said 10). Zero on David's games.

## B. Facts
- **B1** `KnownAttack` (:23): `id`, `text`, `squares [myKing, theirKing, hook, pawn, contact]`, `proof`, `claim`.
- **B2 dropped**: `mw`/`tw` wings (:54); `hook.contact` is said but the number of pushes from `pawn` to `contact` is not counted; the student's OWN shelter on the other wing (not checked — "nothing of yours left behind" is asserted from the wing only).
- **B3 cheap**: `pushes = |rank(contact) − rank(pawn)|`; their mirror storm — `pawnHook(fen, them)` on the student's wing → the race (`planRace.oppositeWingsRace` already owns the count); `pieceSupport` — the student's pieces bearing on `contact` (chess.js attackers).
- **B4 gates**: student not worse (`studentCp < 0` → null, :47); both kings on their back rank on opposite wings (:53-55); student's queen on (:57); a hook exists (:58) within one file of their king (:62); the storm pawn is the student's (:64).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "kings on opposite wings, a hook on g6… the pawn storm simply works" — a named pattern with its conditions | the WHY of the rule (your own king isn't behind those pawns) said as the rule |
| CONSEQUENCE | partly | "the pawn from f3 reaches f5" | what contact opens (the file onto their king) |
| BETTER MOVE + JOB | no | — | errorWhy's best move when it is the storm pawn push |
| HABIT | no | — | record (attack/plan skill) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KA1 | KNOW / STRAT (missed storm) | S | knownAttack true on fenBefore, student's move slow (costReason missed / positional cost) and best move is the storm pawn | hook, pawn | "With the kings on opposite wings, push the pawns at their king: your own king isn't behind them, so the storm costs you nothing." / "A pawn of theirs on {hook} is a hook — your pawns grab it and open the file." | "When {pawn} reaches {contact}, the file in front of their king opens." | "{best} started the storm." (once past) | "With opposite castling, ask every move: is my storm faster than theirs?" | "With kings on opposite wings, the storm was the plan — their pawn on {hook} is the hook it grabs." (past tense; said only when `pastBetterNameable` is true, else it points at the student's next push → silent) | studentCp < 0; same-wing kings; the storm push still playable and best (pointer) | H; C pushes |
| KA2 | PREV (their storm) | S defender | `pawnHook(fen, them)` — their mirror; student's move slow | their hook | "When they storm your king, every tempo counts: answer with your own storm or close the file before their pawns arrive." | "Their pawn reaches {contact} first." | "{best} was the faster plan." | KA1 | "When they storm your king, a pawn in your shelter on {hook} is the hook their pawns grab." | the student's answer move is never named | C mirror |
| KA3 | CALC (race) | both | both hooks | — | handled by planRace (`oppositeWingsRace`) — the count | | | | | | |
| KA4 | exception | — | own king on the storm wing | — | silent by gate (:53-55): "Don't storm with the pawns in front of your own king." (chat) | | | | | | |
| KA5 | phase | — | queens off | — | silent (gate :57) | | | | | | |
| — | record | — | RED/GREY full · AMBER "Opposite wings — storm the hook." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `costReason` missed / `positionalReason` `no-plan` (`bestJobReason` pawn move → `no-plan`/`mistimed-pawn-break`, `positionalReason.ts:213-219`) when the best move is the storm push → KA1.
- Opponent's storm the student ignored → KA2 (cause: allowed, the blow on the opened file).

## F. Build changes
1. `attackLibrary.ts:23` — add `pushes`, `hookFile`, `theirHook` (mirror `pawnHook(fen, them)`) typed fields.
2. Recipes KA1/KA2 → `mistakeLesson.ts` keyed on `positional:no-plan|mistimed-pawn-break` when bestSan is the storm pawn, and `allowed` on the storm's open file.
3. The fixed text (:65-68) stays for chat/lesson; Learn uses the recipe.

## G. Proof boards
- KA1: `vc-2Mys0GRUgM4-19` `rn1q1rk1/p2b1pbp/2Pp1np1/1p2p3/2P1P3/2N1BP2/PP1Q2PP/2KR1BNR b` — hook g6, f3→f5. Repeat `vc-2Mys0GRUgM4-22` (held already-said: say-once guard).
- No board on David's games.

## H. Open questions
- None.
