# Danya deterministic teaching-point coverage audit (P4b)

Video: **Naroditsky Sensei speedrun, Accelerated-Dragon-vs-Elephant game** —
`https://youtu.be/Dj_hLEdDpAg`. Transcript pulled via yt-dlp (reference-only,
never quoted/shipped — plagiarism guard). Game = 1.e4 c5 2.Nf3 d5 3.e5 Bg4
(bishop outside the chain) 4.Bb5 Qc7 5.Bxc6 Qxc6 6.d4 e6 7.Be3 Nge7 8.dxc5 Nf5
9.Nbd2 Be7 … Bb7, c4, b3, Ba3, a4 bxa4, O-O, Rab8, Ba3, Bxf3, Rb2 → wins the
queen. A "pure positional game about structures and pressure" (his words).

## The rule
His teaching is DETERMINISTIC board facts, not vibes. So the compare is a
COVERAGE audit: every discrete claim → a board-grounded teaching-point TYPE →
does our app have a computer that identifies it at that FEN?
DETECTED / PARTIAL / MISSING. For every MISSING, name the detector to build.

## Our detector inventory (grounded, grepped 2026-08-23)
- `detectTactics(fen)` → fork, pin, skewer, discovery, double_check, back_rank,
  removal_of_guard, trapped_piece, mate_threat, overload, battery + hanging.
- `positionReadingService`: `findHangingBySee` (SEE), `findPawnBreaks`,
  `findPieceQuality`, `findWeakSquares`, `strongestWeakestPiece`,
  `findWeakPawns` (isolated/doubled/backward), `findOpenFiles`, `computeSpace`,
  `findAttackTargets`, `findPawnGrabs`, `kingSafetyRead`, `countMaterial`,
  `developmentRead`, `findForcingCandidates`.
- `positionalRead`: `readPosition`/`buildPositionalRead` (plan/king/dev/piece/
  structure/lever observations).
- `lookaheadPlan`: `keySquaresOf`, `buildLookaheadPlan`, `planFromUci`,
  `keySquareLine`, `describePlan`.
- `pieceValueRead`: `pieceQualityLines`, `evalSplitLine`.
- `tacticalRead.ts` (ported): `tacticalReadFromLines` → best line + verdict +
  named key tactic + tempting-but-wrong + refutation.
- `threatCheck`, `positionTrapScan`, `tacticClassifier.scanUpcomingTactics`.

## Coverage matrix — every teaching-point type in the game

| # | Teaching point (from his real commentary) | Type | Our detector | Status |
|---|---|---|---|---|
| 1 | "This is the accelerated dragon / an elephant / a French on steroids / Botvinnik-Carls Caro structure" | opening + structure ID | opening auto-detect (`coach-opening-auto-detected`) | PARTIAL (structure-family naming absent) |
| 2 | "the point is to move-order you into a French" | transposition trap | — | MISSING (low value for computed lines) |
| 3 | "the light-squared bishop OUTSIDE the pawn chain", "best knight vs worst bishop" | good/bad piece | `findPieceQuality`, `strongestWeakestPiece` | DETECTED |
| 4 | "Bg4 pins the knight" | pin | `detectTactics` pin | DETECTED |
| 5 | "puts pressure on e5", "d4 has TWO attackers and TWO defenders — one more attacker and it falls" | attacker/defender pressure count | `findAttackTargets`/SEE (no explicit count) | **MISSING → build `pressureCount`** |
| 6 | "I don't want to ruin my queenside pawn structure" (doubled pawns) | pawn-structure damage | `findWeakPawns` doubled | DETECTED |
| 7 | "queen on c7 is less vulnerable than b6 and pressures e5 more" | candidate-square safety compare | — | MISSING (low value; niche) |
| 8 | "the x-ray between the black queen and the white bishop", "king and queen aligned on the first rank" | x-ray / alignment | `detectTactics` battery (blocked-line x-ray absent) | PARTIAL → extend |
| 9 | "cxd4, Bxf3, Qxf3, cxd4 wins a pawn" | forcing calculation | `tacticalReadFromLines`, `scanUpcomingTactics` | DETECTED |
| 10 | "I did this without calculating — a judgment call" | meta | — | N/A (not a board fact) |
| 11 | "the knight reroutes Nd7 → f5, the typical method" | named maneuver | `keySquaresOf`/`describePlan` waypoints | PARTIAL |
| 12 | "he'll play h3; if h3 Bh5 g4 — does that win a piece? no" | prophylaxis / refute a hypothetical | `threatCheck`, tacticalRead tempting-but-wrong | PARTIAL |
| 13 | "g4 tremendously weakens his king" | king safety from pawn push | `kingSafetyRead` | DETECTED |
| 14 | "I want to preserve all light-square bishops → Bb7" | piece preservation | `strongestWeakestPiece` (no keep-advisor) | **PARTIAL → build keep-line** |
| 15 | "close the queenside with c4 exactly when he played Rc1 — make it look dumb" | tempo / punish-the-slow-move | `developmentRead` (no wasted-move tie) | MISSING (low value) |
| 16 | "Rc1 doesn't accomplish much / white wasted a move" | wasted move | — | MISSING (low value) |
| 17 | "black's typical plan: b5, a5, b4 — a queenside pawn storm" | structure→plan | `middlegamePlanner`, `planFromUci` | PARTIAL |
| 18 | "Ba3 traps the rook — win the exchange" | trapped piece | `detectTactics` trapped_piece | DETECTED |
| 19 | "normally you don't open the queenside, but he's so passive that bxa4 is right" | rule + exception | — | MISSING (hard; skip) |
| 20 | "a4 is now extremely weak", "the a3-pawn is a monster passer" | weak-pawn target / passer | `findWeakPawns` (no PASSER) | **MISSING → build `findPassedPawns`** |
| 21 | "notice how long we kept the tension" | tension value | — | MISSING (low value) |
| 22 | "Bb2 with a fork against rook and pawn", "Nf3 with another fork" | fork | `detectTactics` fork | DETECTED |
| 23 | "Rc2 severs the queen-knight link AND removes d4's defender" (all accomplishments) | multi-effect move | `detectTactics` removal_of_guard (single effect) | PARTIAL |
| 24 | "transforming the advantage — I said attack d4, but now K+Q aligned → Rb8-Rb1" | switch the target | — | MISSING (hard; skip) |
| 25 | "get the rook to the open b-file", "Rb3 anchored by a pawn" | open file / anchored rook | `findOpenFiles` | DETECTED (anchor nicety PARTIAL) |
| 26 | "rooks before queens" | principle | — | MISSING (low value) |
| 27 | "smothered mate / Arabian mate / mate on g2" | named mate pattern | `detectTactics` back_rank + mate_threat | PARTIAL → extend names |
| 28 | "the queen is blocked by its own d-pawn → d4 then Nf3+" | interference / self-block | `detectTactics` (no self-block) | PARTIAL |
| 29 | "g5 creates luft so we're not mated on the back rank" | back-rank / luft | `kingSafetyRead`, back_rank | PARTIAL |
| 30 | "black is slightly better", "completely lost for white" | verdict/eval | `countMaterial`, `evalSplitLine`, tacticalRead verdict | DETECTED |
| 31 | "c4 restricts white — no piece can reach b3 or d3, a thorn in his side" | square control / restriction | `computeSpace` (no square-denial) | PARTIAL |
| 32 | "up a pawn but black has very active pieces — compensation" | compensation | `countMaterial` + eval | PARTIAL |
| 33 | "an extra pawn, it's a passer — push it" | passed pawn | — | **MISSING → build `findPassedPawns`** |

## Verdict — what to BUILD (ranked by frequency × how deterministic × cleanness)
1. **`pressureCount(fen, square)`** — attackers vs defenders on a target,
   "one more attacker wins it" (#5). Recurs constantly in his talk (e5, d4).
2. **`findPassedPawns(fen, color)`** — flag passers, "monster passer, push it"
   (#20, #33). Purely deterministic, currently absent.
3. **Piece-preservation line** off `strongestWeakestPiece` — "keep your good
   bishop" (#14). Small, leverages existing computer.

DETECTED already covers his tactical spine (fork/pin/skewer/trapped/removal/
battery/king-safety/piece-quality/open-file/eval/forcing-calc) — the gap is the
POSITIONAL pressure/passer/preservation vocabulary. Those three make the
computed line sound like his running commentary instead of a bare best-move.

MISSING-but-skipped (transposition trap, wasted-move, rule-exception,
transform-the-advantage, rooks-before-queens, tension) are meta/heuristic, low
board-determinism, or rare — not worth a detector for the computed hot path.

## CORPUS-WIDE ranking (David 2026-08-23: "break down 10 videos … use the saved captions-with-FEN")
The saved captions-with-FEN ARE the farmed corpus `src/data/danya-teachings.json`
— 11,426 notes distilled from every farmed Naroditsky video (lineSan → FEN via
chess.js), each `concepts`-tagged. Tallying tags across ALL of them is a far
better spread than 10 hand-decoded videos. Top deterministic teaching concepts
by frequency, mapped to our detector:

| Rank | Concept | Freq | Our detector | Status |
|---|---|---|---|---|
| 1 | **prophylaxis** | 927 | `threatCheck` (no "what he wants + does it work") | **PARTIAL → build `opponentIntentRead`** |
| 2 | piece-activity | 901 | `strongestWeakestPiece`/`pieceScope` | DETECTED |
| 3 | king-safety | 791 | `kingSafetyRead` | DETECTED |
| 4 | development | 753 | `developmentRead` | DETECTED |
| 5 | pawn-structure | 715 | `findWeakPawns` (chains PARTIAL) | DETECTED |
| 6 | tactics | 647 | `detectTactics` | DETECTED |
| 7 | initiative | 560 | — | MISSING (no metric; skip) |
| 8 | calculation | 449 | `tacticalReadFromLines`/`findForcingCandidates` | DETECTED |
| 9 | counterplay | 391 | — | MISSING (heuristic; skip) |
| 10 | tempo | 338 | `developmentRead` (partial) | PARTIAL |
| 11 | pawn-storm | 315 | `planFromUci`/`middlegamePlanner` | PARTIAL |
| 12 | simplification | 308 | — | MISSING (trade-when-ahead; skip) |
| 13 | sacrifice | 290 | `tacticalRead` forcing sacs | PARTIAL |
| 14 | piece-coordination | 287 | — | MISSING (skip) |
| 15 | pin | 266 | `detectTactics` pin | DETECTED |
| 16 | compensation | 264 | `countMaterial`+eval | PARTIAL |
| 17 | knight-outpost/outpost | 245+234 | `findPieceQuality` outpost | DETECTED |
| 18 | passed-pawn | 206 | `findPassedPawns` | **DETECTED (built today)** |
| 19 | fork | 201 | `detectTactics` fork | DETECTED |
| 20 | pawn-break | 193 | `findPawnBreaks` | DETECTED |
| 21 | **bishop-pair** | 191 | — | **MISSING → build `bishopPair`** (trivial) |
| 22 | open-file | 190 | `findOpenFiles` | DETECTED |
| 23 | pressure | 135 | `pressureCount`/`pressuredTargets` | **DETECTED (built today)** |
| 24 | x-ray | 125 | `detectTactics` battery | PARTIAL |
| 25 | restriction/square-control | 109+78 | `computeSpace` | PARTIAL |
| — | back-rank-mate | 93 | `detectTactics` back_rank | DETECTED |
| — | discovered-check/attack | 85+66 | `detectTactics` discovery | DETECTED |
| — | weak-pawn/weak-squares | 99+87 | `findWeakPawns`/`findWeakSquares` | DETECTED |
| — | double-attack | 102 | `detectTactics` fork/removal | PARTIAL |
| — | deflection | 104 | `detectTactics` overload/removal | PARTIAL |

**Takeaway:** our tactical spine (ranks 2-6, 8, 15, 17, 19-20, 22 + tactic
families) is already DETECTED. The corpus confirms the single biggest gap is
**prophylaxis (#1, 927 notes)** — "what does he want next, and does it work?" —
which our computed line never voices. Plus `bishop-pair` (191, trivial) and the
positional trio built today (pressure/passer/preservation). Everything else
MISSING is heuristic/vibe (initiative, counterplay, coordination, simplification)
with no clean deterministic computer — correctly skipped (empty > invented).

**Final build set (this branch):** `pressureCount` ✓, `findPassedPawns` ✓,
`bestMinorToKeep` ✓ (done) + `bishopPair` + `opponentIntentRead` (the
prophylaxis computer) → wire all into the computed read → test → run the game →
side-by-side.

## Then: wire → run the same game → side-by-side his line ↔ our line at each FEN.
