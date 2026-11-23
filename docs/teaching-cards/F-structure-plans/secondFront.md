# Card — `secondFront` (family F)

### A. Identity
- `secondFront(fen, lines, student)` — `src/services/secondFront.ts:55-94`; `leverOn` :29, `FAR` :24. Reads the engine's best line.
- Adapter `boardComputers.ts:7656-7672`, kind `judgement`; `namesStudentMove: r.side === student`. **weaknesses: wired** (`moveInsight` `planPosed`, no-plan).
- Census: 16 / 6 said; already-said 10.

### B. Facts
- **B1** `SecondFront` :22: `side`, `wing` (the crowded one), `lever` (push square), `target`, `text`, `squares`.
- **B2 dropped**: `top` score (:62); piece counts `onCrowded/pieces.length` (:69); `switches` move (which piece crosses, :79) — the plan's first step, dropped.
- **B3 cheap**: whether the student's played move went the wrong way (another move into the crowded wing with no capture there) — the mistake trigger; the enemy's defenders on the second front.
- **B4 gates**: |best| ≥ 50 (:62); side has ≥3 pieces, ≥¾ on one wing (:66-69); the other king on that wing's far files (:72); a lever on the other wing's own files within 1–2 clear pushes (:75); no capture on the crowded wing in 8 moves, and a switch (:77-80).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | wing, lever, target | — ("they can't hold both wings") |
| CONSEQUENCE | partly | target | the follow-up of the lever |
| BETTER MOVE + JOB | partly | lever (engine) | only after the student's move |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF1 | strategize — S kept pushing the closed wing | S | fires on fenBefore for S; S's move stayed on the crowded wing, cost ≥ inaccuracy | wing, lever, target | "When you can't break through on one wing, open a second front: a defender who holds one wing can't hold both." / "Two weaknesses beat one: with no way in on the kingside, the play was on the queenside." | — | "b4 was the second front: it hits their pawn on a3." (after) | "When an attack stalls, ask where else they're weak." | after | S's move is the lever or a switch | C (B3) |
| SF2 | prevent — O's second front | O | side = O, S's move ignored it | | "When their pieces are stuck on one wing, the danger is the other one: their b4 hits your pawn on c5." | | | | after S's mistake | | H |
| SF3 | knowledge — principle of two weaknesses | either | | | "The principle of two weaknesses: make a second weakness, and the defender runs out of pieces." | | | | Review/chat | | H |
| SF4 | record | — | no-plan RED/GREY full; AMBER "The play was on the other wing."; GREEN silent | | | | | | | | |

### E. Mistake link
- SF1: `positionalReason` `no-plan` with best = the lever / a switch. Seat S. SF2: S's move allowed O's front (costReason `allowed` positional — no named cause today).

### F. Build changes
1. Expose `switchMove` (the crossing piece, :79) and `evalForSide`.
2. `mistakeLesson`: `no-plan` + secondFront on fenBefore → SF1.

### G. Proof boards
- Census lines only (review/lesson, no board id): "Your pieces are all on the kingside … b4 goes at their pawn on a3". Board to locate in the build.

### H. Open questions
- none.
