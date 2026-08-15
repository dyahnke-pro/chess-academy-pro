// Do notes that ALREADY have a position ever actually get spoken?
//
// The whole video-alignment effort rests on one assumption: that the corpus is
// quiet because notes lack positions, so giving them positions makes them
// speak. That assumption has never been tested, and the funnel report casts
// real doubt on it — retrieval already reaches 89.9% of plies while only 17.3%
// speak, which says the loss is downstream of finding a note, not in finding
// one.
//
// If position-keyed notes are already losing at selection, then positioning
// tens of thousands more moves delivery by roughly nothing, and the effort
// belongs elsewhere. This measures exactly that, over the same repertoire walk
// every other coverage report uses.
//
// Reports, never asserts: an instrument for a build/no-build decision.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { noteAtPosition, notesForPrefix, notesForFen, spokenBeatText, type DanyaNote } from './danyaTeachingService';
import { secondaryNotesForPosition, secondaryNotesForFen } from './secondaryCorpora';

interface Entry { name?: string; pgn?: string }

const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

const positioned = (n: DanyaNote): boolean => (n.lineSan?.length ?? 0) > 0;

describe('positioned-note delivery', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
  }, 180_000);

  it('measures whether having a position is enough to be heard', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | Entry[] | Record<string, Entry[]>;
    const entries: Entry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    const t = {
      plies: 0,
      pliesWithPositionedCandidate: 0,
      pliesWherePositionedSpoke: 0,
      pliesWhereSomethingSpoke: 0,
      positionedCandidatesSeen: 0,
      positionedCandidatesSpoken: 0,
    };
    /** Distinct positioned notes offered vs actually selected — the population
     *  the video work would be adding to. */
    const offered = new Set<string>();
    const spoken = new Set<string>();

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (!sans.length) continue;
      const board = new Chess();
      const history: string[] = [];
      for (const san of sans) {
        try { board.move(san); } catch { break; }
        history.push(san);
        const fen = board.fen();
        t.plies += 1;

        const cands = new Map<string, DanyaNote>();
        for (const n of [
          ...notesForPrefix(history), ...notesForFen(fen),
          ...secondaryNotesForPosition(history), ...secondaryNotesForFen(fen),
        ]) cands.set(n.id, n);

        const pos = [...cands.values()].filter(positioned);
        if (pos.length) {
          t.pliesWithPositionedCandidate += 1;
          t.positionedCandidatesSeen += pos.length;
          for (const n of pos) offered.add(n.id);
        }

        const sel = noteAtPosition(history, fen, entry.name ?? null);
        const said = sel ? spokenBeatText(sel).trim().length > 0 : false;
        if (said) {
          t.pliesWhereSomethingSpoke += 1;
          if (sel && positioned(sel)) {
            t.pliesWherePositionedSpoke += 1;
            t.positionedCandidatesSpoken += 1;
            spoken.add(sel.id);
          }
        }
      }
    }

    const pct = (a: number, b: number): number => (b === 0 ? 0 : Number((a / b).toFixed(4)));
    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'If a note already has a position, does it get spoken? Decides whether adding positions is worth it.',
      plies: t.plies,
      pliesWithPositionedCandidate: t.pliesWithPositionedCandidate,
      pliesWherePositionedSpoke: t.pliesWherePositionedSpoke,
      pliesWhereSomethingSpoke: t.pliesWhereSomethingSpoke,
      /** THE NUMBER. Of plies that had a positioned note available, how many
       *  actually heard one. Low means positioning is not the bottleneck and
       *  the video pipeline pays for little. */
      positionedConversion: pct(t.pliesWherePositionedSpoke, t.pliesWithPositionedCandidate),
      positionedCandidatesSeen: t.positionedCandidatesSeen,
      distinctPositionedNotesOffered: offered.size,
      distinctPositionedNotesEverSpoken: spoken.size,
      distinctNoteConversion: pct(spoken.size, offered.size),
    };

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/positioned-note-delivery.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }, 900_000);
});
