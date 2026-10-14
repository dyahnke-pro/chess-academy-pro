// MEASUREMENT, not a gate: how many real book departures get a board-proven
// why (run with BOOK_WHY_MEASURE=1).
import { it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { bookMoveWhy } from './bookMoveWhy';

it.runIf(process.env.BOOK_WHY_MEASURE === '1' && existsSync('public/data/openings-masters-db.json'))('book-departure why coverage', () => {
  const raw = JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8'));
  const pos: Record<string, Array<{ san: string; games: number }>> = raw.positions;
  let positions = 0; let pairs = 0; let withWhy = 0; let posWithAny = 0;
  const byKind: Record<string, number> = {};
  const samples: string[] = [];
  for (const [key, moves] of Object.entries(pos)) {
    const total = moves.reduce((a, m) => a + m.games, 0);
    if (total < 200) continue;
    const fen = `${key} 0 10`;
    let c: Chess; try { c = new Chess(fen); } catch { continue; }
    const top = [...moves].sort((a, b) => b.games - a.games)[0];
    const book = new Set(moves.filter((m) => m.games >= 5).map((m) => m.san));
    const alts = c.moves().filter((m) => !book.has(m));
    if (!alts.length) continue;
    positions += 1;
    let any = false;
    for (const alt of alts) {
      pairs += 1;
      const w = bookMoveWhy(fen, top.san, alt, c.turn());
      if (w) { withWhy += 1; any = true; byKind[w.kind] = (byKind[w.kind] ?? 0) + 1; if (samples.length < 25 && Math.random() < 0.01) samples.push(w.text); }
    }
    if (any) posWithAny += 1;
  }
  console.log(JSON.stringify({ positions, posWithAny, pairs, withWhy, share: +(withWhy / pairs).toFixed(3), byKind }, null, 1));
  for (const s of samples) console.log('·', s);
}, 900_000);
