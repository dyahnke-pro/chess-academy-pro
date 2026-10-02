# Hand walk — 3 fresh games, Learn + Review (2026-10-01, run C)

Games: am-173941975600, am-174098928806, am-174117950920 (sweep corpus).

## Count — every sentence with a board claim
| surface | true / all | machine-checked | hand-checked |
|---|---|---|---|
| Learn  | 170 / 177 (96.0%) | 76 / 76 | 94 / 101 |
| Review | 279 / 286 (97.6%) | 100 / 100 (9 checker misreads: legal lines on their own board) | 179 / 186 |

## False claims and their root fixes
| where | claim | root cause | fix |
|---|---|---|---|
| Learn g1 p2 / Review intro | "the kingádas Opening" | sanitizer's `\b` treats á as a word break | letter lookahead in PIECE_LETTER_AFTER_CONTEXT_RE |
| Learn g1 p12 | "f3 was poisoned … b5 collects it" | greedy-grab fired on a pawn TRADE; stem said a kick collects | SEE guard; stem "hits back" |
| Learn g1 p50, Review g1 p61 | "eyes g4 … stays there for the whole game" | outpost reason rode with the EYES shape | `reason: null` on that shape; one `reasonFor` resolver |
| Learn g3 p20 | "their O-O … every move they spend retreating" | seat-relative reason said of their move; false here too | REASON_NAMES_SIDES Record + tempo `reasonHolds` |
| Review g1 p88 | Rh8# "seizes the open h-file" | concept dispatcher never checked mate | mate guard at `detectConcept` |
| Review g1 p86 | Kg7 "to the centre" | "more central" ≠ arriving | centre file-or-rank zone |
| Review g1 p77 | "stays 2 pawns ahead" (White −6) | relative count worded as absolute | "better on material than X" |
| Review g1 p47, g3 p34 | "nothing covers e4" (queen on f3) | wording outran the computer (pawn holes + bishop) | "no pawn or bishop of yours can cover" |
| Review g2 p67 | "only their rook could take the e-file" | race read in a CHECK position | no file race while in check |

Repeats removed (not false, said twice): better move named by verdict AND grade (all verdicts now drop it); one lost pawn told twice (lostSquare on plan-clause costs).

## Open
- Learn: "d5 … to win a piece", "f5 … to land a skewer", "Rc8 a little loose" (3.5-pawn drop), "a bit better" at +1.9 — all read off Learn's 900 ms live PV; the d16 read refutes each and the tape does not store the live line. Next: record the source line per claim, then gate PV-derived reasons on line depth.
- Review g3 FUNDLEAD 0/6 — ignored-threat sees only one-move hanging pieces; combination threats / walked-into forks attach no fundamental (plan A3).
- Review g1 owed plies 1/7/11 (h4, g4, h5) silent — no computer has a true thing to say about early edge pawns that the engine does not flag.

## Re-walk 2026-10-02 — Review

- **The ply-23 "wedge" was the AUDIT, not the app.** Bisecting by commit was
  inconclusive (the same commit passed once, wedged once). Capturing the page at
  the wedge showed it idle on `/coach/home`: the audit force-tapped the cameo
  card's Skip at screen coordinates while the card was still scrolling into
  view, and the tap landed on the bottom nav's Coach tab. After the card's own
  scroll settles, Skip is uncovered (checked with `elementFromPoint`), so a
  person's tap works. Fix: the audit DOM-clicks the button and logs any cover
  that remains after settling; every card tap and every navigation is logged.
- **SEAT check too blunt:** "They have mate in one with their rook" after the
  student's Nc4 (Rh8# is real) — the consequence of the student's move, right
  seat. The student-ply check now mirrors the opponent-ply one (action verbs
  fail, state verbs pass), with cases in `seatReattribution.test.ts`.
- **Owed opening plies silent (h4, g4, h5):** unflagged, so no fundamental, and
  `principleLine` had nothing for a move that keeps no opening rule. New
  `principleContrastLine` (Learn + Review): the opening rule the engine's move
  kept, said once in full, then as a stem; never on book moves; says nothing
  about the move played.
- Results on 6fde1eec4 (before this batch): game 1 = owed plies + SEAT (both
  fixed here); game 2 = 0 fails; game 3 = FUNDLEAD 0/5 (A3, fixed in this batch).

## Re-walk 3 (2026-10-02) — after the false-claim fixes and the held move

Learn, same three games (`learn-walk-oct1c-re3-tape.json`):
- 192 sentences, 175 with a board claim. Machine-checked 66 — all true.
- Hand-checked from the remaining 109: every count/defender claim (5600 p16, p26; 8806 p12, p20; 0920 p20), the timing claim (0920 p14), the shield (8806 p46), the doubled pawns (0920 p48), the held-by claims (5600 p68, p72; 0920 p10), every "their X is a mistake/blunder" (engine before/after: h3 1.6, Qf4 1.4, b3 3.0, Be3 1.3, f3 2.0, Qc2 1.0), both mates, and "it can wait — Rad8" (5600 p58, still +5.3 after Kxg4).
- Held move at deciding moments: no "The move is X" before any student move; found → the found-move line; missed → the verdict names the move, so the reveal stays quiet. As designed.

FALSE / misleading, all fixed at the computer:
1. **5600 p80 "There's a forced mate here, starting with Rg2"** — depth 26: +8, no mate. A time-boxed read stopped on an aspiration fail-high left "score mate N lowerbound" as its last word, stored over the exact score. Fix: a bounded score never replaces an exact one (`stockfishEngine`, and the pool's two parsers in `gameAnalysisService`). Test fails on the old code.
2. **"Nc6 / Kd5 / Rc8 / Rf6 / Bd5 was loose — it gave away …"** — "loose" is a board word (an undefended piece); the grade of a move is "imprecise", and its cost is advantage, not material ("it cost about two pawns of advantage").
3. **0920 p10 "go and take it"** said with the student still −0.45 after their slip — the offer now follows where the slip left the board: a way back / level / go and take it.
