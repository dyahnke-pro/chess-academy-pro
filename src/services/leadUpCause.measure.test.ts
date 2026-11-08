// WO-DEPTH-01 step 2 — how often each lead-up cause fires on David's real
// slips (both seats), with samples to read against their boards.
//   LEADUP_MEASURE=1 npx vitest run src/services/leadUpCause.measure.test.ts
// Reads audit-reports/.fixtures/data-drop-david.json; writes
// audit-reports/lead-up-causes.json (progress every 100 games).
import { it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { readGame, leadUpCauses, leadUpWords, type LeadUpCause } from './leadUpCause';

const RUN = process.env.LEADUP_MEASURE === '1';
const DROP = 'audit-reports/.fixtures/data-drop-david.json';

interface Ann { moveNumber: number; color: 'white' | 'black'; san: string; classification: string | null }
interface Game { id: string; pgn: string; white: string; black: string; annotations?: Ann[] }

it.runIf(RUN && existsSync(DROP))('lead-up causes on David\'s slips', () => {
  const drop = JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: Game[]; profiles?: Array<{ name?: string; chessComUsername?: string; lichessUsername?: string }> } };
  const games = drop.stores.games.filter((g) => g.annotations?.length);
  const tally: Record<string, number> = { slips: 0, any: 0, pressure: 0, complication: 0, cramp: 0, mistake: 0, blunder: 0 };
  const base: Record<string, number> = { moves: 0, pressure: 0, complication: 0, cramp: 0 };
  const samples: Array<{ id: string; ply: number; san: string; fen: string; seat: string; causes: LeadUpCause[]; words: string[] }> = [];
  let n = 0;
  for (const g of games) {
    n += 1;
    let sans: string[];
    try { const c = new Chess(); c.loadPgn(g.pgn); sans = c.history(); } catch { continue; }
    const slips = (g.annotations ?? []).filter((a) => a.classification === 'mistake' || a.classification === 'blunder');
    if (slips.length === 0) continue;
    const read = readGame(sans);
    // THE BASE RATE: the same conditions at every ordinary move (not an
    // inaccuracy or worse) past the opening — a condition that holds as often
    // there as at slips is no reason for a slip.
    const flagged = new Set((g.annotations ?? []).filter((a) => a.classification === 'inaccuracy' || a.classification === 'mistake' || a.classification === 'blunder').map((a) => (a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0)));
    for (let i = 12; i < sans.length; i += 1) {
      if (flagged.has(i)) continue;
      base.moves += 1;
      for (const c of leadUpCauses(read, i)) base[c.kind] += 1;
    }
    for (const a of slips) {
      const idx = (a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0);
      if (sans[idx] !== a.san) continue;
      tally.slips += 1; tally[a.classification as string] += 1;
      const causes = leadUpCauses(read, idx);
      if (causes.length) tally.any += 1;
      for (const c of causes) tally[c.kind] += 1;
      if (causes.length && samples.length < 60 && (samples.length < 20 || n % 7 === 0)) {
        samples.push({ id: g.id, ply: idx + 1, san: a.san, fen: read.plies[idx].fen, seat: a.color, causes, words: causes.map((c) => leadUpWords(c, false)) });
      }
    }
    if (n % 100 === 0) writeFileSync('audit-reports/lead-up-causes.json', JSON.stringify({ games: n, tally, base, samples }, null, 1));
  }
  writeFileSync('audit-reports/lead-up-causes.json', JSON.stringify({ games: n, tally, base, samples }, null, 1));
  console.log('LEADUP', JSON.stringify(tally), 'BASE', JSON.stringify(base));
}, 3_600_000);
