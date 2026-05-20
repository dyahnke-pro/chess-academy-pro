# RESUME — Opening narration (main line + every variation)

_Branch: `claude/fix-coach-db-audit-BzZcp` · PR #625 (draft) · 2026-05-20._

## Read first — David's directive (verbatim)

> "verify all the lines. you will not write these narrations without
> verifying the accuracy first. i want you to verify accuracy before you
> start each narration just to double check and make sure its 100%. then
> and only then write the narrations for main line plus every variation."

> "its 40 plus sublines. no need for traps and pitfalls. i want the
> sublines to continue the story, a different chapter in the same book.
> relate the sublines back to the main but distinguish the difference in
> battle plan / theory / ideas / key squares."

**There is NO Claude-side alarm/self-wake tool.** The session cannot wake
itself after a data-window pause; it auto-resumes when the window resets.
A heartbeat does not help (it burns the capped data and can't beat a usage
cap). Do not pretend an alarm was set.

## The procedure (per opening, every time)

1. **Verify accuracy FIRST, per line.** Re-run Stockfish on the exact line
   immediately before writing its narration — never from memory. Binary:
   `/usr/games/stockfish` (depth ≥16). Reuse the setupFen-aware helpers in
   `scripts/audit-traps-stockfish.mjs` (`evaluateFen`, `parsePgnToFinalFen`).
2. Only after a line verifies 100% → write its narration.
3. Narrate the **main line** AND **every variation/subline**. Each subline
   is "a different chapter in the same book": relate it to the main line,
   then distinguish — battle plan, theory, ideas, key squares.
4. Hand-written by Claude, book-grounded (the 7 Gutenberg books), zero
   runtime LLM, $0. Honor CLAUDE.md Narration Voice Rules (concrete; no
   interface refs; no praise; name the pattern not the move; silence OK).
5. `narrationEngine.ts` stays as the cheap deterministic move-by-move layer
   underneath the authored teaching track.

## State at pause

- **Line accuracy: 1090 OK / 24 WEAK / 0 BROKEN of 1114** (Stockfish).
  The earlier "649 BROKEN" was a phantom — the audit ignored `setupFen`
  on `pro-repertoires.json`. Fixed (commit `c89b367f`).
- 24 WEAK = unclassified `trap`s winning +152–194cp via real forks/pins;
  correct-sided, just under the +200cp bar. Keep or reclass to `mistake`
  — David's call.
- 955 lines still carry `setupFen` pending the lead-in fetch
  (`scripts/fetch-trap-leadins.mjs`, needs Lichess → David's machine).
  When it lands, lines become walk-from-move-1 / DB-anchored.

## CI / tests

- `pro-repertoires-orientation.test.ts` — GREEN.
- `repertoire-orientation.test.ts` — RED on ~50 non-setupFen authored
  trapLines (`WEAK_TRAP` / `INVERTED_MATERIAL` / `PGN_NOT_IN_DB`) not in
  the allowlist baseline. Predates this branch (red on main too); owned by
  `docs/plans/2026-05-16-trap-orientation.md` (other session). Do NOT
  mass-allowlist — `PGN_NOT_IN_DB` is a hard G3 concern. Coordinate first.

## Decisions pending David

1. Narration delivery shape (recommend: authored teaching track delivered
   at position-keyed phase pivots; sublines as chapters).
2. 24 WEAK traps — keep `trap` or reclass `mistake`?
3. Repertoire allowlist residual — coordinate with trap-orientation session.
4. Confirm no other session is in `useTeachWalkthrough` before wiring
   delivery.

## Subscribed: PR #625 activity (CI + review comments).
