// reviewStoryGame — §6 "story-as-evidence": Naroditsky reaches for a famous game
// that shows the idea in a master's hands. (docs/plans/2026-07-19 SOURCING GUARD,
// David: illustrative games from ANY GM, spread across many players, CITED, never
// verbatim, never fabricated.)
//
// GROUNDING: the game is NOT invented — it is pulled from the app's OWN verified
// model-games corpus (`src/data/model-games.json`, 646 real games with real
// players / event / year, vetted by the modelGames gates). We cite the public
// facts (players, event, year — public record) and teach the idea in our OWN
// authored words (the curated middlegameTheme / lessonSummary), never lifting
// anyone's prose. Deterministic pick (no Math.random) so a review is reproducible.

import modelGamesRaw from '../data/model-games.json';
import { resolveOpeningIdFromName } from './chessConceptService';

interface ModelGameLike {
  openingId?: string;
  white?: string;
  black?: string;
  whiteElo?: number;
  blackElo?: number;
  year?: number | string;
  event?: string;
  result?: string;
  middlegameTheme?: string;
  lessonSummary?: string;
  overview?: string;
  pgn?: string;
  criticalMoments?: Array<{ moveNumber?: number; color?: string; annotation?: string }>;
}

const MODEL_GAMES = modelGamesRaw as ModelGameLike[];

export interface StoryGame {
  /** "Kasparov–Topalov, Wijk aan Zee 1999". */
  citation: string;
  /** The spoken story line. */
  text: string;
  /** The cited game's real PGN (from the verified corpus) so the review can
   *  offer a "watch this game" playback (David 2026-07-21: "where is the tag
   *  to watch that game??"). */
  pgn: string;
  /** The corpus's hand-authored game overview — spoken as the playback opens
   *  (David 2026-07-21: "Does the DB/example game have narrations?"). */
  overview: string | null;
  /** Hand-authored per-moment annotations (92 of the 556 playable games),
   *  spoken as the playback reaches each cited move. */
  criticalMoments: Array<{ moveNumber: number; color: 'white' | 'black'; annotation: string }>;
}

function lowerFirst(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }
function stripPeriod(s: string): string { return s.replace(/\.\s*$/, '').trim(); }
function topElo(g: ModelGameLike): number { return Math.max(g.whiteElo ?? 0, g.blackElo ?? 0); }

/** Tidy a player name from the corpus — collapse doubled dots ("W.." → "W."),
 *  trim stray whitespace. */
function cleanName(n: string): string {
  return n.replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim();
}

/** Keep an event only if it's a REAL event name — not an auto-generated stub
 *  ("2021-02 master game", "master game", anything that's basically a date). A
 *  good event has letters and doesn't just echo the year. */
function cleanEvent(event: string | undefined, year: string): string | null {
  if (!event) return null;
  const e = event.replace(/\s+/g, ' ').trim();
  if (!e) return null;
  if (/master game/i.test(e)) return null;             // generic stub
  if (/^\d{4}(-\d{1,2}){0,2}\b/.test(e)) return null;   // starts with a date
  if (!/[a-z]{3,}/i.test(e)) return null;               // no real word
  // Drop a trailing year the event already carries so we never print "… 1918 1918".
  return e.replace(new RegExp(`[,\\s]*${year}\\s*$`), '').trim() || null;
}

/**
 * Pick a cited illustrative game for the opening, or null. Returns a one-line
 * "story" that names a REAL game (from our verified corpus) + the idea it shows.
 * Requires real players + a year so the citation is solid; else null (empty >
 * vague). Deterministic: the highest-rated available game for the opening.
 */
export function pickStoryGame(openingName: string | null): StoryGame | null {
  if (!openingName) return null;
  const openingId = resolveOpeningIdFromName(openingName);
  if (!openingId) return null;
  const candidates = MODEL_GAMES.filter(
    (g) => g.openingId === openingId && !!g.white && !!g.black && !!g.pgn
      && (g.year !== undefined && g.year !== null && String(g.year).trim() !== ''),
  );
  if (candidates.length === 0) return null;
  // Highest-rated, then most-recent — a deterministic, reproducible pick.
  const pick = candidates
    .slice()
    .sort((a, b) => topElo(b) - topElo(a) || Number(b.year) - Number(a.year))[0];

  const year = String(pick.year);
  const white = cleanName(pick.white ?? '');
  const black = cleanName(pick.black ?? '');
  const event = cleanEvent(pick.event, year);
  const citation = `${white} – ${black}${event ? `, ${event}` : ''} (${year})`;
  const ideaRaw = (pick.middlegameTheme ?? pick.lessonSummary ?? '').trim();
  const idea = ideaRaw ? lowerFirst(stripPeriod(ideaRaw)) : '';
  const ideaClause = idea ? ` — the model there is ${idea}` : '';
  const overview = (pick.overview ?? '').trim();
  const criticalMoments = (pick.criticalMoments ?? [])
    .filter((m): m is { moveNumber: number; color: 'white' | 'black'; annotation: string } =>
      typeof m.moveNumber === 'number' && (m.color === 'white' || m.color === 'black')
      && typeof m.annotation === 'string' && m.annotation.trim().length > 0);
  return {
    citation,
    text: `This is a well-trodden battleground: look up ${citation}${ideaClause}. Seeing the plan in a strong player's hands is worth more than any amount of theory.`,
    pgn: pick.pgn ?? '',
    overview: overview.length >= 20 ? overview : null,
    criticalMoments,
  };
}
