// fundamentalsCatalog — the user-facing MAP of every fundamental the computer
// can attribute, for the Fundamentals scorecard (David 2026-09-07: "make a
// fundamental tab with all fundamentals listed within it" + personalized status).
//
// Each of the 33 FundamentalIds is placed under ONE of the 7 phase sections the
// Fundamentals tab already renders, given a clean label + its coaching device +
// a drill target. The maps are `Record<FundamentalId, …>`, so TypeScript FORCES
// a new fundamental to be catalogued here — it can never silently fall off the
// scorecard. `getFundamentalCounts` reads the student's recorded weaknesses by
// the specific `fundamentalId` (stored on each record) for the per-fundamental
// status. Pure data + one Dexie read; no LLM (G0).

import { FUNDAMENTAL_IDS, FUNDAMENTAL_TAG, type FundamentalId } from './principleAttribution';
import { getMisconceptionTag } from '../data/misconceptionTags';
import { principleFor } from '../data/principles';
import { db } from '../db/schema';

/** The 7 phase sections of the Fundamentals tab (must match FundamentalsPage). */
export type FundamentalSectionId =
  | 'opening-play' | 'center' | 'development' | 'king-safety'
  | 'pawn-structure' | 'tactics-threats' | 'endgame-technique';

/** Which section each fundamental lives under. Exhaustive by type. */
export const FUNDAMENTAL_SECTION: Record<FundamentalId, FundamentalSectionId> = {
  // opening play — develop, castle, win the race to a finished position
  'same-piece-twice': 'opening-play',
  'tempo-handed': 'opening-play',
  'neglected-development': 'opening-play',
  'early-queen-sortie': 'opening-play',
  'early-edge-pawns': 'opening-play',
  'knights-before-bishops': 'opening-play',
  'premature-centre-break': 'opening-play',
  // the centre
  'space-conceded': 'center',
  // development & activity — worst piece to work, active squares
  'buried-own-bishop': 'development',
  'knight-to-the-rim': 'development',
  'worst-piece-unimproved': 'development',
  'rook-ignored-open-file': 'development',
  'kept-bad-bishop': 'development',
  'traded-active-for-passive': 'development',
  // king safety
  'king-left-in-centre': 'king-safety',
  'weakened-king-shield': 'king-safety',
  // pawn structure — weaknesses, grabs, recaptures, passers
  'greedy-pawn-grab': 'pawn-structure',
  'created-pawn-weakness': 'pawn-structure',
  'overextended-pawn': 'pawn-structure',
  'capture-toward-centre': 'pawn-structure',
  'poisoned-pawn': 'pawn-structure',
  // tactics & threats — the double attack, forcing moves, unsound attacks
  'loose-piece': 'tactics-threats',
  'ignored-threat': 'tactics-threats',
  'passive-when-forcing-existed': 'tactics-threats',
  'overvalued-attack': 'tactics-threats',
  'wrong-trade-for-material': 'tactics-threats',
  // endgame technique
  'passive-king-endgame': 'endgame-technique',
  'mistimed-pawn-break': 'endgame-technique',
  'rook-in-front-of-passer': 'endgame-technique',
  'passed-pawn-neglected': 'endgame-technique',
  'lost-the-opposition': 'endgame-technique',
  'passive-rook-endgame': 'endgame-technique',
  'botched-conversion': 'endgame-technique',
};

/** A crisp user-facing title per fundamental. Exhaustive by type. */
export const FUNDAMENTAL_LABEL: Record<FundamentalId, string> = {
  'same-piece-twice': 'Same piece twice',
  'tempo-handed': 'Handing over a tempo',
  'space-conceded': 'Conceding the centre',
  'neglected-development': 'Neglecting development',
  'early-queen-sortie': 'Early queen sortie',
  'king-left-in-centre': 'King left in the centre',
  'greedy-pawn-grab': 'Greedy pawn grab',
  'early-edge-pawns': 'Early edge pawns',
  'knights-before-bishops': 'Bishops before knights',
  'buried-own-bishop': 'Burying your own bishop',
  'premature-centre-break': 'Premature centre break',
  'knight-to-the-rim': 'Knight on the rim',
  'loose-piece': 'Loose piece',
  'ignored-threat': 'Ignoring a threat',
  'passive-when-forcing-existed': 'Missing a forcing move',
  'weakened-king-shield': "Weakening the king's shield",
  'created-pawn-weakness': 'Creating a pawn weakness',
  'overextended-pawn': 'Overextending a pawn',
  'traded-active-for-passive': 'Trading the wrong piece',
  'wrong-trade-for-material': 'Wrong trade for the material',
  'worst-piece-unimproved': 'Leaving your worst piece',
  'rook-ignored-open-file': 'Ignoring an open file',
  'kept-bad-bishop': 'Keeping a bad bishop',
  'passive-king-endgame': 'Passive king in the endgame',
  'mistimed-pawn-break': 'Mistimed pawn break',
  'rook-in-front-of-passer': 'Rook in front of the passer',
  'passed-pawn-neglected': 'Neglecting a passed pawn',
  'lost-the-opposition': 'Losing the opposition',
  'passive-rook-endgame': 'Passive rook',
  'overvalued-attack': 'Overvaluing the attack',
  'poisoned-pawn': 'Taking a poisoned pawn',
  'capture-toward-centre': 'Recapturing the wrong way',
  'botched-conversion': 'Rushing a won position',
};

/** The one-line coaching device for a fundamental (its tag's principle), or the
 *  tag's plain blurb when no device exists. Never null — always something to teach. */
export function fundamentalDevice(id: FundamentalId): string {
  const tag = FUNDAMENTAL_TAG[id];
  return principleFor(tag) ?? getMisconceptionTag(tag)?.blurb ?? '';
}

/** How this fundamental drills: a themed Lichess-puzzle set where its tag carries
 *  puzzleThemes, otherwise the student's OWN flagged positions. Mirrors the
 *  section-level Drill in FundamentalsPage. */
export type FundamentalDrill =
  | { kind: 'themes'; themes: string[] }
  | { kind: 'mistakes' };
export function fundamentalDrill(id: FundamentalId): FundamentalDrill {
  const themes = getMisconceptionTag(FUNDAMENTAL_TAG[id])?.drill.puzzleThemes ?? [];
  return themes.length > 0 ? { kind: 'themes', themes } : { kind: 'mistakes' };
}

/** The fundamentals under a section, in FUNDAMENTAL_IDS order (phase order). */
export function fundamentalsBySection(section: FundamentalSectionId): FundamentalId[] {
  return FUNDAMENTAL_IDS.filter((id) => FUNDAMENTAL_SECTION[id] === section);
}

export interface FundamentalStat {
  /** How many times the student has slipped on this exact fundamental. */
  count: number;
  /** Most recent slip (epoch ms), for ranking / "recently". */
  lastSeenAt: number;
}

/**
 * The student's per-fundamental slip counts, read from the recorded weaknesses
 * (keyed by the `fundamentalId` stored on each record). Only counted (learned-
 * line) records feed the formal count; display-only slips are excluded, matching
 * the weakness profile. A fundamental the student has never slipped on is absent
 * (the caller renders "not yet"). Pure Dexie read.
 */
export async function getFundamentalCounts(): Promise<Partial<Record<FundamentalId, FundamentalStat>>> {
  const out: Partial<Record<FundamentalId, FundamentalStat>> = {};
  let rows: { fundamentalId?: string; counted?: boolean; createdAt: number }[] = [];
  try {
    rows = await db.misconceptionTags.toArray();
  } catch {
    return out;
  }
  for (const r of rows) {
    const fid = r.fundamentalId as FundamentalId | undefined;
    if (!fid || r.counted === false) continue;
    if (!(fid in FUNDAMENTAL_SECTION)) continue; // guard stale/unknown ids
    const cur = out[fid] ?? { count: 0, lastSeenAt: 0 };
    cur.count += 1;
    cur.lastSeenAt = Math.max(cur.lastSeenAt, r.createdAt);
    out[fid] = cur;
  }
  return out;
}
