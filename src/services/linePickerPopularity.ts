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

/** The move by which a line FIRST leaves the family trunk.
 *
 *  🔒 NOT `keyMove`. The first version of this file matched on the naming move,
 *  and the prod audit caught it returning zero captions on a real Sicilian
 *  picker: the move that NAMES a variation is usually several plies past the
 *  family position (the Najdorf is …a6 at ply 9 of `e4 c5`), so it is not a
 *  continuation of that position and the explorer has no entry for it. The
 *  assumption was wrong, not the plumbing — the request went out correctly
 *  banded and every lookup missed.
 *
 *  The branch move IS a continuation by construction: it is the option's own
 *  next ply after the shared trunk. Null when the line is not longer than the
 *  trunk, which means it is the trunk. */
function branchMove(optionPgn: string, trunkPlies: number): string | null {
  const moves = optionPgn.split(/\s+/).filter(Boolean);
  return moves.length > trunkPlies ? moves[trunkPlies] : null;
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

  // ── ASK AT THE POSITION WHERE THESE LINES ACTUALLY PART ────────────────
  //
  // 🔒 NOT THE FAMILY ROOT. A live prod picker for the Sicilian offered exactly
  // three tiles — Dragon, Najdorf, Richter-Rauzer — and all three run
  // `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3` before they differ. Asked at `e4 c5`
  // their branch move is Nf3 for all of them, so the shared-branch rule below
  // correctly refused to caption ANY of them and the feature did nothing for
  // the case it exists to serve: named variations.
  //
  // The question "how often is this line chosen" is only meaningful at the
  // board where the choice is made. So the trunk is the deepest prefix the
  // SHOWN options have in common, not the family's canonical PGN — at that
  // position each option's next ply is a genuine, distinguishable alternative
  // and the explorer has a real number for it.
  //
  // Falls back to `canonicalPgn` when a common prefix cannot be walked, and
  // never goes SHORTER than it: a prefix outside the family would be asking
  // about a different opening entirely.
  const lineOf = (pgn: string): string[] => pgn.split(/\s+/).filter(Boolean);
  const familyPlies = lineOf(canonicalPgn).length;
  const commonPrefix = (): string[] => {
    const lines = options.map((o) => lineOf(o.pgn)).filter((l) => l.length > 0);
    if (lines.length === 0) return lineOf(canonicalPgn);
    let i = 0;
    while (lines.every((l) => l.length > i && l[i] === lines[0][i])) i += 1;
    // Never shorter than the family, and never the whole of any single line —
    // a trunk that consumed an option entirely would leave it no branch move.
    return i >= familyPlies ? lines[0].slice(0, i) : lineOf(canonicalPgn);
  };
  const trunk = commonPrefix();

  let fen: string;
  try {
    const board = new Chess();
    for (const san of trunk) {
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

  const branchOf = options.map((o) => branchMove(o.pgn, trunk.length));
  // ── A SHARED BRANCH IS NOT THIS LINE'S SHARE ────────────────────────────
  //
  // The Najdorf and the Dragon both leave `e4 c5` by Nf3. Reporting Nf3's
  // popularity on BOTH tiles would tell the student that two different lines
  // are each played 70% of the time, which is false twice over and worse than
  // saying nothing. A branch move only earns a number when it belongs to
  // exactly ONE option on screen; the rest keep taxonomy order and no caption.
  const shareCount = new Map<string, number>();
  for (const b of branchOf) if (b) shareCount.set(b, (shareCount.get(b) ?? 0) + 1);

  const ranked: RankedLineOption[] = options.map((o, i) => {
    const branch = branchOf[i];
    const unique = branch !== null && shareCount.get(branch) === 1;
    const games = unique ? bySan.get(branch) ?? null : null;
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
