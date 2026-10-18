// CLASSIFIER COVERAGE — which skills a real slip is filed under, and WHY the
// rest fall to `other` (2026-10-18, David: the heat map leaves skills grey after
// 300 games; PostHog says 34% of recorded slips land in `other`).
//
// Feeds every student mistake (≥100cp) of the real corpora through the SAME
// classifier autoAnalyzeGame calls, with the same inputs it builds. Not a gate.
// Run: CLASSIFIER_COVERAGE=1 npx vitest run src/services/classifierCoverage.measure.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import { classifyPhase } from './gamePhaseService';

interface Line { cp: number | null; mate: number | null; pv: string[] }
interface Ply { fen: string; san: string | null; lines: Line[] }
interface Game { id: string; us: string; white: string; black: string; plies: Ply[] }

const SOURCES = ['data/sources/acc-david/multipv-d14.json', 'data/sources/acc-corpus/multipv-d14.json'];
const PRESENT = SOURCES.filter((p) => existsSync(p));
const HAVE = PRESENT.length > 0 && process.env.CLASSIFIER_COVERAGE === '1';

const cap = (l: Line | undefined): number | null => (!l ? null : l.mate !== null ? (l.mate > 0 ? 1500 : -1500) : l.cp);

function uciLineToSan(fen: string, uci: readonly string[], n = 8): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci.slice(0, n)) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      out.push(m.san);
    }
  } catch { /* partial line */ }
  return out;
}

describe.skipIf(!HAVE)('classifier coverage', () => {
  it('tallies tags and the decline reasons behind `other`', () => {
    const tags = new Map<string, number>();
    const whyOther = new Map<string, number>();
    const samples: Array<Record<string, unknown>> = [];
    const walked: Array<Record<string, unknown>> = [];
    let total = 0;
    for (const src of PRESENT) {
      const games = JSON.parse(readFileSync(src, 'utf8')) as Game[];
      for (const g of games) {
        const usWhite = g.white.toLowerCase() === g.us.toLowerCase();
        const history: string[] = [];
        for (let i = 0; i < g.plies.length; i += 1) {
          const p = g.plies[i];
          if (!p.san) break;
          history.push(p.san);
          const mover = new Chess(p.fen).turn();
          if ((mover === 'w') !== usWhite) continue;
          const next = g.plies[i + 1];
          const best = cap(p.lines[0]);
          const after = next ? cap(next.lines[0]) : null;
          if (best === null || after === null) continue;
          const sign = mover === 'w' ? 1 : -1;
          const cpLoss = Math.max(0, (best - after) * sign);
          if (cpLoss < Number(process.env.MIN_CP ?? 100) || cpLoss >= Number(process.env.MAX_CP ?? 1e9)) continue;
          const bestSan = uciLineToSan(p.fen, p.lines[0].pv, 1)[0];
          let fenAfter = p.fen;
          try { const c = new Chess(p.fen); c.move(p.san); fenAfter = c.fen(); } catch { continue; }
          const cls = classifyMisconceptionNow({
            fen: p.fen,
            playedSan: p.san,
            bestSan,
            gamePhase: classifyPhase(p.fen, { fullMove: Math.floor(i / 2) + 1 }),
            historySans: [...history],
            pvAfterPlayed: next ? uciLineToSan(fenAfter, next.lines[0]?.pv ?? []) : undefined,
            pvAfterBest: uciLineToSan(p.fen, p.lines[0].pv).slice(1),
            evalBefore: best * sign,
            evalAfterPlayed: after * sign,
          });
          total += 1;
          const tag = cls?.tag ?? 'null';
          tags.set(tag, (tags.get(tag) ?? 0) + 1);
          if (cls?.fundamentalId === 'walked-into-tactic') walked.push({ fen: p.fen, played: p.san, best: bestSan, cpLoss, note: cls.coachNote });
          if (tag === 'other' || tag === 'null') {
            for (const w of cls?.why ?? []) {
              const key = w.replace(/[a-h][1-8]|[NBRQK]?[a-h]?x?[a-h][1-8][+#]?|\d+/g, '#');
              whyOther.set(key, (whyOther.get(key) ?? 0) + 1);
            }
            samples.push({ game: g.id, ply: i, fen: p.fen, played: p.san, best: bestSan, cpLoss, phase: classifyPhase(p.fen, { fullMove: Math.floor(i / 2) + 1 }), label: cls?.customLabel, why: cls?.why });
          }
        }
      }
    }
    const sorted = [...tags].sort((a, b) => b[1] - a[1]);
    const whys = [...whyOther].sort((a, b) => b[1] - a[1]).slice(0, 60);
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/classifier-coverage.json', JSON.stringify({ total, tags: sorted, whys, samples, walked }, null, 1));
    console.log('total', total, JSON.stringify(sorted));
    expect(total).toBeGreaterThan(0);
  }, 600_000);
});
