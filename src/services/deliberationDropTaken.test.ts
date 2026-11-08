// A DROP IS THE PIECE THE REFUTATION TAKES (Gotham–Jelena, read at depth 20,
// PLAN § David's notes 2026-11-04 item 6): "Qf5? That drops the rook on h1"
// — taking it walks into Qxf7#, and their best answer is …Qd7; "Bg5+? That
// drops the queen" — the answer is …Kxf7, the bishop. The loose piece was
// named because it was loose, not because their line takes it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildDeliberation } from './deliberation';
import { analysisOf, replayPlies, type ReplayGame } from '../test/replayGame';

const g = JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame;
const at = (ply: number) => replayPlies(g).find((p) => p.ply === ply);

describe('a move "drops" only what their line takes', () => {
  for (const [ply, san, wrong] of [[24, 'Qf5', 'h1'], [26, 'Bg5+', 'c8']] as const) {
    it(`${san} after ply ${ply} is not said to drop the piece on ${wrong}`, () => {
      const p = at(ply);
      expect(p).toBeTruthy();
      if (!p) return;
      const d = buildDeliberation({ analysis: analysisOf(p.after), fenBefore: p.fenAfter, moverColor: 'w', opponentLastSan: p.san, maxCandidates: 6 });
      const alt = d?.alternatives.find((a) => a.san === san);
      expect(alt, `${san} weighed`).toBeTruthy();
      expect(alt?.drops?.square).not.toBe(wrong);
    });
  }
});
