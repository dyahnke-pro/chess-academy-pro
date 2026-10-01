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
