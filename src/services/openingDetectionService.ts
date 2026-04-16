import openingsData from '../data/openings-lichess.json';
import type { DetectedOpening } from '../types';

interface OpeningEntry {
  eco: string;
  name: string;
  pgn: string;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  opening: OpeningEntry | null;
}

let cachedTrie: TrieNode | null = null;

function buildTrie(entries: OpeningEntry[]): TrieNode {
  const root: TrieNode = { children: new Map(), opening: null };

  for (const entry of entries) {
    const moves = entry.pgn.split(/\s+/).filter(Boolean);
    let node = root;

    for (const move of moves) {
      if (!node.children.has(move)) {
        node.children.set(move, { children: new Map(), opening: null });
      }
      const child = node.children.get(move);
      if (!child) break;
      node = child;
    }
    // Always overwrite — longer PGN entries that share a prefix will
    // set their own node deeper in the trie, so the deepest match wins.
    node.opening = entry;
  }

  return root;
}

function getTrie(): TrieNode {
  if (!cachedTrie) {
    cachedTrie = buildTrie(openingsData as OpeningEntry[]);
  }
  return cachedTrie;
}

/**
 * Detect the opening from a list of SAN moves (e.g. from chess.js .history()).
 * Returns the longest matching opening, or null if no match found.
 */
export function detectOpening(moveHistory: string[]): DetectedOpening | null {
  const trie = getTrie();
  let node = trie;
  let lastMatch: { opening: OpeningEntry; plyCount: number } | null = null;

  for (let i = 0; i < moveHistory.length; i++) {
    const move = moveHistory[i];
    const child = node.children.get(move);
    if (!child) break;

    node = child;
    if (node.opening) {
      lastMatch = { opening: node.opening, plyCount: i + 1 };
    }
  }

  if (!lastMatch) return null;

  return {
    eco: lastMatch.opening.eco,
    name: lastMatch.opening.name,
    plyCount: lastMatch.plyCount,
  };
}

/**
 * Check if the current move sequence is still within known opening theory.
 */
export function isStillInOpening(moveHistory: string[]): boolean {
  const trie = getTrie();
  let node = trie;

  for (const move of moveHistory) {
    const child = node.children.get(move);
    if (!child) return false;
    node = child;
  }

  return node.children.size > 0;
}

/**
 * Given an opening name (e.g. "French Defense"), find the main-line PGN moves.
 * Returns the longest (most specific) matching line as an array of SAN moves,
 * or null if no match. If `preferMainLine` is true (default), picks the
 * canonical shortest match (e.g. "e4 e6" for French Defense) to start the
 * opening and then the longest continuation to guide play deeper.
 */
export function getOpeningMoves(openingName: string): string[] | null {
  const entries = openingsData as OpeningEntry[];
  const lower = openingName.toLowerCase();

  // Exact match wins — when the user says "King's Indian Defense" we
  // want the bare main line, not the longest "King's Indian Defense:
  // Fianchetto, Panno Variation" sub-line. Without this preference
  // the longest-PGN reducer below picked an obscure variation that
  // diverged from the user's actual intent on move 3-4 and
  // tryOpeningBookMove silently fell off the line.
  const exact = entries.filter((e) => e.name.toLowerCase() === lower);
  if (exact.length > 0) {
    const best = exact.reduce((a, b) => (a.pgn.length > b.pgn.length ? a : b));
    return best.pgn.split(/\s+/).filter(Boolean);
  }

  // Common-prefix match — "King's Indian" matches "King's Indian
  // Defense" / "King's Indian Attack". Prefer the bare entry when
  // present (shortest name in the prefix bucket → least specific →
  // closest to the canonical main line). Fall back to longest PGN.
  const prefix = entries.filter((e) => e.name.toLowerCase().startsWith(lower));
  if (prefix.length > 0) {
    const bare = prefix.find((e) => e.name.toLowerCase() === lower);
    const best = bare ?? prefix.reduce((a, b) => {
      // Prefer shorter NAME (the bare opening) over longer PGN here.
      if (a.name.length !== b.name.length) return a.name.length < b.name.length ? a : b;
      return a.pgn.length > b.pgn.length ? a : b;
    });
    return best.pgn.split(/\s+/).filter(Boolean);
  }

  // Fallback: substring match — same shorter-name preference.
  const fuzzy = entries.filter((e) => e.name.toLowerCase().includes(lower));
  if (fuzzy.length === 0) return null;
  const best = fuzzy.reduce((a, b) => {
    if (a.name.length !== b.name.length) return a.name.length < b.name.length ? a : b;
    return a.pgn.length > b.pgn.length ? a : b;
  });
  return best.pgn.split(/\s+/).filter(Boolean);
}

/**
 * Given a requested opening's move list and the current game history,
 * return the next book move the AI should play, or null if we've left the book.
 * Only returns a move if it's the AI's turn according to the opening line.
 *
 * @param openingMoves - Full SAN move list for the opening (from getOpeningMoves)
 * @param gameHistory - Current game SAN history (from chess.js .history())
 * @param aiColor - 'white' | 'black' — which side the AI is playing
 */
export function getNextOpeningBookMove(
  openingMoves: string[],
  gameHistory: string[],
  aiColor: 'white' | 'black',
): string | null {
  const nextPly = gameHistory.length;

  // Check that all game moves so far match the opening line
  for (let i = 0; i < gameHistory.length; i++) {
    if (i >= openingMoves.length) return null; // Past the book
    if (gameHistory[i] !== openingMoves[i]) return null; // Deviated from book
  }

  // Check if the next move is in the book
  if (nextPly >= openingMoves.length) return null;

  // Check if it's the AI's turn (ply 0 = white, ply 1 = black, etc.)
  const isWhiteTurn = nextPly % 2 === 0;
  const isAiTurn = (aiColor === 'white' && isWhiteTurn) || (aiColor === 'black' && !isWhiteTurn);
  if (!isAiTurn) return null;

  return openingMoves[nextPly];
}

/** Reset cached trie (for testing). */
export function _resetTrie(): void {
  cachedTrie = null;
}
