import repertoireData from '../data/repertoire.json';
import openingManifests from '../data/opening-manifests.json';
import { buildVariationTabs } from './variationTabs';
import type { OpeningRecord, OpeningVariation } from '../types';

// Route a raw Lichess ECO entry that is a VARIATION / SUBLINE of a curated
// masterclass to that masterclass's detail page with the correct variation tab
// pre-selected (David 2026-07-03: "have any opening that is a variation or
// subline navigate the CORRECT TAB"). The bare ECO reference page then never
// renders for a line we actually teach.
//
// The matcher is CONSERVATIVE on purpose — a wrong redirect (sending a student
// to the wrong lesson) is worse than the bare reference page, so anything
// ambiguous or only-generically-matching is left alone.

interface RepEntry {
  id: string;
  pgn: string;
  name?: string;
  variations?: OpeningVariation[] | null;
}

const MASTERCLASS_IDS = new Set(
  Object.keys(openingManifests).filter((k) => !k.startsWith('_')),
);
const MASTERCLASSES: RepEntry[] = (repertoireData as RepEntry[]).filter((o) =>
  MASTERCLASS_IDS.has(o.id),
);

const toMoves = (pgn: string | undefined): string[] =>
  (pgn ?? '').trim().split(/\s+/).filter(Boolean);

/** Length of the shared leading prefix of two move lists. */
function commonPrefix(a: string[], b: string[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

const MIN_IDENT_PLIES = 3; // a match on <3 plies is too generic to trust
const MIN_MAIN_PLIES = 5; // a main-line redirect needs a deep shared prefix

// Curated TRANSPOSITION aliases — lines that reach a taught masterclass
// variation by a DIFFERENT move order. The prefix matcher below can't see
// these: they diverge from the taught spine early, then transpose back, so
// they share too few leading plies to match. Each rule is deliberately tight —
// it names the exact move-order family and the tab it feeds — because a wrong
// redirect is worse than the bare page.
const TRANSPOSITION_ALIASES: Array<{
  match: (moves: string[]) => boolean;
  to: string;
  line: string | null;
}> = [
  {
    // Accelerated Panov Attack (`e4 c6 c4…`, i.e. 2.c4 instead of 2.d4) → the
    // Caro-Kann masterclass Panov tab. The …d5 lines transpose into the exact
    // same IQP Panov structures the tab teaches, and the bare `e4 c6 c4`
    // parent defaults to …d5. It shares only `e4 c6` (2 plies) with the taught
    // Panov spine, so it otherwise fell through to a half-built 2-move stub
    // (David 2026-07-16). Excludes the Open Variation (`e4 c6 c4 e5` — a
    // genuinely different …e5 structure that is NOT the Panov).
    match: (m): boolean =>
      m[0] === 'e4' &&
      m[1] === 'c6' &&
      m[2] === 'c4' &&
      (m.length === 3 || m[3] === 'd5'),
    to: 'caro-kann',
    line: 'Panov',
  },
];

export interface MasterclassRedirect {
  to: string;
  line: string | null;
}

/**
 * If `opening` is a non-masterclass ECO entry that clearly belongs to a curated
 * masterclass variation (or its main line), return the redirect target; else
 * null. Ambiguous / generic / already-a-masterclass inputs return null.
 */
export function resolveMasterclassRedirect(
  opening: Pick<OpeningRecord, 'id' | 'pgn' | 'isRepertoire'>,
): MasterclassRedirect | null {
  if (!opening?.pgn) return null;
  // Masterclasses render themselves; pro/repertoire entries route themselves.
  if (MASTERCLASS_IDS.has(opening.id) || opening.isRepertoire) return null;

  const E = toMoves(opening.pgn);
  if (E.length < 2) return null;

  // Curated transposition aliases win first — they exist precisely for the
  // move orders the prefix matcher can't see.
  for (const a of TRANSPOSITION_ALIASES) {
    if (a.match(E)) return { to: a.to, line: a.line };
  }

  const candidates: Array<{ to: string; line: string | null; spec: number }> = [];

  for (const M of MASTERCLASSES) {
    const main = toMoves(M.pgn);
    const tabs = buildVariationTabs(M.id, M.variations ?? null);
    // Tier 3 — DEDICATED MAIN: E lies on M's own main line (one is a prefix of
    // the other, deep enough). M is the masterclass FOR this opening, so it wins
    // over any OTHER masterclass that merely carries this line as a variation tab
    // (e.g. the Glek, promoted to `glek-system`, beats four-knights' Glek tab).
    const cm = commonPrefix(E, main);
    if (cm >= MIN_MAIN_PLIES && (cm === main.length || cm === E.length)) {
      candidates.push({ to: M.id, line: null, spec: 2000 + cm });
    }
    // Tier 2 — VARIATION TAB: E agrees with V through V's defining move.
    for (const t of tabs) {
      const V = M.variations?.[t.index];
      const v = toMoves(V?.pgn);
      if (v.length === 0) continue;
      const identPly = commonPrefix(v, main); // first ply V diverges from main
      const need = identPly + 1; // include the variation-defining move
      if (need < MIN_IDENT_PLIES || need > v.length) continue;
      if (E.length >= need && commonPrefix(E, v) >= need) {
        // Deeper agreement with V's actual line = more specific.
        candidates.push({ to: M.id, line: t.label, spec: 1000 + commonPrefix(E, v) });
      }
    }
  }

  if (candidates.length === 0) return null;
  const topSpec = Math.max(...candidates.map((c) => c.spec));
  const winners = candidates.filter((c) => c.spec === topSpec);
  // Ambiguous — two DISTINCT targets tie at the top specificity → leave the page.
  const distinct = new Set(winners.map((c) => `${c.to}|${c.line ?? ''}`));
  if (distinct.size > 1) return null;
  return { to: winners[0].to, line: winners[0].line };
}
