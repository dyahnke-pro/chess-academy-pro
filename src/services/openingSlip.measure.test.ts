// OPENING SLIP ON DAVID'S RECORD — every game where he left the masters'
// book: what the opening slip says there, against what the old book-move
// lane (`bookMoveWhy` alone) said. Gated: OPENING_SLIP_MEASURE=1, with
// DATA_DROP pointing at his data drop (read in place) and the masters' file
// in public/data. Writes nothing; prints the counts and every spoken line.
import { describe, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const RUN = process.env.OPENING_SLIP_MEASURE === '1';
const DROP = process.env.DATA_DROP ?? 'audit-reports/.fixtures/data-drop-david.json';
const MASTERS = 'public/data/openings-masters-db.json';
const HIM = process.env.DATA_DROP_PLAYER ?? 'Knight_Mare_01';

describe.skipIf(!RUN || !existsSync(DROP) || !existsSync(MASTERS))('opening slip on his record', () => {
  it('measures', async () => {
    const { __setLocalDbForTests } = await import('./masterPlayLookup');
    const { bookDeparture } = await import('./bookDeparture');
    const { openingSlip, mastersBook } = await import('./openingSlip');
    const { bookMoveWhy } = await import('./bookMoveWhy');
    __setLocalDbForTests(JSON.parse(readFileSync(MASTERS, 'utf8')));
    const games = (JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: Array<{ id: string; pgn: string; white: string; black: string }> } }).stores.games;
    const counts: Record<string, number> = {};
    const lines: string[] = [];
    const bump = (k: string): void => { counts[k] = (counts[k] ?? 0) + 1; };
    for (const g of games) {
      const seat = g.white === HIM ? 'w' : g.black === HIM ? 'b' : null;
      if (!seat) continue;
      const c = new Chess();
      try { c.loadPgn(g.pgn); } catch { continue; }
      const sans = c.history();
      bump('games');
      const dep = bookDeparture(sans);
      if (!dep) { bump('never-left'); continue; }
      if (dep.mover !== seat) { bump('they-left'); continue; }
      bump('he-left');
      const book = mastersBook(sans.slice(0, dep.ply - 1));
      if (!book) { bump('no-book'); continue; }
      const slip = openingSlip({ fen: dep.fen, playedSan: dep.san, book, student: seat });
      const old = dep.mainSan ? bookMoveWhy(dep.fen, dep.mainSan, dep.san, seat) : null;
      bump(slip ? `slip:${slip.kind}:${(slip.created ?? slip.lost)?.kind ?? 'job'}` : 'silent');
      if (old && !slip) bump('old-spoke-now-silent');
      if (!old && slip) bump('old-silent-now-speaks');
      if (slip) lines.push(`${g.id} ${Math.ceil(dep.ply / 2)}${seat === 'w' ? '.' : '…'}${dep.san} (book ${book.moves.slice(0, 3).join('/')}) => ${slip.text}${old ? `\n      old: ${old.text}` : ''}`);
    }
    __setLocalDbForTests(null);
    console.log(JSON.stringify(counts, null, 1));
    for (const l of lines) console.log(l);
  }, 600_000);
});
