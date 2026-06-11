# Coach "show me a game that <player> played <opening>" (David 2026-06-11)

## The bug David hit
Typing **"show me a game that magnus played the catalan opening"** into
`/coach/teach` returned a chain of *"I don't have an exact match for … Did
you mean Catalan Opening? / King's Pawn Game? / Italian Game?"* pickers and
never showed a game — even though the app ships 5 Carlsen Catalan wins on
disk.

## Root cause (diagnosed, not guessed)
The deterministic front-end router in `CoachTeachPage.handleSubmit` —
`TEACH_PATTERN` (the `show me X` verb) at `CoachTeachPage.tsx:1297` —
captured the WHOLE clause ("a game that magnus played the catalan") as an
**opening name**, fuzzy-matched it, and surfaced a "Did you mean…" picker.
**The request never reached the brain or `lookup_player_games`.** A prior
session (2026-06-11) had already fixed the *tool* to find Carlsen's Catalan
games (`openingId: queens-pawn`, `variationLabel: "Catalan g3"`) — but the
tool was never reached, one layer too low. NOT an LLM tool-use decision; a
regex hijack upstream of the LLM.

## Architecture decision (David)
- **Hard-code the routing decision** — code detects the player-game ask and
  calls the lookup as a plain function; the LLM is never in the loop. G0
  ("THE LLM DECIDES NOTHING") applied: no tool-use round-trip, no toolbelt
  tokens (~3-4k/turn), no "decide to call the tool" fragility.
- **Data breadth:** "as much as we can on disc for fast lookup, then online
  access for deeper questions." On-disk = `pro-game-references.json` (fast,
  offline). Online = LIVE chess.com for the deep tail.
- **Don't break the app** — ADD a deterministic path; remove ZERO tools.
  Action tools (`play_move`, walkthrough hand-off, board set) stay wired.

## Phase 1 — DONE: deterministic routing + walk the real game
- `src/services/playerGameRequest.ts` — pure `parsePlayerGameRequest(text)`
  (precise regexes, player stoplist, opening span). 29 tests.
- `CoachTeachPage.handleSubmit` — new branch BEFORE the fuzzy matcher:
  parse → `lookupPlayerGamesTool.execute()` (plain fn, no LLM) → mount the
  real game via `buildSession` + the generic `MiddlegamePlanInline` session
  player (`modelGameSession` state). Honest message when nothing found.
- Regression gate: `lookupPlayerGames.magnus-catalan.test.ts`.

## Phase 2 — DONE: online chess.com "deeper" layer
- `api/chesscom-games.ts` — edge proxy. Scans the player's chess.com
  monthly archives newest-first, filters by opening slug (each game's `eco`
  URL) + color + wins-only, bounded by `months` + a 20s deadline.
- `src/services/chesscomGamesService.ts` — client wrapper +
  `resolveChesscomUsername` name→handle map + chess.js PGN→bare-SAN.
  Degrades to [] on any failure. 6 tests.
- Wired as the fallback: on-disk empty → "checking <player>'s chess.com
  games…" → mount the live game, or honest "couldn't find on disk or
  chess.com." **Edge fn → verify on PROD, not localhost.**

## Phase 3 — DEFERRED (heavy): regrow the on-disk chunk
On-disk is thin because the SOURCE extraction was capped small
(`build-game-references.mjs --max-per-variation 5`; the committed
`-deep`/`-trees`/`-model-wins` files hold only ~1-5 games/variation).
Growing it = re-run the pipeline per player (`fetch-chesscom.mjs` →
re-extract with higher limits → `build-game-references.mjs --max-per-variation N`
→ commit the bigger `public/data/pro-game-references.json`). It's fetched
lazily from `public/` (NOT in the JS bundle), so growth doesn't slow
startup; switch to lazy per-player files past a few MB. Long offline batch —
do it deliberately.

## Phase 4 — DEFERRED: token-saving "strip the lookup tools" pass
Phase 1 is the first tools-free domino. Follow-up: invert the other
EXPENSIVE lookup/fact tools (master-play, stockfish eval, opening book,
player-opening-moves) to deterministic code + one voice-only LLM call,
surface by surface. Leave action tools alone. Own plan doc when started.

## Verify
- `npm run ship-check` — green.
- Post-deploy (PROD): "show me a game that magnus played the catalan" →
  walks a real Carlsen Catalan win (on-disk). An opening we DON'T carry on
  disk → online chess.com pull. Off-canonical: "how does carlsen play the
  catalan", "carlsen's french defense games".
