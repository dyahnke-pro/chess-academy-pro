# Samay Raina — full pro-rep build (2026-05-31)

**Player:** Samay Raina (`samayraina`, registry id already present, NM/"M" title,
~2000). The only unbuilt registry player with a deep, mineable chess.com corpus
(**17,171 games**) — the elite GMs (Carlsen/Caruana/Firouzja/Dubov/Gukesh/Prag/
Niemann) and the other streamers expose only ~2 public months. On-brand for the
app (entertainer, SuperPogChamps champ, piece nicknames).

**Goal:** match the Eric Rosen standard exactly — 8 openings, each with main +
variation Watch lessons, model games (real wins), middlegame plan, endgame plan
(where data supports), pitfalls, named traps where real, and engine-mined
punish-gems. All gates green, deployed, prod-audited.

## Repertoire (data-derived from his 17,171 games)
A classical 1.e4 / 1…e5 player.

**White:**
1. **Open Sicilian** (e4 c5 Nf3 → d4) — his #1, 4204g (vs …d6 and …Nc6)
2. **Ruy Lopez** (e4 e5 Nf3 Nc6 Bb5) — 1163g
3. **Italian Game** (Bc4) — 920g
4. **vs French** (e4 e6 d4 d5 Nc3) — 205g+
5. **vs Caro-Kann** (e4 c6 d4 d5 Nc3) — 225g+

**Black:**
6. **Open Games / …e5** (e4 e5) — 3196g
7. **Sicilian** (…c5) — 1338g
8. **Scandinavian** (…d5) — 324g  (or French …e6, 421g — pick by data depth)

## Pipeline (proven on Rosen — reuse verbatim)
extract-opening-tree → pick-model-games → author lessons (main+variations) →
pro-repertoires.json entry → model games → middlegame + endgame plans →
pitfalls → named traps (if real) → punish-gems (Stockfish 17 at /tmp/stockfish
+ explorer proxy) → register + tab resolvers → bump PRO_DATA_REVISION → gates →
ship → prod audit. Auto-arrow-sanitizer hook covers proSamayRaina* via the
generalized scope (extend SCOPE_RE + the PostToolUse matcher).

## Status
- [x] corpus fetched (17,171), repertoire analysed
- [ ] extract trees + model games (8 openings)
- [ ] author + wire + gate + ship + audit

## DONE (2026-06-01) — full G9.1 parity, shipped
8 openings, each to the Eric Rosen standard:
- Main + variation Watch lessons (16 files, board-accurate, two-register, arrow-clean)
- 24 model games (real Samay wins, up to 2950)
- 8 middlegame plans (anchored at spine terminus)
- 8 pitfalls
- 25 engine-mined punish-gems (Stockfish 17, crushes to +6.1)
- Tab-plan resolvers, PRO_DATA_REVISION bump

Verification: all gates green (2478 tests), ship-check READY TO PUSH, on main.
Real-app audit 8/8 (curated Watch lessons, 0 legacy fallbacks). Also integrated
a parallel Caruana build (registered its 7 lessons + fixed its kind:'main'
typecheck bug + baselined its tab resolvers).

Deferred (honest, per "empty > invented"): endgame plans + named traps beyond
the mined gems.
