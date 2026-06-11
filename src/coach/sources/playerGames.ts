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
import proRepertoireData from '../../data/pro-repertoires.json';
import type { ProGameReference } from '../../types';

/** App player id -> display name, from the pro roster. */
const PLAYER_NAMES: Record<string, string> = Object.fromEntries(
  (proRepertoireData as { players: { id: string; name: string }[] }).players.map((p) => [p.id, p.name]),
);

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
}): LivePlayerGamesContext | null {
  // Reads the in-memory cache primed by loadProGameReferenceData (awaited
  // in coachService before this runs, and on boot by dataLoader). Empty
  // until that resolves — the block is simply absent on a cold envelope.
  const ALL_REFS = getProGameReferenceDataSync();
  // Fast path: a specific pro opening surface.
  if (args.proOpeningId) {
    const scoped = ALL_REFS.filter((g) => g.proOpeningId === args.proOpeningId && !studentLost(g));
    if (scoped.length === 0) return null;
    return shape(scoped, scoped[0].openingId, args.openingName ?? scoped[0].variationLabel, scoped[0].playerId);
  }

  let { openingName } = args;
  if (openingName && /^[A-E]\d{2}$/.test(openingName.trim())) openingName = null;
  if (!openingName && args.moveHistory.length > 0) {
    const detected = detectOpening(args.moveHistory);
    if (detected?.name) openingName = detected.name;
  }
  if (!openingName) return null;

  const openingId = openingNameToId(openingName);
  if (!openingId) return null;
  const candidates = openingIdCandidates(openingId);
  const stem = openingStem(openingId);

  const matches = ALL_REFS.filter((g) => gameMatchesOpening(g, candidates, stem) && !studentLost(g));
  if (matches.length === 0) return null;

  return shape(matches, openingId, openingName, null);
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
        player: PLAYER_NAMES[g.playerId] ?? g.playerId,
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
