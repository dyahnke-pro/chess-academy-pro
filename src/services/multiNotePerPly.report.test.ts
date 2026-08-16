// What does the one-note-per-ply cap actually cost?
//
// David has asked more than once to lift it, and it has never been measured —
// only asserted. `noteAtPosition` returns a single note, and the funnel counted
// 3,526 candidates that passed every gate and simply lost. The obvious reading
// is that ~3,500 pieces of teaching are being thrown away.
//
// The non-obvious question, and the one that decides it: WHERE do those losers
// sit? A tie-loser at a ply that already spoke adds a second voice to a ply
// that was never silent — real teaching, but not a fix for silence. A ply where
// every survivor was excluded (already used earlier in the lesson) is silence
// the cap genuinely caused.
//
// Instrument only. Counts, per ply: how many notes pass EVERY gate, whether one
// was selected, and how many extra were available.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import {
  noteAtPosition, notesForPrefix, notesForFen, noteOpeningConflicts,
  anchorTeachesItsPosition, isVerifiedPosition, spokenBeatText, type DanyaNote,
} from './danyaTeachingService';
import { secondaryNotesForPosition, secondaryNotesForFen } from './secondaryCorpora';
import { noteContradictsLine, notePhaseMismatchesBoard } from './noteLineGuard';
import {
  noteDescribesPosition, noteTeachesChessNotItsSource, noteStaysInScope,
} from './noteAnchorIntegrity';

interface Entry { name?: string; pgn?: string }
const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

/** Every gate `onThisLine` applies, minus the exclude-set — so this counts what
 *  the cap and the per-lesson dedupe are holding back, not what the gates are. */
const passesAllGates = (
  n: DanyaNote, fen: string, history: string[], opening: string | null,
): boolean =>
  anchorTeachesItsPosition(n)
  && isVerifiedPosition(n)
  && !noteContradictsLine(`${n.explains} ${n.teaches}`, history)
  && !notePhaseMismatchesBoard(n.phase, fen, history.length)
  && !noteOpeningConflicts(n.opening, opening)
  && noteDescribesPosition(n, fen)
  && noteTeachesChessNotItsSource(n)
  && noteStaysInScope(n, opening)
  && spokenBeatText(n).trim().length > 0;

describe('one-note-per-ply cap', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
  }, 180_000);

  it('measures what lifting the cap would add, and where', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | Entry[] | Record<string, Entry[]>;
    const entries: Entry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    const t = {
      plies: 0,
      spoke: 0,
      silent: 0,
      /** Plies that SPOKE and had more usable notes waiting — lifting the cap
       *  adds a second voice here. Teaching gained, but not silence fixed. */
      spokeWithExtras: 0,
      extraNotesAtSpokenPlies: 0,
      /** Plies that were SILENT although a fully-usable note existed — these
       *  are silence the cap or the per-lesson dedupe actually caused, and the
       *  only ones lifting it would un-silence. */
      silentDespiteUsable: 0,
      maxUsableAtAnyPly: 0,
    };
    const histogram: Record<string, number> = {};

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (!sans.length) continue;
      const board = new Chess();
      const history: string[] = [];
      const seen = new Set<string>();

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
        const usable = [...cands.values()].filter(
          (n) => passesAllGates(n, fen, history, entry.name ?? null),
        );

        const sel = noteAtPosition(history, fen, entry.name ?? null, seen);
        const said = !!sel && spokenBeatText(sel).trim().length > 0;
        if (said && sel) seen.add(sel.id);

        const bucket = usable.length >= 5 ? '5+' : String(usable.length);
        histogram[bucket] = (histogram[bucket] ?? 0) + 1;
        t.maxUsableAtAnyPly = Math.max(t.maxUsableAtAnyPly, usable.length);

        if (said) {
          t.spoke += 1;
          const extras = usable.filter((n) => n.id !== sel?.id && !seen.has(n.id)).length;
          if (extras > 0) { t.spokeWithExtras += 1; t.extraNotesAtSpokenPlies += extras; }
        } else {
          t.silent += 1;
          if (usable.some((n) => !seen.has(n.id))) t.silentDespiteUsable += 1;
        }
      }
    }

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'What does the one-note-per-ply cap actually cost, and where?',
      plies: t.plies,
      spoke: t.spoke,
      silent: t.silent,
      spokePliesWithMoreAvailable: t.spokeWithExtras,
      extraNotesAvailableAtSpokenPlies: t.extraNotesAtSpokenPlies,
      /** The number that matters for SILENCE. */
      silentPliesThatHadAUsableNote: t.silentDespiteUsable,
      maxUsableAtAnyPly: t.maxUsableAtAnyPly,
      usableNotesPerPly: histogram,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/multi-note-per-ply.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }, 900_000);
});
