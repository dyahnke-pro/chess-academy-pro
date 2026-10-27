# Subline narration — the standard and the five checks (WO-COURSE-01 E)

David 2026-10-27: "Hand written. With multiple checks for accuracy … make sure
traps are included and teaching is as strong as it can be."

A subline is one opponent reply on a tab's line, walked to a middlegame
(`src/data/course-sublines.json`, keyed `<openingId>::<tab>::<move>@<ply>`).
Its narration is a `SublineNarration` in `src/data/lessons/sublineNarration*.ts`:
an `intro` spoken on the board right after the reply, and a few `beats` on the
moves that teach something. Every word is written by hand FROM the line's fact
sheet — never from memory (G0/G3).

## 1. Start from the fact sheet

```
npx tsx scripts/course-replies/line-facts.ts <openingId> <tab> <move@ply>
```

It prints every move with its board, the engine's read from the student's seat
(the best move, and whether the line played it, and the eval in fixed words),
the known mistake at the reply and its engine-verified punishment, what players
at three ratings answer there, and the eval where the line lands. Under each
move it prints the BOARD FACTS: what the moved piece hits, every loose piece
(attacked and unguarded — marked when only a pinned piece attacks it), every
pin (to the king, or to a piece worth more than both the pinned piece and the
pinner), the material from your seat, and the side marker to write ("…" for
Black only). A claim the sheet does not support is not written; an eval is
said in the sheet's words ("about level", "a little better", "clearly
better", "winning") or in pawns as the sheet prints it ("about two pawns
better"), never stronger.

## 2. What a narration says, in this order

1. **Their idea** — what the reply wants (the square it hits, the piece it
   frees, the plan it starts). Intro.
2. **The tempting move and why it falls short** — only when the sheet shows
   one: the move players at the student's level actually play there, or the
   capture that loses something. Say what it allows.
3. **The answer and the plan** — the line's next student move and what it
   does on the board; the plan the line follows.
4. **The trap** — when the reply is a known mistake, name the punishment and
   what it wins (from the gem's engine cp — "wins a piece", never a vague
   "crushes").
5. **Where it lands, and the habit** — the structure or the advantage at the
   end, and the one habit that finds this next time ("when they attack a pawn,
   look first for the capture that attacks something back").

Not every line has all five. A line with nothing to say past its intro gets
only the intro — silence beats filler.

## 3. Voice rules (all already in CLAUDE.md; listed so nothing is missed)

- The student is **you / your**; the opponent is **they / their** — never
  he / his / we / our.
- No move numbers in spoken prose: "…Nf6", "Bc4", "the knight to c4".
- Every sentence names a square, a piece or an idea the student can look at.
- No praise, no "I", no interface words, no restating the move just played
  unless the sentence adds why.
- `sayShort` is ≤ 8 words: the move plus a 3–5 word echo.
- Arrows and highlights point at exactly what the words name (green arrows
  from a real piece with a clear path; yellow on a named square).
- No statistics the sheet does not print ("scores heavily", "the most
  popular") and no engine words the sheet does not back ("best", "only
  move", "winning").

## 4. The five checks

1. **Board check (automatic).** `sublineBoardClaims.test.ts` replays every
   unit on its own board; a claim that is false there fails the build. The
   baseline only shrinks. `sublineLeadMove.gate.test.ts`: a beat that opens
   with a move names its own ply's move, an intro names a move its line plays,
   and "…" marks Black's moves only (107 narrations written for another line
   were retired when it landed, 2026-10-27).
2. **Engine check.** Every "best", "wins", "loses", "only", "mate", "+N" in
   the text is backed by a line of the fact sheet (the engine best at that
   ply, the gem's cp, the final eval). A writer lists, under each narration,
   which sheet line backs each such word.
3. **Second reader.** A different reader (a second agent, or me) re-derives
   every claim from the sheet without seeing the writer's reasoning, and flags
   anything it cannot reproduce. A flag is fixed or the sentence goes.
4. **Sources.** `sources[]` on every narration: `book:<id>` / `concept:<id>` /
   a reputable URL the `narrationSources` resolver accepts.
5. **The walk.** Before a batch ships, its lines are played in the app (Watch
   and Learn) and read against the board, one tab at a time.

## 5. Sample (Scotch, 3…Nf6 — written to this standard)

Fact sheet highlights: after 3…Nf6, 4.dxe5 is the engine's best (+1.0); the
pawn takes and hits the f6-knight. After 4…Nxe4 the engine prefers 5.Qe2; the
masters play 5.Bc4. 6.O-O ends the line at +0.8 for you.

```ts
intro: {
  say: "…Nf6 — they leave d4 alone and hit your e-pawn instead. Don't defend it: take on e5. The pawn captures and attacks the knight on f6 at the same time, so they spend their move saving it.",
  sayShort: '…Nf6 — take on e5, hit the knight.',
},
beats: [
  { atMove: 7, say: "…Nxe4 — the knight escapes by taking your e-pawn, so the material is level again. But it stands in the middle of the board with no pawn guarding it. Qe2, hitting it along the e-file, is the engine's choice; the masters most often develop first with Bc4." },
  { atMove: 8, say: "Bc4 — the bishop aims at f7, a square only their king guards." },
  { atMove: 10, say: "Castle. Your king is safe while theirs is still in the centre, and the pawn on e5 takes d6 and f6 away from their pieces. The habit: when they attack a pawn, look first for the capture that attacks something back." },
],
```
