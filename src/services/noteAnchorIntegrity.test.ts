// The backstop for note-anchor drift.
//
// David 2026-08-04: "Gates are back ups that should never fire." The cure for
// false narration is upstream — selection only ever picks a note whose taught
// line reproduces the ply's position (`noteSelectionDeterminism.test`), and
// `noteDescribesPosition` drops the ones that are filed right but describe
// somewhere else. This is what watches for the ground shifting under that.
//
// It is a DATA gate, not a prose gate, and deliberately so. A runtime
// claim-stripper on spoken sentences was considered and rejected: it would judge
// each sentence as if it opened the note, so legitimate teaching like "after Bg5
// Nbd7, White plays Qd2" — whose third move only becomes legal two plies later —
// would be silenced. Catching a defect at build time, where it can be fixed, beats
// stripping true teaching at runtime.
//
// The number it guards: 260 of 6,768 position-keyed notes (3.8%) open by
// describing a board unreachable from their own anchor. That is transcript
// distillation attaching prose to the wrong moment. A re-farm that pushes this
// materially higher has regressed the corpus, and this fails loudly instead of
// letting the coach narrate more confident nonsense.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { noteDescribesPosition, noteTeachesChessNotItsSource } from './noteAnchorIntegrity';
import danyaRaw from '../data/danya-teachings.json';
import type { DanyaNote } from './danyaTeachingService';

/** The board a note's own taught line produces, or null if it won't replay. */
function anchorFen(lineSan: readonly string[]): string | null {
  if (lineSan.length === 0) return null;
  try {
    const chess = new Chess();
    for (const san of lineSan) chess.move(san);
    return chess.fen();
  } catch {
    return null;
  }
}

describe('corpus notes describe the position they are filed at', () => {
  let positioned: DanyaNote[] = [];

  beforeAll(() => {
    // The PRIMARY corpus, which is the house voice and the worst offender of the
    // four (5.1% against 1.8–3.9%). Scoped to it deliberately: it is a static
    // import, so this reads the same bytes the app ships, with no fetch to prime
    // and no chance of measuring an empty set. The farmed corpora are held to the
    // same rule at SELECTION — `noteDescribesPosition` runs on every candidate
    // regardless of corpus — so this watches the source most likely to drift.
    positioned = (danyaRaw as unknown as { notes: DanyaNote[] }).notes
      .filter((n) => n.lineSan.length > 0);
    expect(positioned.length).toBeGreaterThan(1_000);
  });

  it('holds the mis-anchored rate at or below its measured baseline', () => {
    let judged = 0;
    let misAnchored = 0;
    const examples: string[] = [];

    for (const note of positioned) {
      const fen = anchorFen(note.lineSan);
      if (!fen) continue;
      judged += 1;
      if (!noteDescribesPosition(note, fen)) {
        misAnchored += 1;
        if (examples.length < 5) {
          examples.push(`${note.id} @[${note.lineSan.join(' ')}] — "${note.explains.slice(0, 70)}"`);
        }
      }
    }

    const rate = misAnchored / judged;
    // BASELINE, not a target. Measured 2026-08-04 at 5.1% for the primary
    // corpus. It may only shrink: a re-farm that raises it has attached more
    // prose to the wrong moment, and these notes are exactly the ones that
    // produce fluent, confident, false narration.
    expect(
      rate,
      `${misAnchored}/${judged} notes describe a position they are not filed at:\n${examples.join('\n')}`,
    ).toBeLessThanOrEqual(0.07);
    // Selection drops every one of these, so the corpus keeps working — this is
    // a health signal, not a ship-blocker for the runtime.
    console.log(`[anchor integrity] ${misAnchored}/${judged} mis-anchored (${(rate * 100).toFixed(1)}%)`);
  });

  it('rejects a note that opens on a move unreachable from its board', () => {
    // The Caro-Kann case that started this: a note filed after 1.e4 c6 2.d4 d5
    // 3.Nc3 dxe4 that opens "After Nxh5…" — no knight can reach h5.
    const chess = new Chess();
    for (const san of ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4']) chess.move(san);
    const bad: DanyaNote = {
      id: 'test-bad', lineSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'], opening: 'Caro-Kann Defense',
      phase: 'opening', explains: 'After Nxh5, Black plays Nc6, threatening ...cxd4.',
      teaches: '', plans: '', concepts: [], sources: [],
    };
    expect(noteDescribesPosition(bad, chess.fen())).toBe(false);
  });

  it('keeps a note whose opener recaps a move its own line played', () => {
    // "After …Bc5" in a note anchored two plies after Bc5 is orienting the
    // student, not jumping elsewhere. Silencing it would be the worse error.
    const chess = new Chess();
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3']) chess.move(san);
    const good: DanyaNote = {
      id: 'test-good', lineSan: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3'],
      opening: 'Scotch Game', phase: 'opening',
      explains: 'After …Bc5, White must watch the a7-g1 diagonal.',
      teaches: '', plans: '', concepts: [], sources: [],
    };
    expect(noteDescribesPosition(good, chess.fen())).toBe(true);
  });

  it('stays silent when there is nothing to judge', () => {
    // No hypothetical opener, no named moves, or no board — all unjudgeable, and
    // an unjudgeable note must pass. Only a PROVABLY misplaced note is dropped.
    const plain: DanyaNote = {
      id: 'test-plain', lineSan: ['e4'], opening: null, phase: 'opening',
      explains: 'The centre is the first thing to fight for.',
      teaches: '', plans: '', concepts: [], sources: [],
    };
    expect(noteDescribesPosition(plain, new Chess().fen())).toBe(true);
    expect(noteDescribesPosition(plain, undefined)).toBe(true);
  });
});

// ── A note must teach CHESS, not describe where it came from ────────────────
//
// These corpora are distilled from video transcripts and the distillation
// sometimes keeps the frame instead of the content. Measured past book across
// 120 real games, 63 of 770 selected notes — 8.2% — opened by describing their
// own source. Spoken mid-game that is worse than silence: it is the narration
// rules' "never reference the interface, no meta" arriving through the corpus
// rather than through a template.
describe('notes teach chess, not the material they came from', () => {
  const meta = (explains: string): DanyaNote => ({
    id: 'm', lineSan: ['e4', 'e5', 'Nf3'], opening: null, phase: 'middlegame',
    explains, teaches: '', plans: '', concepts: [], sources: [],
  });

  it('drops a note describing its own source', () => {
    for (const text of [
      'The transcript discusses a common tactical pattern where Black wins a piece.',
      'The repertoire is built on the idea of playing ...g6 setups against e4.',
      'In this video he explains why the knight belongs on d5.',
      'The speaker prefers the quiet line here.',
    ]) {
      expect(noteTeachesChessNotItsSource(meta(text)), text).toBe(false);
    }
  });

  it('keeps teaching that merely mentions chess material', () => {
    // The filter must not reach ordinary chess prose. "Course" and "series" are
    // narrow enough to need their article; a rook on an open FILE is not a clip.
    for (const text of [
      'The rook belongs behind the passed pawn.',
      'Black should meet the pawn storm with a central break.',
      'This structure repeats across the whole Sicilian complex.',
      'He has the bishop pair, so keep the position open.',
    ]) {
      expect(noteTeachesChessNotItsSource(meta(text)), text).toBe(true);
    }
  });
});
