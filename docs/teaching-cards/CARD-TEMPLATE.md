# Card template — one per computer (the build spec for WO-LEARN-MISTAKES-ONLY)

Every card answers one question: **can this computer produce the lesson sentence, and does it produce every lesson its facts make possible?** The card IS the spec the build implements — every row must be buildable as written.

## The sentence type every card targets (David 2026-11-23)

A mistake turn is said as, in this order:
1. **LESSON** — a general chess lesson, with this board's example inside it. Never a restatement of the board (the student watched the move). Voice: "Trading off your dark-squared bishop hands them the dark squares, and d4 is the first target." / "A piece is only free if nothing can take back." / "When one piece refutes all your tries, that piece is the real target." / "Count before you attack: you need more attackers than they have defenders."
2. **CONSEQUENCE** — what it means next, when not already in 1.
3. **BETTER MOVE + ITS JOB** — only once the move is past (Review; Learn after the move). "Bc1 kept it, guarding d4 from b2."
4. **HABIT** — only when the student's record is RED/GREY on that skill. "Before you trade a bishop, ask which colour you're giving away."
Learn speaks ONLY after the student's move, only on a mistake (either side). Learn never names the student's next move, nor the move they just played ("your trade"). Specific always: the piece, the square, the target — short.

## Card sections (fill every one; "n/a — reason" is allowed, blank is not)

### A. Identity
- Computer, file, the function(s), the CoachFactKind(s) it emits, which surfaces read it (docs/computer-reach.json).

### B. Facts — what it computes (read the code end to end; cite file:line)
- B1. Fields it HANDS OVER today (type + meaning).
- B2. Facts it COMPUTES INTERNALLY BUT DROPS (the "why" thrown away) — exact variable and line.
- B3. Facts it COULD compute cheaply from what it already has (chess.js on the same board, the saved engine read) — and how.
- B4. Gates and thresholds that decide when it fires (file:line, value).

### C. Sentence readiness — can it fill each slot today?
| slot | today (yes / partly / no) | the field that fills it | what is missing |
|---|---|---|---|
| LESSON | | | |
| CONSEQUENCE | | | |
| BETTER MOVE + JOB | | | |
| HABIT | | | |

### D. Lesson recipes — EVERY lesson its facts support (the teaching gap)
Run every fact through every angle: recognize · identify · consequence (now / after the exchange / in the endgame) · prevent · own plan · their plan · strategize (when/whether) · calculate (count, line) · evaluate · knowledge (rule, named pattern, geometry, the exception) · habit · both seats · phase · combination with another computer's fact on the same board · counterfactual · exception · record (RED/GREY full, AMBER one clause, GREEN silent).
One row per lesson:

| id | angle | seat | condition (deterministic, from which fields) | slots (field → word) | LESSON stems (2–3, rotated) | CONSEQUENCE stem | BETTER-MOVE stem | HABIT stem | Learn variant | guard (never said when…) | data (H have / C compute: how) |

Every "doesn't apply" angle is listed once with its reason.

### E. Mistake link — which mistakes this computer explains
Which mistake causes from the one error computer (`inaccuracyCall.errorWhy` → `costReason` kind allowed/missed + motif, `whyItFailed` kinds incl. walks-into-fork, `positionalReason` concession kinds, mate) this computer's lessons teach, per seat. A lesson that never attaches to a mistake turn is marked "Review/chat only".

### F. Build changes — exact edits (the work order)
Numbered, each: file:line, what changes, why (which card row it enables). Expose dropped fields (B2) as typed fields; add calculations (B3); sensitivity changes (B4: old value → new value, with the miss board it catches and the false board it must not); delete renderers that only state the board; recipes go into the one recipe table (`mistakeLesson` — Record<cause, recipe>), never into the computer's own prose.

### G. Proof boards (saved data only)
- Boards where each recipe fires (id + FEN), from audit-reports/teaching-census-data/ (lines-*.jsonl, boards-?.jsonl, g-*.jsonl), audit-reports/danya-havecheck/, src/test/fixtures/.
- Boards where it must NOT fire (the guard).
- If you ran the computer's pure function on a saved board (chess.js only, NO engine), say what it returned.

### H. Open questions — anything that is the owner's call (behaviour), listed, never decided.
