// recordReprice — carry ONE PRICE to the stored record (L6, #2 root cause 4).
//
// A game analysed before the review priced moves inside one search carries
// annotations priced as the read before minus a separate read after. Every
// row the record built from them — slip rows (`misconceptionTags`), mistake
// puzzles, held/broken capability rows — carried that split. This re-prices
// the game's annotations (`annotationReprice`, the review's own regrade) and
// relabels the rows already built from them, in place:
//   • a slip row / mistake puzzle whose move is STILL a fault takes the new
//     cost and band;
//   • a row whose move the one search says was NOT a fault is DEMOTED: moved,
//     whole, into `demotedRows` (lead/David L6: demote, never delete). Store
//     membership is the one predicate — every reader of the slip rows and the
//     puzzles (drill queue, My Mistakes, the weakness spine, the heat map, the
//     counts) drops it with no code of its own; the row is kept whole, so it
//     can be put back;
//   • the capability rows are rebuilt by the record's own re-read, which reads
//     the new costs (`POSITIVE_HALF_REV` / `THREAT_HALF_REV` moved with
//     `RECORD_PRICE_REV`).
// One game per call, run inside `misconceptionRulesBackfill`'s loop, so it
// shares the boot schedule (start late, yield per move, persist per game).
import { db } from '../db/schema';
import type { MisconceptionTagRecord, MoveAnnotation, MoveClassification } from '../types';
import { demotedId } from './demotedRows';
import { RECORD_PRICE_REV } from '../data/misconceptionTags';
import { repriceAnnotations } from './annotationReprice';
import type { MoveScorer } from './pvPlayback';
import { determinePlayerColor, replayPgnToFens } from './mistakePuzzleService';
import { isFixtureGame } from './fixtureGames';
import { REVIEW_READ_DEPTH } from './engineConstants';
import { usernameForGame } from './autoAnalyzeGame';

type Grade = NonNullable<MisconceptionTagRecord['grade']>;
const GRADES: ReadonlySet<MoveClassification> = new Set(['inaccuracy', 'mistake', 'blunder']);

export interface RecordRepriceResult {
  /** Student moves given a one-search price. */
  priced: number;
  /** Annotations whose label moved. */
  annotationsRelabeled: number;
  /** Slip rows whose grade moved (the move is still a fault). */
  rowsRelabeled: number;
  /** Slip rows whose move the one search says was not a fault (demoted). */
  rowsNotAFault: number;
  /** Mistake puzzles whose band moved. */
  puzzlesRelabeled: number;
  /** Mistake puzzles whose move the one search says was not a fault (demoted). */
  puzzlesNotAFault: number;
}

const NONE: RecordRepriceResult = { priced: 0, annotationsRelabeled: 0, rowsRelabeled: 0, rowsNotAFault: 0, puzzlesRelabeled: 0, puzzlesNotAFault: 0 };

/** Analysed games whose annotations were not re-priced under `RECORD_PRICE_REV`. */
export async function gamesBehindPrice(): Promise<string[]> {
  const games = await db.games
    .filter((g) => !g.isMasterGame && !!g.fullyAnalyzed && (g.annotations?.length ?? 0) > 0
      && !isFixtureGame(g) && g.recordPriceRev !== RECORD_PRICE_REV)
    .toArray();
  return games.map((g) => g.id);
}

/** Re-price one game and relabel the rows built from it. Stamps the game, so
 *  a killed app keeps every finished game and re-prices only the rest. */
export async function repriceGameRecord(
  gameId: string,
  opts: { scorer: MoveScorer; username?: string; yieldBetween?: () => Promise<void>; depth?: number },
): Promise<RecordRepriceResult> {
  const game = await db.games.get(gameId);
  if (!game || isFixtureGame(game) || (game.annotations?.length ?? 0) === 0) return NONE;
  if (game.recordPriceRev === RECORD_PRICE_REV) return NONE;
  const color = determinePlayerColor(game, opts.username ?? usernameForGame(game));
  const stamp = async (annotations?: MoveAnnotation[]): Promise<void> => {
    await db.games.update(gameId, { ...(annotations ? { annotations } : {}), recordPriceRev: RECORD_PRICE_REV });
  };
  if (!color) { await stamp(); return NONE; }
  const fens = replayPgnToFens(game.pgn);
  const r = await repriceAnnotations({
    annotations: game.annotations ?? [],
    fens,
    playerColor: color,
    scorer: opts.scorer,
    depth: opts.depth ?? REVIEW_READ_DEPTH,
    yieldBetween: opts.yieldBetween,
  });
  // The repriced verdict per (position, move), for the rows built from them.
  const verdict = new Map<string, { cls: MoveClassification; cost: number }>();
  for (const a of r.annotations) {
    if (a.color !== color || typeof a.costCp !== 'number') continue;
    const fen = fens[(a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0)];
    if (fen) verdict.set(`${fen}|${a.san}`, { cls: a.classification, cost: a.costCp });
  }
  const out: RecordRepriceResult = { ...NONE, priced: r.priced, annotationsRelabeled: r.changes.length };
  const now = Date.now();
  await db.transaction('rw', db.games, db.misconceptionTags, db.mistakePuzzles, db.demotedRows, async () => {
    await stamp(r.annotations);
    const rows = await db.misconceptionTags.where('sourceGameId').equals(gameId)
      .filter((row) => row.source === 'auto-analysis').toArray();
    for (const row of rows) {
      const v = verdict.get(`${row.fen}|${row.playedSan ?? ''}`);
      if (!v) continue;
      if (!GRADES.has(v.cls)) {
        out.rowsNotAFault += 1;
        await db.demotedRows.put({ id: demotedId('misconceptionTags', row.id), store: 'misconceptionTags', row, demotedAt: now, rev: RECORD_PRICE_REV, costCp: v.cost });
        await db.misconceptionTags.delete(row.id);
        continue;
      }
      const grade = v.cls as Grade;
      if (row.grade !== grade || row.cpLoss !== v.cost) {
        if (row.grade !== grade) out.rowsRelabeled += 1;
        await db.misconceptionTags.update(row.id, { grade, cpLoss: v.cost });
      }
    }
    const puzzles = await db.mistakePuzzles.where('sourceGameId').equals(gameId).toArray();
    for (const p of puzzles) {
      const v = verdict.get(`${p.fen}|${p.playerMoveSan}`);
      if (!v) continue;
      if (!GRADES.has(v.cls)) {
        out.puzzlesNotAFault += 1;
        await db.demotedRows.put({ id: demotedId('mistakePuzzles', p.id), store: 'mistakePuzzles', row: p, demotedAt: now, rev: RECORD_PRICE_REV, costCp: v.cost });
        await db.mistakePuzzles.delete(p.id);
        continue;
      }
      const classification = v.cls as 'inaccuracy' | 'mistake' | 'blunder';
      if (p.classification !== classification || p.cpLoss !== v.cost) {
        if (p.classification !== classification) out.puzzlesRelabeled += 1;
        await db.mistakePuzzles.update(p.id, { classification, cpLoss: v.cost });
      }
    }
  });
  return out;
}
