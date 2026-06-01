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
- [x] STEP 5-16 — ALL 9 OPENINGS BUILT TO FULL CONTENT (2026-06-01):
      lessons (Gate A) + variation tabs + model games (student wins only) +
      middlegame plans + endgame (Kan) + engine/board-verified pitfalls +
      warnings + pro-rep entries + revision bump. Every gate green.
      | Opening | Tabs | Models | Gems | Warn | Pitfalls |
      |---|---|---|---|---|---|
      | Sicilian Kan ⭐ | 4 | 12 | 6 | 0 | 3 |
      | Nimzo-Indian | 3 | 9 | 4 | 0 | 3 |
      | Caro-Kann | 3 | 9 | 3 | 1 | 3 |
      | Réti/KIA | 3 | 9 | 3 | 0 | 3 |
      | Ruy Lopez | 2 | 8 | 9 | 0 | 3 |
      | Open Sicilian | 3 | 9 | 0 | 0 | 3 |
      | Rossolimo | 3 | 9 | 2 | 0 | 3 |
      | French (White) | 3 | 9 | 5 | 1 | 3 |
      | Anti-Caro 2Kts | 2 | 6 | 4 | 0 | 3 |
      Plans/models per opening = exactly what his data supports (no fabrication).

## GEMS + TRAPS + WARNINGS PASS (2026-06-01, David: "don't stop until all
   model games, end games, middle plans, traps, and what to watch out for")
- **36 punish-gems mined + hand-narrated** (Building-Habits register, gate-green).
  23 confirmed crushes incl. an anti-Caro smothered mate (Qe2 Nbd7?? Nd6#) and a
  Ruy +5.0 Open-line crush. The gems ARE the weapon/trap section (same as Gotham,
  which ships 0 trapLines + its weapons as gems).
- **Hand-found 2 gems the bot missed** (David: "bots are missing things"): a Réti
  KIA …d4 clamp and a Rossolimo …Nf4 rim-hop — added deeper EXTRA_WALK seeds for
  the main Advance Caro / Reti / Rossolimo / Open Sicilian lines the shallow seeds
  skipped, then re-mined.
- **2 engine-verified warningLines** (Caro …b5 −0.7, French Qxg7 −1.0) feeding the
  "watch out for" section alongside the 27 pitfalls. Most candidate warnings were
  just equal (recipe LAYER-4 reality) — only the genuinely-punished ones shipped
  (empty > invented).
- Open Sicilian honestly carries 0 gems: at masters-depth the amateur tries don't
  blunder hard enough — empty > fabricated.
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
