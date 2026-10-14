// MEASUREMENT (BOOK_WHY_MEASURE=1): a fixed, evenly spaced sample of real book
// departures with the line the coach would say, for hand grading.
import { it } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { bookMoveWhy } from './bookMoveWhy';

it.runIf(process.env.BOOK_WHY_MEASURE === '1' && existsSync('public/data/openings-masters-db.json'))('sample for hand grading', () => {
  const raw = JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8'));
  const pos: Record<string, Array<{ san: string; games: number }>> = raw.positions;
  const rows: Array<{ fen: string; main: string; played: string; kind: string; text: string }> = [];
  let i = 0;
  for (const [key, moves] of Object.entries(pos)) {
    const total = moves.reduce((a, m) => a + m.games, 0);
    if (total < 500) continue;
    const fen = `${key} 0 10`;
    let c: Chess; try { c = new Chess(fen); } catch { continue; }
    const top = [...moves].sort((a, b) => b.games - a.games)[0];
    const book = new Set(moves.filter((m) => m.games >= 5).map((m) => m.san));
    // A natural departure: a developing or central move that is not book.
    const alt = c.moves({ verbose: true }).find((m) => !book.has(m.san) && !m.captured && (m.piece === 'n' || m.piece === 'b' || (m.piece === 'p' && 'cdef'.includes(m.from[0]))));
    if (!alt) continue;
    i += 1;
    if (i % 37 !== 0) continue;
    const w = bookMoveWhy(fen, top.san, alt.san, c.turn());
    rows.push({ fen, main: top.san, played: alt.san, kind: w?.kind ?? '-', text: w?.text ?? '(nothing)' });
    if (rows.length >= 40) break;
  }
  writeFileSync('/tmp/claude-0/bookwhy-sample.json', JSON.stringify(rows, null, 1));
  console.log('ROWS', rows.length);
}, 900_000);
