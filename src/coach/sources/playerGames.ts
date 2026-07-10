/**
 * Player-games source — the coach's BREADTH layer of real pro games
 * (David 2026-06-01). Pulls from `src/data/pro-game-references.json`
 * (built by `scripts/pro-repertoire/build-game-references.mjs`) and
 * shapes a compact envelope sub-block so the coach can cite + walk a
 * pro's ACTUAL games during teaching + walkthroughs — not just the ~2
 * hand-narrated model games per opening.
 *
 * Division of labour vs `modelGames.ts`: model games are the DEPTH
 * layer (hand-narrated, critical moments). Player games are the
 * BREADTH layer (many real games, no per-move narration) — "Naroditsky
 * beat a 3176 in this exact line, here are the moves."
 *
 * Gate: opening must resolve AND have ≥1 reference game. Scoped to a
 * single pro when `proOpeningId` is passed (a pro opening surface),
 * otherwise spans every pro who plays the opening. Reads the static
 * import synchronously (like modelGames.ts) so it's testable without a
 * seeded Dexie.
 */
import type { LivePlayerGamesContext } from '../types';
import { detectOpening } from '../../services/openingDetectionService';
import { getProGameReferenceDataSync } from '../../services/proGameReferenceData';
import type { ProGameReference } from '../../types';

/** App player id -> the pro's real display handle (the roster `name` is the
 *  repertoire TITLE, not the person). Used for the honest-empty message + the
 *  scoped answer's byline (David 2026-07-10). */
const PLAYER_DISPLAY: Record<string, string> = {
  naroditsky: 'Naroditsky', gothamchess: 'GothamChess', carlsen: 'Carlsen',
  hikaru: 'Hikaru', caruana: 'Caruana', firouzja: 'Firouzja', dubov: 'Dubov',
  gukesh: 'Gukesh', praggnanandhaa: 'Praggnanandhaa', niemann: 'Niemann',
  ericrosen: 'Eric Rosen', annacramling: 'Anna Cramling', chesswithakeem: 'Akeem',
  samayraina: 'Samay Raina', aman: 'Aman',
};

/** Name / handle aliases -> app player id. Matched with word boundaries against
 *  the ask so "how does GothamChess / Levy / Danya play this" resolves to the
 *  right pro. Longer/more-specific aliases are fine; the first \b-match wins. */
const PLAYER_ALIASES: Record<string, string> = {
  naroditsky: 'naroditsky', danya: 'naroditsky',
  gothamchess: 'gothamchess', gotham: 'gothamchess', levy: 'gothamchess', rozman: 'gothamchess',
  carlsen: 'carlsen', magnus: 'carlsen',
  hikaru: 'hikaru', nakamura: 'hikaru',
  caruana: 'caruana', fabiano: 'caruana', fabi: 'caruana',
  firouzja: 'firouzja', alireza: 'firouzja',
  dubov: 'dubov', daniil: 'dubov',
  gukesh: 'gukesh',
  praggnanandhaa: 'praggnanandhaa', pragg: 'praggnanandhaa',
  niemann: 'niemann', hans: 'niemann',
  rosen: 'ericrosen', imrosen: 'ericrosen',
  cramling: 'annacramling',
  akeem: 'chesswithakeem',
  samay: 'samayraina', raina: 'samayraina',
  aman: 'aman', hambleton: 'aman', chessbrah: 'aman',
};

/** Resolve the pro the student NAMED in the ask to an app player id, or null
 *  when no known pro is named. Word-boundary matched so a short alias never
 *  fires inside another word. */
export function resolvePlayerIdFromAsk(ask: string | undefined): string | null {
  if (!ask) return null;
  const lower = ask.toLowerCase();
  for (const [alias, id] of Object.entries(PLAYER_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(lower)) return id;
  }
  return null;
}

/** The pro's display handle for messages (falls back to the id). */
export function playerDisplayName(id: string): string {
  return PLAYER_DISPLAY[id] ?? id;
}

/** Max games shipped into the envelope per call — breadth without
 *  ballooning the token budget. The lookup_player_games tool surfaces
 *  the full set on demand. */
const MAX_GAMES = 4;
/** Plies of the line shipped — enough to walk the opening + early
 *  middlegame in a lesson. */
const MAX_PLIES = 40;

function studentLost(g: ProGameReference): boolean {
  return (g.studentSide === 'white' && g.result === '0-1') ||
         (g.studentSide === 'black' && g.result === '1-0');
}

function openingNameToId(name: string): string {
  const base = name.split(':')[0].trim();
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Candidate base-openingIds for a resolved opening name (American /
 *  British spelling + the bare stem), mirroring modelGames.ts. */
function openingIdCandidates(openingId: string): Set<string> {
  const set = new Set([openingId]);
  if (openingId.endsWith('-defense')) set.add(openingId.replace(/-defense$/, '-defence'));
  if (openingId.endsWith('-defence')) set.add(openingId.replace(/-defence$/, '-defense'));
  const stripped = openingId.replace(/-defen[cs]e$/, '');
  if (stripped !== openingId) set.add(stripped);
  return set;
}

/** Collapse an opening id/name to a comparison stem (drop trailing
 *  -opening/-defense/-game/etc.) so "catalan", "catalan-opening" and
 *  "Catalan Opening" all reduce to "catalan". */
function openingStem(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .replace(/-(opening|defense|defence|game|system|variation|attack)$/g, '');
}

/** A reference game matches the asked opening if its repertoire-tree
 *  openingId matches OR its variationLabel/variation names the opening
 *  (the build stashes the ACTUAL opening in the label — Carlsen's
 *  Catalan wins are openingId "queens-pawn", label "Catalan g3"). A
 *  "vs <Opening>" label means the player FACED it, so it's excluded
 *  from a "his <Opening>" ask (David 2026-06-11). */
function gameMatchesOpening(g: ProGameReference, candidates: Set<string>, stem: string): boolean {
  if (candidates.has(g.openingId)) return true;
  if (openingStem(g.openingId) === stem) return true;
  if (/^vs\b/i.test(g.variationLabel.trim())) return false;
  const labelNorm = g.variationLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (stem && labelNorm.includes(stem)) return true;
  const varNorm = (g.variation ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return !!stem && varNorm.includes(stem);
}

export function loadPlayerGamesForLive(args: {
  openingName?: string | null;
  moveHistory: string[];
  /** When set (a pro opening surface), scope to this one pro opening. */
  proOpeningId?: string | null;
  /** When the student NAMED a pro ("how does GothamChess play this"), scope the
   *  games to THAT player and, if they have none in this line, return an honest
   *  empty context so the coach says so instead of showing another pro's games
   *  (David 2026-07-10). */
  askedPlayerId?: string | null;
}): LivePlayerGamesContext | null {
  // Reads the in-memory cache primed by loadProGameReferenceData (awaited
  // in coachService before this runs, and on boot by dataLoader). Empty
  // until that resolves — the block is simply absent on a cold envelope.
  const ALL_REFS = getProGameReferenceDataSync();
  const asked = args.askedPlayerId ?? null;
  const scopeToAsked = <T extends ProGameReference>(games: T[]): T[] =>
    asked ? games.filter((g) => g.playerId === asked) : games;
  // Fast path: a specific pro opening surface.
  if (args.proOpeningId) {
    let scoped = ALL_REFS.filter((g) => g.proOpeningId === args.proOpeningId && !studentLost(g));
    scoped = scopeToAsked(scoped);
    if (scoped.length === 0) {
      return asked
        ? emptyForPlayer(asked, args.openingName ?? args.proOpeningId ?? 'this line')
        : null;
    }
    return shape(scoped, scoped[0].openingId, args.openingName ?? scoped[0].variationLabel, scoped[0].playerId);
  }

  let { openingName } = args;
  if (openingName && /^[A-E]\d{2}$/.test(openingName.trim())) openingName = null;
  if (!openingName && args.moveHistory.length > 0) {
    const detected = detectOpening(args.moveHistory);
    if (detected?.name) openingName = detected.name;
  }
  if (!openingName) {
    // Named a pro but we can't resolve the line → still answer honestly about
    // the player rather than going mute.
    return asked ? emptyForPlayer(asked, 'this line') : null;
  }

  const openingId = openingNameToId(openingName);
  if (!openingId) return asked ? emptyForPlayer(asked, openingName) : null;
  const candidates = openingIdCandidates(openingId);
  const stem = openingStem(openingId);

  let matches = ALL_REFS.filter((g) => gameMatchesOpening(g, candidates, stem) && !studentLost(g));
  matches = scopeToAsked(matches);
  if (matches.length === 0) {
    return asked ? emptyForPlayer(asked, openingName, openingId) : null;
  }

  return shape(matches, openingId, openingName, asked);
}

/** Honest empty context for a NAMED player with no games in the line — the
 *  assembler voices "I don't have <Name>'s games in this line" (David
 *  2026-07-10). */
function emptyForPlayer(playerId: string, openingName: string, openingId?: string): LivePlayerGamesContext {
  return {
    playerId,
    requestedPlayerName: playerDisplayName(playerId),
    openingId: openingId ?? openingNameToId(openingName) ?? openingName,
    openingName,
    totalAvailable: 0,
    games: [],
  };
}

/** Rank (highest opponent rating first) + cap + project into the
 *  envelope context. `scopedPlayerId` is set when all matches belong to
 *  one pro (the proOpeningId fast path). */
function shape(
  matches: ProGameReference[],
  openingId: string,
  openingName: string,
  scopedPlayerId: string | null,
): LivePlayerGamesContext {
  const ranked = [...matches].sort(
    (a, b) => (b.opponentRating ?? 0) - (a.opponentRating ?? 0),
  );
  const picked = ranked.slice(0, MAX_GAMES);
  return {
    playerId: scopedPlayerId,
    openingId,
    openingName,
    totalAvailable: matches.length,
    games: picked.map((g) => {
      const opponent = g.studentSide === 'white' ? g.black : g.white;
      return {
        id: g.id,
        player: playerDisplayName(g.playerId),
        studentSide: g.studentSide,
        opponent,
        opponentRating: g.opponentRating,
        result: g.result,
        date: g.date,
        source: g.source,
        variationLabel: g.variationLabel,
        pgnPrefix: g.pgn.split(/\s+/).slice(0, MAX_PLIES).join(' '),
        plyCount: g.plyCount,
      };
    }),
  };
}
