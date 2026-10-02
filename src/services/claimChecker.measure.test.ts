// CLAIM CHECKER — pass 1: HARVEST (2026-09-27, David: "we don't even have the
// accuracy with the current build … I like the plan").
//
// Feeds every student move of 100 real games (50 Naroditsky, 50 chess.com
// amateurs at 800–1800) through the SAME computers Learn free play calls after
// the coach's reply, with the SAME inputs the page builds (the engine's top
// three lines before the move, after it, and at the board the student now
// faces), and records every claim they make with its kind and squares.
//
// This pass verifies nothing. It exists so the verifiers in pass 2 are written
// against what the computers ACTUALLY say, not against what we assume they say.
//
// Not a gate. Skips unless the corpus exists:
//   node scripts/build-wo4-corpus.mjs --fetch --out data/sources/acc-corpus --target 50
//   node scripts/acc-annotate.mjs data/sources/acc-corpus
//   node scripts/acc-annotate.mjs data/sources/acc-naro
// Run: CLAIM_CHECK=1 npx vitest run src/services/claimChecker.measure.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { computePositionFacts } from './positionFacts';
import { detectBehaviors } from './danyaBehaviors';
import { backwardLook } from './backwardLook';
import { buildPositionalRead } from './positionalRead';
import { mateContext } from '../utils/mateContext';
import type { StockfishAnalysis } from '../types';

interface Line { cp: number | null; mate: number | null; pv: string[] }
interface Ply { fen: string; san: string | null; lines: Line[] }
interface Game { id: string; us: string; white: string; black: string; whiteElo: number | null; blackElo: number | null; plies: Ply[] }

const SOURCES = ['data/sources/acc-naro/multipv-d14.json', 'data/sources/acc-corpus/multipv-d14.json'];
const PRESENT = SOURCES.filter((p) => existsSync(p));
// Opt-in: the full harvest runs every student move of 100 games (~15 min), so
// it never rides a normal test run or the pre-commit hook.
const HAVE = PRESENT.length > 0 && process.env.CLAIM_CHECK === '1';

export interface HarvestedClaim {
  game: string;
  set: 'naro' | 'amateur';
  ply: number;
  seat: 'white' | 'black';
  lane: 'facts' | 'behavior' | 'backward' | 'positional';
  kind: string;
  text: string;
  squares: string[];
  claim?: string;
  fenBefore: string;
  san: string;
  probe: string;
  cpLoss: number | null;
  studentEvalAfter: number | null;
}

function toAnalysis(lines: Line[]): StockfishAnalysis | null {
  if (!lines.length) return null;
  const top = lines[0];
  return {
    bestMove: top.pv[0] ?? '',
    evaluation: top.cp ?? 0,
    isMate: top.mate !== null,
    mateIn: top.mate,
    depth: 14,
    topLines: lines.map((l, i) => ({ rank: i + 1, evaluation: l.cp ?? 0, moves: l.pv, mate: l.mate, wdl: null })),
    nodesPerSecond: 0,
    wdl: null,
    seldepth: 14,
  } as unknown as StockfishAnalysis;
}

const MATE = 100_000;
const whiteCp = (l: Line | undefined): number | null => (!l ? null : l.mate !== null ? (l.mate > 0 ? MATE : -MATE) : l.cp);

describe.skipIf(!HAVE)('claim checker — harvest', () => {
  it('records every claim Learn\'s computers make on 100 real games', async () => {
    const out: HarvestedClaim[] = [];
    for (const src of PRESENT) {
      const set: 'naro' | 'amateur' = src.includes('acc-naro') ? 'naro' : 'amateur';
      const games = JSON.parse(readFileSync(src, 'utf8')) as Game[];
      for (const g of games) {
        const seat: 'white' | 'black' = g.white === g.us ? 'white' : 'black';
        const sc: 'w' | 'b' = seat === 'white' ? 'w' : 'b';
        const sign = seat === 'white' ? 1 : -1;
        const rating = (seat === 'white' ? g.whiteElo : g.blackElo) ?? 1690;
        for (let i = 0; i + 2 < g.plies.length; i += 1) {
          const before = g.plies[i];
          if (before.fen.split(' ')[1] !== sc || !before.san) continue;
          const mid = g.plies[i + 1];
          const probe = g.plies[i + 2];
          if (!mid.san) continue;
          const pre = toAnalysis(before.lines);
          const midA = toAnalysis(mid.lines);
          const studentBest = toAnalysis(probe.lines);
          if (!pre || !midA || !studentBest) continue;
          const bothCp = !pre.isMate && !midA.isMate;
          const preCp = whiteCp(before.lines[0]);
          const midCp = whiteCp(mid.lines[0]);
          const cpLoss = bothCp && preCp !== null && midCp !== null ? (preCp - midCp) * sign : null;
          const moverAfter = !midA.isMate ? midA.evaluation * sign : (midA.mateIn !== null && midA.mateIn * sign > 0 ? MATE : null);
          const history = g.plies.slice(0, i + 1).map((p) => p.san as string);
          const c = new Chess(before.fen); const mv = c.move(before.san);
          const r = new Chess(mid.fen); const rp = r.move(mid.san);
          const base = { game: g.id, set, ply: i + 1, seat, fenBefore: before.fen, san: before.san, probe: probe.fen, cpLoss, studentEvalAfter: moverAfter };

          try {
            const pf = await computePositionFacts({
              posture: 'walk', fen: probe.fen, moverColor: probe.fen.split(' ')[1] as 'w' | 'b', studentColor: sc, rating,
              analysis: studentBest,
              lastMove: {
                fenBefore: before.fen, san: before.san, cpLoss, historySans: history,
                reads: {
                  historySans: history, bestMoveUci: pre.bestMove || null,
                  bestPvUci: pre.topLines[0]?.moves ?? [], playedPvUci: midA.topLines[0]?.moves ?? [],
                  evalBeforeWhiteCp: pre.isMate ? undefined : pre.evaluation,
                  evalAfterWhiteCp: midA.isMate ? undefined : midA.evaluation,
                  ...mateContext(pre, midA, seat),
                },
                popular: null, fanBefore: pre.topLines,
              },
              opponentLastMove: { fenBefore: mid.fen, san: mid.san },
            } as Parameters<typeof computePositionFacts>[0]);
            for (const cl of pf.clauses) out.push({ ...base, lane: 'facts', kind: cl.kind, text: cl.text, squares: [...(cl.squares ?? [])], claim: cl.claim });
          } catch (e) { out.push({ ...base, lane: 'facts', kind: 'ERROR', text: String(e).slice(0, 200), squares: [] }); }

          try {
            for (const h of detectBehaviors({ fen: probe.fen, studentColor: seat, studentLastTo: mv.to, opponentLastTo: rp.to })) {
              out.push({ ...base, lane: 'behavior', kind: h.id, text: h.fact, squares: [...h.squares] });
            }
          } catch (e) { out.push({ ...base, lane: 'behavior', kind: 'ERROR', text: String(e).slice(0, 200), squares: [] }); }

          try {
            const pr = buildPositionalRead(probe.fen, seat, new Set(), new Set());
            if (pr) out.push({ ...base, lane: 'positional', kind: pr.kind, text: pr.text, squares: [...(pr.squares ?? [])], claim: pr.key });
          } catch (e) { out.push({ ...base, lane: 'positional', kind: 'ERROR', text: String(e).slice(0, 200), squares: [] }); }

          try {
            const bestSan = (() => { try { const t = new Chess(before.fen); return t.move({ from: pre.bestMove.slice(0, 2), to: pre.bestMove.slice(2, 4), promotion: pre.bestMove[4] }).san; } catch { return null; } })();
            if (bestSan) {
              const look = backwardLook({ priorMove: null,
                fenBefore: before.fen, fenAfter: mid.fen, playedSan: before.san, bestSan,
                bestPvUci: pre.topLines[0]?.moves ?? [], replyPvUci: midA.topLines[0]?.moves ?? [],
                replySan: mid.san, cpLoss: cpLoss ?? 0, moverEvalAfterCp: moverAfter, studentColor: seat,
                ...mateContext(pre, midA, seat),
              });
              if (look) out.push({ ...base, lane: 'backward', kind: look.kind, text: look.line, squares: look.square ? [look.square] : [] });
            }
          } catch (e) { out.push({ ...base, lane: 'backward', kind: 'ERROR', text: String(e).slice(0, 200), squares: [] }); }
        }
      }
    }
    mkdirSync('audit-reports/claim-check', { recursive: true });
    writeFileSync('audit-reports/claim-check/harvest.json', JSON.stringify(out, null, 1));
    const byKind = new Map<string, number>();
    for (const x of out) byKind.set(`${x.lane}:${x.kind}`, (byKind.get(`${x.lane}:${x.kind}`) ?? 0) + 1);
    console.log(`[harvest] ${out.length} claims`);
    for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)} ${k}`);
    expect(out.length).toBeGreaterThan(100);
  }, 3_600_000);
});
