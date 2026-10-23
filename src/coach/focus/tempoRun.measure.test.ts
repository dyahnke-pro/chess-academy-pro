// THE TEMPO RUN, MEASURED ON DAVID'S GAMES (WO-FOCUS-TACTICS-01; PLAN.md: "each
// only once it passes its measurement on David's games"). Replays every
// analysed game in his data drop through the ONE run computer (`stepRun`) on his
// moves, each move's read rebuilt from the stored review (the best line and the
// played line, both the mover's eval), and counts how often a run of two or more
// ends — "had" or "let off" — and his longest run per game.
// 2026-10-23 (a tempo move = a NEW threat, discovered attacks included): 342
// games — runs of 2+ ended 311 times in 183 games (267 had, 44 let off — a
// floor: the review keeps the best move on some moves only, and a let-off
// needs it); longest run 0 in 36 games, 1 in 104, 2 in 119, 3 in 54, 4+ in 29.
// Run: TEMPO_RUN_MEASURE=1 npx vitest run src/coach/focus/tempoRun.measure.test.ts
// Writes audit-reports/tempo-run.json.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { NO_RUN, stepRun, TEMPO_RUN_MIN, type TempoRun } from './tempoRun';
import { positionKey } from '../../services/positionProvenance';
import type { ReadLine } from './focusChances';

const DROP = process.env.TEMPO_DROP ?? 'audit-reports/.fixtures/data-drop-david.json';
const ME = process.env.TEMPO_ME ?? 'Knight_Mare_01';
interface Ann { san: string; color: 'white' | 'black'; bestMove: string | null; evaluation: number | null; bestMoveEval: number | null }
interface DropGame { id: string; pgn: string; white: string; black: string; annotations?: Ann[] | null }

/** The stored review as a read of the board: the best line and the played
 *  line, White's view (as the engine reports). The review keeps `bestMove`
 *  only on some moves; without it the best line keeps its value under a
 *  placeholder move (so the cost is right, and a let-off — which needs the
 *  best move itself — cannot be read there). */
function readOf(fen: string, san: string, a: Ann | undefined): ReadLine[] | null {
  if (!a || a.evaluation === null || a.bestMoveEval === null) return null;
  let uci: string | null = null;
  try { const m = new Chess(fen).move(san); uci = `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
  const best = { moves: [a.bestMove ?? '(best)'], evaluation: a.bestMoveEval, mate: null };
  return uci === a.bestMove ? [best] : [best, { moves: [uci], evaluation: a.evaluation, mate: null }];
}

describe.runIf(process.env.TEMPO_RUN_MEASURE === '1')('the tempo run on David\'s games', () => {
  it('counts the run ends and the longest runs', () => {
    expect(existsSync(DROP)).toBe(true);
    const games = (JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: DropGame[] } }).stores.games
      .filter((g) => (g.white === ME || g.black === ME) && g.pgn && Array.isArray(g.annotations) && g.annotations.length > 0);
    let had = 0; let letOff = 0; const endGames = new Set<string>(); const longest: Record<string, number> = {};
    for (const g of games) {
      const full = new Chess(); try { full.loadPgn(g.pgn); } catch { continue; }
      const sans = full.history(); const me = g.white === ME ? 'w' : 'b';
      const c = new Chess(); let run: TempoRun = NO_RUN;
      const seen = new Set<string>();
      for (let i = 0; i < sans.length; i += 1) {
        const fen = c.fen();
        const mine = c.turn() === me;
        if (mine) {
          const step = stepRun(run, { fenBefore: fen, san: sans[i], student: me, lines: readOf(fen, sans[i], g.annotations?.[i]), seen });
          run = step.run;
          if (step.ended) { endGames.add(g.id); if (step.ended.letOff) letOff += 1; else had += 1; }
        }
        try { c.move(sans[i]); } catch { break; }
        if (mine) seen.add(positionKey(c.fen()));
      }
      const l = Math.max(run.longest, run.length);
      const k = l >= 4 ? '4+' : String(l);
      longest[k] = (longest[k] ?? 0) + 1;
    }
    const out = { games: games.length, runMin: TEMPO_RUN_MIN, had, letOff, gamesWithAnEnd: endGames.size, longest };
    writeFileSync('audit-reports/tempo-run.json', JSON.stringify(out, null, 2));
    console.log(`[tempo-run] ${games.length} games: ended ${had + letOff} in ${endGames.size} games (had ${had}, let off ${letOff}); longest ${JSON.stringify(longest)}`);
    expect(games.length).toBeGreaterThan(0);
  }, 600_000);
});
