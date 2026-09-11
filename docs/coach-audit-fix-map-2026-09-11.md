# Coach Audit — Root-Cause Fix Map (2026-09-11)

Root-cause fixes for every CONFIRMED finding in the broken-map
(`docs/coach-audit-broken-map-2026-09-11.md`). **This is still a MAP — no code
is changed here.** Each entry: the confirmed symptom → the root cause (file:line)
→ the minimal correct fix → the gate that must ship with it.

Ordering: fix the DISEASE, not each symptom. The 12 findings collapse into **3
root causes** (D3 detector class, D1 lesson-fallback catch-all, D2 router
pre-emption) plus a few one-offs.

---

## ROOT CAUSE A — D3: tactic detectors validate geometry, not material
Covers findings #9 (symptom), #10, #11, #12. Highest impact (P1, app-wide via G0).

### Fix A1 — `findSkewers` (tacticsDetector.ts ~240) — the false skewer (#10)
**Root cause (exact):** the emit condition is pure geometry + value-ordering:
```
first.color === enemyColor && second.color === enemyColor &&
PIECE_VALUE[first.type] > PIECE_VALUE[second.type] &&
PIECE_VALUE[second.type] >= 1        // ← pawn allowed as the "prize"
```
No check that (a) the back piece is worth winning, or (b) the skewer actually
NETS material (front piece capturable for gain / undefended).

**Fix:**
1. Raise the back-piece floor: `PIECE_VALUE[second.type] >= 3` (a skewer wins a
   real piece; you cannot skewer a knight to a pawn — kills the Ruy d7 case).
2. Add the material-won validation the SIBLING detectors already use: the front
   piece must be capturable for gain (undefended, or the slider ≤ its value and
   the exchange nets material) — reuse `chess.attackers()` / the SEE-style check
   from `findRemovableGuards`/`findTrappedPieces`. A pure value-ordering ray with
   a defended front piece (Bxc6 dxc6 = trade) is NOT a skewer.
Model it on `findDiscoveredAttacks`' "with tempo, or it isn't worth a word"
pattern — the fix already exists in-file, just not applied to skewers.

### Fix A2 — `findForks` (tacticsDetector.ts ~116) — no material/safety check (#11)
**Root cause:** fires when a piece attacks ≥2 enemy pieces of value ≥3, with NO
check that (a) the forker is SAFE (not itself capturable for free) or (b) the
targets are actually winnable (undefended / can't both be saved).
**Fix:** after collecting ≥2 targets, require the forking square is not defended
by a cheaper enemy piece (forker safe), AND at least one target is undefended or
unsavable (a real win). Reuse `attackersOfSquare` + the sole-defender logic from
`findOverloadedPieces`.

### Fix A3 — coverage gate (#12)
**Root cause:** `tacticsDetector.test.ts` (29 tests, green) has NO case for the
skewer/fork material class, so the bug shipped under a green gate.
**Fix:** add red-then-green cases to `tacticsDetector.test.ts`: the Ruy FEN
(`r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w …`) asserts NO skewer;
a real B→K→Q skewer asserts one IS found; a fork on two defended pieces asserts
NO fork; a real K+Q knight fork asserts one. Ship WITH A1/A2 so the gate goes
red first, green after.

> Note (G0): the coach is currently CORRECT to voice these — it faithfully
> speaks a computed fact. Fixing the computer fixes every downstream surface
> (chat tactics-live, teach commentary, review) at once. No LLM/prompt change.

---

## ROOT CAUSE B — D1: the "no specific lesson" catch-all (findings #3, #4)
_Filling from the routing investigation — pending._

## ROOT CAUSE C — D2: deterministic routers pre-empt analytics asks (#1, #2)
_Filling from the routing investigation — pending._

## One-offs (#5 endgame-tablebase, #6 last-game, #7 drill-stage, #8 review-game)
_Filling from the routing investigation — pending._

---

## Sequencing
1. **A (D3 detectors)** first — one code area, P1, app-wide, self-contained,
   ships with its own gate. Biggest value per line.
2. **B (D1 catch-all)** — one shared mis-route fixes #3 + #4.
3. **C (D2 routers)** — reorder/tighten so analytics asks aren't pre-empted.
4. The one-offs.
Each fix ships with the gate that would have caught it (the audit's standing-net
principle), then the 3-instrument prod audit on the affected surface.
