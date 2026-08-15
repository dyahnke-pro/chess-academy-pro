// WHICH notes actually speak on a Ruy walk, and was their position computed or
// guessed? Two earlier measurements disagreed and one of them must be wrong:
//
//   positionedNoteDelivery  said every note that speaks IS positioned
//                           (pliesWherePositionedSpoke === pliesWhereSomethingSpoke)
//   the bake lookup         said two of the three notes that spoke WRONGLY on
//                           the Ruy have no lineSan at all
//
// Both cannot hold. This resolves it by asking the real selector and printing
// the selected note's own anchor, rather than inferring from either side.
import { describe, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { noteAtPosition, spokenBeatText } from './danyaTeachingService';

const LINE = [
  'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7',
  'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5',
];

describe('ruy provenance', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
  }, 180_000);

  it('reports the anchor of every note that speaks', () => {
    // Farm-time anchor verdicts, if present: 'high'/'medium' mean the position
    // was re-derived and its claims checked against the board; anything else
    // means the shipped position came from the chunk aligner's guess.
    const verdict = new Map<string, string>();
    const registry = JSON.parse(readFileSync('src/data/corpora.json', 'utf8')) as
      { corpora: Array<{ key: string }> };
    for (const c of registry.corpora) {
      try {
        const r = JSON.parse(readFileSync(`audit-reports/${c.key}-anchor/report.json`, 'utf8')) as
          { results: Array<{ id: string; outcome: string; tier?: string }> };
        for (const x of r.results) {
          verdict.set(x.id, x.outcome === 'anchored' ? (x.tier ?? 'anchored') : x.outcome);
        }
      } catch { /* creator has no report on this clone */ }
    }

    const board = new Chess();
    const history: string[] = [];
    const seen = new Set<string>();
    let spoke = 0;
    let unpositioned = 0;

    for (const san of LINE) {
      board.move(san);
      history.push(san);
      const note = noteAtPosition(history, board.fen(), 'Ruy Lopez', seen);
      const text = note ? spokenBeatText(note).trim() : '';
      if (!note || !text) {
        console.log(`ply ${String(history.length).padStart(2)} ${san.padEnd(5)} · silent`);
        continue;
      }
      seen.add(note.id);
      spoke += 1;
      const plies = note.lineSan?.length ?? 0;
      if (plies === 0) unpositioned += 1;
      console.log(
        `ply ${String(history.length).padStart(2)} ${san.padEnd(5)} ► ${note.id}`
        + ` anchor=${verdict.get(note.id) ?? '(none)'} linePlies=${plies}`,
      );
      console.log(`         ${text.slice(0, 104)}`);
    }
    console.log(`\nspoke on ${spoke}/${LINE.length} plies; ${unpositioned} had NO position`);
  }, 600_000);
});
