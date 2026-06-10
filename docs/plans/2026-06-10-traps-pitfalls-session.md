# Traps / Pitfalls Session — 2026-06-10 (autonomous)

**Directive (David):** add verified trap/pitfall coverage to the openings, ship
to `main`, run the post-deploy audit until it passes. **100% accuracy, no
fabrication** — the supreme constraint.

## SHIPPED to `main`/prod — 7 hand-authored pitfalls, every one engine-verified

All in `src/data/common-mistakes.json` (static import → bundled). Each: chess.js-
legal + correct orientation, Stockfish depth-24 **and** depth-26 re-eval, chess.js
replay to the terminal position, theory-consistent, board-true narration (both
registers), resolvable `sources[]`.

| Opening | Pitfall | Punishment | Verified |
|---|---|---|---|
| two-knights-defence | `4…Nxe4??` | `Bxf7+ Ke7` (g5-N guards f7) | +2.06 |
| ruy-lopez | Noah's Ark `8.Qxd4??` | `…c5 …c4` traps Bb3 (escapes blocked) | −3.0 |
| birds-opening | From's Gambit `4.Nc3??` | `…Qh4+ g3 Bxg3+ hxg3 Qxg3#` | **mate (M3)** |
| caro-kann | `5…Ngf6??` | `Nd6#` (e7 pinned by Qe2) | **checkmate** |
| petrov-defence | `4…Nf6??` | `Nc6+` discovered check, every block drops Q | −6.0 (+9 mat) |
| philidor-defence | Légal `4…g6??` | `Nxe5! …Bxd1?? Bxf7+ Ke7 Nd5#` | `Nd5#` / −1.8 |
| queens-gambit | Elephant `6.Nxd5??` | `…Nxd5 Bxd8 Bb4+` wins the piece | −3.4 |

Two of these filled true gaps (Bird's 0→1; Ruy 1→2); the rest are iconic named
traps added to under-covered openings.

## POST-DEPLOY AUDIT — 7/7 GREEN on prod
`scripts/audit-pitfalls-prod.mjs` (new, committed). Drives the LIVE
`/openings/<id>` page for each of the 7, asserts: page mounts, `CommonMistakesSection`
renders (not empty), pitfall cards present, the exact authored narration text on
the page, **zero console errors**. Result: **7/7 green** against
`https://chess-academy-pro.vercel.app` (bundle `index-WWSCnHjf.js`).

## Coverage (masterclass + gambit set)
- **48 / 49 openings have pitfall coverage; 105 pitfalls total.**
- The lone gap: **`schliemann-defence` (0)** — multiple engine+explorer scans
  found NO clean *common* student pitfall (it's a sharp gambit; its only "bad"
  moves are obscure queen-sorties nobody plays, on a murky baseline). Per the
  100% bar: **left empty — empty > fabricated.**

## REJECTED (the bar cuts both ways — did NOT ship)
- **Schliemann `…d5`** (only −0.7 vs −0.56 — not a real pitfall).
- **The mislabeled "Najdorf" detector lead** (`Bc4/Ng5` line is a Bc4 anti-
  Sicilian, not a Najdorf — would have been misfiled).
- **old-indian / albin / queens-indian / trompowsky** extra pitfalls — positional
  openings with no clean famous one-move trap; existing coverage left intact.

## OUT OF SCOPE this pass (flagged for David)
- **Pro-rep openings (81)**: would each need the same per-opening engine
  verification; most are anti-Sicilian/positional with no clean famous pitfall.
  Not fabricated. A separate pass if desired.
- **Weapon-traps (gems)**: the famous "opponent errs, YOU punish" traps (Lasker,
  Englund, etc.) belong in `punish-gems.json` + the narration sidecar (different
  lane/gate), not `common-mistakes.json`. Not started this pass.

## Verification chain used on every pitfall (for reproducibility)
chess.js legality + orientation → Stockfish d24 + d26 → chess.js replay to
mate/material → theory cross-check → board-true narration + resolvable sources →
`commonMistakeNarration` + `narrationAccuracy` gates → `ship-check` (READY TO
PUSH) → push to `main` (rebased onto concurrent pushes) → prod bundle hash
advanced → `audit-pitfalls-prod.mjs` 7/7 green.

## UPDATE — extended batch (autonomous continuation)

Added 6 more verified pitfalls (13 total this session, all live on prod):
- **sicilian-alapin** `…Qa5+??` (−3.0, 5,615 games) + `…Ne4??` (−2.9)
- **alekhine-defence** `…d6??` in the Chase (−3.1, `c5` forks the knight)
- **qga** `…Nc6??` (−3.2, `Qxc6+` fork — `…b5` vacated b7)
- **vienna-game** `Bd2??` (−5.1 — fails to recapture on c3, drops a piece)
- **trompowsky-attack** `Bd2??` (−2.1 — `…Nxd2` wins a pawn + initiative)

Each verified the same way (chess.js + Stockfish d22 + correct-move-from-engine
+ dup check + board-true narration + resolvable sources + gates + ship-check).
Rejected: French `…Qxd4` (node already lost), Alekhine `dxe5` (correct move
only −0.75), Schliemann `…d5` (not a real pitfall).

**Live prod coverage: 48/49 masterclass+gambit openings, 111 pitfalls total.**
Only `schliemann-defence` remains empty (no clean common pitfall — verified).

Post-deploy audit: `scripts/audit-pitfalls-prod.mjs` (now 12 openings, with an
`AUDIT_ONLY` scope filter). NB: node block-buffers stdout to a file — the audit
prints nothing until it EXITS (~8 min for 12 openings, ~18s each); do not mistake
that for a hang.

## UPDATE — disaster-walkthrough punishmentLines (batch 1+2+3, all live on main)

David's "I set them up, you knock them down" standard applied to the pitfalls:
every pitfall whose wrong move leads to a CONCRETE forced disaster now carries a
hand-authored `punishmentLine` — a sharp/cautionary second-person walkthrough
that plays the blunder out and shows the punishment. WATCH plays the disaster;
Learn/Practice still drill the antidote (correctMove). Positional/"dim" pitfalls
get NO fabricated disaster (empty > generic > invented) — they keep the standard
RED-wrong/GREEN-correct arrow + their existing explanation.

Pipeline (reproducible): `_gen-punishment-lines.mjs` (engine-verified disaster
candidates + per-move board facts) → `_verify-disasters.mjs` (confirms a REAL
student disaster: wrong ≤ −150cp, correct ≥ −90cp, swing ≥ 150cp, oriented) →
hand-author NARR {title, ann[], cue[]} board-true → `_assemble-punishment.mjs`
(merges narration + scaffold into the punishmentLine, RED move-arrow + green
vision + yellow key squares, validates array alignment) → gates → ship-check →
push main → prod bundle advanced → `audit-pitfalls-prod.mjs`.

- **Batch 1 (16):** masterclass/gambit disasters (shipped 556e3ec).
- **Batch 2 (17):** masterclass/gambit confirmed disasters — italian, KID,
  english, catalan, four-knights, evans (x2), sveshnikov, benko, budapest,
  scotch-gambit (x3), vienna-gambit, smith-morra, marshall (x2).
- **Batch 3 (26):** pro-rep confirmed disasters across every player — naroditsky
  (x3), gothamchess (x4), hikaru (x3), samayraina (x2), caruana (x2), carlsen
  (x6), aman (x3), incl. the famous Caro `…Ngf6?? Nd6#` mate and the Qxf7+ /
  Bxf7+ unsound sacs.

**Total: 59 punishmentLines live** (43 confirmed disasters this session + 16
batch-1 + 3 pre-existing pirc). Every one: moves[0]==wrongMove, all moves
chess.js-legal from the FEN, oriented to the student color, Stockfish-confirmed,
arrays aligned, cues ≤8 words. Gates green: commonMistakeNarration (203),
commonMistakeLine (8). ship-check READY TO PUSH.

Audit `scripts/audit-pitfalls-prod.mjs` EXTENDED (G7 living-audit):
- PHASE A (render): 38 openings — section renders + board-true on-card snippet +
  0 console errors.
- PHASE B (interactive WATCH): 10 disaster openings — expands the matching
  pitfall card, clicks WATCH, asserts the disaster walkthrough (`line-player-demo`)
  mounts showing the authored title. Proves the walkthrough PLAYS, not just that
  data exists.
- Browser recycles every 8 pages (sandbox headless_shell OOM-crashes ~20 pages
  in one long-lived context).
