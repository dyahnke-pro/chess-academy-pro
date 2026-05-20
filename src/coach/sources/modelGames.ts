/**
 * Model-games source — pulls curated pro/master examples from
 * `src/data/model-games.json` (~121 games keyed by openingId, each
 * with overview + critical-moments narration) and shapes them into
 * a compact envelope sub-block.
 *
 * Why this exists: the coach can reference "look at how Morphy
 * handled this" or "Carlsen's Italian Game plan" — but only if the
 * brain knows which games are canonical examples. Without this, it
 * either invents plausible-sounding-but-fake citations OR calls
 * lichess_master_games (which gives raw PGNs, not narrated examples).
 * The curated model-games carry our own per-position commentary.
 *
 * Gate: opening must be recognized AND have at least one model game
 * registered. Up to 2 games shipped per call (1 if it's the only
 * one, 2 if multiple available — token budget rather than info
 * budget).
 */
import type { LiveModelGameContext } from '../types';
import { detectOpening } from '../../services/openingDetectionService';
import modelGamesData from '../../data/model-games.json';
import type { ModelGame } from '../../types';

const ALL_GAMES = modelGamesData as unknown as ModelGame[];

function openingNameToId(name: string): string {
  const base = name.split(':')[0].trim();
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Load model games for the resolved opening. Returns null when
 *  nothing matched. Caps shipped games at 2 to keep token spend
 *  bounded; the brain has tools to fetch deeper if needed. */
export function loadModelGamesForLive(args: {
  openingName?: string | null;
  moveHistory: string[];
}): LiveModelGameContext | null {
  let { openingName } = args;
  // Treat bare ECO codes ("B01", "C50") as null so detectOpening
  // takes over — surfaces sometimes pass game.eco when the
  // classified name isn't handy.
  if (openingName && /^[A-E]\d{2}$/.test(openingName.trim())) {
    openingName = null;
  }
  if (!openingName && args.moveHistory.length > 0) {
    const detected = detectOpening(args.moveHistory);
    if (detected?.name) openingName = detected.name;
  }
  if (!openingName) return null;

  const openingId = openingNameToId(openingName);
  if (!openingId) return null;

  // Model-games corpus uses British spellings in many entries
  // ("alekhine-defence", "dutch-defence", "grunfeld-defence"). Try
  // both American and British plus the short-form variant.
  const candidates = new Set([openingId]);
  if (openingId.endsWith('-defense')) candidates.add(openingId.replace(/-defense$/, '-defence'));
  if (openingId.endsWith('-defence')) candidates.add(openingId.replace(/-defence$/, '-defense'));
  const stripped = openingId.replace(/-defen[cs]e$/, '');
  if (stripped !== openingId) candidates.add(stripped);
  const matches = ALL_GAMES.filter((g) => candidates.has(g.openingId));
  if (matches.length === 0) return null;

  // Take up to 2 games. Pick highest-rated first when ratings exist,
  // else preserve source ordering (curator put canonical first).
  const ranked = [...matches].sort((a, b) => {
    const aMax = Math.max(a.whiteElo ?? 0, a.blackElo ?? 0);
    const bMax = Math.max(b.whiteElo ?? 0, b.blackElo ?? 0);
    return bMax - aMax;
  });
  const picked = ranked.slice(0, 2);

  return {
    openingId,
    openingName,
    totalAvailable: matches.length,
    games: picked.map((g) => ({
      id: g.id,
      white: g.white,
      black: g.black,
      result: g.result,
      year: g.year,
      event: g.event,
      overview: g.overview,
      // Trim PGN to the first ~25 plies — enough for the brain to
      // know the line, not so much that the envelope balloons.
      pgnPrefix: g.pgn.split(/\s+/).slice(0, 25).join(' '),
      criticalMoments: (g.criticalMoments ?? []).slice(0, 2).map((m) => ({
        moveNumber: m.moveNumber,
        annotation: m.annotation,
        concept: m.concept,
      })),
    })),
  };
}
