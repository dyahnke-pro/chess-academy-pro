# Eric Rosen — Stafford Gambit pro-rep build (2026-05-31)

**Player:** Eric Rosen (`ericrosen`, IM) — already in `pro-repertoires.json`
players as "The Stafford Gambit king" but had ZERO openings. This is his first.

**Opening:** Stafford Gambit (Black) — `pro-ericrosen-stafford`. His signature
weapon. Complements Gotham's "Stafford-refute" (Gotham = White beats it; Rosen
= plays it as Black).

## Data (done — data-first, golden rule #1)
- Corpus: 18,788 games → `data/sources/imrosen-chesscom/` (gitignored).
- Tree + deep-build run for all 8 variations. Honest gambit: games are
  middlegame battles (Q+pieces); few reach endgames → endgame section
  self-hides (golden rule #9). CORRECT for a gambit, not a gap.
- Voice corpus: `data/sources/imrosen-voice/per-opening/stafford.md`
  (his framing + the 6.Bg5?? Nxe4!! Légal-mate trap + ...h5/...Ng4/...Qh4
  h-file motif + Erenburg 2024 World Blitz win).

## Variation tabs (data-derived, each a verified student WIN model game)
| Tab | Line | Games | Score | Model game (real corpus win) |
|---|---|---|---|---|
| Main | Accepted 5.d3 Bc5 (h-storm) | 160 | 64% | FarewellToKings2112 2661 + gmcorrales 2815 |
| 5.Nc3 | Accepted, knight develops | 88 | 64% | alicanelia29 2787 |
| 5.e5 | Accepted, space grab …Ne4 | 29 | 53% | IljaJoke 2480 |
| 4.Nf3 | Declines 2nd knight → quiet Petroff | 62 | 57% | RestartingChess 2796 |
| Four Knights | 3.Nc3 …Bc5 (BEST scorer) | 204 | 68% | wonderfultime 3165 |
| 4.d4 | White gives pawn back, …Nxe4 | 18 | — | AlmasRakhmatullaev 2982 |

## Build steps (G9.2 procedure)
- [x] STEP 0-6: fetch, extract, deep-build, model games, plan-count, voice corpus
- [x] STEP 7-8: main LessonScript + 5 variation lessons, registered in `lessons/index.ts`
- [x] STEP 9: 3 middlegame plans (anchored at each variation's spine terminus — Gate C)
- [x] STEP 10: pro-repertoires.json entry (opening + 5 variations + Légal-mate trapLine)
- [x] STEP 11: 7 model games (real Rosen wins vs 2480–3165, hand-authored overviews)
- [x] STEP 12: 3 common-mistakes / pitfalls
- [x] STEP 13: proRepertoireOpeningMap — SKIPPED (no masterclass Stafford id)
- [x] STEP 14: bumped PRO_DATA_REVISION → 2026-05-31-ericrosen-stafford
- [x] STEP 14b: closed two gate holes (proRepNarrationVoice + proRepPlanAccuracy now
      cover any `pro-` player, not just gothamchess/naroditsky)
- [x] STEP 15: gate tests green (11 files, 3344 tests) + `npm run ship-check` = READY TO PUSH
- [ ] STEP 16: push to main + 3-instrument audit

## G9.3 four hard gates
- A: every variation has a registered LessonScript (no legacy WalkthroughMode)
- B: every pgn reaches a middlegame (gambit = the attacking middlegame)
- C: each plan's criticalPositionFen = its variation's spine terminus
- D: move skeleton locked BEFORE narration

## Honest classification
Stafford is objectively a GAMBIT (dubious with best White play). Negative engine
eval at terminus is EXPECTED for a sharp showcase (soundness carve-out) — teach
initiative-for-a-pawn, never claim equality. White's correct neutralization
(Be2/h3/c3+d4 fortress, or 4.Nf3 quiet Petroff) taught honestly.
