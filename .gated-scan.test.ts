import { describe, it } from 'vitest';
import { Chess } from 'chess.js';
import { getAllLessonScripts } from '/home/user/chess-academy-pro/src/data/lessons';
import repertoire from '/home/user/chess-academy-pro/src/data/repertoire.json';
import proRepertoires from '/home/user/chess-academy-pro/src/data/pro-repertoires.json';
import antiOpenings from '/home/user/chess-academy-pro/src/data/anti-openings.json';

// Gate D retro-sweep: lesson deepest-beat skeleton vs the entry's data line.
// classify: 'aligned' (one is a prefix of the other), 'diverges@k'.
interface E { id: string; pgn?: string; variations?: Array<{ name: string; pgn?: string }> | null }
const entries = new Map<string, E>();
for (const e of [...(repertoire as E[]), ...(proRepertoires as { openings: E[] }).openings, ...(antiOpenings as E[])]) entries.set(e.id, e);

function lineOf(key: string): string | null {
  const [oid, vname] = key.includes('::') ? key.split('::') : [key, null];
  const e = entries.get(oid);
  if (!e) return null;
  if (!vname) return e.pgn ?? null;
  return e.variations?.find((v) => v.name === vname)?.pgn ?? null;
}

describe('gate-d scan', () => {
  it('classifies', () => {
    const rows: string[] = [];
    for (const { key, lesson } of getAllLessonScripts()) {
      const pgn = lineOf(key);
      if (!pgn) continue; // gambit-tab / trap lessons without data lines
      const dataSans = pgn.trim().split(/\s+/);
      let bt = lesson.beats[0];
      for (const b of lesson.beats) if (b.moves.length > bt.moves.length) bt = b;
      const lessonSans = bt.moves;
      const n = Math.min(dataSans.length, lessonSans.length);
      let k = -1;
      for (let i = 0; i < n; i++) if (dataSans[i] !== lessonSans[i]) { k = i; break; }
      if (k === -1) {
        if (dataSans.length === lessonSans.length) continue; // exact
        // prefix: fine unless the DATA is much deeper than the LESSON (lesson stops early on the fixed line)
        if (lessonSans.length < dataSans.length - 6) rows.push(`SHALLOW-LESSON ${key} lesson=${lessonSans.length}p data=${dataSans.length}p`);
        continue;
      }
      rows.push(`DIVERGES@${k} ${key} lesson:${lessonSans.slice(Math.max(0,k-1), k+2).join(' ')} vs data:${dataSans.slice(Math.max(0,k-1), k+2).join(' ')} (lesson ${lessonSans.length}p, data ${dataSans.length}p)`);
    }
    console.log(`GATE-D rows: ${rows.length}`);
    for (const r of rows) console.log('  ' + r);
  });
});
