# Opening Watch beats — one beat a move (WO-OPENINGS-REWRITE-01)

David 2026-11-11: "I want 1 beat per move explaining the why, the move order,
this is our chance to teach like Naroditski" → "You are the writer for opening
tab! You use the computers and ANY AND ALL TOOLS at your disposal to write the
best narrations possible."

Every line of an opening's Watch lesson — the main line and each tab — has ONE
beat per move, both sides. The words are written by hand FROM the line's fact
sheet, never from memory (G0/G3). The subline standard
(`docs/SUBLINE-NARRATION.md`) applies in full: its voice rules and its five
checks. This page adds what a Watch line needs on top of it.

## 1. The fact sheet

```
LESSON_WRITER=1 LESSON_IDS=<id> npx vitest run src/services/lessonWriter.measure.test.ts   # the computed draft
LESSON_FACTS=1  LESSON_IDS=<id> npx vitest run src/services/lessonFacts.measure.test.ts    # the sheet
```

`audit-reports/lesson-writer/<id>.facts.md` prints, for every move: what the
masters play there and how often, the engine's top three lines from the
mover's seat at a fixed depth, what the move played costs against the best,
the board after it (what the moved piece hits, loose pieces, pins, material,
the eval words allowed, the side marker), the corpus note taught at that exact
board (Naroditsky, Danya — seat-checked), and the computed draft beat. A claim
the sheet does not support is not written.

## 2. What one beat says

1. **The move and its job** — what it does on the board, named by square and
   piece ("Bf4 — the bishop steps back to a diagonal where it hits c7").
2. **Why now — the move order** — when the sheet shows the masters' other
   move here, or a natural move that fails, say why this one comes first
   ("not Bh4: on h4 the bishop sits on the rim, where …g5 chases it").
3. **What it wants next** — the follow-up or the plan the move starts, or, on
   their move, what they are after and how you answer.

One to three sentences is the normal size; the opening's defining moves may
run longer. Never a stack of unrelated facts — one thought a move.

**The signature move** (the move the opening is named for: Bg5 in the
Trompowsky, …c5 in the Sicilian, the gambit pawn) carries the opening's idea
in full: what it threatens, what theory it sidesteps, the structure it aims
for.

## 3. The Learn cue

`sayShort` ≤ 8 words: the move plus the idea in 3–5 words ("Bf4 — active
diagonal, eyes c7.").

## 4. Rules on top of the subline standard

- No move numbers, no "1." in prose; the side marker from the sheet ("…e6"
  for Black).
- A percentage only as the sheet prints it ("most masters, about 60%, play
  Ne4 here").
- Squares named are lit and moves named are arrowed by code — write the
  square or the move, never mark it by hand.
- The engine line says what happens ("if …Qb6, Nc3 and the b-pawn is
  poisoned"), never "the engine says".
- Old hand-written beats for the line are deleted when the new ones land
  (David 2026-11-11: "Once they are replaced, ok to delete").
