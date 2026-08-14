// What the coach ACTUALLY says walking the Vienna, ply by ply.
//
// David 2026-08-14: "can you give me full narration examples now, before and
// after the changes we just made? maybe the matrix now isn't even necessary?"
//
// Every prior answer in this thread has been a percentage. A percentage cannot
// answer "is the matrix necessary" — only reading what the student would hear,
// at each move of a real opening, can. So this walks the Vienna spine, calls
// the REAL selector at every ply, and prints the note that wins, the gate's
// verdict on it, and — for the plies that stay silent — WHICH gate took the
// last candidate away.
//
// The comparison is corpus-vs-gates, not old-code-vs-new: git has the before,
// and re-running a 400s pipeline against a checked-out corpus to reproduce a
// number we already measured would prove nothing new. What is worth knowing is
// where the teaching is TODAY and what stands between it and the student.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import {
  noteAtPosition,
  notesForPrefix,
  notesForFen,
  spokenBeatText,
  noteOpeningConflicts,
  type DanyaNote,
} from './danyaTeachingService';
import { secondaryNotesForPosition, secondaryNotesForFen } from './secondaryCorpora';
import {
  noteDescribesPosition,
  noteTeachesChessNotItsSource,
  noteStaysInScope,
} from './noteAnchorIntegrity';
import { gradeNarrationText } from './coachAnswerGates';

/** The Vienna Game main spine. Real moves, walked with chess.js — never a
 *  remembered line (G3). */
const VIENNA = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Be7', 'd4', 'O-O', 'Bd3', 'f5', 'exf6', 'Bxf6'];
const LESSON = 'Vienna Gambit';

describe('Vienna — what the student actually hears', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
  }, 180_000);

  it('walks the spine and reports the spoken line at every ply', () => {
    const board = new Chess();
    const history: string[] = [];
    const plies: unknown[] = [];

    for (const san of VIENNA) {
      board.move(san);
      history.push(san);
      const fen = board.fen();
      const ply = history.length;

      const candidates = new Map<string, DanyaNote>();
      for (const n of [
        ...notesForPrefix(history),
        ...notesForFen(fen),
        ...secondaryNotesForPosition(history),
        ...secondaryNotesForFen(fen),
      ]) candidates.set(n.id, n);

      const selected = noteAtPosition(history, fen, LESSON);

      // For a SILENT ply, attribute every candidate to the first gate that
      // refuses it. This is the line that answers "is the matrix necessary" —
      // if the silence is scope, a matrix helps; if there were no candidates at
      // all, no amount of gate-tuning conjures teaching.
      // Blame is only meaningful when NOTHING was selected. A note that WAS
      // selected but speaks nothing is a different failure — an unbaked
      // floating note, whose original prose names a foreign game's squares and
      // is therefore deliberately silent until baked. Conflating the two made
      // this report print "no candidates at all" on a ply that had eight, which
      // read as a corpus bug and was a bug in this line.
      const blame: Record<string, number> = {};
      if (!selected) {
        for (const n of candidates.values()) {
          const g = !noteDescribesPosition(n, fen) ? 'describesPosition'
            : !noteTeachesChessNotItsSource(n) ? 'teachesChessNotSource'
            : !noteStaysInScope(n, LESSON) ? 'staysInScope'
            : noteOpeningConflicts(n.opening, LESSON) ? 'openingConflicts'
            : 'privateFilterOrLostTheTie';
          blame[g] = (blame[g] ?? 0) + 1;
        }
      }

      const spoken = selected ? spokenBeatText(selected).trim() : '';
      const graded = spoken ? (gradeNarrationText(spoken, fen, 'viennaExample') ?? '').trim() : '';

      plies.push({
        ply,
        move: san,
        candidates: candidates.size,
        spoke: !!graded,
        noteId: selected?.id ?? null,
        opening: selected?.opening ?? null,
        heard: graded || null,
        gateTook: spoken && graded !== spoken
          ? (graded ? 'part of the note' : 'the whole note')
          : null,
        silenceBlame: selected ? null : blame,
      });
    }

    const spokeCount = plies.filter((p) => (p as { spoke: boolean }).spoke).length;
    const withCandidates = plies.filter((p) => (p as { candidates: number }).candidates > 0).length;
    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      lesson: LESSON,
      line: VIENNA.join(' '),
      plies: VIENNA.length,
      pliesWithCandidates: withCandidates,
      pliesThatSpoke: spokeCount,
      detail: plies,
    };

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/vienna-narration.json', JSON.stringify(report, null, 2));

    console.log(`\n════ ${LESSON} — ${VIENNA.join(' ')} ════`);
    console.log(`spoke on ${spokeCount} of ${VIENNA.length} plies (${withCandidates} had candidates)\n`);
    for (const p of plies as Array<Record<string, unknown>>) {
      const head = `ply ${String(p.ply).padStart(2)}  ${String(p.move).padEnd(7)} cand=${String(p.candidates).padStart(3)}`;
      if (p.heard) {
        console.log(`${head}  ▶ ${p.opening ?? '—'} [${p.noteId}]`);
        console.log(`          "${p.heard}"`);
        if (p.gateTook) console.log(`          (gate removed ${p.gateTook})`);
      } else if (p.noteId) {
        // Selected, but spoke nothing — the note has no baked spoken form.
        console.log(`${head}  · silent — note ${p.noteId} selected but has no spoken form (unbaked)`);
      } else {
        const b = p.silenceBlame as Record<string, number> | null;
        const why = b && Object.keys(b).length
          ? Object.entries(b).map(([k, v]) => `${k}×${v}`).join(' ')
          : (p.candidates as number) > 0
            ? 'candidates present but every one refused by a private filter'
            : 'no candidates at all';
        console.log(`${head}  · silent — ${why}`);
      }
    }
  }, 900_000);
});
