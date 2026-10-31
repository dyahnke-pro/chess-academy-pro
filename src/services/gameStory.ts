/**
 * gameStory — ONE per-game story state (WO-STORY-MATRIX-01 P1-8, design
 * docs/plans/2026-10-30-story-matrix-phase1.md §3.8). Pure: no Dexie, no React.
 *
 * Commit 8a moves the SAY-ONCE family in: one claim map and one sentence-key
 * map, each storing the ply a key was first said. What it replaced, on Learn:
 * `standingFactMemory`, the page's `positionalSaidRef`, `fundamentalSeenRef`,
 * `threatSaidRef` and `drilledSaidRef`, learnMemory's `spokenKeys`,
 * `conceptTaught`, `principleTaught`, `spokenThreatLines`, `lastThreatKey`,
 * `loudAlarms`, `spokenTacticLines`, `saidExplainers` and `pieceQualitySaid`,
 * and usePhaseNarration's own ledger — fourteen memories, two "the board went
 * backwards" detectors, two reset doors, and no rewind at all (a takeback
 * either kept everything said after the board it returned to, or, across a
 * full-move boundary, forgot the whole game).
 *
 * THE RULES, each made by the shape rather than a convention:
 *  - WRITES HAPPEN AT THE DOOR. A computer that produces a line OFFERS its
 *    say-once keys on the turn's board (`offer`); the rest of that turn reads
 *    them as said, so two producers never offer one idea, but the GAME
 *    remembers them only when the door keeps the line (`commitKept`). Marked
 *    at compute time, a line the door held was "said" and never came back
 *    (prod Learn 2026-10-16: 19 of 21 behaviours held, every idea lost).
 *  - REWIND TAKES BACK WHAT THE UNDONE PLIES SAID: every entry said after the
 *    board a takeback returns to is forgotten.
 *  - `newGame` IS THE ONE RESET. The surface's game memory calls it from every
 *    path that starts a game.
 *
 * Threads (plans) and events (phase, opening named, verdicts) join in 8b/8c.
 */
import { positionOf } from '../utils/samePosition';

export interface GameStory {
  readonly gameId: string;
  /** The board's ply as the story last saw it — the watermark a later board
   *  is compared with to tell a new game from the next move. */
  readonly ply: number;
  /** Claim → the ply it was first said. */
  readonly said: ReadonlyMap<string, number>;
  /** Spoken-sentence key (the voice package's `spokenSentenceKeys`) → the ply
   *  it was first said. */
  readonly sentences: ReadonlyMap<string, number>;
}

/** What one door kept: claims and sentence keys. */
export interface StorySaid {
  readonly claims?: Iterable<string>;
  readonly sentences?: Iterable<string>;
}

/** A line a computer produced on a board, with the keys saying it would
 *  spend. `text` is matched against what the door kept (which may have
 *  trimmed it), the same way `rememberKeptClauses` matches clauses. */
export interface TurnOffer {
  readonly text: string;
  readonly claims?: readonly string[];
  readonly sentences?: readonly string[];
}

/** What a board's turn may treat as said: the game's ledger plus what this
 *  turn has offered so far. */
export interface StoryHeard {
  has(claim: string): boolean;
  readonly claims: ReadonlySet<string>;
  readonly sentences: ReadonlySet<string>;
}

export interface StoryStore {
  current(): GameStory;
  /** Record what a door kept (or a line spoken outside the door), said at `ply`. */
  commit(ply: number, said: StorySaid): void;
  /** Offer a line's keys on `board`'s turn. A different board starts a new turn. */
  offer(board: string, offer: TurnOffer): void;
  /** The game's ledger plus `board`'s offers (none when `board` is not this turn's). */
  heard(board: string | null): StoryHeard;
  /** Commit the offers on `board` whose line the door kept. */
  commitKept(ply: number, board: string, kept: ReadonlyArray<{ text: string }>): void;
  /** The board is at `ply` now (the next move, never a takeback). */
  reach(ply: number): void;
  /** A takeback to `ply`: everything said after it is forgotten. */
  rewind(ply: number): void;
  /** A new board inside the same game (a scenario phase): everything said
   *  stays said, as of `ply` on the new board. */
  jump(ply: number): void;
  /** A new game: everything forgotten, under its own id. */
  newGame(gameId: string): void;
}

/** The say-once keys' namespaces in the one claim map. Unprefixed keys are the
 *  board ideas every lane shares (the positional read's, the composer's, the
 *  behaviours', a definition's `definitionKey`); each memory merged in 8a that
 *  had its own vocabulary keeps it under its own prefix. (The alert lanes'
 *  namespaces live with the alert lanes, which are their only writers and
 *  readers — `CoachTeachPage`'s `ALERT_KEY`.) */
export const STORY_KEY = {
  /** An opening principle taught (the door's `principle:` claims). */
  principle: (id: string): string => `principle:${id}`,
  /** A fundamental named in full (its short stem after). */
  fundamental: (id: string): string => `fundamental-seen:${id}`,
  /** A commentary moral (`buildPlayCommentary`'s explainers). */
  explainer: (key: string): string => `explainer:${key}`,
  /** The piece-quality read's once-a-phase keys. */
  pieceQuality: (key: string): string => `piece-quality-once:${key}`,
} as const;

/** The keys under one prefix, the prefix taken off — a merged memory read back
 *  in its own vocabulary. */
export function keysUnder(keys: Iterable<string>, prefix: string): Set<string> {
  const out = new Set<string>();
  for (const k of keys) if (k.startsWith(prefix)) out.add(k.slice(prefix.length));
  return out;
}

/** Does a kept fact carry this offer's line? Matched as `rememberKeptClauses`
 *  matches clauses: the door may have trimmed either side. */
function keptCarries(kept: ReadonlyArray<{ text: string }>, text: string): boolean {
  if (!text) return false;
  return kept.some((f) => !!f.text && (f.text === text || f.text.includes(text) || text.includes(f.text)));
}

export function createStoryStore(gameId: string): StoryStore {
  let id = gameId;
  let ply = 0;
  let said = new Map<string, number>();
  let sentences = new Map<string, number>();
  let turn: { board: string; offers: TurnOffer[] } | null = null;

  const put = (map: Map<string, number>, keys: Iterable<string> | undefined, at: number): void => {
    if (!keys) return;
    for (const k of keys) if (k && !map.has(k)) map.set(k, at);
  };
  const offersOn = (board: string | null): readonly TurnOffer[] =>
    board && turn && positionOf(turn.board) === positionOf(board) ? turn.offers : [];
  const dropAfter = (map: Map<string, number>, target: number): void => {
    for (const [k, at] of map) if (at > target) map.delete(k);
  };

  return {
    current: (): GameStory => ({ gameId: id, ply, said, sentences }),
    commit(at: number, s: StorySaid): void {
      put(said, s.claims, at);
      put(sentences, s.sentences, at);
    },
    offer(board: string, o: TurnOffer): void {
      if (!turn || positionOf(turn.board) !== positionOf(board)) turn = { board, offers: [] };
      turn.offers.push(o);
    },
    heard(board: string | null): StoryHeard {
      const offers = offersOn(board);
      const claims = new Set(said.keys());
      const spoken = new Set(sentences.keys());
      for (const o of offers) {
        for (const c of o.claims ?? []) claims.add(c);
        for (const k of o.sentences ?? []) spoken.add(k);
      }
      return { has: (c: string): boolean => claims.has(c), claims, sentences: spoken };
    },
    commitKept(at: number, board: string, kept: ReadonlyArray<{ text: string }>): void {
      for (const o of offersOn(board)) {
        if (!keptCarries(kept, o.text)) continue;
        put(said, o.claims, at);
        put(sentences, o.sentences, at);
      }
    },
    reach(at: number): void {
      ply = Math.max(0, at);
    },
    rewind(target: number): void {
      const to = Math.max(0, target);
      dropAfter(said, to);
      dropAfter(sentences, to);
      ply = Math.min(ply, to);
      turn = null;
    },
    jump(at: number): void {
      const to = Math.max(0, at);
      for (const map of [said, sentences]) for (const [k, p] of map) if (p > to) map.set(k, to);
      ply = to;
      turn = null;
    },
    newGame(next: string): void {
      id = next;
      ply = 0;
      said = new Map();
      sentences = new Map();
      turn = null;
    },
  };
}
