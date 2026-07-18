/**
 * openingMatchup
 * --------------
 * Resolves a "teach X vs Y" request into a SINGLE line where the two
 * openings actually collide on one board — grounded in the Lichess DB and
 * (optionally) extended with Stockfish (David 2026-07-18: "Make sure the
 * coach can show or teach any two different openings against each other.
 * Coach should use the DBs and stockfish.").
 *
 * Why not just merge two opening PGNs: an opening's identity often depends
 * on the OPPONENT's moves — the "Italian Game" REQUIRES 1…e5, so pasting
 * White's Italian moves over a Sicilian Black setup produces a Sicilian,
 * not an Italian. Merging arbitrary lines either mislabels the result or
 * invents moves (G3 violation). So instead:
 *
 *   Tier 1 — NAMED DB MATCHUP ENTRY. The DB already carries real matchups
 *   as single entries: "King's Indian Attack: Sicilian Variation" (KIA vs
 *   the Sicilian), "Caro-Kann Defense: Panov-Botvinnik…", "Indian Defense:
 *   London System" (London vs the KID). We find the deepest entry whose
 *   name carries a distinctive token of BOTH sides and teach it. Every move
 *   is the DB's — G3-clean.
 *
 *   No matchup line → HONEST FAILURE (never an invented hybrid). Two
 *   openings that can't meet — both the same colour, or no book line exists
 *   (Italian vs Sicilian, Ruy vs French) — get a plain "they don't have a
 *   standard matchup" answer plus an offer to teach either on its own.
 *
 * `extendMatchupToMiddlegame` (async) continues a short named spine toward
 * a middlegame with `stockfishEngine.getBestMove` — real, legal engine
 * moves, best-effort (engine unavailable → the DB spine stands).
 */
import { Chess } from 'chess.js';
import openingsData from '../data/openings-lichess.json';
import { resolveOpeningEntry } from './openingDetectionService';
import { fuzzyMatchOpening } from './openingFuzzyMatcher';
import { stockfishEngine } from './stockfishEngine';

interface OpeningEntry {
  name: string;
  eco: string;
  pgn: string;
}

const ENTRIES = openingsData as OpeningEntry[];

/** Matchup separators — mirrors openingFuzzyMatcher's. */
const MATCHUP_SPLIT_RE = /\s+(?:vs\.?|versus|against)\s+/i;

/** Generic opening words that don't distinguish one opening from another —
 *  dropped when comparing two names so "King's Indian Attack" contributes
 *  {kings, indian} not {attack}. */
const GENERIC_TOKENS = new Set([
  'defense', 'defence', 'variation', 'attack', 'game', 'system', 'opening',
  'gambit', 'line', 'main', 'with', 'the', 'of', 'and',
]);

/** Which side plays this opening. Same name-based heuristic
 *  `openingDetectionService` uses for `studentSide`, so matchup ordering
 *  agrees with how a single-opening lesson would orient the board. */
export function inferMatchupColor(name: string): 'white' | 'black' {
  const l = name.toLowerCase();
  // An "Attack" is a WHITE system even inside a Black-named family:
  // "King's Indian ATTACK" (vs "King's Indian Defense"), "Panov Attack"
  // (White's answer to the Caro-Kann). The attack guard wins.
  if (/\battack\b/.test(l) && !/\bdefen[cs]e\b.*\battack\b/.test(l)) {
    // "…Attack" not preceded by a "Defense:" that owns it → White system.
    if (!/defen[cs]e\s*:/.test(l)) return 'white';
  }
  if (/\battack\b/.test(l) && /defen[cs]e\s*:/.test(l)) {
    // "Caro-Kann Defense: Panov Attack" — the ATTACK is White's; the entry
    // is the White side of a Black-named opening.
    return 'white';
  }
  const isBlack =
    /\bdefen[cs]e\b/.test(l) ||
    /\b(sicilian|french|caro|pirc|modern|alekhine|scandinavian|king.s indian|queen.s indian|nimzo|grunfeld|gr[üu]nfeld|benoni|benko|dutch|philidor|petroff|petrov|slav|two knights|dragon)\b/.test(l);
  return isBlack ? 'black' : 'white';
}

function distinctiveTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !GENERIC_TOKENS.has(t));
}

export interface OpeningMatchup {
  /** 'line' — a real matchup line to teach. 'incompatible' — the two can't
   *  face each other (same colour) or have no book matchup. */
  kind: 'line' | 'incompatible';
  query: string;
  whiteName: string;
  blackName: string;
  /** 'line' only — the DB entry name + moves to teach. */
  canonicalName?: string;
  eco?: string;
  moves?: string[];
  source?: 'named-entry';
  /** 'incompatible' only — the honest explanation shown to the student. */
  reason?: string;
}

/** Resolve one side of the matchup to a canonical opening (alias- and
 *  fuzzy-aware, leading article stripped). */
function resolveSide(raw: string): { name: string; eco: string } | null {
  const s = raw.replace(/^(?:the|a|an)\s+/i, '').trim();
  if (!s) return null;
  const direct = resolveOpeningEntry(s);
  if (direct) return { name: direct.canonicalName, eco: direct.eco };
  const f = fuzzyMatchOpening(s);
  const top = f.candidates[0];
  return top ? { name: top.canonicalName, eco: top.eco } : null;
}

/** Deepest DB entry whose name carries a distinctive token of BOTH sides —
 *  the real, named matchup line. Grounded (G3): moves are the DB's. */
function findNamedMatchup(aTokens: string[], bTokens: string[]): OpeningEntry | null {
  if (aTokens.length === 0 || bTokens.length === 0) return null;
  let best: OpeningEntry | null = null;
  let bestScore = -1;
  for (const e of ENTRIES) {
    const n = e.name.toLowerCase();
    const aHit = aTokens.filter((t) => n.includes(t)).length;
    const bHit = bTokens.filter((t) => n.includes(t)).length;
    if (aHit === 0 || bHit === 0) continue;
    // Prefer entries that match MORE of both names, then the deeper line.
    const plies = e.pgn.split(/\s+/).filter(Boolean).length;
    const score = (aHit + bHit) * 1000 + plies;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/**
 * Resolve a "X vs Y" matchup. Returns null when the query isn't a matchup
 * (no separator) or a side can't be resolved — the caller then falls back
 * to its normal single-opening handling.
 */
export function resolveOpeningMatchup(rawQuery: string): OpeningMatchup | null {
  const query = (rawQuery ?? '').trim();
  const sides = query.split(MATCHUP_SPLIT_RE);
  if (sides.length !== 2) return null;

  const a = resolveSide(sides[0]);
  const b = resolveSide(sides[1]);
  if (!a || !b) return null;
  if (a.name === b.name) return null; // "Sicilian vs the Sicilian" — not a matchup

  const ca = inferMatchupColor(a.name);
  const cb = inferMatchupColor(b.name);

  if (ca === cb) {
    // Two same-colour openings can't sit on opposite sides of one board.
    return {
      kind: 'incompatible',
      query,
      whiteName: a.name,
      blackName: b.name,
      reason: `${a.name} and ${b.name} are both ${ca === 'white' ? 'White' : 'Black'} openings, so they can't face each other on one board.`,
    };
  }

  const whiteName = ca === 'white' ? a.name : b.name;
  const blackName = ca === 'black' ? a.name : b.name;

  const named = findNamedMatchup(distinctiveTokens(a.name), distinctiveTokens(b.name));
  if (named && named.pgn.split(/\s+/).filter(Boolean).length >= 5) {
    return {
      kind: 'line',
      query,
      whiteName,
      blackName,
      canonicalName: named.name,
      eco: named.eco,
      moves: named.pgn.split(/\s+/).filter(Boolean),
      source: 'named-entry',
    };
  }

  // No book matchup — be honest (empty > invented). The caller offers each
  // side to learn on its own.
  return {
    kind: 'incompatible',
    query,
    whiteName,
    blackName,
    reason: `I don't have a standard book line for ${whiteName} against ${blackName} in the database — they don't have a common matchup.`,
  };
}

/**
 * Extend a grounded matchup spine toward a middlegame with Stockfish
 * best-play (David: "use the DBs and stockfish"). Real, legal engine moves
 * only. Best-effort: engine unavailable / any error → the input spine
 * stands unchanged.
 */
export async function extendMatchupToMiddlegame(
  moves: string[],
  targetPlies = 16,
): Promise<string[]> {
  if (moves.length >= targetPlies) return moves;
  const g = new Chess();
  for (const m of moves) {
    try {
      if (!g.move(m)) return moves;
    } catch {
      return moves;
    }
  }
  const out = [...moves];
  try {
    while (out.length < targetPlies && !g.isGameOver()) {
      const uci = await stockfishEngine.getBestMove(g.fen(), 400);
      if (!uci || uci.length < 4) break;
      const mv = g.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
      if (!mv) break;
      out.push(mv.san);
    }
  } catch {
    /* engine unavailable — ship the DB spine as-is */
  }
  return out;
}
