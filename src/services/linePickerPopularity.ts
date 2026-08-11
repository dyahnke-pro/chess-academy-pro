/**
 * linePickerPopularity — rank the line picker by what players at the student's
 * level actually play.
 *
 * 🔒 THE PICKER'S ORDER IS A TEACHING CLAIM (David 2026-08-11, handing this one
 * over: "I leave you to build the line/leaf picker. Ok for you to take charge on
 * that.").
 *
 * `findLinePickerOptions` ranks by "how many DB entries fall under this
 * sub-name" — a proxy for popularity, and an honest one as far as it goes: it
 * does surface the Najdorf over a four-ply curiosity. But it counts NAMES in a
 * taxonomy, not GAMES on a board, so what it really measures is how finely
 * theory has subdivided a line. A heavily-catalogued sideline outranks a
 * commonly-played one, and the student reads the top tile as "this is what
 * people play". That is a claim the ordering was not entitled to make.
 *
 * The amateur explorer answers the actual question, banded to the student's
 * rating — the same source and the same reasoning as the coach's own moves
 * (`coachGameEngine.explorerBandForElo`): what people at THIS level really
 * choose. G3 throughout: every number here came from real games, and a move
 * with no games gets no number rather than an invented one.
 *
 * ── WHY THIS IS A SEPARATE, ASYNC PASS ────────────────────────────────────
 *
 * The picker must not wait on a network call to render. Tonight's other lesson
 * was that a lookup wired in front of a surface turns an instant wrong answer
 * into a slow one — a race that abandons the waiter while the work grinds on
 * (see `enginePlanContext`). So the sync path is untouched: the tiles appear
 * immediately in taxonomy order, and this re-ranks them in place if and when
 * real data arrives. A miss, a timeout, a rate-limit, an offline device — every
 * one of them leaves the picker exactly as it is today.
 *
 * One request, not one per tile. The explorer's reply at the family's base
 * position already carries a frequency for every immediate continuation, and
 * each option's naming move IS one of those continuations.
 */
import { Chess } from 'chess.js';
import { fetchLichessExplorer } from './lichessExplorerService';
import { explorerBandForElo } from './coachGameEngine';
import type { LinePickerOption } from './openingDetectionService';

/** A tile, plus what the games say about it. */
export interface RankedLineOption extends LinePickerOption {
  /** Share of games at this position that played this line's naming move,
   *  0-100. `null` when the explorer had nothing for it — which is the common
   *  case for a deep or rare line and must read as "unknown", never as zero. */
  playedPct: number | null;
  /** Games behind `playedPct`. Null alongside it. */
  games: number | null;
}

/** The move that first distinguishes an option from its siblings, as SAN.
 *
 *  `keyMove` is authored for DISPLAY ("5...a6"), so it carries a move number
 *  and the ellipsis a Black move is written with. The explorer keys on bare
 *  SAN. */
function bareSan(keyMove: string): string {
  return keyMove.replace(/^\d+\s*(?:\.{1,3}|…)\s*/, '').trim();
}

/**
 * Re-rank picker options by real game frequency at the student's rating band.
 *
 * Returns the options with `playedPct` / `games` attached, most-played first.
 * On any failure — no base position, explorer miss, network error — returns the
 * input order unchanged with both fields null. Never throws, never blocks
 * rendering, and never invents a number.
 */
export async function rankByPopularity(
  options: readonly LinePickerOption[],
  /** Canonical PGN of the bare family, e.g. "e4 c5" for the Sicilian. The
   *  position every option branches FROM. */
  canonicalPgn: string,
  /** The student's rating. Bands the sample so the ordering reflects the games
   *  they will actually meet, not a grandmaster's repertoire. */
  studentElo: number,
): Promise<RankedLineOption[]> {
  const unranked = (): RankedLineOption[] =>
    options.map((o) => ({ ...o, playedPct: null, games: null }));
  if (options.length === 0) return [];

  let fen: string;
  try {
    const board = new Chess();
    for (const san of canonicalPgn.split(/\s+/).filter(Boolean)) {
      if (!board.move(san)) return unranked();
    }
    fen = board.fen();
  } catch {
    return unranked();
  }

  let result;
  try {
    result = await fetchLichessExplorer(fen, 'lichess', { ratings: explorerBandForElo(studentElo) });
  } catch {
    return unranked(); // rate-limited, circuit open, offline — order stands
  }
  if (!result?.moves?.length) return unranked();

  const total = result.moves.reduce((n, m) => n + m.white + m.draws + m.black, 0);
  if (total <= 0) return unranked();

  const bySan = new Map<string, number>();
  for (const m of result.moves) bySan.set(m.san, m.white + m.draws + m.black);

  const ranked: RankedLineOption[] = options.map((o) => {
    const games = bySan.get(bareSan(o.keyMove)) ?? null;
    return {
      ...o,
      games,
      playedPct: games === null ? null : Math.round((games / total) * 1000) / 10,
    };
  });

  // Anything the explorer knows about, most-played first. Everything it does
  // NOT know about keeps its original relative order and sits behind — an
  // unknown line is not a zero-popularity line, and demoting it below a
  // measured 0.1% would be a claim the data does not support. Sorting the
  // known ones among themselves and leaving the rest alone says exactly what
  // is known and no more.
  const known = ranked.filter((o) => o.games !== null).sort((a, b) => (b.games ?? 0) - (a.games ?? 0));
  const unknown = ranked.filter((o) => o.games === null);
  return [...known, ...unknown];
}

/**
 * The tile's popularity caption, or '' when there is nothing honest to say.
 *
 * Percentages below a tenth of a point round to 0.0 and would read as "nobody
 * plays this", so they are reported as a floor instead. Silence beats a
 * misleading number, and a fabricated one is not on the table at all.
 */
export function popularityLabel(o: Pick<RankedLineOption, 'playedPct' | 'games'>): string {
  if (o.playedPct === null || o.games === null) return '';
  if (o.games < 10) return ''; // too thin a sample to quote at anyone
  if (o.playedPct < 0.1) return 'under 0.1% at your level';
  return `${o.playedPct}% at your level`;
}
