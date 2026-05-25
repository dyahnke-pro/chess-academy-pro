# PLAN — Scotch Game masterclass (Vienna template, playbook §0.7)

Branch: develop on `main` (David's standing policy) — Italian landed on main; Scotch follows.

## Pick (§0.5 autonomous, grounded)
**scotch-game** (white, C45). Completes the 1.e4 e5 white family (Ruy/Vienna/Italian).
Main pill = **Classical 4…Bc5 Be3 Qf6** (repertoire pgn, 50p, anchor 12).

Tabs (frequency-ordered from repertoire weights; all ≥20p, DB-anchored ≥6, no padding):
1. **Mieses** 4…Nf6 (5.Nxc6 bxc6 6.e5) — 0.25, 20p, anchor 11
2. **Scotch Gambit** 4.Bc4 — 0.15, 20p, anchor 9
3. **Four Knights** 4…Nf6 5.Nc3 Bb4 — 0.12, 24p, anchor 8 (folds in Schmidt)
4. **Kasparov's Nb3** 4…Bc5 5.Nb3 — 0.10, 21p, anchor 9

Dropped: Steinitz 4…Qh4 (12p) + Göring (16p) — too shallow without invented extension.

## Weapons
No forced famous named trap like the Italian's Légal/Fried Liver — so weapons = **mined
punish-gems** (CI runner, explorer firewalled here), like Caro. Ship named traps only if a
real one verifies. Model games: use bundled scotch games if present, else CI/David.

## Steps (Vienna §0.7)
- [ ] 1a main lesson `src/data/lessons/scotchGame.ts`
- [ ] 1b variation lessons `scotchGameVariations.ts` (4)
- [ ] 2 register registry.ts + index.ts
- [ ] 3 variationTabs CURATED['scotch-game']
- [ ] 4 scotchMasterclassTabs.ts + OpeningDetailPage plan chain
- [ ] 5 middlegame plans (main + 4) + add-leadeye
- [ ] 6 punish-gems on CI runner (+ narrate)
- [ ] 7 model games (bundled / CI / David)
- [ ] 8 checkpoint quizzes + common mistakes
- [ ] 9 manifest
- gates: ship-check + soundness on runner + walkthrough audit
