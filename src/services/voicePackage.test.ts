// The package is the utterance. These are the properties that were lost when
// the phrasing model was removed from the live lane and the package went with
// it — David 2026-08-08: "We still need to be handing the phrase in a package.
// Deterministically… same rules apply, just now to Google voice."
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildVoicePackage, describeVoicePackage, type VoiceFact } from './voicePackage';

/** Move 3 of the Pirc David played on prod — quiet, everything home. */
const PIRC_3 = 'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3';

const fact = (kind: VoiceFact['kind'], text: string, fen = PIRC_3): VoiceFact => ({ kind, text, fen });

describe('the voice package', () => {
  it('THE REGRESSION: refuses the three lines David actually heard', () => {
    // Each was spoken over this board announced as "the pin on the board".
    // None names a square, so the square-anchored grader alone cannot settle
    // them — the configuration check is what refuses them.
    const pkg = buildVoicePackage([
      fact('note', 'Doubled rooks on the open file x-ray the opposing rook behind a knight.'),
      fact('note', 'The passed pawn decides the game.'),
    ]);
    expect(pkg.spoken).toBe('');
    expect(pkg.kept).toEqual([]);
    expect(pkg.dropped.map((d) => d.reason)).toEqual(['board lacks doubled rooks', 'board lacks passed pawn']);
  });

  it('what is SPOKEN and what is LOGGED are one object', () => {
    // The divergence this file exists to end: the old code logged `factLines`
    // and spoke a separately-built string, so the audit could describe
    // something the student never heard.
    const pkg = buildVoicePackage([
      fact('computed', 'The knight on f6 is your most active piece.'),
      fact('alert', 'Their pawn on d4 is undefended.'),
    ]);
    expect(pkg.spoken).toBe(pkg.kept.map((f) => f.text).join(' '));
    expect(pkg.spoken).not.toBe('');
    expect(describeVoicePackage(pkg)).toContain('alert');
  });

  it('rank is declared — the computed read outranks the note, always', () => {
    // Order used to be the accident of a `??` chain, and the chain had no
    // computed lane at all, which is why David heard "no threat detection, no
    // tactics, no positional read. Nothing!!"
    const pkg = buildVoicePackage([
      fact('note', 'Fight for the centre early.'),
      fact('computed', 'The knight on f6 is your most active piece.'),
      fact('gem', 'That last move can be punished — look for it.'),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['gem', 'computed', 'note']);
  });

  it('is deterministic — same facts in, same words out', () => {
    const facts = [fact('alert', 'Their pawn on d4 is undefended.'), fact('note', 'Fight for the centre early.')];
    expect(buildVoicePackage(facts).spoken).toBe(buildVoicePackage([...facts]).spoken);
  });

  it('judges each fact against ITS OWN board, not a shared one', () => {
    // Facts arrive from producers that ran at different moments — during an
    // animation the live FEN is not the FEN a fact was computed from, and
    // judging by the wrong board is the whole bug class. Same sentence, two
    // boards, opposite verdicts.
    const endgame = '8/8/8/3k4/8/8/4RR2/4K3 w - - 0 60';   // rooks doubled? no — e2/f2 are adjacent files
    const doubled = '8/8/8/3k4/8/8/4R3/4R1K1 w - - 0 60';   // e2 + e1, same file
    const claim = 'Doubled rooks decide it.';
    expect(buildVoicePackage([fact('computed', claim, endgame)]).spoken).toBe('');
    expect(buildVoicePackage([fact('computed', claim, doubled)]).spoken).toBe(claim);
  });

  it('a duplicate sentence is one sentence to the ear', () => {
    const pkg = buildVoicePackage([
      fact('computed', 'Their pawn on d4 is undefended.'),
      fact('note', 'their pawn on d4 is undefended'),
    ]);
    expect(pkg.kept).toHaveLength(1);
    expect(pkg.dropped[0]?.reason).toBe('duplicate');
  });

  it('holds the utterance to a budget — the student is waiting through it', () => {
    const board = new Chess(PIRC_3);
    expect(board.turn()).toBe('w');
    const pkg = buildVoicePackage([
      fact('gem', 'One.'), fact('alert', 'Two.'), fact('opening', 'Three.'), fact('computed', 'Four.'),
    ]);
    expect(pkg.kept).toHaveLength(3);
    expect(pkg.dropped.map((d) => d.reason)).toEqual(['over budget']);
  });
});

// From David's live Vienna run, 2026-08-08.
describe('the join', () => {
  it('THE REGRESSION: a following fact starts a sentence, not a clause', () => {
    // He heard: "That takes your pawn. the knight on e4 sits on an outpost…"
    // and "There's a real pin here for you — look for it. the knight on e4…".
    // Each producer writes a standalone sentence; some open lowercase because
    // they were authored to be spliced mid-sentence. After a full stop that
    // lowercase reads as a mistake and HEARS as one — the voice drops pitch as
    // if continuing a clause.
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    const pkg = buildVoicePackage([
      { kind: 'alert', text: 'That takes your pawn.', fen },
      { kind: 'computed', text: 'the knight on e4 sits on an outpost no pawn can challenge.', fen },
    ]);
    expect(pkg.spoken).toBe('That takes your pawn. The knight on e4 sits on an outpost no pawn can challenge.');
  });

  it('leaves a move name lowercase — capitalising a SAN would be wrong', () => {
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    const pkg = buildVoicePackage([
      { kind: 'alert', text: 'Careful.', fen },
      { kind: 'computed', text: 'dxe5 would open the file.', fen },
    ]);
    expect(pkg.spoken).toContain('dxe5');
    expect(pkg.spoken).not.toContain('Dxe5');
  });

  it('does not touch a first fact that is already a sentence', () => {
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    expect(buildVoicePackage([{ kind: 'alert', text: 'Careful here.', fen }]).spoken).toBe('Careful here.');
  });
});
