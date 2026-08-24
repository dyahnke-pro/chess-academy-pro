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
import voicedMatchupData from './voiced-matchups.json';

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

// ─── Matchup walkthroughs (built from real videos of a pairing) ────────────

interface MatchupEntry {
  id: string;
  matchupName: string;      // "King's Indian Attack vs French Defense"
  whiteSystem: string;
  blackDefense: string;
  videoIds: string[];
  narratedNodes: number;
  totalNodes: number;
  tree: WalkthroughTree;
}
const MATCHUPS = voicedMatchupData as unknown as MatchupEntry[];

/** Short aliases → canonical family. Tokens use SINGULAR "king"/"queen" to
 *  match the apostrophe-stripped tokenization of "King's"/"Queen's", and KEEP
 *  "attack"/"defense" (they distinguish KIA from KID). */
const FAMILY_ALIASES: Record<string, string> = {
  kia: 'king indian attack',
  kid: 'king indian defense',
  qgd: 'queen gambit', qga: 'queen gambit', qg: 'queen gambit',
  najdorf: 'sicilian', dragon: 'sicilian dragon', sicilian: 'sicilian',
  caro: 'caro kann', carokann: 'caro kann', scandi: 'scandinavian',
  spanish: 'ruy lopez', ruy: 'ruy lopez', italian: 'italian', giuoco: 'italian',
  french: 'french', london: 'london', vienna: 'vienna', scotch: 'scotch',
  alekhine: 'alekhine', pirc: 'pirc', modern: 'modern',
};

/** Stop-words for FAMILY matching. Unlike the single-opening tokenizer, this
 *  KEEPS attack/defense/gambit/game — those are what tell KIA from KID and
 *  Queen's Gambit from Queen's Pawn. Also folds possessive "king's" → "king". */
const MATCHUP_STOP = new Set([
  'the', 'a', 'an', 'vs', 'versus', 'against', 'opening', 'variation', 'line',
  'play', 'teach', 'me', 'with', 'show', 'us', 'my', 'and', 'of',
]);

function famTokens(text: string): string[] {
  const raw = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const alias = FAMILY_ALIASES[raw.replace(/\s+/g, '')];
  return (alias ?? raw)
    .split(/\s+/)
    .filter((w) => w.length > 1 && w !== 's' && !MATCHUP_STOP.has(w));
}

/** Does a requested side ("KIA", "the French") name this family? All the
 *  side's content tokens must appear in the family's tokens. */
function sideNamesFamily(sideText: string, family: string): boolean {
  const s = famTokens(sideText);
  if (s.length === 0) return false;
  const fam = new Set(famTokens(family));
  return s.every((t) => fam.has(t));
}

const MATCHUP_SPLIT = /\s+(?:vs\.?|versus|against)\s+/i;

/**
 * Resolve a "X vs Y" request to a VOICED matchup walkthrough built from the
 * real videos we have of that pairing — or null when we have none (the caller
 * then falls back to the constructed line via planOpeningMatchup).
 *
 * Sides match in EITHER order: "KIA vs French" and "French vs KIA" both find
 * King's Indian Attack (White) vs French Defense (Black).
 */
export function resolveVoicedMatchup(query: string): (WalkthroughTree & { studentSide?: 'white' | 'black' }) | null {
  if (!query || !MATCHUP_SPLIT.test(query)) return null;
  const parts = query.split(MATCHUP_SPLIT).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  let best: MatchupEntry | null = null;
  for (const m of MATCHUPS) {
    const straight = sideNamesFamily(a, m.whiteSystem) && sideNamesFamily(b, m.blackDefense);
    const swapped = sideNamesFamily(a, m.blackDefense) && sideNamesFamily(b, m.whiteSystem);
    if (straight || swapped) {
      if (!best || m.narratedNodes > best.narratedNodes) best = m;
    }
  }
  if (!best) return null;
  return { ...best.tree, studentSide: 'white' };
}

/** The matchup catalogue — pairings we have real video(s) for. */
export function listVoicedMatchups(): { id: string; matchupName: string; narratedNodes: number; games: number }[] {
  return MATCHUPS.map((m) => ({ id: m.id, matchupName: m.matchupName, narratedNodes: m.narratedNodes, games: m.videoIds.length }));
}
