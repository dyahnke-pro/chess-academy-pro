// Gate: every arrow in a middlegame-plan line starts on a real piece and
// follows a square that piece can actually see on the board after the move.
// A line arrow that runs through other pieces is allowed only when the beat
// itself says it is a pin, a battery or an x-ray — that is the one case the
// student is meant to look through a piece.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import plansRaw from './middlegame-plans.json';

interface Arrow { from: string; to: string }
interface Line { fen: string; moves: string[]; annotations?: string[]; arrows?: Arrow[][] }
interface Plan { id: string; playableLines?: Line[] }

const file = (s: string): number => s.charCodeAt(0) - 97;
const rank = (s: string): number => Number(s[1]) - 1;
const sq = (f: number, r: number): string => String.fromCharCode(97 + f) + String(r + 1);
const LOOK_THROUGH = /\b(pin|pins|pinned|battery|x-ray|behind)\b/i;

export function between(a: string, b: string): string[] | null {
  const nf = Math.abs(file(b) - file(a));
  const nr = Math.abs(rank(b) - rank(a));
  if (!(nf === 0 || nr === 0 || nf === nr)) return null;
  const df = Math.sign(file(b) - file(a));
  const dr = Math.sign(rank(b) - rank(a));
  const out: string[] = [];
  for (let f = file(a) + df, r = rank(a) + dr; f !== file(b) || r !== rank(b); f += df, r += dr) out.push(sq(f, r));
  return out;
}

export function arrowProblem(board: Chess, a: Arrow, text: string): string | null {
  const piece = board.get(a.from as Parameters<Chess['get']>[0]);
  if (!piece) return 'starts on an empty square';
  if (piece.type === 'n') {
    const dx = Math.abs(file(a.to) - file(a.from));
    const dy = Math.abs(rank(a.to) - rank(a.from));
    return (dx === 1 && dy === 2) || (dx === 2 && dy === 1) ? null : 'is not a knight jump';
  }
  if (piece.type === 'p' || piece.type === 'k') return null;
  const path = between(a.from, a.to);
  if (!path) return 'is not a line the piece moves on';
  const blockers = path.filter((s) => board.get(s as Parameters<Chess['get']>[0]));
  if (blockers.length > 0 && !LOOK_THROUGH.test(text)) return `runs through ${blockers.join(', ')}`;
  return null;
}

describe('plan arrows follow real sight-lines', () => {
  it('every plan arrow starts on a piece and is not blocked', () => {
    const rows: string[] = [];
    for (const plan of plansRaw as unknown as Plan[]) {
      (plan.playableLines ?? []).forEach((line, li) => {
        const c = new Chess(line.fen);
        line.moves.forEach((m, i) => {
          const mv = c.move(m);
          for (const a of line.arrows?.[i] ?? []) {
            if (a.from === mv.from && a.to === mv.to) continue;
            const why = arrowProblem(c, a, line.annotations?.[i] ?? '');
            if (why) rows.push(`${plan.id}[${li}]#${i} ${m}: ${a.from}->${a.to} ${why}`);
          }
        });
      });
    }
    expect(rows).toEqual([]);
  });

  it('catches a blocked arrow and a wrong origin (negative control)', () => {
    const c = new Chess();
    expect(arrowProblem(c, { from: 'f1', to: 'b5' }, 'the bishop eyes b5')).toMatch(/runs through e2/);
    expect(arrowProblem(c, { from: 'e4', to: 'e5' }, '')).toBe('starts on an empty square');
    expect(arrowProblem(c, { from: 'g1', to: 'f3' }, '')).toBeNull();
  });
});
