/**
 * masterPlayTypes
 * ---------------
 * Shared types for the master-play grounding pipeline (cache, lookup,
 * watcher, claim validator, brain integration). Kept in a leaf module
 * so every consumer pulls the same shape and circular imports stay
 * impossible.
 */

/** One master move from the lookup. Mirrors the meaningful subset of
 *  the Lichess explorer payload. */
export interface MasterPlayMove {
  /** Standard algebraic notation, e.g. "Nf3", "O-O", "exd5". */
  san: string;
  /** UCI, e.g. "g1f3". Optional — the local DB may not store it. */
  uci?: string;
  /** Total game count seen in this position with this move played. */
  games: number;
  /** Wins / draws / losses from White's perspective (Lichess shape). */
  white: number;
  draws: number;
  black: number;
  /** Pre-computed percentages 0-1. Avoids division-by-zero traps in
   *  consumers — the lookup zeros these when games===0. */
  whitePct: number;
  drawPct: number;
  blackPct: number;
  /** Average rating across games with this move, when known. */
  averageRating?: number;
}

/** A famous master game where this position arose. Result-level
 *  attribution (Lichess returns these at the top-level of the payload,
 *  not per-move). */
export interface MasterPlayTopGame {
  id?: string;
  white?: string;
  black?: string;
  whiteRating?: number;
  blackRating?: number;
  year?: number;
  month?: string;
  event?: string;
  /** "1-0" / "0-1" / "1/2-1/2". */
  result?: '1-0' | '0-1' | '1/2-1/2';
}

/** Result of a master-play lookup for a given position. Always
 *  returned (never null) — when no data is available, `source: 'none'`
 *  + empty `moves[]`. Callers branch on the source field instead of
 *  null-checking. */
export interface MasterPlayResult {
  /** Normalized 4-field position-FEN keyed against. */
  fen: string;
  /** Sum of games across all `moves[]`. Zero when source === 'none'. */
  totalGames: number;
  /** Master moves played in this position, sorted by `games` desc.
   *  Empty when source === 'none'. */
  moves: ReadonlyArray<MasterPlayMove>;
  /** Where the data came from. `'local'` hits the in-app
   *  `openings-lichess-extended.json`. `'lichess-live'` hits the live
   *  Lichess explorer via the /api/lichess-explorer proxy. `'none'`
   *  means both layers missed (or the device is offline).  */
  source: 'local' | 'lichess-live' | 'none';
  /** Famous master games where this position arose. Present when the
   *  source provides them (Lichess live always; local DB may not).
   *  Used by `claimValidator` to ground player / year / event claims. */
  topGames?: ReadonlyArray<MasterPlayTopGame>;
}

/** A canonical opening DB entry (from `openings-lichess.json` +
 *  `openings-lichess-extended.json`). Used by the claim validator as a
 *  SECOND grounding source alongside live master-play data — when a
 *  named opening (Vienna Steinitz Gambit, Najdorf English Attack,
 *  Marshall Attack, ...) exists in the DB, its move sequence and name
 *  attribution count as book theory the coach is free to teach without
 *  needing live Lichess explorer top-N coverage of every position. */
export interface OpeningDbEntry {
  /** ECO classification, e.g. "C24". */
  eco: string;
  /** Canonical name from the Lichess DB. */
  name: string;
  /** Space-separated SAN sequence. */
  pgn: string;
  /** SANs derived from `pgn` for fast contains-checks. */
  sans: ReadonlyArray<string>;
}

/** The block injected into the LLM system prompt at Layer B. Built
 *  from one or more MasterPlayResults (current FEN + look-ahead
 *  children). Read by `claimValidator` to ground SAN / numeric /
 *  entity / comparative claims. */
export interface MasterPlayContext {
  /** Primary position the user is currently looking at. */
  current: MasterPlayResult;
  /** Up to N look-ahead positions, one per top master move from the
   *  current position. Lets the LLM answer "and if I play X?" without
   *  a tool call. */
  lookahead: ReadonlyArray<{
    /** SAN of the move that produced this look-ahead position. */
    moveFromCurrent: string;
    result: MasterPlayResult;
  }>;
  /** Canonical Lichess-DB opening entries that match the current FEN's
   *  move history OR were referenced by name in the most recent user
   *  message. Populated by `getCoachChatResponse` after
   *  `buildMasterPlayContext` returns. The claim validator consults
   *  this alongside `current.moves` so the coach can answer "walk me
   *  through the Steinitz Gambit" without the validator rejecting
   *  every SAN that isn't in Lichess's live top-N for that exact
   *  position. Empty / undefined when neither path matched (validator
   *  falls back to master-play-only behavior). */
  dbEntries?: ReadonlyArray<OpeningDbEntry>;
  /** Ground-truth SANs for game-review turns: the moves actually played
   *  in the game under review PLUS the legal moves of the reviewed
   *  position (chess.js-validated). The claim validator treats these as
   *  grounded so the coach can discuss the student's OWN game — including
   *  moves and engine-suggested legal alternatives that left master book
   *  — without every concrete SAN being flagged as an ungrounded
   *  hallucination. Populated by `buildMasterPlayContext` only when the
   *  surface supplied `gameSans` (review); undefined elsewhere, where the
   *  strict master-play-only SAN gate stays in force. */
  groundedSans?: ReadonlyArray<string>;
  /** Player display names grounded THIS turn by the player-games tools.
   *  The entity claim-validator treats these as attributed, so a lesson
   *  on "how <pro> plays X" can name the pro without stocking out. Same
   *  idea as `groundedSans` for moves. (Prod bug 2026-06-02.) */
  groundedPlayers?: ReadonlyArray<string>;
  /** True when this turn is grounded in an ACTUAL played game (the
   *  review surface supplied `gameSans`). Distinguishes the review case
   *  — where a SAN that's neither played nor legal IS a hallucination
   *  worth flagging — from the off-book play/chat case, where bare SANs
   *  are legitimate forward-looking move discussion (a plan names FUTURE
   *  moves not yet legal) and must NOT be flagged into the stock
   *  fallback. Set by `buildMasterPlayContext`. */
  groundedFromPlayedGame?: boolean;
  /** True when this turn is step-by-step MOVE NARRATION (the engine-driven
   *  Learn reply / a "I played X. Your move." report) — the coach narrates a
   *  played move + its ideas, naming tactical continuations a ply or two ahead
   *  ("…then bxc3 doubles my pawns") that are TEACHING, not "masters play X"
   *  claims. When set, the bare-SAN gate is skipped (the G6 arrow validator
   *  still board-verifies every SAN; the percentage / count / player /
   *  comparative guards stay in force). Set by `buildMasterPlayContext`.
   *  (David's iPhone + deep audit, 2026-06-04.) */
  moveNarration?: boolean;
}
