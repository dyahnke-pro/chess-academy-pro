// CENSUS 9 COVERAGE — every structure-plan sentence the engine-free plan
// computers produce on the four OS-11 games (and David's record when its
// fixture is present), written to audit-reports/census9/<label>.json so the
// merge is measured before and after. Run: CENSUS9=<label> npx vitest run <this>.
import { it } from 'vitest';
import { Chess } from 'chess.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { structurePlanFact } from '../services/nextPlans';
import { deriveNextPlanFacts } from '../services/nextPlans';
import { namedPawnStructure } from '../services/nextPlans';

const LABEL = process.env.CENSUS9;

function games(): Array<{ name: string; side: 'w' | 'b'; fens: string[] }> {
  const out = ['os11-g1-smith-morra', 'os11-g2-najdorf-english-attack', 'os11-g3-nimzo-larsen', 'os11-g4-ruy-lopez-qf6'].map((name) => {
    const pgn = readFileSync(`src/test/__fixtures__/os11-games/${name}.pgn`, 'utf8');
    const c = new Chess(); c.loadPgn(pgn);
    return { name, side: /StudentSide "black"/.test(pgn) ? 'b' as const : 'w' as const, fens: c.history({ verbose: true }).map((m) => m.after) };
  });
  const drop = 'audit-reports/.fixtures/data-drop-david.json';
  if (existsSync(drop)) {
    const d = JSON.parse(readFileSync(drop, 'utf8')) as { stores?: Record<string, Array<{ id?: string; pgn?: string; white?: string; black?: string }>> };
    for (const g of d.stores?.games ?? []) {
      if (!g.pgn) continue;
      try {
        const c = new Chess(); c.loadPgn(g.pgn);
        const side = g.black === 'Knight_Mare_01' ? 'b' as const : 'w' as const;
        out.push({ name: `drop:${g.id ?? out.length}`, side, fens: c.history({ verbose: true }).map((m) => m.after) });
      } catch { /* an unreadable game is skipped */ }
    }
  }
  return out;
}

it.runIf(!!LABEL)('census 9 coverage', () => {
  const rows: string[] = [];
  for (const g of games()) {
    g.fens.forEach((fen, i) => {
      if (fen.split(' ')[1] !== g.side) return;
      const sp = structurePlanFact(fen, g.side);
      if (sp) rows.push(`${g.name}\t${i + 1}\tstructurePlan\t${sp.text}`);
      for (const p of deriveNextPlanFacts(fen, g.side, { namesStudentMoves: true })) rows.push(`${g.name}\t${i + 1}\tnextPlans:${p.kind}\t${p.text}`);
      const ns = namedPawnStructure(fen, g.side);
      if (ns) rows.push(`${g.name}\t${i + 1}\tnamedStructure\t${ns.name} — ${ns.plan}`);
    });
  }
  writeFileSync(`audit-reports/census9/${LABEL}.tsv`, rows.join('\n') + '\n');
  console.log(`census9 ${LABEL}: ${rows.length} rows over ${games().length} games`);
}, 600_000);
