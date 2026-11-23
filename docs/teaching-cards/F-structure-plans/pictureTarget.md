# Card — `pictureTarget` (family F)

### A. Identity
- `pictureTarget(facts, fen, lines, attacker)` — `src/services/pictureLedger.ts:1027`; `targetOf` :516 (the target now: attackers > defenders within two moves, a pawn/hole/fixed piece), `planTargetOf` :679 (a race won in 3–4 moves, `PLAN_MOVES = 4` :531, `raceOf` :639), `candidateOf` :496, `vulnerability` :509.
- Adapter `boardComputers.ts:8071-8108`, kind `priority`; skill `missed-weak-target` (best move goes at the target) or `missed-plan-route`; record **wired** (moveInsight). Census: 228 / 110 said.

### B. Facts
- **B1** `Target` {attacker, best, runnerUp, candidates: TargetCandidate {entry, attackers, levers, defenders, fixed}}; `PlanTarget` {best: PlanRace {won, horizon, attackers, defenders, decisive, attackerReach, defenderReach}, races}.
- **B2 dropped**: the WHY of the weakness (`entry.traits`: isolated/backward/doubled/no-pawn-guard…) is in the entry but the text says only the counts; `decisive.route` used only for squares.
- **B3 cheap**: did the student's played move go at the target (`moveAnswersTarget`) — the mistake is the student to move NOT doing it (the record already asks it: `asksTarget`), and the cost from the saved read.
- **B4 gates**: target: attackers > defenders, not the king, a pawn/hole/fixed piece (:524); plan target: race won at horizon 3–4 (:680).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | counts ("six of your pieces and pawns can get at it, only three can guard it") | the rule ("Count before you attack…") and the weakness kind |
| CONSEQUENCE | yes | counts → it falls | — |
| BETTER MOVE + JOB | partly | the best move going at it | — |
| HABIT | yes (skill wired) | missed-weak-target / missed-plan-route | stem |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TG1 | calculate — missed target | S | S to move, target now exists, best move answers it, S's move doesn't, cost ≥ inaccuracy | target, counts, traits | "Count before you attack: you need more attackers than they have defenders — and on c5 you had six against three." / "A weak pawn is won by counting: c5 had three guards and you had six pieces for it." | "Now they add a guard and it holds." | "Qa4 went at it." (best, past) | "Every quiet move, ask: which of their weak spots can I outnumber?" | after | target is a piece with a safe square (:520) | H + C |
| TG2 | missed plan route | S | plan target race won, best works on it, S didn't | decisive piece, horizon | "A target three moves away is still a target: bring the rook to c1 and c5 falls." | | best | | after | | H |
| TG3 | prevent — their target | O | targetOf for O after S's move (S's weakness outnumbered) and S's move created/ignored it | | "Your pawn on d4 is outnumbered: they have five pieces for it, you have four guards." | | best | "After every move, count your weak pawn's guards." | after | | C |
| TG4 | knowledge — runner-up | either | runnerUp exists | | "The target is the weakest point, not the first one you see: d4, not e4." | | | | as LESSON clause | | H |
| TG5 | record | — | skill RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- TG1/TG2: the record's own skills `missed-weak-target` / `missed-plan-route` (filed by the adapter) — positionalReason `no-plan` / `misplaced-piece` for the cost. TG3: S's weakness → `created-pawn-weakness` / costReason `allowed`.

### F. Build changes
1. Expose `entry.traits` in the recipe (weakness kind → LESSON variant).
2. `mistakeLesson`: skill `missed-weak-target` → TG1, `missed-plan-route` → TG2.
3. The standing "The target is …" before the move leaves Learn (before-move pointer); TG1 after.

### G. Proof boards
- `vc-_X7t6o3o6JM-14` (`rnbq1rk1/pp2ppb1/5np1/2pp3p/3P1B1P/2N1PN2/PPPQ1PP1/R3KB1R w KQ -`) c5 six vs three; `vc-_zT8aWZh2x0-12` d4 not e4 (TG4); `vc--Y5bZoD6TM0-28` h5 five vs two.
- Guard: a piece with a safe square.

### H. Open questions
- none.
