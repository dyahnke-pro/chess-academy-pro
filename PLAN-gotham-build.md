# GothamChess (Levy Rozman) Pro-Rep Full-Depth Build — Progress Tracker

Building all 18 Gotham openings to full G9.1 depth (plans + model games + gems +
pitfalls + tab routing). David's directive: don't stop until 100% done.

## Per-opening pipeline (the proven recipe)
1. Extract tree (`extract-opening-tree.mjs`) + start gem miner in background
2. Deep-build config in `deep-build-data.mjs` + `middlegame-past-spine.mjs` for plan lines
3. Author N plans (delete 2 legacy overview-only plans per opening; data-anchored, theme-gated)
4. Author gem narration in `punishGemNarration.ts` (fix any positional-tier gems with cp>=100 -> confirmed)
5. Author 2-5 model games (his real WINS only, strong opponents, hand-authored overviews)
6. Author 3-4 pitfalls (watch side-to-move! setup must leave WHITE to move for a White mistake)
7. Tab resolver `src/services/proGothamchess<X>TabPlans.ts` + wire into OpeningDetailPage.tsx
8. Bump PRO_DATA_REVISION, ship-check, push to main + branch

## Status (18/18 DONE ✅)
ALL 18 GothamChess openings built to full G9.1 depth:
- White: italian, london, ponziani, anti-sicilian, milner-barry, fantasy-caro,
  stafford-refute, caro-advance-white, kia, closed-sicilian, vienna, trompowsky, english
- Black: caro-kann (prior session), scandinavian, qgd, french-defense, pirc-defense
Each: data-anchored plans + his real model-game WINS + narrated gems (tactical
openings) + pitfalls + tab routing. Marquee model-game wins captured incl.
Naroditsky, Vidit, Hans Niemann, Anish Giri, GM Finegold, GM Bok, GM Barcenilla,
IM Eric Rosen, Salem Saleh.

## ⚠️ DEPLOY CAP BLOCKED
Vercel 100-build/day cap is HIT — prod bundle frozen at vienna's `C9F65Jim`.
All content IS committed + pushed to main (git correct); prod can't deploy until
cap resets (~24h). Localhost audit (2026-05-30) verified all new openings seed +
render correctly. **RE-RUN prod 3-instrument audit (`audit-pro-gothamchess-prod.mjs`)
once the cap resets and the bundle advances past C9F65Jim.**

## Notes
- Thin openings (Italian 75g, Ponziani 82g, Anti-Sicilian Bb5 ~6g, Milner-Barry 14g,
  Stafford 10g): build what data supports, don't fabricate. Anchor plans on the
  entry's theory-validated variation PGNs where his game data is thin.
- Tactical openings yield gems (Vienna 3, Italian 4, Ponziani 5, Milner-Barry 4,
  Anti-Sic 2, Fantasy 1, Stafford 1); positional ones (Trompowsky, English) yield 0.
- Gem narration arrays MUST equal playLine length (leading empties = inaccuracy index).
