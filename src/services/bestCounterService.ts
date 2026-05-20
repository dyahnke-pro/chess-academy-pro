// Best-counter + deep-position stats service.
//
// Loads docs/audit-runs/2026-05-19-best-counters/best-counters-shallow.json
// (signature-depth best response per opening, from Lichess Masters /
// 2200+ player DB) and best-counters.json (deep-tabiya stats), exposes
// lookups for the coach grounding pipeline + opening annotation cards.
//
// The data is read-only static (committed to repo) — no runtime
// network calls. Coach grounding gets concrete master-game stats
// instantly per CLAUDE.md narration rule (name the concept every time).

import bestCountersShallowData from '../../docs/audit-runs/2026-05-19-best-counters/best-counters-shallow.json';
import bestCountersDeepData from '../../docs/audit-runs/2026-05-19-best-counters/best-counters.json';

interface BestCounterEntry {
  openingId: string;
  source?: string;
  openingName?: string;
  openingColor?: string;
  pliesAtQuery?: number;
  dbSource?: string;
  tailFen?: string;
  sideToMove?: 'white' | 'black';
  totalGamesAtPosition?: number;
  bestResponse?: {
    san: string;
    uci?: string;
    games: number;
    winsForResponder: number;
    lossesForResponder: number;
    draws: number;
    winRate: number;
    expectedScore?: number;
  };
  bestResponseFen?: string;
  repGame?: {
    id: string;
    white: string;
    whiteRating: number | null;
    black: string;
    blackRating: number | null;
    year: number;
    month?: string;
    result: string;
    sourceUrl: string;
    fullPgn?: string | null;
  };
  error?: string;
}

interface BestCountersFile {
  generatedAt: string;
  totalProcessed?: number;
  results: BestCounterEntry[];
}

const shallowFile = bestCountersShallowData as BestCountersFile;
const deepFile = bestCountersDeepData as BestCountersFile;

const shallowByOpening = new Map<string, BestCounterEntry>();
for (const e of shallowFile.results) {
  if (e.openingId && e.bestResponse) shallowByOpening.set(e.openingId, e);
}

const deepByOpening = new Map<string, BestCounterEntry>();
for (const e of deepFile.results) {
  if (e.openingId && e.bestResponse) deepByOpening.set(e.openingId, e);
}

/** Returns the signature-depth best counter (typically at ply 5-8 where
 *  the opening's identity is established). Use this for "the opening's
 *  defining response" — what the responder should play to counter the
 *  named opening at the surface level. */
export function getBestCounter(openingId: string): BestCounterEntry | null {
  return shallowByOpening.get(openingId) ?? null;
}

/** Returns the deep-tabiya stats (typically at ply 10-14 inside a specific
 *  variation). Use this for "in this exact theoretical position, the most
 *  popular continuation is X." */
export function getDeepPositionStats(openingId: string): BestCounterEntry | null {
  return deepByOpening.get(openingId) ?? null;
}

/** Returns BOTH signature + deep entries combined, for use in coach
 *  system-prompt injection and annotation card display. */
export function getOpeningMasterContext(openingId: string): {
  signature: BestCounterEntry | null;
  deep: BestCounterEntry | null;
} {
  return {
    signature: shallowByOpening.get(openingId) ?? null,
    deep: deepByOpening.get(openingId) ?? null,
  };
}

/** Formats a best-counter entry as a 1-sentence concept-level narration
 *  string suitable for either coach system-prompt injection or static
 *  annotation card display. Per CLAUDE.md narration rule: name the
 *  concept (best response SAN, sample size, score). No filler. */
export function formatBestCounterAsNarration(e: BestCounterEntry): string | null {
  if (!e.bestResponse) return null;
  const r = e.bestResponse;
  const stm = e.sideToMove === 'white' ? 'White' : 'Black';
  const scorePct = ((r.expectedScore ?? r.winRate) * 100).toFixed(0);
  const counter = `${stm}'s most reliable response in master games is ${r.san} (expected score ${scorePct}% across ${r.games.toLocaleString()} games).`;
  if (e.repGame) {
    const game = `Master example: ${e.repGame.white} vs ${e.repGame.black} (${e.repGame.year}), ${e.repGame.result}.`;
    return `${counter} ${game}`;
  }
  return counter;
}

/** Formats just the master-game reference for display, given an entry. */
export function formatRepGameRef(e: BestCounterEntry): string | null {
  if (!e.repGame) return null;
  return `${e.repGame.white} (${e.repGame.whiteRating ?? '?'}) vs ${e.repGame.black} (${e.repGame.blackRating ?? '?'}), ${e.repGame.year}, ${e.repGame.result}`;
}

/** Lookup count statistics — for diagnostics. */
export function getStats(): { shallow: number; deep: number } {
  return { shallow: shallowByOpening.size, deep: deepByOpening.size };
}
