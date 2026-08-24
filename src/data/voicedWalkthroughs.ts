/**
 * Voiced walkthroughs — the our-words DNA corpus, merged into branching
 * WalkthroughTrees by `scripts/build-voiced-walkthroughs.mjs` and shipped as
 * `voiced-walkthroughs.json`.
 *
 * This is the resolver the "Learn with Coach" (teach me X) flow calls FIRST:
 * when a student asks to be taught an opening we have voiced, we serve that
 * hand-authored, board-true walkthrough instead of generating one. Moves come
 * from real games (chess.js-legal at build time); the prose is the DNA note
 * (G0/G3 — nothing generated at runtime).
 */
import type { WalkthroughTree } from '../types/walkthroughTree';
import voicedData from './voiced-walkthroughs.json';

interface VoicedEntry {
  id: string;
  openingName: string;
  studentSide: 'white' | 'black';
  videoIds: string[];
  narratedNodes: number;
  totalNodes: number;
  tree: WalkthroughTree & { studentSide?: 'white' | 'black' };
}

const ENTRIES = voicedData as unknown as VoicedEntry[];

/** Stop-words dropped when matching a request against an opening name, so
 *  "teach me the caro-kann" and "Caro-Kann Defense: Fantasy Variation" line
 *  up on their content tokens. */
const STOP = new Set([
  'the', 'a', 'an', 'please', 'teach', 'me', 'us', 'my', 'your', 'about',
  'on', 'in', 'with', 'opening', 'defense', 'defence', 'game', 'variation',
  'line', 'system', 'attack', 'and', 'of', 'vs', 'against', 'play', 'learn',
]);

/** Tokenize to content words: lowercase, split on any non-alphanumeric
 *  (so hyphens/colons/apostrophes break "Caro-Kann" → caro, kann and
 *  "King's Indian" → king, s, indian), drop stop-words and bare digits. */
function tokens(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
}

/** Score how well a request matches an entry: number of request tokens that
 *  appear in the entry's name tokens. Requires the request's tokens to be a
 *  subset-ish of the name (every request token present) for a *specific*
 *  match; otherwise falls back to family overlap. */
function scoreMatch(reqTokens: string[], nameTokens: Set<string>): number {
  if (reqTokens.length === 0) return 0;
  let hits = 0;
  for (const t of reqTokens) if (nameTokens.has(t)) hits += 1;
  return hits;
}

/**
 * Resolve a teach request to a voiced walkthrough tree, or null.
 *
 * Strategy: score every voiced entry by content-token overlap with the
 * request. The winner is the highest score; ties break toward the entry with
 * the most narrated nodes (the richest lesson). A request must land at least
 * one content token on the winner — a zero-overlap "best" is no match.
 *
 * "caro-kann" → Caro-Kann Fantasy (deepest Caro). "french advance" → the
 * French Advance entry (both tokens hit). "sicilian najdorf" → the Najdorf.
 */
export function resolveVoicedWalkthrough(query: string): WalkthroughTree | null {
  if (!query || !query.trim()) return null;
  // A "X vs Y" matchup is NOT a single-opening lesson — leave it to the
  // matchup planner (planOpeningMatchup), which constructs the two openings
  // colliding on one board. Declining here keeps a fall-through from ever
  // collapsing a matchup into one side's voiced walkthrough.
  if (/\b(?:vs\.?|versus|against)\b/i.test(query)) return null;
  const reqTokens = tokens(query);
  if (reqTokens.length === 0) return null;

  let best: VoicedEntry | null = null;
  let bestScore = 0;
  for (const e of ENTRIES) {
    const nameTokens = new Set(tokens(e.openingName));
    const score = scoreMatch(reqTokens, nameTokens);
    if (score > bestScore || (score === bestScore && score > 0 && best && e.narratedNodes > best.narratedNodes)) {
      best = e;
      bestScore = score;
    }
  }
  if (!best || bestScore === 0) return null;
  // carry studentSide onto the tree so the board orients correctly
  return { ...best.tree, studentSide: best.studentSide };
}

/** The full catalogue — for a "what can you teach me" index / greeting. */
export function listVoicedWalkthroughs(): {
  id: string;
  openingName: string;
  studentSide: 'white' | 'black';
  narratedNodes: number;
  games: number;
}[] {
  return ENTRIES.map((e) => ({
    id: e.id,
    openingName: e.openingName,
    studentSide: e.studentSide,
    narratedNodes: e.narratedNodes,
    games: e.videoIds.length,
  }));
}

/** Lookup by the stable id used on the /voiced index. */
export function getVoicedTreeById(id: string): (WalkthroughTree & { studentSide?: 'white' | 'black' }) | null {
  const e = ENTRIES.find((x) => x.id === id);
  return e ? { ...e.tree, studentSide: e.studentSide } : null;
}
