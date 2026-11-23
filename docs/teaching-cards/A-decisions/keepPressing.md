# keepPressing — when they're on the ropes, keep forcing

## A. Identity
- `safetyHabits.ts:97` `keepPressing(fenBefore, san, bestSan, cpLoss, cpAfter)`; registry `keepPressing` `boardComputers.ts:4965-4976`, kind `rule`, claim `method:keep-pressing`, seat `student`. Learn call `learnBoardTeaching.ts:264`. Census 1/1 (review).

## B. Facts
- B1: fixed string "When they are on the ropes, keep asking questions — a check or a capture first, so they never get a free move to untangle." (:103).
- B2 dropped: `bestSan` and that it was forcing (:99-101); `cpAfter` (still ≥ 300 = still winning); `cpLoss`.
- B3 cheap: what the forcing best move hit (chess.js: captured piece / checked king); what their "free move" did — the reply after the played move (next game move or after-fan[0]) — did it defend, trade, or create a threat (`detectNewThreat`); the gap in bands (`evalBand` before vs after: decisive → clearly).
- B4: `cpAfter >= 300` (:96), `cpLoss >= 100` (AUTOPILOT_CP :25), best is forcing (`x` or `+#`), played is not.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | the fixed rule | no example from this board |
| CONSEQUENCE | no | — | what the free move gave them (B3) |
| BETTER MOVE + JOB | no | bestSan dropped | name + what it forced |
| HABIT | partly | "keep asking questions" | is the lesson and habit at once |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KP1 | strategize (initiative) | S | gate passes | best kind | "When you're winning and they're on the ropes, a quiet move gives them the one thing they need: time." | "Their reply {reply} untangled {what}" (B3) | "{best} kept forcing: it {hits the X / gave check}." | "Checks and captures first while they're tied up." | after move, best named (past) | still winning after (≥300) — it is a lesson about a lead, not a blunder | C |
| KP2 | evaluate | S | band dropped (decisive → clearly) | bands | "A winning position stays winning only while you keep the pressure: the edge shrank from {a} to {b}." | — | KP1 | KP1 | | band really changed | C |
| KP3 | their seat | O | opponent was winning and let up | | "They let you off the hook: a quiet move when they had forcing ones. Use the free move." | — | n/a | — | Learn: says the chance exists, holds the move | seat param | C |
| KP4 | record | S | | | RED/GREY full · AMBER "Keep forcing while they're tied up." · GREEN silent | | | | | | H |
| — | prevent, calculate, phase | — | n/a — no line or phase facts in its inputs | | | | | | | | |

## E. Mistake link
- costReason `missed` (the forcing line the move skipped), any motif; also `botched-conversion` fundamental (principleVoice) — same idea: ONE recipe, keyed on the cause "missed forcing line while winning".

## F. Build changes
1. Return typed `{ bestSan, bestKind, cpAfter, cpLoss }` (:97-104).
2. Add B3 reply read (needs `reply` param) for KP1's consequence.
3. Subsume against principle `botched-conversion` and methodBeat `forcing-scan` (same claim) — one claim `forcing-while-winning`.
4. Seat param for KP3.

## G. Proof boards
- g:1018863294#34 S `e5` best `Nxc3` loss 161, `2r1k2r/pp3ppp/2b1p3/q2n4/1b6/P1NQ4/1P1KNPPP/R4B1R b k - 6 17` → KP1.
- g:1015773958#44 S `Rfe8` best `Qc2+` loss 110 → KP1 (check skipped).
- Guard: g:1020632112#69 O `Bd4` loss 2000 fired for the opponent — mate-flattened cost; only an O-seat recipe may use it, and the 2000 is the mate scale, not a pawn count.

## H. Open questions
- none beyond family-wide: inaccuracy vs mistake threshold.
