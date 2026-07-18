/**
 * openingMatchup
 * --------------
 * Resolves a "teach X vs Y" request into a real line where the two openings
 * COLLIDE on one board, by CONSTRUCTING it from each opening's own DB setup
 * (David 2026-07-18: "Make sure the coach can show or teach any two
 * different openings against each other … use the DBs and stockfish", and
 * "when they can't meet the coach should say that but then use stockfish to
 * still make the request happen … show what happens and teach the best
 * lines").
 *
 * Why construction, not a named DB entry: the DB's `King's Indian Attack:
 * Sicilian Variation` entry is `e4 e6 d3 d5…` — a French move order, NOT the
 * Dragon the user asked for ("it played a French"). So instead we take each
 * opening's OWN setup — White's moves from the White opening's line, Black's
 * from the Black opening's — and merge them, which yields the actual two
 * setups colliding:
 *   KIA vs Sicilian Dragon → e4 c5 d3 d6 Nd2 Nc6 Ngf3 g6 g3 Bg7 Bg2 Nf6 …
 * Every move is the DB's (G3-clean); Stockfish bridges a clash and extends
 * toward a middlegame. When the two don't NORMALLY meet (QG vs the Sicilian,
 * Italian vs the French), we say so honestly and still show it.
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

/** Normalize a name for comparison: possessive apostrophes folded
 *  ("King's" → "kings"), punctuation → space, lower-cased. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]s\b/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Which side plays this opening. Same name-based heuristic
 *  `openingDetectionService` uses for `studentSide`. "Attack" systems are
 *  White even inside a Black-named family ("King's Indian ATTACK", "Panov
 *  Attack"). */
export function inferMatchupColor(name: string): 'white' | 'black' {
  const l = name.toLowerCase();
  if (/\battack\b/.test(l) && !/defen[cs]e\s*:/.test(l)) return 'white';
  if (/\battack\b/.test(l) && /defen[cs]e\s*:/.test(l)) return 'white';
  const isBlack =
    /\bdefen[cs]e\b/.test(l) ||
    /\b(sicilian|french|caro|pirc|modern|alekhine|scandinavian|king.s indian|queen.s indian|nimzo|grunfeld|gr[üu]nfeld|benoni|benko|dutch|philidor|petroff|petrov|slav|two knights|dragon)\b/.test(l);
  return isBlack ? 'black' : 'white';
}

/** The DEEPEST DB entry that is genuinely THIS opening — its normalized
 *  name equals the opening or begins with it (a real child line, e.g.
 *  "King's Indian Attack: Sicilian Variation" for KIA). This is the setup
 *  source; its plies for the relevant colour ARE that opening's development.
 *  NOT a token-overlap match (which wrongly pulled a "King's Indian Defense:
 *  …Benko Attack" for "King's Indian Attack"). */
function setupEntry(name: string): OpeningEntry | null {
  const key = normalizeName(name);
  let best: OpeningEntry | null = null;
  let bestPlies = -1;
  for (const e of ENTRIES) {
    const n = normalizeName(e.name);
    if (n !== key && !n.startsWith(key + ' ')) continue;
    const plies = e.pgn.split(/\s+/).filter(Boolean).length;
    if (plies > bestPlies) {
      bestPlies = plies;
      best = e;
    }
  }
  return best;
}

/** Extract one colour's plies from a PGN move list — that colour's setup. */
function sidePlies(pgn: string, color: 'white' | 'black'): string[] {
  const moves = pgn.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < moves.length; i++) {
    if ((i % 2 === 0) === (color === 'white')) out.push(moves[i]);
  }
  return out;
}

function resolveSide(raw: string): { name: string; eco: string } | null {
  const s = raw.replace(/^(?:the|a|an)\s+/i, '').trim();
  if (!s) return null;
  const direct = resolveOpeningEntry(s);
  if (direct) return { name: direct.canonicalName, eco: direct.eco };
  const f = fuzzyMatchOpening(s);
  const top = f.candidates[0];
  return top ? { name: top.canonicalName, eco: top.eco } : null;
}

export interface OpeningMatchupPlan {
  query: string;
  whiteName: string;
  blackName: string;
  /** White's setup moves (from the White opening's DB line). */
  whiteSetup: string[];
  /** Black's setup moves (from the Black opening's DB line). */
  blackSetup: string[];
  eco: string;
  /** Do the two openings normally meet? Drives the honest note only. */
  meets: boolean;
  /** Both openings are the same colour → they can't share a board. */
  sameColor: boolean;
  /** Honest "…don't normally meet…" note (null when they meet or when
   *  sameColor — the caller phrases the same-colour case itself). */
  note: string | null;
}

/**
 * Plan a "X vs Y" matchup. Sync + deterministic (no engine). Returns null
 * when the query isn't a matchup (no separator) or a side can't be resolved
 * — the caller falls back to normal single-opening handling.
 */
export function planOpeningMatchup(rawQuery: string): OpeningMatchupPlan | null {
  const query = (rawQuery ?? '').trim();
  const sides = query.split(MATCHUP_SPLIT_RE);
  if (sides.length !== 2) return null;

  const a = resolveSide(sides[0]);
  const b = resolveSide(sides[1]);
  if (!a || !b) return null;
  if (a.name === b.name) return null;

  const ca = inferMatchupColor(a.name);
  const cb = inferMatchupColor(b.name);

  if (ca === cb) {
    // Two same-colour openings physically can't face each other.
    return {
      query,
      whiteName: a.name,
      blackName: b.name,
      whiteSetup: [],
      blackSetup: [],
      eco: '',
      meets: false,
      sameColor: true,
      note: null,
    };
  }

  const whiteName = ca === 'white' ? a.name : b.name;
  const blackName = ca === 'black' ? a.name : b.name;
  const whiteEntry = setupEntry(whiteName);
  const blackEntry = setupEntry(blackName);
  if (!whiteEntry || !blackEntry) return null;

  // Do they NORMALLY meet? The principled test is first-move compatibility:
  // a Black defense is built to answer a specific White first move (the
  // Sicilian answers 1.e4, the KID answers 1.d4), so the two systems meet
  // iff White's actual first move IS that move. "Queen's Gambit (1.d4) vs
  // the Sicilian (answers 1.e4)" → d4 ≠ e4 → they don't normally meet;
  // "London (1.d4) vs the KID (answers 1.d4)" → they do. This drives only
  // the honest note — the line is always constructed either way.
  const whiteFirst = whiteEntry.pgn.split(/\s+/).filter(Boolean)[0] ?? '';
  const blackAnswersFirst = blackEntry.pgn.split(/\s+/).filter(Boolean)[0] ?? '';
  const meets = whiteFirst !== '' && whiteFirst === blackAnswersFirst;
  const note = meets
    ? null
    : `The ${whiteName} and the ${blackName} don't normally meet — they come from different first moves — but here's what it looks like when White sets up the ${whiteName} and Black answers with the ${blackName}, with the engine finding the best moves where the two systems collide.`;

  return {
    query,
    whiteName,
    blackName,
    whiteSetup: sidePlies(whiteEntry.pgn, 'white'),
    blackSetup: sidePlies(blackEntry.pgn, 'black'),
    eco: whiteEntry.eco || blackEntry.eco || '',
    meets,
    sameColor: false,
    note,
  };
}

/**
 * Build the concrete matchup LINE from a plan (async — uses Stockfish to
 * bridge a setup clash and extend toward a middlegame). Play each side's
 * setup moves in order, skipping any illegal in the current position (the
 * opponent deviated); when a side has no legal setup move left, or once
 * both setups are established, Stockfish supplies best-play. Best-effort:
 * engine unavailable / error → the chess.js merge of the two setups stands
 * (still a real ~16–20-ply collision, G3-clean).
 */
export async function buildMatchupLine(
  plan: OpeningMatchupPlan,
  targetPlies = 20,
): Promise<string[]> {
  if (plan.sameColor) return [];
  const g = new Chess();
  const out: string[] = [];
  let wi = 0;
  let bi = 0;

  const nextSetupMove = (setup: string[], from: number): { san: string; next: number } | null => {
    const legal = new Set(g.moves());
    let idx = from;
    while (idx < setup.length) {
      const san = setup[idx];
      idx += 1;
      if (legal.has(san)) return { san, next: idx };
    }
    return null;
  };

  const engineMove = async (): Promise<string | null> => {
    try {
      const uci = await stockfishEngine.getBestMove(g.fen(), 350);
      if (!uci || uci.length < 4) return null;
      const mv = g.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
      return mv ? mv.san : null;
    } catch {
      return null;
    }
  };

  for (let ply = 0; ply < targetPlies; ply += 1) {
    if (g.isGameOver()) break;
    const white = g.turn() === 'w';
    const setup = white ? plan.whiteSetup : plan.blackSetup;
    const from = white ? wi : bi;
    const scripted = nextSetupMove(setup, from);
    if (scripted) {
      g.move(scripted.san);
      out.push(scripted.san);
      if (white) wi = scripted.next; else bi = scripted.next;
      continue;
    }
    // No legal setup move for this side — bridge/extend with the engine.
    const eng = await engineMove();
    if (!eng) break; // engine unavailable → stop; the merged setup prefix stands
    out.push(eng);
  }

  return out;
}
