// A DROP IS THE PIECE THE REFUTATION TAKES (Gotham–Jelena, read at depth 20,
// PLAN § David's notes 2026-11-04 item 6): "Qf5? That drops the rook on h1"
// — taking it walks into Qxf7#, and their best answer is …Qd7; "Bg5+? That
// drops the queen" — the answer is …Kxf7, the bishop. The loose piece was
// named because it was loose, not because their line takes it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildDeliberation } from './deliberation';
import { captureRunAfterMove } from './captureRun';
import { analysisOf, replayPlies, type ReplayGame } from '../test/replayGame';

const g = JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame;
const at = (ply: number) => replayPlies(g).find((p) => p.ply === ply);

describe('a move "drops" only what their line takes', () => {
  for (const [ply, san, wrong] of [[24, 'Qf5', 'h1'], [26, 'Bg5+', 'c8']] as const) {
    it(`${san} after ply ${ply} is not said to drop the piece on ${wrong}`, () => {
      const p = at(ply);
      expect(p).toBeTruthy();
      if (!p) return;
      const d = buildDeliberation({ analysis: analysisOf(p.after), fenBefore: p.fenAfter, moverColor: 'w', prevCapture: captureRunAfterMove(p.prev, p.fenBefore, p.san), maxCandidates: 6 });
      const alt = d?.alternatives.find((a) => a.san === san);
      expect(alt, `${san} weighed`).toBeTruthy();
      expect(alt?.drops?.square).not.toBe(wrong);
    });
  }
});

// HOW IT FALLS, NOT ONLY THAT IT FALLS (WO-DEPTH-01, David 2026-11-08: "Every
// part of the app needs to have deeper reasoning than a surface evaluation").
// "Bg5+? That drops the bishop on f7." said that the bishop goes; the line the
// engine plays says how — their king takes it.
describe('a dropped piece is said with the move that takes it', () => {
  it('Bg5+ after ply 26: their king takes the bishop on f7', async () => {
    const { ruleOuts } = await import('./deliberation');
    const p = at(26);
    if (!p) throw new Error('ply 26 missing');
    const d = buildDeliberation({ analysis: analysisOf(p.after), fenBefore: p.fenAfter, moverColor: 'w', prevCapture: captureRunAfterMove(p.prev, p.fenBefore, p.san), maxCandidates: 6 });
    const alt = d?.alternatives.find((a) => a.san === 'Bg5+');
    expect(alt?.drops).toMatchObject({ square: 'f7', line: ['Kxf7'], moved: false });
    expect(d && ruleOuts(d, new Set()).find((r) => r.san === 'Bg5+')?.text).toBe('Bg5+? Then they play Kxf7, and the bishop on f7 is lost.');
  });
});
