/**
 * WO-4 J2 — DOES A REAL GAME PRODUCE ATTRIBUTED FUNDAMENTALS THAT LAND IN THE
 * MODEL? "A wire that does not fire is not a wire" — an import is not proof.
 *
 * This drives the app's OWN pipeline, not a re-implementation of it:
 *   real PGN → `analyzeGameOnWorker` (the batch sweep: book skip, shallow-noise
 *   floor, `classifyCpLoss`, BEST_MOVE_DEPTH refinement) → `db.games` →
 *   `autoAnalyzeGameMisconceptions` (→ `captureMisconception` →
 *   `classifyMisconception` attribution-first → `logMisconception`) →
 *   `misconceptionTags` rows carrying `fundamentalId` → `getFundamentalCounts`.
 *
 * The only substitution is the ENGINE TRANSPORT: `analyzeGameOnWorker` takes a
 * `DedicatedWorker`, so a replay worker hands back numbers REAL Stockfish 18
 * (the app's own npm WASM build) produced offline for every position of the
 * game, at the sweep's own depths (BATCH_SHALLOW_DEPTH=12 for evals,
 * BEST_MOVE_DEPTH=18 for the best move). Nothing about the grading, the gate or
 * the attribution is stubbed. Vitest is the only place fake-indexeddb + the
 * module aliases exist, which is why the measurement lives here.
 *
 * Two halves:
 *  • THE GATE — one real amateur game, committed as a fixture. Fails if the
 *    pipeline stops producing attributed rows.
 *  • THE MEASUREMENT — the 47-game real corpus under data/sources/wo4-corpus/
 *    (gitignored research data; skipped when absent). Writes
 *    audit-reports/wo4-attribution-measure.json. This is where the WO's numbers
 *    come from (the `learned` gate, the attribution gap).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { analyzeGameOnWorker } from './gameAnalysisService';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { getFundamentalCounts } from './fundamentalsCatalog';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { getMisconceptionProfile } from './misconceptionService';
import { FUNDAMENTAL_TAG, FUNDAMENTAL_IDS } from './principleAttribution';
import { MISCONCEPTION_TAGS } from '../data/misconceptionTags';
import { MATE_EVAL_VALUE } from './engineConstants';
import { buildGameRecord } from '../test/factories';
import type { MisconceptionTagRecord } from '../types';

// ─── The replay worker ───────────────────────────────────────────────────────

/** One engine reading of one position, as the offline annotator stored it. */
interface EngineRead { evalWhite: number | null; best: string | null; depth: number }
interface CorpusGame {
  id: string; moves: string; white: string; black: string; whiteElo: number; blackElo: number;
  winner: string | null; us: string; depth: number;
  plies: { fenBefore: string; bestMove: string | null; bestMoveEval: number | null; evaluation: number | null }[];
}

/** The annotator encodes mate as ±(100000 − n); the app's worker as ±MATE_EVAL_VALUE. */
function normEval(v: number | null): number {
  if (v === null) return 0;
  if (Math.abs(v) > 90_000) return v > 0 ? MATE_EVAL_VALUE : -MATE_EVAL_VALUE;
  return v;
}

/** fen → engine read, from a per-ply annotation (position i = ply i's BEFORE). */
function readsByFen(g: CorpusGame): Map<string, EngineRead> {
  const m = new Map<string, EngineRead>();
  for (const p of g.plies) m.set(p.fenBefore, { evalWhite: p.bestMoveEval, best: p.bestMove, depth: g.depth });
  // The final position: eval = last ply's `evaluation`, no best move.
  const c = new Chess();
  for (const san of g.moves.split(' ')) c.move(san);
  const last = g.plies[g.plies.length - 1];
  if (!m.has(c.fen())) m.set(c.fen(), { evalWhite: last.evaluation, best: null, depth: g.depth });
  return m;
}

type Worker = Parameters<typeof analyzeGameOnWorker>[1];

/** A `DedicatedWorker` that replays real Stockfish output by position. Depth
 *  ≥ 18 requests read the deep map when it exists (the sweep's best-move pass). */
function replayWorker(shallow: Map<string, EngineRead>, deep: Map<string, EngineRead> | null): Worker {
  const stub = {
    newGame(): void { /* replay has no hash to clear */ },
    analyzePosition(fen: string, depth: number): Promise<{ evaluation: number; bestMove: string; depth: number; pv: string[] }> {
      const hit = (depth >= 18 ? deep?.get(fen) : undefined) ?? shallow.get(fen) ?? deep?.get(fen);
      if (!hit) return Promise.reject(new Error(`replay: no engine read for ${fen}`));
      return Promise.resolve({ evaluation: normEval(hit.evalWhite), bestMove: hit.best ?? '(none)', depth: hit.depth, pv: [] });
    },
    ping(): Promise<boolean> { return Promise.resolve(true); },
    destroy(): void { /* nothing to kill */ },
  };
  return stub as unknown as Worker;
}

function pgnOf(moves: string): string {
  const c = new Chess();
  for (const san of moves.split(' ')) c.move(san);
  return c.pgn();
}

/** Run ONE real game through the real pipeline; return what landed. */
async function runGame(g: CorpusGame, deep: CorpusGame | null): Promise<{
  annotations: NonNullable<Awaited<ReturnType<typeof analyzeGameOnWorker>>>['annotations'];
  rows: MisconceptionTagRecord[];
  studentColor: 'white' | 'black';
}> {
  const studentColor: 'white' | 'black' = g.white.toLowerCase() === g.us.toLowerCase() ? 'white' : 'black';
  const rec = buildGameRecord({
    id: `wo4-${g.id}`, pgn: pgnOf(g.moves), white: g.white, black: g.black,
    whiteElo: g.whiteElo, blackElo: g.blackElo, source: 'lichess',
    result: g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2',
  });
  await db.games.put(rec);
  const worked = await analyzeGameOnWorker(rec, replayWorker(readsByFen(g), deep ? readsByFen(deep) : null));
  if (!worked) throw new Error(`analyzeGameOnWorker returned null for ${g.id}`);
  await db.games.update(rec.id, { annotations: worked.annotations, fullyAnalyzed: true, analysisDepth: worked.achievedDepth });
  await autoAnalyzeGameMisconceptions(rec.id, g.us);
  const rows = await db.misconceptionTags.where('sourceGameId').equals(rec.id).toArray();
  return { annotations: worked.annotations, rows, studentColor };
}

beforeEach(async () => {
  await db.misconceptionTags.clear();
  await db.games.clear();
  await db.mistakePuzzles.clear();
  await db.positionEvals.clear();
});

// ─── THE MEASUREMENT (skips without the gitignored corpus) ───────────────────

const CORPUS_DIR = 'data/sources/wo4-corpus';
const SHALLOW = `${CORPUS_DIR}/annotated-d12.json`;
const DEEP = `${CORPUS_DIR}/annotated-d18.json`;

describe.skipIf(!existsSync(SHALLOW))('WO-4 measurement — the real 47-game amateur corpus through the real pipeline', () => {
  it('measures the `learned` gate and the attribution gap, and writes the report', async () => {
    const shallow = JSON.parse(readFileSync(SHALLOW, 'utf8')) as CorpusGame[];
    const deepAll = existsSync(DEEP) ? (JSON.parse(readFileSync(DEEP, 'utf8')) as CorpusGame[]) : [];
    const deepById = new Map(deepAll.map((g) => [g.id, g]));

    const detectorTags = new Set(Object.values(FUNDAMENTAL_TAG));
    const gapTags = MISCONCEPTION_TAGS.map((t) => t.id).filter((t) => !detectorTags.has(t));

    const tally = { games: 0, plies: 0, studentPlies: 0, studentFlagged: 0, rowsLogged: 0, rowsCounted: 0, rowsUncounted: 0, rowsWithFundamental: 0 };
    const byTag = new Map<string, number>();
    const byFundamental = new Map<string, number>();
    const byFundamentalWithTag = new Map<string, number>();
    const gapHits = new Map<string, number>(gapTags.map((t) => [t, 0]));
    const bump = (m: Map<string, number>, k: string): void => { m.set(k, (m.get(k) ?? 0) + 1); };
    const perGame: { id: string; us: string; studentColor: string; flagged: number; rows: number; attributed: string[]; tags: string[] }[] = [];
    // Every attributed row with the numbers needed to rebuild it as a fixture.
    const rowsDetail: { game: string; fundamentalId: string; tag: string; moveNumber?: number; fen: string; playedSan?: string; bestSan?: string; cpLoss?: number; evaluation: number | null; bestMoveEval: number | null; bestMove: string | null }[] = [];

    for (const g of shallow) {
      const { annotations, rows, studentColor } = await runGame(g, deepById.get(g.id) ?? null);
      tally.games += 1;
      tally.plies += annotations.length;
      const mine = annotations.filter((a) => a.color === studentColor);
      tally.studentPlies += mine.length;
      const flagged = mine.filter((a) => a.classification === 'blunder' || a.classification === 'mistake').length;
      tally.studentFlagged += flagged;
      tally.rowsLogged += rows.length;
      for (const r of rows) {
        if (r.counted === false) tally.rowsUncounted += 1; else tally.rowsCounted += 1;
        bump(byTag, r.tag);
        if (r.fundamentalId) {
          tally.rowsWithFundamental += 1;
          bump(byFundamental, r.fundamentalId);
          bump(byFundamentalWithTag, `${r.fundamentalId} → ${r.tag}`);
        }
        if (gapHits.has(r.tag)) bump(gapHits, r.tag);
      }
      for (const r of rows) {
        if (!r.fundamentalId) continue;
        const ann = annotations.find((a) => a.moveNumber === r.moveNumber && a.color === studentColor);
        rowsDetail.push({ game: g.id, fundamentalId: r.fundamentalId, tag: r.tag, moveNumber: r.moveNumber, fen: r.fen, playedSan: r.playedSan, bestSan: r.bestSan, cpLoss: r.cpLoss,
          evaluation: ann?.evaluation ?? null, bestMoveEval: ann?.bestMoveEval ?? null, bestMove: ann?.bestMove ?? null });
      }
      perGame.push({ id: g.id, us: g.us, studentColor, flagged, rows: rows.length,
        attributed: rows.map((r) => r.fundamentalId).filter((x): x is string => !!x), tags: rows.map((r) => r.tag) });
    }

    // WHAT THE MODEL SEES vs WHAT THE SCORECARD SEES — read through the app's own readers.
    const scorecard = await getFundamentalCounts();
    const scorecardTotal = FUNDAMENTAL_IDS.reduce((n, id) => n + (scorecard[id]?.count ?? 0), 0);
    const profileAll = await getMisconceptionProfile();
    const profileCountedOnly = await getMisconceptionProfile({ countedOnly: true });
    const sum = (p: Awaited<ReturnType<typeof getMisconceptionProfile>>): number => p.reduce((n, a) => n + a.total, 0);

    const rank = (o: Map<string, number>): [string, number][] => [...o.entries()].sort((a, b) => b[1] - a[1]);
    const neverFired = FUNDAMENTAL_IDS.filter((id) => !byFundamental.has(id));
    const report = {
      generatedAt: new Date().toISOString(),
      corpus: { source: 'lichess rated blitz/rapid, both players 1000–2000, fetched 2026-09-19', games: shallow.length, deepAvailable: deepAll.length, sweepDepth: 12, bestMoveDepth: deepAll.length ? 18 : 12 },
      tally,
      learnedGate: {
        note: 'autoAnalyzeGameMisconceptions hardcodes learned:false → every row is counted:false',
        rowsCounted: tally.rowsCounted, rowsUncounted: tally.rowsUncounted,
        formalProfile_all: sum(profileAll), formalProfile_countedOnly: sum(profileCountedOnly),
        fundamentalsScorecard: scorecardTotal,
      },
      attributionRate: tally.studentFlagged ? +(tally.rowsWithFundamental / tally.studentFlagged).toFixed(3) : 0,
      byTag: rank(byTag), byFundamental: rank(byFundamental), byFundamentalWithTag: rank(byFundamentalWithTag),
      neverFired,
      gap: { tagsWithNoDetector: gapTags, hits: rank(gapHits) },
      perGame,
      rowsDetail,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/wo4-attribution-measure.json', JSON.stringify(report, null, 2));
    console.log('\n[WO-4 MEASURE] ' + JSON.stringify({ ...report, perGame: undefined, rowsDetail: undefined, byFundamentalWithTag: undefined }, null, 1));

    // The harness itself must have RUN — a measurement that measured nothing is
    // the vacuity failure this repo names as its most expensive.
    expect(tally.games).toBe(shallow.length);
    expect(tally.plies).toBeGreaterThan(1000);
    expect(tally.studentFlagged).toBeGreaterThan(0);
  }, 600_000);
});

// ─── THE GATE (always runs; committed fixture) ────────────────────────────────
// One real amateur game — lichess Nw3DqA2B, Maxim_2017_Bolotnik as Black — with
// the app's own Stockfish 18 reads at BOTH sweep depths (12 for the eval curve,
// 18 for the best move on a flagged ply). The richest game in the corpus: seven
// flagged moves, five attributed across four distinct fundamentals. If this
// stops producing attributed rows, capture→attribute→model is broken.

const FIXTURE = 'src/test/fixtures/wo4-real-game-Nw3DqA2B.json';
interface Fixture extends Omit<CorpusGame, 'depth' | 'plies'> {
  shallow: { depth: number; plies: CorpusGame['plies'] };
  deep: { depth: number; plies: CorpusGame['plies'] };
}
const asGame = (f: Fixture, half: 'shallow' | 'deep'): CorpusGame =>
  ({ ...f, depth: f[half].depth, plies: f[half].plies });

describe('WO-4 gate — a real game produces ATTRIBUTED fundamentals that land in the model', () => {
  it('real PGN → real sweep → misconceptionTags rows carrying fundamentalId → the scorecard reads them', async () => {
    const f = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    const { annotations, rows, studentColor } = await runGame(asGame(f, 'shallow'), asGame(f, 'deep'));
    expect(studentColor).toBe('black');

    // The sweep graded the student's game — flagged moves exist and carry a best move.
    const flagged = annotations.filter((a) => a.color === studentColor && (a.classification === 'blunder' || a.classification === 'mistake'));
    expect(flagged.length).toBeGreaterThanOrEqual(3);
    expect(flagged.every((a) => a.bestMove)).toBe(true);

    // Every flagged move was CAPTURED (one row each, all from this game).
    expect(rows.length).toBe(flagged.length);
    expect(rows.every((r) => r.source === 'auto-analysis' && r.sourceGameId === `wo4-${f.id}`)).toBe(true);

    // ATTRIBUTION fired: rows carry a fundamentalId that is a real FundamentalId,
    // whose tag is the one FUNDAMENTAL_TAG files it under (one vocabulary).
    const attributed = rows.filter((r) => r.fundamentalId);
    expect(attributed.length).toBeGreaterThanOrEqual(3);
    expect(new Set(attributed.map((r) => r.fundamentalId)).size).toBeGreaterThanOrEqual(2);
    for (const r of attributed) {
      const id = r.fundamentalId as (typeof FUNDAMENTAL_IDS)[number];
      expect(FUNDAMENTAL_IDS).toContain(id);
      expect(r.tag).toBe(FUNDAMENTAL_TAG[id]);
      // The proof is board-true: the row names the move played and the better move.
      expect(r.playedSan).toBeTruthy();
      expect(r.bestSan).toBeTruthy();
    }

    // And the MODEL'S READER sees them — this is the wire firing, not an import.
    const counts = await getFundamentalCounts();
    for (const r of attributed) {
      expect(counts[r.fundamentalId as (typeof FUNDAMENTAL_IDS)[number]]?.count ?? 0).toBeGreaterThan(0);
    }

    // The measured `learned` gate, recorded here so a change to it is VISIBLE
    // (see docs/plans/2026-09-19-wo4-fundamentals-attribution.md): the
    // recording path writes counted:false, so the TAG tally sees none — that
    // guard against double-counting the mistakePuzzle twin is deliberately kept.
    const countedOnly = await getMisconceptionProfile({ countedOnly: true });
    expect(rows.every((r) => r.counted === false)).toBe(true);
    expect(countedOnly.reduce((n, a) => n + a.total, 0)).toBe(0);

    // AND THE RANKER SEES THE FUNDAMENTALS ANYWAY (A-NEW, closed 2026-09-19):
    // the spine reads `fundamentalId` over ALL rows into `fundamental:<id>`
    // rows, so what the tab shows is what the coach teaches from. This is the
    // measurement that read 79 → 0 before the reader existed.
    const spine = await getUnifiedWeaknessProfile();
    for (const id of new Set(attributed.map((r) => r.fundamentalId))) {
      const row = spine.find((w) => w.key === `fundamental:${id}`);
      expect(row, `spine has no row for ${id}: ${spine.map((w) => w.key).join(', ')}`).toBeTruthy();
      expect(row!.total).toBe(attributed.filter((r) => r.fundamentalId === id).length);
    }
  }, 60_000);

  it('NEGATIVE CONTROL — seat the OTHER player and the student\'s attributions do not appear', async () => {
    const f = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    const asStudent = await runGame(asGame(f, 'shallow'), asGame(f, 'deep'));
    await db.misconceptionTags.clear(); await db.games.clear(); await db.mistakePuzzles.clear();
    const opponent = f.us.toLowerCase() === f.white.toLowerCase() ? f.black : f.white;
    const asOpponent = await runGame({ ...asGame(f, 'shallow'), us: opponent }, { ...asGame(f, 'deep'), us: opponent });
    expect(asOpponent.studentColor).not.toBe(asStudent.studentColor);
    // Different seat, different flagged plies — no row from one seat's set can
    // carry the other seat's (moveNumber, playedSan).
    const key = (r: MisconceptionTagRecord): string => `${r.moveNumber}:${r.playedSan}`;
    const mine = new Set(asStudent.rows.map(key));
    expect(asOpponent.rows.some((r) => mine.has(key(r)))).toBe(false);
  }, 60_000);

  it('NEGATIVE CONTROL — with no engine reads the sweep grades nothing and nothing is captured (the harness cannot pass vacuously)', async () => {
    const f = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    // A worker with no reads rejects every search; the sweep records nulls and
    // classifies book/good — no flagged move, so no capture and no attribution.
    const rec = buildGameRecord({ id: `wo4-blank-${f.id}`, pgn: pgnOf(f.moves), white: f.white, black: f.black, source: 'lichess' });
    await db.games.put(rec);
    const worked = await analyzeGameOnWorker(rec, replayWorker(new Map(), null));
    expect(worked).not.toBeNull();
    const flagged = (worked?.annotations ?? []).filter((a) => a.classification === 'blunder' || a.classification === 'mistake');
    expect(flagged.length).toBe(0);
    await db.games.update(rec.id, { annotations: worked?.annotations ?? [], fullyAnalyzed: true, analysisDepth: 0 });
    await autoAnalyzeGameMisconceptions(rec.id, f.us);
    expect(await db.misconceptionTags.where('sourceGameId').equals(rec.id).count()).toBe(0);
  }, 60_000);
});
