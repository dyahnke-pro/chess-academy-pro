# Masterclass improvements campaign (2026-05-22)

Ranked improvement queue across the four shipped masterclasses (Ruy, Pirc,
Vienna, Caro). Work top-down. Each lands on main when its gates are green.

## 1. Finish Caro to the full standard  ← IN PROGRESS
Caro is lessons-only. Bring it to Ruy/Vienna parity:
- [ ] **Model games per variation** (Black wins). Sourced IDs:
  Classical `ydlFwo0O` (Mamedyarov–Topalov), Advance `tPeuj1h3`
  (Giri–Carlsen), Panov `LzyxwbnY` (Yu Yangyi), Fantasy `cd322YTs`
  (Mesic), Tartakower `pZpMgHRG` (Sedlak). Exchange + Two Knights: still
  to source a Black win. Export PGN → author `criticalMoments` (keystones,
  not move-by-move) → Hole-5 gate (FEN reachable). Bump manifest modelGames.
- [ ] **Black middlegame plans** per variation (replaced the 2 removed
  White-oriented ones). DB/explorer line into the Black structure, lead-the-
  eye, oriented black → middlegamePlanner gate. Bump manifest middlegamePlans.

## 2. Lead-the-eye: add green vision arrows to Caro lessons
Caro lessons are highlights-only. Add verified vision arrows (non-pawn
origin, clear sight-line, target named in narration) per §5a/§5b.
- [ ] Sweep all 7 Caro lessons; add arrows where a piece eyes a named square.

## 3. Hole-6 Stockfish soundness on engine-unverified past-book tails
- [ ] Run the Stockfish soundness pass (Hole 6b) on Vienna Gambit (~10p),
  Vienna Paulsen (~9p), Ruy MAIN ply-29. Confirm ≤120cp loss or trim the
  tail to where support exists. Needs a UCI engine (STOCKFISH_PATH / CI).

## 4. Extend Pirc depth shortfalls
- [ ] Pirc main (18→20+), 150 Attack (16→20+), Austrian-e5c5 (14→20+),
  Arkhangelsk (19→20+). Extend lines via masters spine; remove from
  `lessonDepth.KNOWN_SHORTFALLS`.

## 5. Caro traps/warnings (only the real ones)
- [ ] Karpov 4…Nd7 **Nd6# smothered-mate warning** (DB-real "watch out for").
- [ ] Evaluate Exchange/Advance …Qb6 tactical shots as weapons (verify
  forced + winning via chess.js + Stockfish before shipping; skip if not).

## Notes
- Coach chat brain quality + continue-playing flow: verify on prod (G7).
- Post-deploy audit loop ×3 (caro-kann) running this session.
