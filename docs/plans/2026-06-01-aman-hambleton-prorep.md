# Pro-Rep Build — Aman Hambleton (chessbrah) — 2026-06-01

Per CLAUDE.md §G9.1/§G9.2 + `docs/pro-rep-efficient-build-recipe.md`.

## WHY AMAN
David's pick (2026-06-01). Two axes: **most data** + **real teaching-voice corpus**.
- **Data:** personal handles all dead/banned (`gmamanhambleton` = fair-play-closed),
  so the corpus is the **`chessbrah`** streaming account: **35,738 games, 126 months
  (2010→2026)**. 35,253 parsed.
- **Voice:** the single best didactic corpus in chess content —
  *Building Habits* / *Bullet Habits* series, his site `amanhambleton.com/lessons`
  + `/courses`, a **London System Chessable course** (his GM-making weapon), a
  public **Lichess study of his Sicilian 2...e6 games**, fan-extracted Building
  Habits SCID DB. Maps directly onto our "right ideas, elegantly taught" doctrine.

## REPERTOIRE (data-confirmed, win-rate confirmed)
From `scripts/pro-repertoire/analyze-chessbrah-openings.mjs` (top 6-ply prefixes):

| # | Opening | Side | Games | Score | Notes |
|---|---|---|---|---|---|
| 1 | **Sicilian Kan/Taimanov** `e4 c5 Nf3 e6` | Black | **1231** | 75.2% | CROWN JEWEL; his Lichess study |
| 2 | **Nimzo-Indian** `d4 Nf6 c4 e6 Nc3 Bb4` | Black | 481 | 78.4% | #2 black weapon |
| 3 | **Caro-Kann** `e4 c6` | Black | ~380 | ~75% | solid backup |
| 4 | **Réti / KIA** `Nf3 … g3 Bg2` | White | 178 ECO + 1000s prefix | ~75% | dominant white system |

(Bogo-Indian `…Bb4+` vs Nf3 = Nimzo companion, 201g — folds in as a Nimzo variation.)
(Ruy Lopez 539g + Open Sicilian as White also real — candidate for a later pass.)

## BUILD ORDER (recipe: batch each LAYER across openings; ship once)
Lead with the **Sicilian Kan** to full G9.1 depth (richest data, proves pipeline),
then fan out. Layers: lessons → model games → plans → pitfalls → endgames → gems.

### Pipeline status
- [x] STEP 0 — corpus on disk (35,738 games)
- [x] deps installed (`npm ci`); chess.js present
- [x] STEP 1 — openings added to extractor (`aman-sicilian-kan`, `aman-nimzo-indian`,
      `aman-caro-kann`, `aman-reti`)
- [ ] STEP 2 — extract trees + model games (per opening)
- [ ] STEP 3 — identify variation tabs (≥30g + canonical name)
- [ ] STEP 4 — deep-build per-variation data
- [ ] STEP 5 — count MG + endgame plans HONESTLY (wider-corpus rule)
- [ ] STEP 6 — voice corpus per opening → `data/sources/chessbrah-voice/per-opening/`
- [ ] STEP 7-8 — author + register lessons (LESSONS map only; G9.3 Gate A)
- [ ] STEP 9 — middlegame + endgame plans (Gate C continuity)
- [ ] STEP 10 — pro-repertoires.json entry
- [ ] STEP 11 — model games (3-5/variation, student WINS only)
- [ ] STEP 12 — common-mistakes (engine-verified)
- [ ] STEP 13 — proRepertoireOpeningMap (only if masterclass match)
- [ ] STEP 14 — bump PRO_DATA_REVISION
- [ ] STEP 15 — validate (ship-check + gate tests)
- [ ] STEP 16 — push main + 3-instrument audit + Watch-depth audit

### G9.3 four hard gates (every opening): A=curated LessonScript (no legacy
fallback), B=line reaches middlegame, C=plan FEN continues opening terminus,
D=move skeleton before prose.

## Next-session pickup
If interrupted: trees land in `data/sources/chessbrah-trees/`, deep data in
`chessbrah-deep/`, voice in `chessbrah-voice/`. Resume at the first unchecked
STEP. The crown jewel (Sicilian Kan) is the depth template; replicate its shape.
