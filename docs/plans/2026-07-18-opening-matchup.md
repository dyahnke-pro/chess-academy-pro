# Opening Matchup — "teach X vs Y" (David 2026-07-18)

David: *"Coach couldn't show the two openings vs each other that I asked
for … Make sure the coach can show or teach any two different openings
against each other. Coach should use the DBs and stockfish."*

The earlier fuzzy fix only made the picker OFFER both sides as separate
"pick one" chips — tapping one taught a single opening in isolation, NOT
the two colliding on one board. This builds the real thing.

## Grounding (G3 — no invented lines)

An opening's identity often depends on the opponent's moves ("Italian
Game" REQUIRES 1…e5), so you cannot merge two arbitrary opening PGNs
without either mislabeling the result or inventing moves. So:

- **Tier 1 — named DB matchup entry (the grounded spine).** The Lichess
  DB already encodes real matchups as single entries: `King's Indian
  Attack: Sicilian Variation` (KIA vs the Sicilian), `Caro-Kann Defense:
  Panov-Botvinnik…`, `Indian Defense: London System` (London vs the KID),
  `English Opening: Anglo-Indian … King's Indian Formation` (English vs
  KID). We find the deepest entry whose name carries a distinctive token
  of BOTH sides and teach THAT. Every move is the DB's (G3-clean).
- **Stockfish extension.** If the named spine is short (< ~12 plies), we
  extend it toward a middlegame with `stockfishEngine.getBestMove`
  (best-play both sides) — real, legal engine moves, honoring David's
  "use the DBs and stockfish." Best-effort: engine unavailable → ship the
  DB spine as-is.
- **Honest failure (no invented hybrid).** If the two openings can't meet
  (both the same colour → can't face each other; or no book matchup exists
  — Italian vs Sicilian, Ruy vs French), we say so plainly and offer to
  teach either one on its own (tappable chips). Empty > invented.

## Files

- `src/services/openingMatchup.ts` — `resolveOpeningMatchup(query)` (sync,
  DB-grounded) + `extendMatchupToMiddlegame(moves)` (async Stockfish).
- `src/services/openingMatchup.test.ts` — coverage for named lines,
  colour ordering, same-colour + no-entry incompatibility.
- `src/components/Coach/CoachTeachPage.tsx` — detect a matchup in
  `handleSubmit` BEFORE the single-opening fuzzy picker; a `line` teaches
  the matchup via `generateOpening` `entryOverride`; an `incompatible`
  posts the honest message + per-side chips.

## Status: shipped
