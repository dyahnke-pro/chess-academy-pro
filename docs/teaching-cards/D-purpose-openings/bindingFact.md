# CARD — `bindingFact` (how the move answers theirs)

## A. Identity
`src/services/threeFacts.ts:380` `bindingFact(fenBefore, san, target, ownPointSquare, moverIsStudent)` → `{text, idea: 'guard'|'threat'}`; `binding :375`; `TheirTarget :56` from `theirTarget(...)` (`:~330`). Census 127 offered / 60 said; kinds `binding` 85, `two-jobs` 42; census verdict "S (unclear 'this')".

## B. Facts
- **B1** text ("and this covers it" / "and this goes after the knight doing it" / "so this hits back on the side they're attacking"), `idea`.
- **B2 dropped:** guard counts before/after (`:403`), the attacker's piece, the target's piece type, `TheirTarget.plain` (visibility).
- **B3 cheap — THE MISS:** `theirTarget` exists AND `bindingFact(played) === null` AND the target is the errorWhy cause's lost/attacked square → "they aimed at X and your move did not answer it". This is the single most common learner mistake ("missed-opponents-threat", 15 of David's 109 costly moves tagged so by positionalReason).
- **B4 gates:** capture of the attacker / moving the target → null (`:390`); plain hit guarded → null (`:404`, David's "stating the obvious"); hit-back only if worth ≥ target, same wing (`:420-424`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | — |
| CONSEQUENCE | partly | TheirTarget text ("Their Qf4 is aimed at your knight on g4") | the miss inversion (B3) |
| BETTER MOVE + JOB | yes | on bestSan: guard / threat | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BF1 | identify their threat | S mistake | B3 miss | target, attacker | "Their last move always asks a question. Their queen on f4 was aimed at your knight on g4: answer that before your own plan." / "First ask what their move attacks." | "The knight on g4 falls." (errorWhy) | "Nf6 covered it." / "h6 went after the bishop doing it." (binding on bestSan) | "After every move of theirs, ask: what does it attack?" | same | target = cause target; never on `plain` + GREEN record | C |
| BF2 | strategize (counter) | S mistake | best binding idea = threat (hit back) | | "Sometimes the best defence is a bigger threat on the same side of the board." | | "Qe5 hit back harder." | | same | worth ≥ | H |
| BF3 | both seats | O mistake | their move ignored the student's target | | pointer → H1 | | | | held | | C |
| BF4 | record | S | `missed-opponents-threat` RED/GREY full; GREEN: silent even on miss (counts) | | | | | | | | H |

## E. Mistake link
`allowed-capture` / `left-hanging` / `allowed-threat` whenever the lost piece was already attacked by their last move (BF1); positional tag `missed-opponents-threat`.

## F. Build changes
1. `bindingFact` — expose `{guardsBefore, guardsAfter, attacker: {square, piece}}`.
2. Add `missedAnswer(fenBefore, playedSan, theirLast)` → `TheirTarget | null` (B3) as an input to errorWhy's cause (`cause.unanswered`).
3. Delete the "and this covers it" renderer from Learn (the unclear "this" line; good-move).

## G. Proof boards
- Census: "Their Qf4 is aimed at your knight on g4, and this goes after the queen doing it." (`boards-0.jsonl:2828`, vc-26ZXZEiudhA-43); "Their Ke3 is aimed at your knight on e4, and this covers it." (`lines-2.jsonl:7284`).
- BF1 candidate: chesscom-1001055178 ply 4 …Bg4 → Ne5 attacks the bishop (errorWhy allowed-reply) — check whether their previous move had a target; build test must search David's 109 for `theirTarget` == errorWhy lostSquare.

## H. Open questions
1. BF1 is the classic beginner lesson — should it speak at AMBER too (one clause) given how often it recurs?
