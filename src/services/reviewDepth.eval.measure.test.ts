/**
 * @vitest-environment-options { "url": "https://chess-academy-pro.vercel.app/" }
 *
 * REVIEW NARRATION — ACCURACY AND DEPTH over 100 of David's games (David
 * 2026-10-28: "Evaluate the accuracy of the narrations in 100 random games … dive
 * deeper down the move to uncover 2 and 3rd order consequences/reasons … Make
 * sure it stays deterministic … use the same tools the coach has").
 *
 * The REAL Review (`generateReviewNarration`) runs over each game with one mock:
 * the engine transport, routed to a native Stockfish (fixed depth, one thread, a
 * fresh process per position — the same read every run). For every narrated
 * move, the coach's own computers read what it set in motion: the engine's best
 * continuation (`computePvLine` facts), the tactic detector on the board after
 * it, and the cause-and-effect chains. Each game is written as it finishes, so a
 * stopped run keeps what it did.
 *
 *   REVIEW_DEPTH_EVAL=1 SHARD=0/4 npx vitest run src/services/reviewDepth.eval.measure.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ON = process.env.REVIEW_DEPTH_EVAL === '1';
const SF = '/usr/games/stockfish';
const DEPTH = Number(process.env.EVAL_DEPTH || 14);
const GAMES = Number(process.env.EVAL_GAMES || 100);
const [SHARD_I, SHARD_N] = (process.env.SHARD || '0/1').split('/').map(Number);
const OUT = process.env.EVAL_OUT || 'audit-reports/review-depth';
const ONLY = process.env.EVAL_ONLY ?? '';
const CACHE_DIR = 'audit-reports/review-depth';
const DROP = 'audit-reports/.fixtures/data-drop-david.json';
const ME = 'knight_mare_01';

interface Line { cp: number; mate: number | null; pv: string[]; earlier?: { depth: number; moves: string[] } | null }
/** Review's own path, as the app runs it (`isReviewUncapped()` is true in the
 *  app). The first runs passed `uncapped: false` and measured the capped path
 *  the app does not run; EVAL_UNCAPPED=0 keeps that for comparison. */
const UNCAPPED = process.env.EVAL_UNCAPPED !== '0';
/** The record keeps eight plies of each line (the pool's `pvPlies`); the first
 *  runs gave it the whole line. EVAL_RECORD_PLIES=0 keeps the whole line. */
const RECORD_PLIES = Number(process.env.EVAL_RECORD_PLIES ?? 8);
/** The cost reason's deep read (`COST_REASON_DEPTH`), served by the pool mock. */
const DEEP_DEPTH = Number(process.env.EVAL_DEEP_DEPTH || 20);
const cachePath = `${CACHE_DIR}/engine-cache-${SHARD_I}.json`;
// Every shard's reads, so a re-run of one game (EVAL_ONLY) is served from disk.
const cache: Record<string, Line[]> = {};
for (let i = 0; i < 8; i += 1) {
  const p = `${CACHE_DIR}/engine-cache-${i}.json`;
  if (existsSync(p)) Object.assign(cache, JSON.parse(readFileSync(p, 'utf8')) as Record<string, Line[]>);
}
let cacheDirty = 0;

/** Stockfish's lines at `fen`, White's point of view (mate: + = White mates). */
function read(fen: string, searchmoves?: string, depth: number = DEPTH): Promise<Line[]> {
  const k = depth === DEPTH ? `${fen}|${searchmoves ?? ''}` : `${fen}|${searchmoves ?? ''}|d${depth}`;
  if (cache[k]) return Promise.resolve(cache[k]);
  const multipv = searchmoves ? Math.min(8, searchmoves.split(' ').length) : 3;
  return new Promise((resolve) => {
    const sf = spawn(SF);
    const byRank = new Map<number, Line>();
    // The best line at each exact depth — the free second read (`earlierLine`).
    const bestByDepth = new Map<number, string[]>();
    const flip = fen.split(' ')[1] === 'b' ? -1 : 1;
    let done = false;
    let buf = '';
    const finish = (): void => {
      if (done) return;
      done = true;
      try { sf.kill(); } catch { /* gone */ }
      const lines = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
      if (lines[0]) {
        let best: { depth: number; moves: string[] } | null = null;
        for (const [d, moves] of bestByDepth) if (d <= depth - 2 && (!best || d > best.depth)) best = { depth: d, moves };
        lines[0] = { ...lines[0], earlier: best };
      }
      cache[k] = lines;
      if (!ONLY && ++cacheDirty % 200 === 0) writeFileSync(cachePath, JSON.stringify(cache));
      resolve(lines);
    };
    sf.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      const parts = buf.split('\n');
      buf = parts.pop() ?? '';
      for (const ln of parts) {
        if (ln.startsWith('bestmove')) { finish(); continue; }
        if (!ln.startsWith('info') || !/ pv /.test(ln) || / bound /.test(ln)) continue;
        const rank = Number(/ multipv (\d+)/.exec(ln)?.[1] ?? 1);
        const cp = /score cp (-?\d+)/.exec(ln);
        const mt = /score mate (-?\d+)/.exec(ln);
        const pv = / pv (.+)$/.exec(ln)?.[1].trim().split(/\s+/) ?? [];
        const dm = / depth (\d+)/.exec(ln);
        if (rank === 1 && dm) bestByDepth.set(Number(dm[1]), pv);
        const mate = mt ? Number(mt[1]) * flip : null;
        byRank.set(rank, { cp: cp ? Number(cp[1]) * flip : (mate !== null ? (mate > 0 ? 30000 - Math.abs(mate) : -30000 + Math.abs(mate)) : 0), mate, pv });
      }
    });
    sf.on('error', finish);
    sf.stdin.write(`setoption name MultiPV value ${multipv}\nposition fen ${fen}\ngo depth ${depth}${searchmoves ? ` searchmoves ${searchmoves}` : ''}\n`);
    setTimeout(finish, 60_000);
  });
}

async function analyze(fen: string, _depth?: number, opts?: Record<string, string | number>): Promise<{
  bestMove: string; evaluation: number; isMate: boolean; mateIn: number | null; depth: number;
  topLines: { rank: number; evaluation: number; moves: string[]; mate: number | null; depth: number }[]; nodesPerSecond: number;
}> {
  const lines = await read(fen, typeof opts?.searchmoves === 'string' ? opts.searchmoves : undefined);
  const top = lines[0];
  return {
    bestMove: top?.pv[0] ?? '',
    evaluation: top?.cp ?? 0,
    isMate: top?.mate != null,
    mateIn: top?.mate ?? null,
    depth: DEPTH,
    topLines: lines.map((l, i) => ({ rank: i + 1, evaluation: l.cp, moves: l.pv, mate: l.mate, depth: DEPTH, ...(i === 0 ? { earlier: l.earlier ?? null } : {}) })),
    nodesPerSecond: 0,
  };
}

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn((fen: string, depth?: number, opts?: Record<string, string | number>) => analyze(fen, depth, opts)),
    analyzeBounded: vi.fn((fen: string, depth: number, opts?: Record<string, string | number>) => analyze(fen, depth, opts)),
  },
}));
// THE POOL, as the app leases it for the review's passes — native Stockfish
// behind it, and the cost reason's deep read at its own depth.
vi.mock('./gameAnalysisService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gameAnalysisService')>();
  const lane = {
    analyzePosition: (fen: string, depth: number) => analyze(fen, depth),
    async analyzeDeep(fen: string) {
      const lines = await read(fen, undefined, DEEP_DEPTH);
      const top = lines[0];
      return {
        bestMove: top?.pv[0] ?? '', evaluation: top?.cp ?? 0, isMate: top?.mate != null, mateIn: top?.mate ?? null, depth: DEEP_DEPTH,
        topLines: top ? [{ rank: 1, evaluation: top.cp, moves: top.pv, mate: top.mate, depth: DEEP_DEPTH, earlier: top.earlier ?? null }] : [],
        nodesPerSecond: 0,
      };
    },
  };
  return { ...actual, acquirePvEngines: vi.fn(async (size: number) => ({ engines: Array.from({ length: Math.max(1, Math.min(size, 3)) }, () => lane), release: () => undefined })) };
});
// What Review speaks with the phrasing pass off — the computed text.
vi.mock('./coachApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./coachApi')>();
  return { ...actual, voiceFacts: vi.fn(async () => ''), voiceReviewLines: vi.fn(async () => []) };
});

/** Seeded, so the same 100 games are picked every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
/** `side`'s material minus the other side's, from a FEN. */
function materialFor(fen: string, side: 'white' | 'black'): number {
  let w = 0; let b = 0;
  for (const ch of fen.split(' ')[0]) { const v = VALUE[ch.toLowerCase()]; if (v === undefined) continue; if (ch === ch.toUpperCase()) w += v; else b += v; }
  return side === 'white' ? w - b : b - w;
}

interface DeepItem { order: 2 | 3 | 4; kind: string; text: string; squares: string[]; san?: string; mentioned: boolean }

describe.runIf(ON)('review narration — accuracy and depth over David\'s games', () => {
  it('narrates each game and reads what each narrated move set in motion', { timeout: 7_200_000 }, async () => {
    mkdirSync(OUT, { recursive: true });
    const { classifyCpLoss } = await import('./gameAnalysisService');
    const { generateReviewNarration } = await import('./coachFeatureService');
    const { computePvLine } = await import('./pvPlayback');
    const { detectTactics } = await import('./tacticsDetector');
    const { buildCausalChain, findAllowedChain, findMissedChain } = await import('./causalChain');
    type ReviewMoveInput = import('./coachFeatureService').ReviewMoveInput;
    try {
      const { __setLocalDbForTests } = await import('./masterPlayLookup');
      __setLocalDbForTests(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')));
    } catch { /* the book reframe falls through */ }
    try {
      const { __setHisPlayDbForTests } = await import('./hisPlayLookup');
      __setHisPlayDbForTests(JSON.parse(readFileSync('public/data/danya-play-db.json', 'utf8')));
    } catch { /* the opening detail falls through */ }

    interface DropGame { id: string; pgn: string; white: string; black: string; result: string; whiteElo?: number; blackElo?: number }
    const drop = JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: DropGame[] } };
    const mine = drop.stores.games
      .filter((g) => [g.white, g.black].some((n) => n?.toLowerCase() === ME))
      .map((g) => { const c = new Chess(); try { c.loadPgn(g.pgn); } catch { return null; } return { g, sans: c.history() }; })
      .filter((x): x is { g: DropGame; sans: string[] } => !!x && x.sans.length >= 30)
      .sort((a, b) => a.g.id.localeCompare(b.g.id));
    const r = rng(20261028);
    for (let i = mine.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [mine[i], mine[j]] = [mine[j], mine[i]]; }
    const only = new Set(ONLY.split(',').filter(Boolean));
    const picked = only.size ? mine.filter(({ g }) => only.has(g.id)) : mine.slice(0, GAMES).filter((_, i) => i % SHARD_N === SHARD_I);
    console.log(`[eval] shard ${SHARD_I}/${SHARD_N}: ${picked.length} of ${Math.min(GAMES, mine.length)} games (of ${mine.length} of his)`);

    for (const [n, { g, sans }] of picked.entries()) {
      const file = `${OUT}/game-${g.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      if (existsSync(file)) { console.log(`[eval] ${n + 1}/${picked.length} ${g.id} done before`); continue; }
      const t0 = Date.now();
      const seat: 'white' | 'black' = g.white.toLowerCase() === ME ? 'white' : 'black';
      const rating = (seat === 'white' ? g.whiteElo : g.blackElo) || 1500;
      const c = new Chess();
      const fens = [c.fen()];
      let replays = true;
      for (const s of sans) { try { c.move(s); } catch { replays = false; break; } fens.push(c.fen()); }
      // A game from a set-up start (a variant, a lesson position) is not a game
      // Review narrates from move one — skipped, and said so.
      if (!replays) { console.log(`[eval] ${n + 1}/${picked.length} ${g.id}: not from the standard start — skipped`); writeFileSync(file, JSON.stringify({ id: g.id, skipped: 'not from the standard start' })); continue; }
      const reads: Line[][] = [];
      for (const f of fens) reads.push(await read(f));
      const moves: ReviewMoveInput[] = sans.map((san, i) => {
        const before = reads[i][0]?.cp ?? 0;
        const after = reads[i + 1][0]?.cp ?? 0;
        const white = i % 2 === 0;
        const classification = classifyCpLoss(white ? before - after : after - before, before, after, white, san.includes('#'));
        // THE ENGINE'S LINES ON A FLAGGED MOVE, as the app stores them
        // (`gameAnalysisService`: afterPlayed = the line after the move,
        // afterBest = the best line past its first move). Without them every
        // reason that needs a line read only a one-move board reply.
        const flagged = classification === 'inaccuracy' || classification === 'mistake' || classification === 'blunder';
        const cut = (pv: string[]): string[] => (RECORD_PLIES > 0 ? pv.slice(0, RECORD_PLIES) : pv);
        const afterPlayed = cut(reads[i + 1][0]?.pv ?? []);
        const afterBest = cut(reads[i][0]?.pv ?? []).slice(1);
        return {
          ply: i + 1, san, isCoachMove: false,
          classification,
          evaluation: after, preMoveEval: before, bestMove: reads[i][0]?.pv[0] ?? null, fenAfter: fens[i + 1],
          ...(flagged && (afterPlayed.length || afterBest.length) ? { pv: { afterPlayed, afterBest, depth: DEPTH } } : {}),
        };
      });
      const narration = await generateReviewNarration({
        moves, playerColor: seat, openingName: null, result: g.result, playerRating: rating, coachNarration: 'full', uncapped: UNCAPPED, gameId: g.id,
      });

      const said: Record<number, string> = {};
      // Which producer spoke each ply — to measure the talk by source.
      const source: Record<number, string> = {};
      const reason: Record<number, string> = {};
      for (const s of narration.segments) {
        if (s.narration?.trim()) { said[s.ply] = s.narration.trim(); source[s.ply] = s.narrationSource ?? 'none'; }
        if (s.costReason) reason[s.ply] = s.costReason;
      }
      // The one cost reason per costly ply, both seats (WO-DECIDER-02).
      const reasonRows = narration.segments.filter((s) => s.reasonRow).map((s) => s.reasonRow);
      const probes: Record<number, DeepItem[]> = {};
      for (const plyS of Object.keys(said)) {
        const p = Number(plyS);
        const text = said[p];
        const inText = new Set(text.match(/\b[a-h][1-8]\b/g) ?? []);
        const mentions = (sq: string[], san?: string): boolean => sq.some((s) => inText.has(s)) || (!!san && text.includes(san.replace(/[+#]/g, '')));
        const mover: 'white' | 'black' = p % 2 === 1 ? 'white' : 'black';
        const items: DeepItem[] = [];
        const push = (it: Omit<DeepItem, 'mentioned'>): void => { items.push({ ...it, mentioned: mentions(it.squares, it.san) }); };
        // What the board holds right after the move.
        try {
          const t = detectTactics(fens[p]);
          for (const tac of t.tactics) push({ order: 2, kind: `on the board: ${tac.type}`, text: tac.description, squares: tac.involvedSquares });
          for (const h of t.hangingPieces) push({ order: 2, kind: 'left loose', text: `${h.color === 'w' ? 'White' : 'Black'} ${h.piece} on ${h.square} is loose`, squares: [h.square] });
        } catch { /* a board the detector cannot read */ }
        // What the best play from here does, move by move.
        const pv = await computePvLine(fens[p], { maxPlies: 6, depth: DEPTH, engine: { analyzePosition: analyze } as never }).catch(() => null);
        let net = 0;
        for (const [k, ply] of (pv?.plies ?? []).entries()) {
          const order: 2 | 3 | 4 = k <= 1 ? 2 : k <= 3 ? 3 : 4;
          const to = ply.uci.slice(2, 4);
          const f = ply.facts;
          net += (ply.moverColor === mover ? 1 : -1) * f.materialGained;
          if (f.isMate) push({ order, kind: 'mate', text: `${ply.san} mates`, squares: [to], san: ply.san });
          if (f.tacticLanded) push({ order, kind: `line: ${f.tacticLanded}`, text: `${ply.san} lands a ${f.tacticLanded}`, squares: [to], san: ply.san });
          if (f.newPassedPawns.length) push({ order, kind: 'line: passed pawn', text: `${ply.san} makes a passed pawn on ${f.newPassedPawns.join(', ')}`, squares: f.newPassedPawns, san: ply.san });
          if (f.outpostGained) push({ order, kind: 'line: outpost', text: `${ply.san} gains an outpost on ${f.outpostGained}`, squares: [f.outpostGained], san: ply.san });
          if (f.shieldLost > 0) push({ order, kind: 'line: king cover lost', text: `${ply.san} strips ${f.shieldLost} pawn(s) from the king`, squares: [to], san: ply.san });
          if (f.newOpenFiles.length) push({ order, kind: 'line: file opened', text: `${ply.san} opens the ${f.newOpenFiles.join(', ')}-file`, squares: [to], san: ply.san });
        }
        // Material from the board BEFORE the move to the end of the line, so
        // the move's own capture counts (a queen trade is even, not "down 8").
        const endFen = pv?.plies.length ? pv.plies[pv.plies.length - 1].fenAfter : fens[p];
        const swing = materialFor(endFen, mover) - materialFor(fens[p - 1], mover);
        if (Math.abs(swing) >= 1 && pv?.plies.length) {
          push({ order: pv.plies.length > 2 ? 3 : 2, kind: 'line: material', text: `the best play from here leaves the side that moved ${swing > 0 ? 'up' : 'down'} ${Math.abs(swing)}`, squares: pv.plies.filter((x) => x.facts.captured).map((x) => x.uci.slice(2, 4)), san: pv.plies[0].san });
        }
        void net;
        // Cause and effect across moves.
        try {
          const chain = buildCausalChain({ historySans: sans.slice(0, p), focusPly: p });
          if (chain) push({ order: 2, kind: 'chain: what this move did', text: chain.edges.map((e) => e.proof).join('; '), squares: chain.nodes.flatMap((x) => x.squares) });
          if (mover === seat) {
            const allowed = findAllowedChain(sans, p, mover === 'white' ? 'w' : 'b');
            if (allowed) push({ order: 3, kind: 'chain: what it allowed', text: allowed.edges.map((e) => e.proof).join('; '), squares: allowed.nodes.flatMap((x) => x.squares) });
            const missed = findMissedChain(sans, p, mover === 'white' ? 'w' : 'b');
            if (missed) push({ order: 2, kind: 'chain: what it missed', text: missed.edges.map((e) => e.proof).join('; '), squares: missed.nodes.flatMap((x) => x.squares) });
          }
        } catch { /* no chain */ }
        probes[p] = items;
      }
      const plies = fens.map((fen, i) => ({ san: sans[i] ?? null, fen, lines: reads[i] }));
      writeFileSync(file, JSON.stringify({ id: g.id, seat, rating, result: g.result, intro: narration.intro, closing: narration.closing, said, source, reason, reasonRows, probes, plies, uncapped: UNCAPPED, recordPlies: RECORD_PLIES }));
      if (!ONLY) writeFileSync(cachePath, JSON.stringify(cache));
      console.log(`[eval] ${n + 1}/${picked.length} ${g.id}: ${sans.length} plies, ${Object.keys(said).length} narrated, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    expect(true).toBe(true);
  });
});

describe.runIf(!ON)('review narration — accuracy and depth (skipped)', () => {
  it('set REVIEW_DEPTH_EVAL=1 to run', () => { expect(true).toBe(true); });
});
