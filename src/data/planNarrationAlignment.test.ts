// Gate: a plan annotation or cue that opens with a move must name the move
// played on its own ply, and a leading '…' (Black's move) must sit on a
// Black move. The same check gems pass (gemNarrationAlignment.test).
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import plansRaw from './middlegame-plans.json';
import { leadingMove } from './gemNarrationAlignment.test';

interface Line { fen: string; moves: string[]; annotations?: string[]; learnCues?: string[] }
interface Plan { id: string; playableLines?: Line[] }

export function alignmentProblem(text: string, san: string, color: 'w' | 'b'): string | null {
  const said = leadingMove(text);
  if (!said) return null;
  if (said !== san.replace(/[+#]/g, '')) return `says ${said}, played ${san}`;
  if (/^\s*(…|\.\.\.)/.test(text) && color === 'w') return `marks White's ${san} as Black's`;
  return null;
}

describe('plan narration names the move on its own ply', () => {
  it('every plan annotation and cue that opens with a move names the played move', () => {
    const rows: string[] = [];
    for (const plan of plansRaw as unknown as Plan[]) {
      (plan.playableLines ?? []).forEach((line, li) => {
        const c = new Chess(line.fen);
        line.moves.forEach((m, i) => {
          const mv = c.move(m);
          for (const [reg, arr] of [['ann', line.annotations], ['cue', line.learnCues]] as const) {
            const t = arr?.[i];
            const why = t ? alignmentProblem(t, mv.san, mv.color) : null;
            if (why) rows.push(`${plan.id}[${li}] ${reg}[${i}] ${why}`);
          }
        });
      });
    }
    expect(rows).toEqual([]);
  });
  it('flags a misaligned or wrong-side line (negative control)', () => {
    expect(alignmentProblem('Nf3 develops', 'Nc3', 'w')).toMatch(/says Nf3/);
    expect(alignmentProblem('…Nc3 develops', 'Nc3', 'w')).toMatch(/Black's/);
    expect(alignmentProblem('Nc3 develops', 'Nc3', 'w')).toBeNull();
  });
});
