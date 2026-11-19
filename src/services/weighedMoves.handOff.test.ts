import { describe, it, expect } from 'vitest';
import { Chess, type Color } from 'chess.js';
import { standingRefutations, temptingOnBoard, type WeighRead } from './weighedMoves';
import { consideredTries } from './tryCandidates';
import tries from './__fixtures__/danyaTries.reads.json';

interface Row { id: string; fen: string; try: string; reads: WeighRead[] }
function said(id: string, san: string): string | null {
  const t = (tries as Row[]).find((r) => r.id === id && r.try === san);
  if (!t) throw new Error(`no fixture row ${id} ${san}`);
  const m = new Chess(t.fen).move(t.try);
  const uci = m.from + m.to + (m.promotion ?? '');
  const student = t.fen.split(' ')[1] as Color;
  const tempt = temptingOnBoard({ fen: t.fen, student, rating: 1800, reads: t.reads, priorMove: null }).find((x) => x.uci === uci);
  if (tempt) return null;
  return standingRefutations({ fen: t.fen, student, rating: 1800, reads: t.reads }).find((x) => x.uci === uci)?.text ?? null;
}

function anySaid(id: string, san: string): string | null {
  const t = (tries as Row[]).find((r) => r.id === id && r.try === san);
  if (!t) throw new Error(`no fixture row ${id} ${san}`);
  const m = new Chess(t.fen).move(t.try);
  const uci = m.from + m.to + (m.promotion ?? '');
  const student = t.fen.split(' ')[1] as Color;
  return temptingOnBoard({ fen: t.fen, student, rating: 1800, reads: t.reads, priorMove: null }).find((x) => x.uci === uci)?.text
    ?? standingRefutations({ fen: t.fen, student, rating: 1800, reads: t.reads }).find((x) => x.uci === uci)?.text ?? null;
}

describe('a refuter hands off only to one that speaks (his tries)', () => {
  it('a try that drops a pawn on a bigger cost is said with the pawn and the result', () => {
    expect(said('a-guide-to-underpromotion#4', 'd8=Q')).toMatch(/They win a pawn in the line\. After it your edge is gone\.$/);
  });
  it('a try whose line mates is said with the mate, by whichever refuter names it', () => {
    expect(anySaid('how-to-survive-an-attack#2', 'bxc4')).toMatch(/Qb7#/);
  });
  it('material is named in pieces, counted to where the trades end (Nd3 …Ba4 … Bxc6 Rxc3)', () => {
    const t = (tries as Row[]).find((r) => r.id === 'the-terrifying-grinder-of-chess#0' && r.try === 'Nd3');
    if (!t) throw new Error('no fixture row');
    const s = standingRefutations({ fen: t.fen, student: t.fen.split(' ')[1] as Color, rating: 1800, reads: t.reads, considered: consideredTries(t.fen) }).find((x) => x.san === 'Nd3')?.text ?? '';
    expect(s).toMatch(/They win a knight for a pawn in the line/);
    expect(s).not.toMatch(/worth|points/);
  });
});
