// Is `noteStaysInScope` redundant where the BOARD already settles scope?
//
// It is the single biggest rejector — 3,531 candidates — and its own
// justification is about AMBIGUOUS positions: at a shared prefix, "e4 c6 d4 d5"
// serves five Caro variations and the position says nothing about which line a
// note teaches. That is a real defect it caught (a Tartakower lesson hearing
// "In the Fantasy…").
//
// But deep in a line where only ONE named opening can reach this exact board,
// the position has already decided scope, and the name-check is then deleting
// teaching for no gain — including legitimate teaching by contrast ("unlike the
// Advance…").
//
// So the question is a number: how many of those rejections sit at positions
// only one named opening reaches? If most are at ambiguous positions the idea
// dies here. Instrument only.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { notesForPrefix, notesForFen, type DanyaNote } from './danyaTeachingService';
import { secondaryNotesForPosition, secondaryNotesForFen } from './secondaryCorpora';
import { noteStaysInScope } from './noteAnchorIntegrity';

interface Entry { name?: string; pgn?: string }
const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

/** How many DISTINCT named openings in the DB pass through this move prefix.
 *  1 means the board itself identifies the opening; >1 means it does not. */
function buildDiscrimination(): (history: string[]) => number {
  const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8')) as
    Array<{ name?: string; pgn?: string; moves?: string }> | Record<string, unknown>;
  const rows: Array<{ name: string; sans: string[] }> = [];
  const list = Array.isArray(db) ? db : Object.values(db).flat() as Array<Record<string, string>>;
  for (const e of list) {
    const name = (e as { name?: string }).name;
    const pgn = (e as { pgn?: string; moves?: string }).pgn ?? (e as { moves?: string }).moves;
    if (!name || !pgn) continue;
    rows.push({ name, sans: sansOf(pgn) });
  }
  // Index by every prefix so a lookup is a map hit rather than a scan of 3,000
  // entries per ply.
  const byPrefix = new Map<string, Set<string>>();
  for (const r of rows) {
    for (let i = 1; i <= r.sans.length; i++) {
      const k = r.sans.slice(0, i).join(' ');
      if (!byPrefix.has(k)) byPrefix.set(k, new Set());
      byPrefix.get(k)!.add(r.name);
    }
  }
  return (history: string[]) => byPrefix.get(history.join(' '))?.size ?? 0;
}

describe('scope gate vs board discrimination', () => {
  let discrimination: (h: string[]) => number;
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
    discrimination = buildDiscrimination();
  }, 180_000);

  it('counts scope rejections by how ambiguous the position is', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | Entry[] | Record<string, Entry[]>;
    const entries: Entry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    let rejections = 0;
    let atUnique = 0;      // only one named opening reaches this board
    let atAmbiguous = 0;   // several do — the gate is load-bearing here
    let atUnknown = 0;     // position not in the DB at all
    const pliesFreedIfRelaxed = new Set<string>();

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (!sans.length) continue;
      const board = new Chess();
      const history: string[] = [];
      for (const san of sans) {
        try { board.move(san); } catch { break; }
        history.push(san);
        const fen = board.fen();
        const d = discrimination(history);

        const cands = new Map<string, DanyaNote>();
        for (const n of [
          ...notesForPrefix(history), ...notesForFen(fen),
          ...secondaryNotesForPosition(history), ...secondaryNotesForFen(fen),
        ]) cands.set(n.id, n);

        for (const n of cands.values()) {
          if (noteStaysInScope(n, entry.name ?? null)) continue;
          rejections += 1;
          if (d === 0) atUnknown += 1;
          else if (d === 1) { atUnique += 1; pliesFreedIfRelaxed.add(`${entry.name}#${history.length}`); }
          else atAmbiguous += 1;
        }
      }
    }

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'Of noteStaysInScope rejections, how many sit where the BOARD already identifies the opening?',
      scopeRejections: rejections,
      atUniquePosition: atUnique,
      atAmbiguousPosition: atAmbiguous,
      atPositionNotInDb: atUnknown,
      /** Plies that could newly get a candidate if the gate relaxed ONLY where
       *  exactly one named opening reaches the board. */
      pliesPotentiallyFreed: pliesFreedIfRelaxed.size,
      shareAtUnique: rejections ? Number((atUnique / rejections).toFixed(4)) : 0,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/scope-discrimination.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }, 900_000);
});
