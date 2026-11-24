# Card — `planChoice` (family F)

### A. Identity
- `planChoice(fen, lines, studentColor, lastMove)` — `src/services/planChooser.ts:32-97`; `PLAN_CHOICE_FROM_MOVE = 10` :15, `SHARP_PLAN_GAP_CP = 150` :18; plans read by `planFromUci` + `aimsOf` (planArc), `aimWalkableNow`.
- Adapter `boardComputers.ts:5149-5160`, kind `plan-arc`, surfaces **learn: LEARN_BUNDLE**, lesson; review/chat/think not. Census: 33 / 15 said (lesson). Map: "two plans level: pick one you understand".

### B. Facts
- **B1** `{ text, key }` only.
- **B2 dropped**: `gap` (:47), `p0`/`p1` plans (:66-67) and `a0`/`a1` aims (`id`, `kind`, `phrase`, `route`) (:77-78) — the two plans as data; `earned` (searched depth, :89).
- **B3 cheap**: did the student's PLAYED move start `a1` (the weaker plan) when gap ≥ 80? → "you chose the weaker plan" with the cost = gap. Compare the played UCI with `l1.moves[0]` (and with p1's first step).
- **B4 gates**: move ≥ 10 (:40); two lines, no mate (:42); gap < 150 and best not a capture/check (:53); gap ≤ 30 (level) or ≥ 80 (stronger) — 31..79 silent (:55); no `convert` plan (:65); both aims sayable now, different aims (:76-79).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "choose the one you understand" (level) / "the stronger is …" | before-move only; typed plans |
| CONSEQUENCE | partly | "falls short by N" | — |
| BETTER MOVE + JOB | partly | a0 phrase | after the move |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PCh1 | strategize — the weaker plan chosen | S | gap ≥ 80, S's move = l1's first move (B3) | a0, a1, gap | "When two plans are on offer, compare them before you commit: the d-file was the stronger plan here, and the knight to e5 falls short." / "A plan can be playable and still second best." | what the stronger plan wins (its aim's target) — the cost words (`costWords(gap)`) only beside a board reason, never alone | a0 phrase past tense | "Before you commit to a plan, name the other one and compare." | after | gap from a short search (`searchedShort`) → no number | C (B3) |
| PCh2 | level plans | S | gap ≤ 30 | | "Two plans hold: choose the one you understand and play it with purpose." | | | | Review/chat only (not a mistake) | | H |
| PCh3 | record | — | `no-plan` RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): PCh1 → **E15 positional** `no-plan` (silent in E15 today, errorWhy H3 — this card is one answer to it: the weaker of two plans) or `misplaced-piece` when the weaker plan is a piece route; PCh2 Review/chat.
- PCh1: `positionalReason` `no-plan` when the played move starts the weaker plan; the cost is the gap. Seat S.

### F. Build changes
1. Return `{ gap, stronger: Aim, weaker: Aim, earned }` beside the text.
2. `planChoseWeaker(choice, fenBefore, playedSan)` — enables PCh1.
3. Learn: the before-move "Two plans hold here…" leaves Learn (LEARN_BUNDLE); PCh1 after the move.

### G. Proof boards
- `vc-_Y-iXy9b4Ew-25` (`r2q1r2/pp2ppbk/2npbnpp/8/4P3/P1NBBN1P/1P1Q1PP1/2R2RK1 b`) "Two plans hold here — the d-file, or getting the knight to e5…".
- Guard: gap 31-79 (silent), fullmove < 10.

### H. Open questions
1. PCh1 between 80 and 99 cp is an inaccuracy — speak it?
