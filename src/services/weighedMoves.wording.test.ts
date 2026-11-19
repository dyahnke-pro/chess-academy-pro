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
  const considered = consideredTries(t.fen);
  return temptingOnBoard({ fen: t.fen, student, rating: 1800, reads: t.reads, priorMove: null, considered }).find((x) => x.uci === uci)?.text
    ?? standingRefutations({ fen: t.fen, student, rating: 1800, reads: t.reads, considered }).find((x) => x.uci === uci)?.text ?? null;
}

describe('the refuters word his tries like a person', () => {
  it('a storm is said against their king, never against the king\'s square', () => {
    const s = said('the-positional-threat#0', 'g3') ?? '';
    expect(s).toMatch(/^g3 storms their king/);
    expect(s).not.toMatch(/\bg8\b/);
  });
  it('the king a reason names is named by its square', () => {
    expect(said('the-positional-threat#0', 'g3')).toMatch(/The king on [a-h][1-8] is less sheltered/);
  });
  it('no board reason describes a piece the line takes (Kf1 …Bxc5)', () => {
    expect(said('the-importance-of-solving-studies#0', 'Kf1') ?? '').not.toMatch(/bishop on c5 reaches/);
  });
});
