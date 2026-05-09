# Endgame Training Platform — design + roadmap

## What shipped (this session)

A working endgame training platform with hand-authored content, voice-first
narration, interactive practice, and an evaluation-recognition quiz.

### Surface

`/coach/endgame` — six tabs:

```
Mating Patterns │ Principles │ Pawn Endings │ Rook Endings │ Drawing Patterns │ Eval Lab
```

### Content

**27 hand-authored lessons / 39 reference positions** across four catalogs:

| Catalog | Lessons | Positions |
|---|---|---|
| `endgame-principles.json` | 7 | 9 |
| `pawn-endings.json` | 7 | 14 |
| `drawn-patterns.json` | 8 | 11 |
| `rook-endings.json` | 5 | 5 |

All FEN-validated via chess.js. All `bestMove` and `solution` sequences
replay-checked. Voice consistency enforced by test (no chess clichés like
"strong move" / "good piece"). Principles + drawn-patterns cite a
historical source (Capablanca, Tarrasch, Philidor, Lucena, Vancura, etc).

### Lessons taught

**Principles** (universal):
1. Activate the King (Nimzowitsch)
2. Push Your Passed Pawns (Nimzowitsch)
3. Attack Weak Pawns (Steinitz)
4. Two Weaknesses (Capablanca)
5. Don't Rush (Capablanca / Dvoretsky)
6. Rooks Behind Passed Pawns (Tarrasch)
7. Trade Pieces When Ahead, Pawns When Behind (Capablanca)

**Pawn Endings**:
1. Opposition (Philidor 1749)
2. Key Squares (Maizelis / Dvoretsky)
3. The Rule of the Square (Lucena 1497)
4. Distant Opposition
5. Outflanking
6. Breakthrough (Berger 1890)
7. Triangulation (Bähr 1936)

**Drawing Patterns**:
1. Wrong-Rook-Pawn Bishop (Greco c. 1620) — with compare/contrast winning version
2. Opposite-Color Bishops (Steinitz 1880s)
3. Philidor's Defensive Position (1749)
4. Queen vs Rook Fortress (Berger 1890)
5. K vs K+P with Opposition
6. Stalemate Stalking
7. Perpetual Check
8. Insufficient Material — K+B, K+N, K+NN vs K (FIDE 5.2.b)

**Rook Endings**:
1. Lucena's Position / Building a Bridge (1497)
2. Philidor's Defensive Position (1749)
3. The Active Rook (Tarrasch 1931)
4. Vancura Position (Vancura 1924)
5. Cutting Off the King

### Interactive practice

Every position with a `bestMove` is interactive — student drags a piece,
chess.js parses the SAN, the app verifies. Right move → green
"Solved" badge. Wrong move → red destination square flash, retry. Board
state from FEN, never the LLM.

### Eval Lab quiz

10-question recognition quiz drawn from the 39-position pool. Each
position presents with the `result` hidden; student picks
winning/drawing/losing; reveal shows the authored explanation +
correct/incorrect badge. Summary screen with grade and answer-by-answer
breakdown.

### Architecture

- **Data**: hand-authored JSON files (`src/data/*-endings.json`,
  `endgame-principles.json`, `drawn-patterns.json`)
- **Types**: `src/types/endgameLesson.ts`
- **Service**: `src/services/endgameLessonsService.ts` (read-only loaders)
- **UI**: `src/components/Coach/EndgameLessonTab.tsx` (lesson view) +
  `EvalLabQuiz.tsx` (quiz view) + tab wiring in `CoachEndgamePage.tsx`
- **Tests**: `endgameLessonsService.test.ts` (10 invariants) +
  `EvalLabQuiz.test.tsx` (4 behavioral tests)

The architectural contract is the same as the rest of the app: **lines
only come from databases**. Here the "database" is hand-authored JSON
that I (Claude) wrote at design time, with chess.js validating every
move at build time. No runtime LLM authorship anywhere.

---

## Roadmap (what's next)

### Tier 1 — content depth

- **More positions per lesson.** Most lessons have 1-3 positions; 4-6
  per lesson would deepen the practice corpus and broaden the Eval Lab
  quiz pool.
- **Réti's Maneuver (1921)** — the famous king-zigzag study showing
  that a king can chase one pawn AND support its own pawn through
  diagonal motion. Belongs in pawn endings; needs careful authoring
  because the move sequence is precise.
- **Saavedra Position (1895)** — under-promotion to rook to avoid
  stalemate. Famous study; belongs in rook endings.

### Tier 2 — new surfaces

- **Calculation tab.** Six skills: candidate discipline, forcing-move
  triage, visualization, counting, quiet-move recognition, calculate-
  to-quiet. Best implementation: layer over Lichess puzzle DB themes
  (`mateIn2-5`, `quietMove`, `long`) since hand-authoring tactical
  positions is risk-prone.
- **Piece-Mate vs Stockfish.** KQ vs K, KR vs K, KBN vs K technique
  drills. Stockfish plays the lone king at full strength; user has 50
  moves to mate. Tablebase (≤7 pieces) verifies the user's run.
- **From Your Games.** Mine the user's imported games for endgame
  positions where they lost or got worse. Surfaces personalized
  practice — way more motivating than abstract theory.

### Tier 3 — pedagogy infrastructure

- **Spaced repetition** for endgame patterns. Re-surface Anastasia /
  opposition / Philidor at 3d, 7d, 30d intervals. Reuses existing
  flashcard infra.
- **Cross-link suggestions.** When the user fails 3 quiet-move
  attempts in a row, surface the Calculation → Quiet Move drill.
  When they fail Lucena, surface the Cutting Off lesson first.
- **Time pressure mode.** 30s per move on practice positions.
  Endgame technique under time stress is a different (and more
  practical) skill.

### Tier 4 — verification

- **Lichess Tablebase API.** For positions ≤7 pieces, replace the
  hand-curated `result` field with a runtime lookup. Adds mathematical
  certainty to every claim. URL: `tablebase.lichess.ovh/standard?fen=`
- **Stockfish-deep verification.** For positions >7 pieces, run
  Stockfish at depth 30 to confirm the curator's eval claim. Build-time
  check that fires if any authored result doesn't match the engine's
  considered evaluation.

---

## Voice contract

Every word of narration in this catalog is hand-authored by me (Claude)
at design time. Same voice as `mating-patterns.json`: concrete squares,
geometric mechanism, source-cited, no chess clichés.

If a future session adds new lessons:
- New entries go in the existing JSON files (don't fragment the
  catalogs further)
- Voice consistency is enforced by the test suite — `npm test
  endgameLessonsService` fires if "strong move" / "good piece" /
  similar phrases sneak in
- Every FEN must be chess.js-legal (also a test gate)
- Every claim of theoretical result should cite a chess source —
  Capablanca, Dvoretsky, Maizelis, Berger, Lucena, Philidor,
  Vancura, Tarrasch, Nimzowitsch are the standard reference set
