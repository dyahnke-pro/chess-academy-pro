# WO-INSIGHT-01 — the coach's insight (2026-10-05)

David, after a Custom Lesson session: "This app is missing insight." The coach
named facts (check, fork, loose piece) as labels and never said how they
relate: what the position asks, why one move beats a lookalike, what the
student's own move actually did.

## Decisions (David, 2026-10-05)
- Wrong move → **the idea, not the answer**: press / defend / bring one more /
  improve, plus what the move did. The answer move stays hidden.
- Comparing two moves → **arrows only**, both lines, one or two sentences.
- **Everywhere at once** — one computer, every coach section, one push.
- **Play it out**: every spoken line gets a tap-to-walk button.

## The computer — `src/services/moveInsight.ts`
- `positionAsk(fen, {bestSan})` — reads must-defend (null-move probe), loose
  enemy pieces (SEE), king-zone attackers vs defenders, and whether the best
  move is forcing / a double attack. Mode + one sentence; never the move.
- `moveMissed(fen, san, replyPv)` — the student's move along the engine's
  reply: material it loses (exchange ledger), a check the king walks out of,
  a capture that is taken straight back.
- `doubleAttack` / `mechanismContrast` — one piece, two targets, against a
  move that hits one. Feeds `compareTwoMoves` (review) and the chat compare.
- `walkableLine` / `pvSans` — the shape every Walk button takes.

## Wired
| surface | what it says now |
|---|---|
| Learn drill wrong move | what the move did + what the position asks; Walk on the move's line |
| Learn drill hint / Learn Hint | what the position asks, then the piece / the arrow |
| Chat "X or Y?" | mechanism ("hits the king and the queen at once; the other only checks") + both lines walkable |
| Review "why X was better" | mechanism leads the material proof |
| Tactics / My Mistakes / Setup Trainer wrong try | refutation + what the position asks; Walk button |
| How to Think — assess | the verdict the assessment exists for |
| Play "Why?" | what the position asks, before the strongest move |

## Same push — drill defects from David's session
Engine judges a move off the answer key (`judgeAlternative`: as good →
accepted); no closing line spoken over the next puzzle; no "keep going" after
every reply; Next button + typed next/skip; drill prompt joins the speech
queue; talk never routes as an opening name; hub tiles' start timer no longer
cancelled by its own URL cleanup.

## Next
More mechanisms in `mechanismContrast` (pin, discovered attack, overload,
removing the defender) — each a board read, each with a test.
