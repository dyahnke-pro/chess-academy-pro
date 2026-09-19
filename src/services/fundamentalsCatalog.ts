// fundamentalsCatalog — the user-facing MAP of every fundamental the computer
// can attribute, for the Fundamentals scorecard (David 2026-09-07: "make a
// fundamental tab with all fundamentals listed within it" + personalized status).
//
// Each FundamentalId is placed under ONE of the 7 phase SECTIONS the Fundamentals
// tab renders AND under one of the four classical PILLARS the tab and the coach
// chat teach from (`FUNDAMENTAL_PILLAR` — the join that used to be missing
// entirely; see its comment), given a clean label + its coaching device + a
// drill target. Every map is `Record<FundamentalId, …>`, so TypeScript FORCES a
// new fundamental to answer for each — it can never silently fall off the
// scorecard, and it can never silently fail to belong to a pillar.
// `getFundamentalCounts` reads the student's recorded weaknesses by the specific
// `fundamentalId` (stored on each record) for the per-fundamental status;
// `pillarStanding` rolls those up per pillar. Pure data + one Dexie read; no LLM (G0).

import { FUNDAMENTAL_IDS, FUNDAMENTAL_TAG, type FundamentalId } from './principleAttribution';
import { getMisconceptionTag } from '../data/misconceptionTags';
import { principleFor } from '../data/principles';
import { db } from '../db/schema';
// TYPE-ONLY (erased at build, so no runtime edge is added to this module): the
// pillar union is OWNED by groundedAnswer, which is what the coach chat and the
// tab both teach from. Re-declaring those four strings here would be the
// duplicated-constant rot the project bans — import the one union instead.
import type { FundamentalsTopic } from './groundedAnswer';

/** The 7 phase sections of the Fundamentals tab. The ORDER is the render order.
 *  Derived as a const tuple so every consumer (the page, the tests) iterates the
 *  one list instead of hand-copying it — a new section cannot be forgotten. */
export const FUNDAMENTAL_SECTION_IDS = [
  'opening-play', 'center', 'development', 'king-safety',
  'pawn-structure', 'tactics-threats', 'endgame-technique',
] as const;
export type FundamentalSectionId = (typeof FUNDAMENTAL_SECTION_IDS)[number];

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

/**
 * 🔗 THE JOIN — WHICH CLASSICAL PILLAR EACH FUNDAMENTAL BELONGS TO.
 *
 * The app carried the taxonomy in TWO halves that nothing connected. The tab
 * and the coach chat TEACH four classical pillars (`FundamentalsTopic` —
 * piece-values / development / centre / king-safety, authored in
 * `groundedAnswer.assembleFundamentalsAnswer`). The computer ATTRIBUTES 33
 * `FundamentalId`s. No code linked one to the other, so the tab taught an idea
 * the model could not file and the model filed ideas the tab could not teach —
 * the `discovery` / `discovered_attack` class from the top of CLAUDE.md, and
 * every test stayed green because nothing joined them. `piece-values` was the
 * worst of it: not one fundamental reached that pillar, so the one pillar about
 * the currency of every trade was decoration.
 *
 * `Record<FundamentalId, FundamentalPillar | null>` closes it at the type level:
 * a NEW fundamental fails to compile until someone decides its pillar. `null` is
 * an ANSWER, not a gap — the pillars are the four classical opening/safety
 * ideas, and pawn-structure, threat-awareness and endgame technique genuinely
 * are not among them. Saying so explicitly is the point; a fallthrough would let
 * "nobody decided" and "there is no pillar" look identical.
 *
 * NB this is a DIFFERENT CUT from `FUNDAMENTAL_SECTION`, not a copy of it, so
 * the two cannot drift: the section answers "which phase panel does this render
 * under", the pillar answers "which classical principle does this belong to".
 * `wrong-trade-for-material` renders under tactics and belongs to piece-values;
 * both are right.
 */
export type FundamentalPillar = Exclude<FundamentalsTopic, 'general'>;

export const FUNDAMENTAL_PILLAR: Record<FundamentalId, FundamentalPillar | null> = {
  // DEVELOPMENT — a new piece every move; don't spend tempo while pieces sit home.
  'same-piece-twice': 'development',
  'tempo-handed': 'development',
  'neglected-development': 'development',
  'early-queen-sortie': 'development',
  'early-edge-pawns': 'development',
  'knights-before-bishops': 'development',
  'buried-own-bishop': 'development',
  'knight-to-the-rim': 'development',
  'worst-piece-unimproved': 'development',
  'rook-ignored-open-file': 'development',
  'kept-bad-bishop': 'development',
  'traded-active-for-passive': 'development',
  // The development pillar's own prose names pawn-hunting while the pieces are
  // still at home — that is exactly this fundamental, so it files here rather
  // than under piece-values (the cost is time, not the pawn).
  'greedy-pawn-grab': 'development',
  // THE CENTRE.
  'space-conceded': 'center',
  'premature-centre-break': 'center',
  'capture-toward-centre': 'center',
  // KING SAFETY.
  'king-left-in-centre': 'king-safety',
  'weakened-king-shield': 'king-safety',
  // PIECE VALUES — the currency of every trade. Before this map these three had
  // nowhere to go and the pillar had nothing in it.
  'loose-piece': 'piece-values',
  'wrong-trade-for-material': 'piece-values',
  'poisoned-pawn': 'piece-values',
  // NO PILLAR — explicit, and each for a reason.
  // Pawn structure is its own body of theory; none of the four pillars covers it.
  'created-pawn-weakness': null,
  'overextended-pawn': null,
  // Threat-awareness and attack judgement are calculation habits, not pillars.
  'ignored-threat': null,
  'passive-when-forcing-existed': null,
  'overvalued-attack': null,
  // ENDGAME technique is deliberately null, and `passive-king-endgame` is the
  // one to be careful with: in the endgame the king STOPS hiding and becomes a
  // fighting piece, so filing it under king-safety would teach the opposite of
  // the truth. A wrong pillar is worse than an honest none.
  'passive-king-endgame': null,
  'mistimed-pawn-break': null,
  'rook-in-front-of-passer': null,
  'passed-pawn-neglected': null,
  'lost-the-opposition': null,
  'passive-rook-endgame': null,
  'botched-conversion': null,
};

/** The classical pillar this fundamental belongs to, or null where it genuinely
 *  has none. Total by construction — never a lookup that can miss. */
export function fundamentalPillar(id: FundamentalId): FundamentalPillar | null {
  return FUNDAMENTAL_PILLAR[id];
}

/** Every fundamental filed under a pillar, in FUNDAMENTAL_IDS (phase) order.
 *  The reverse of the join: what the pillar's teaching is actually graded on. */
export function fundamentalsForPillar(pillar: FundamentalPillar): FundamentalId[] {
  return FUNDAMENTAL_IDS.filter((id) => FUNDAMENTAL_PILLAR[id] === pillar);
}

/**
 * WHERE A SECTION'S TEACHING PROSE COMES FROM — exhaustive, so a new section
 * must declare it. Three of the seven read one of the four authored pillars;
 * the rest carry their own authored classical prose. Before this, the page read
 * `SECTION_PROSE[id] ?? ''`, so a section with no entry rendered SILENTLY EMPTY
 * — the fallthrough this WO exists to remove.
 *
 * G0/G3: every string here is authored classical principle (Capablanca, Lasker,
 * Tarrasch — public domain), house voice (you/they, never we/our), and makes no
 * claim about any specific board.
 */
export type SectionTeaching =
  | { kind: 'pillar'; pillar: FundamentalPillar }
  | { kind: 'authored'; prose: string };

export const SECTION_TEACHING: Record<FundamentalSectionId, SectionTeaching> = {
  'opening-play': {
    kind: 'authored',
    prose:
      "Every opening is trying to do the same three things: put a piece on a good square with each move, get your king to safety by castling, and fight for the centre. Bring out a new piece every move, don't go pawn-hunting while your pieces are still at home, and don't move the same piece twice when another one hasn't moved at all. Win the race to a finished position and the middlegame is already in your favour.",
  },
  center: { kind: 'pillar', pillar: 'center' },
  development: { kind: 'pillar', pillar: 'development' },
  'king-safety': { kind: 'pillar', pillar: 'king-safety' },
  'pawn-structure': {
    kind: 'authored',
    prose:
      "Pawns are the only piece that never moves backward, so every pawn move is permanent — it gives up a square forever. Keep your pawns healthy: avoid doubled and isolated pawns when you can, and try to place them on squares the opposite colour of your bishop so it stays free. A passed pawn — one no enemy pawn can stop — is a long-term asset; push it, and it forces the defender to tie down a piece just to hold it back.",
  },
  'tactics-threats': {
    kind: 'authored',
    prose:
      "Almost every tactic is a double attack — one move that hits two things at once, so the defender can only save one. Before you commit, run the checklist in order, for both sides: every check, every capture, every threat. And before you trust an attack or a sacrifice, count the attackers against the defenders on the target square — if their defenders arrive first, the combination doesn't work.",
  },
  'endgame-technique': {
    kind: 'authored',
    prose:
      "In the endgame your king stops hiding and becomes a fighting piece — march it toward the centre and the pawns. Rooks belong behind passed pawns and on the seventh rank, never sitting passive in front of a pawn. And when the kings face off in a pawn ending, whoever is forced to move first gives ground — that is the opposition, and it decides who queens.",
  },
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
 * The student's per-fundamental slip counts, read from the recorded
 * misconception tags (keyed by the `fundamentalId` stored on each record).
 *
 * 🔒 IMPORTED / ANALYZED GAMES COUNT HERE (David 2026-09-08: "do we capture that
 * data in game analysis?" → "yes to both"). This used to exclude `counted:false`
 * rows "matching the weakness profile" — but that hid every imported game from
 * the fundamentals scorecard, so a heavy importer saw a rich weakness profile
 * (fed by mistakePuzzles/classifiedTactics) and a near-empty fundamentals view,
 * from the SAME games split down two pipes. The `counted` flag exists to stop
 * the misconception TALLY double-counting the mistake-puzzle WEAKNESS PROFILE —
 * a different consumer. The fundamentals scorecard is "which fundamentals you
 * break", and an imported-game slip absolutely counts for that. Each game's
 * misconceptions are logged once (the `hasMisconceptionsForGame` guard in
 * autoAnalyzeGame), so counting every fundamentalId-tagged row cannot
 * double-count a game across the live + batch paths. A fundamental never slipped
 * on is absent (the caller renders "not yet"). Pure Dexie read.
 */
export async function getFundamentalCounts(): Promise<Partial<Record<FundamentalId, FundamentalStat>>> {
  const out: Partial<Record<FundamentalId, FundamentalStat>> = {};
  let rows: { fundamentalId?: string; createdAt: number }[] = [];
  try {
    rows = await db.misconceptionTags.toArray();
  } catch {
    return out;
  }
  for (const r of rows) {
    const fid = r.fundamentalId as FundamentalId | undefined;
    if (!fid) continue;
    if (!(fid in FUNDAMENTAL_SECTION)) continue; // guard stale/unknown ids
    const cur = out[fid] ?? { count: 0, lastSeenAt: 0 };
    cur.count += 1;
    cur.lastSeenAt = Math.max(cur.lastSeenAt, r.createdAt);
    out[fid] = cur;
  }
  return out;
}


/** The student's standing on ONE pillar, rolled up from the fundamentals filed
 *  under it. This is what the join BUYS: before it existed, the tab could teach
 *  a pillar and had no way to say how the student was doing on it, because no
 *  fundamental was linked to one.
 *
 *  `asked` is the heat-map's grey/red split (CLAUDE.md): a pillar nothing has
 *  ever caught the student on is GREY — never asked — which is NOT the same as
 *  mastered, so the caller must not render it as a pass. Pure: the counts are
 *  passed in by the caller that already read Dexie, so this stays a function of
 *  its arguments and is testable without a database. */
export interface PillarStanding {
  pillar: FundamentalPillar;
  /** Every fundamental filed under the pillar. */
  fundamentals: FundamentalId[];
  /** Total recorded slips across them. */
  slips: number;
  /** How many DISTINCT fundamentals under it have ever caught the student. */
  distinct: number;
  /** The most-slipped fundamental under it, or null when none has fired. */
  worst: FundamentalId | null;
  /** False = grey. The board has never posed this pillar's question to them. */
  asked: boolean;
}

export function pillarStanding(
  pillar: FundamentalPillar,
  counts: Partial<Record<FundamentalId, FundamentalStat>>,
): PillarStanding {
  const fundamentals = fundamentalsForPillar(pillar);
  let slips = 0;
  let distinct = 0;
  let worst: FundamentalId | null = null;
  let worstCount = 0;
  for (const id of fundamentals) {
    const n = counts[id]?.count ?? 0;
    if (n <= 0) continue;
    slips += n;
    distinct += 1;
    if (n > worstCount) { worstCount = n; worst = id; }
  }
  return { pillar, fundamentals, slips, distinct, worst, asked: slips > 0 };
}
