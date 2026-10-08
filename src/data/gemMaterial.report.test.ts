import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { ALL_GEMS, gemId } from './lessons/punishGems';
import { GEM_NARRATION } from './lessons/punishGemNarration';
import { GAMBIT_GEM_NARRATION } from './lessons/gambitGemNarration';

const V: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const MAT = /(pawns? (?:up|down|ahead|to the good)|piece up|piece down|exchange (?:up|down)|the exchange|material (?:is|stays)? ?(?:even|level|equal)|level material|even material|up material|a piece for|for a pawn|two pawns|clean pawn|extra pawn|extra piece|a rook up|queen up)/i;
describe.runIf(process.env.GEM_MAT === '1')('gem material report', () => {
  it('writes', () => {
    const rows: string[] = [];
    const all = { ...GEM_NARRATION, ...(GAMBIT_GEM_NARRATION as Record<string, { watch: string[]; learn?: string[] }>) };
    for (const gem of ALL_GEMS) {
      const id = gemId(gem); const n = all[id]; if (!n) continue;
      const ply = gem.playLine.trim().split(/\s+/);
      [...n.watch.map((t, i) => [t, i, 'w'] as const), ...(n.learn ?? []).map((t, i) => [t, i, 'l'] as const)].forEach(([t, i, reg]) => {
        if (!MAT.test(t)) return;
        const c = new Chess(); ply.slice(0, i + 1).forEach((m) => c.move(m));
        let d = 0; for (const r of c.board()) for (const s of r) if (s) d += (s.color === 'w' ? 1 : -1) * V[s.type];
        const punisher = gem.lineMoves.trim().split(/\s+/).length % 2 === 0 ? 'black' : 'white';
        const forP = punisher === 'white' ? d : -d;
        rows.push(`${id} ${reg}[${i}] punisher=${punisher} matForPunisher=${forP} :: ${t}`);
      });
    }
    writeFileSync('audit-reports/gem-material.txt', rows.join('\n'));
    console.log('lines', rows.length);
  });
});
