# One coach + the missing computers — the plan (2026-10-07, for David's go)

Scope this session: ONLY these two. Nothing starts until David says go.

## Where we stand (measured, not recalled)

**One coach — not done.**
- 9 decider doors (`duplicate-census.md` §B1). Learn speaks through its own
  `learnTurnDoor.decideTurn`; Play live, Review, read-position and phase
  narration go through `coachDecider.decide`; chat routes on its own. The
  proof requirement shipped today lives only in Learn's door.
- 15 duplicate FACT groups, ~47 extra producers (§A). Fixed so far: turning
  point (U1), grade/cost table (U2), withholding (U8). Still split: hanging (2),
  threats (5), why-the-better-move (5), tactic detection (8+), trade (2),
  material (3), "brilliant" (4), plans (3), pawn shape (10), bad piece (3),
  king safety (2), book departure (2), phase (3), missed tactic (2).
- Machinery duplicates (§B, §C): 15 say-once memories, 11 question systems, 7
  register declarations, 8 recap producers, ~40 piece-name tables.
- Tactics and Weaknesses do not carry the `Proof` object at all.

**Computers.** `teach-brief.md`: 458 teaching acts — 104 built, 242 partial,
112 missing. Done from the missing list: illusory pin (pin-break), pinned
pinner, obligation lifts, prophylaxis, tied defender, move order. ~106 left.
A few are not computers (phrase bank, imagery, clock data we don't have, an
"explore it yourself" screen) — those come to David, not to code.

## Why this order
Build the shape first, then the computers into it — otherwise every new
computer is wired by hand into Learn and retrofitted later, which is how we
got 9 doors and 47 duplicate producers.

## Phases

**P0 — Prove the branch.** Full suite green; hand-walk Learn and
Review on a fresh game, every claim checked (100% bar); push the branch.
- [x] 19 red tests fixed at the cause (2026-10-07): four private piece-value
  tables onto `pieceValues`, five private piece-name tables onto `PIECE_NAMES`,
  two point-threshold namers onto `countWords`/`boardEdgeWords`, outcome words
  routed through the ledger (`threatProof` says "they win a knight" off
  `computeExchangeLedger`), stale code-shape regexes, the U2 grade ceiling
  made inclusive (an inaccuracy may cost "about a pawn"), the plan-stop line
  says the MOVE ("moved from a7 to a5"), not a phantom piece.
- [x] The one-coach gate caught Learn hand-wiring 11 new computers. Fixed by
  STARTING P4: `boardComputers.ts` — `readBoard(id, ctx)` → one shape (text +
  required proof + squares + key), every entry answers all six surfaces,
  `boardComputers.test.ts` holds each "wired" claim to a real caller. Nine
  computers enter Learn through it; Learn imports 71 → 59, total 253 → 244.
- [x] Found on the way: the plan thread computed its stop proof and Learn
  queued `NO_PROOF` (dropped — G8.5); now carried. Chat's threat answer now
  runs Learn's take-the-attacker check (they disagreed).

**P1 — ONE DOOR.** `coachDecider.decide` becomes the only door; Learn's lane
table (leads, DNA beats, danger, waves) becomes Learn's POSTURE config inside
it, not a second decider. Its fact type REQUIRES `FactProof`, so every surface
inherits the proof rule. Gate: `coachDecider.test` fails if any surface calls
another door.

**P2 — ONE FACT PER QUESTION.** Each duplicate group collapses to one computer
returning `{fact, proof}`; the rest become callers or are deleted (G8.5).
Riskiest first: hanging, threats, trade, material, brilliant, tactic detection,
why-better, then plans, pawn shape, bad piece, king safety, book departure,
phase, missed tactic.

**P3 — PROOF EVERYWHERE.** Delete the `stated` escape; every conclusion
computer returns its `Proof` from its own data. Tactics: the puzzle
explanation and a wrong try's refutation are `Proof`s. Weaknesses: the record
keeps the proof (additive optional field, no migration of old rows); My
Weaknesses, the heat map and drills read it back.

**P4 — ONE REGISTRY.** (Seeded in P0: `boardComputers.ts`.) `Record<ComputerId, ComputerSpec>`: compute, proof,
dual-use tag, and an answer for EVERY surface (Learn, Review, Play-on-ask,
chat, Tactics, Weaknesses: wired, or why not). Surfaces read the registry
instead of hand-calling computers, so a new computer cannot compile until it
answers every surface. Replaces the Learn-only `computerRoles`.

**P5 — THE MISSING COMPUTERS, most-named first** (reader count N):
1. Simplest clean win (8) · 2. Restriction (8) · 3. Repertoire fit (8, record +
authored data) · 4. Mate or material (6) · 5. Two weaknesses (5) · 6. Castling
geometry (5) · 7. Prepare the recapture (4) · 8. Pattern fails here (4) ·
9. Opening equivalence / no independent value (4) · 10. Lore (4, authored data
only) · then the N=3 band (wrongly expected, self-interference, right idea
wrong piece, attack race, flank-vs-centre, hold a resource, decoy/deflection,
loaded line) and down.

**Per computer, every time:**
1. The four levels: foundation; PLAN.md state; `surface-map.mjs --changed`;
   read the code end to end.
2. Duplicate check: grep, the census, and the 242 PARTIAL acts — if a partial
   exists, extend it; never a second one.
3. Pure computer with its `Proof`; fail-on-old tests on a real game position.
4. One registry entry → every surface; the dual-use record tag.
5. Wiring check (G8.5): a live caller on every surface it claims.
6. Every ~5 computers: hand walk of Learn and Review on a fresh game, 100%.

## Not breaking it
- Before P1 and P2: record Learn and Review tapes on 3 fixed games. After each
  phase, diff them — a line that disappears or changes must have a computed
  reason, or it is a regression.
- One surface at a time; its audit before the next.
- Weakness-record changes are additive only.

## Honest size
P0 ~1h · P1 half a day (the riskiest) · P2 ~a day · P3 half a day · P4 half a
day · P5 ~20-40 min per computer, so ~106 is several days. In the 3-day
window: P0–P4 plus the top ~25-30 computers. The rest go on the list in order.

## For David
- Go / change the order?
- The non-computer items (phrase bank, imagery, clock, explore screen,
  authored lore/repertoire data): skip, or a separate task?
