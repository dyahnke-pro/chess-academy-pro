// At the plies that go SILENT, how much teaching is board-TRUE but merely
// off-topic?
//
// The gates fall into two kinds and are currently treated identically:
//
//   TRUTH     is this note about THIS BOARD?   noteDescribesPosition,
//             noteContradictsLine, notePhaseMismatchesBoard,
//             anchorTeachesItsPosition
//   EDITORIAL is it about THIS OPENING?        noteStaysInScope,
//             noteOpeningConflicts, noteTeachesChessNotItsSource
//
// A truth rejection means the note would LIE on this board — unrecoverable at
// any price, and those gates exist because false claims reached students
// ("Bg5 pins the knight" with no knight on the board). An editorial rejection
// means the note is TRUE here and simply belongs to a different lesson. That
// is a very different thing to throw away in silence.
//
// This counts the second kind at the plies that currently say nothing. It is
// the size of the prize for a fallback tier that keeps every truth gate and
// relaxes only scope — and if the number is small, that idea dies here rather
// than after being built.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import {
  noteAtPosition, notesForPrefix, notesForFen, noteOpeningConflicts,
  anchorTeachesItsPosition, spokenBeatText, type DanyaNote,
} from './danyaTeachingService';
import { secondaryNotesForPosition, secondaryNotesForFen } from './secondaryCorpora';
import { noteContradictsLine, notePhaseMismatchesBoard } from './noteLineGuard';
import {
  noteDescribesPosition, noteTeachesChessNotItsSource, noteStaysInScope,
} from './noteAnchorIntegrity';

interface Entry { name?: string; pgn?: string }
const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

/** Every gate that asks "is this true HERE". Failing one means the note would
 *  make a false claim about this board. */
const passesTruth = (n: DanyaNote, fen: string, history: string[]): boolean =>
  anchorTeachesItsPosition(n)
  && noteDescribesPosition(n, fen)
  && !noteContradictsLine(`${n.explains} ${n.teaches}`, history)
  && !notePhaseMismatchesBoard(n.phase, fen, history.length);

/**
 * Gates that ask "does this belong to THIS LESSON".
 *
 * The first cut lumped these together and the samples exposed why that was
 * wrong: an Italian lesson offered "if Black declines the Vienna Gambit with
 * …d6", which is board-true and about a different opening entirely. That note
 * fails `noteStaysInScope` — the gate that reads the PROSE for a foreign
 * variation name — and counting it as recoverable was the bug.
 *
 * So the two are not equivalent evidence:
 *   noteStaysInScope     the note NAMES another opening. Strong, textual, and
 *                        never relaxed — this is the "In the Fantasy…" guard.
 *   noteOpeningConflicts the note's metadata TAG differs. Weak: the tag comes
 *                        from a video title, and a note can teach a position
 *                        perfectly well while carrying its source's coarse tag.
 * Only the tag is a candidate for relaxation.
 */
const passesScope = (n: DanyaNote, opening: string | null): boolean =>
  !noteOpeningConflicts(n.opening, opening);

/** Never relaxed, at any coverage cost. */
const namesAForeignOpening = (n: DanyaNote, opening: string | null): boolean =>
  !noteStaysInScope(n, opening) || !noteTeachesChessNotItsSource(n);

describe('truth vs scope at silent plies', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
  }, 180_000);

  it('sizes the recoverable-without-lying pool', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | Entry[] | Record<string, Entry[]>;
    const entries: Entry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    const t = {
      plies: 0, silent: 0,
      silentWithCandidates: 0,
      /** THE NUMBER: silent plies holding a note that is board-true and
       *  speakable, rejected only for being off-topic. */
      silentRecoverable: 0,
      /** Silent plies where every candidate fails a TRUTH gate — correctly
       *  silent, and nothing should ever change that. */
      silentAllUntrue: 0,
      recoverableNotes: 0,
    };
    const samples: Array<{ opening: string; ply: number; text: string }> = [];

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (!sans.length) continue;
      const board = new Chess();
      const history: string[] = [];
      // A note answers ONCE per lesson. Without this the same sentence filled
      // plies 9 through 14 of the Italian in the first measurement — six
      // identical lines in a row, which is worse than the silence it replaced.
      const usedInLesson = new Set<string>();
      for (const san of sans) {
        try { board.move(san); } catch { break; }
        history.push(san);
        const fen = board.fen();
        t.plies += 1;

        const sel = noteAtPosition(history, fen, entry.name ?? null);
        if (sel && spokenBeatText(sel).trim()) continue;
        t.silent += 1;

        const cands = new Map<string, DanyaNote>();
        for (const n of [
          ...notesForPrefix(history), ...notesForFen(fen),
          ...secondaryNotesForPosition(history), ...secondaryNotesForFen(fen),
        ]) cands.set(n.id, n);
        if (!cands.size) continue;
        t.silentWithCandidates += 1;

        const trueHere = [...cands.values()].filter(
          (n) => passesTruth(n, fen, history)
            && !namesAForeignOpening(n, entry.name ?? null)
            && spokenBeatText(n).trim().length > 0,
        );
        if (!trueHere.length) { t.silentAllUntrue += 1; continue; }
        const offTopicOnly = trueHere.filter((n) => !passesScope(n, entry.name ?? null));
        const fresh = offTopicOnly.filter((n) => !usedInLesson.has(n.id));
        if (fresh.length) {
          usedInLesson.add(fresh[0].id);
          t.silentRecoverable += 1;
          t.recoverableNotes += fresh.length;
          if (samples.length < 12) {
            samples.push({
              opening: entry.name ?? '?', ply: history.length,
              text: spokenBeatText(fresh[0]).trim().slice(0, 190),
            });
          }
        }
      }
    }

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'At silent plies, how much teaching is board-TRUE and rejected only as off-topic?',
      plies: t.plies,
      silentPlies: t.silent,
      silentWithCandidates: t.silentWithCandidates,
      silentAllUntrue: t.silentAllUntrue,
      silentRecoverable: t.silentRecoverable,
      recoverableNotes: t.recoverableNotes,
      recoverableShareOfSilent: t.silent ? Number((t.silentRecoverable / t.silent).toFixed(4)) : 0,
      samples,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/truth-vs-scope.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, samples: `${samples.length} in report` }, null, 2));
  }, 900_000);
});
