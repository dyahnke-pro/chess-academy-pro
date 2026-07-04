# Route ECO sub-line/variation pages → the correct masterclass tab (David 2026-07-03)

**Ask (verbatim):** "remove that page and have any opening that is a variation or
subline navigate the CORRECT TAB in that specific opening."

## Problem
The ~3,300 raw Lichess ECO entries each get a bare detail page (Watch +
book readings only). Many of them ARE variations/sublines of one of the 44
curated masterclasses. A user landing on "Caro-Kann Defense: Advance Variation"
gets the empty reference page instead of the Caro-Kann masterclass Advance tab.

## Fix (generalizes the one-off Glek alias)
A resolver `resolveMasterclassRedirect(opening)` maps a non-masterclass ECO
opening → `{ to: <masterclassId>, line: <tabLabel|null> }` by PGN branch
matching, and `OpeningDetailPage` `navigate(replace)`s to
`/openings/<to>?line=<label>` on mount — so the bare page never renders and the
correct tab is pre-selected (the `?line=` deep-link already works).

### Matching rules (CONSERVATIVE — mis-routing is worse than the bare page)
- Only NON-masterclass, non-repertoire ECO entries are candidates.
- A variation tab V "owns" the branch from its **identifying ply** (first ply V
  diverges from the masterclass main). An ECO entry E maps to (M, V) if E agrees
  with V through that defining move (E is on V's branch). Deeper agreement =
  more specific; the most specific match wins.
- Main-line match (E on M's main, no variation) only when E shares a deep
  prefix (≥5 plies and reaches the main's end or E's end) — ranks BELOW any
  variation match.
- **Ambiguity → NO redirect.** If two different masterclasses/tabs tie at the
  same specificity (e.g. a bare "e4 e5" line), leave the reference page as-is.
- Generic matches (< 3 plies of identity) are ignored.

### Files
- `src/services/masterclassRedirect.ts` — the resolver (pure, testable).
- `src/components/Openings/OpeningDetailPage.tsx` — redirect on mount.
- `src/services/masterclassRedirect.test.ts` — known sub-lines map correctly;
  masterclasses + unrelated/ambiguous lines do NOT redirect.
- Verification: run the resolver over ALL ECO entries, print per-masterclass
  counts + samples, hand-check before shipping.

### Status — BUILT
- [x] resolver + empirical verification: **1,204 ECO entries** route to a
  masterclass tab; report hand-checked (Trompowsky/Vienna/Fried-Liver/etc. all
  correct); no cross-first-move mis-routes; ambiguity→skip; every target real.
- [x] wire redirect in OpeningDetailPage.loadOpening (navigate replace on mount).
- [x] tests: masterclassRedirect.test.ts (Glek twin → glek-system; masterclasses
  don't redirect; no cross-first-move; every target real; coverage report).
- Note: transposition entries (e.g. "Four Knights: Italian Variation" in the
  Italian move order Bc4-first) route to the same POSITION's lesson under the
  transposed masterclass — chess-correct, not a mis-route (strict move-order
  prefix matching = no false-position matches).
