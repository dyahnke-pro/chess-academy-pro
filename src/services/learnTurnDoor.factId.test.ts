// THE LEARN DOOR JOINS BY ID, NEVER BY WORDS (WO-STORY-MATRIX-01 P1-5).
//
// The door hands its facts to the voice package and reads back what was kept.
// It used to find which lane a kept sentence came from by its words — the
// first fact offered whose text CONTAINED the kept text (`laneOf`), and its
// stakes, role and proof the same way. Two facts whose words are a substring
// of one another were then one fact to the door: the second was filed under
// the first one's lane, took that lane's step, and lost its own. The kept
// fact now carries the id of the fact it came from (`VoiceFact.factId`).
import { describe, it, expect } from 'vitest';
import { decideTurn } from './learnTurnDoor';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { claimKey } from './voicePackage';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
/** Two true sentences on this board, the second inside the first. */
const LONG = 'Mark it: your knight on f3 attacks the pawn on e5.';
const SHORT = 'your knight on f3 attacks the pawn on e5.';

describe('a kept fact is attributed by its id, never by its words', () => {
  it('two facts whose texts are substrings of each other keep their own lanes', () => {
    expect(LONG.includes(SHORT)).toBe(true);
    // The student's move's reason (yours) and their move's purpose (theirs):
    // two steps, so the thought keeps one fact each and both speak.
    const d = decideTurn([
      { lane: 'fundamental', role: 'teach', text: LONG, fen: FEN, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
      { lane: 'theirPurpose', role: 'teach', text: SHORT, fen: FEN, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
    ]);
    expect(d.pkg.kept.map((f) => f.text)).toEqual([LONG, SHORT]);
    expect(d.spoke).toEqual(['fundamental', 'theirPurpose']);
    expect(d.held).toEqual([]);
  });

  it('every kept and dropped voice fact names the fact it came from', () => {
    // A third fact whose claim the game already heard: the package drops it,
    // so the dropped half is exercised, not vacuous.
    const SAID = 'already-heard:e5';
    const d = decideTurn([
      { id: 'long', lane: 'fundamental', role: 'teach', text: LONG, fen: FEN, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
      { id: 'short', lane: 'theirPurpose', role: 'teach', text: SHORT, fen: FEN, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
      { id: 'heard', lane: 'planArc', role: 'teach', text: 'Their pawn on e5 is the target of the whole plan.', fen: FEN, claims: [SAID], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
    ], undefined, new Set([claimKey(SAID)]));
    expect(d.pkg.kept.map((f) => f.factId)).toEqual(['long', 'short']);
    expect(d.pkg.dropped.map((x) => x.fact.factId)).toEqual(['heard']);
    const ids = [...d.pkg.kept, ...d.pkg.dropped.map((x) => x.fact)].map((f) => f.factId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
