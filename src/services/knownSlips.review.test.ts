// THE KNOWN MISTAKES AND TRAPS REACH REVIEW (David 2026-11-04: "it needs to be
// in review for sure") — on Naroditsky's own Scotch Gambit game
// (src/test/fixtures/danya-scotch-gambit.json) and on real club slips, with
// the club gem index the app fetches. Before `knownSlip`, Review read no gem:
// every line asserted here was absent.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { knownSlipIndexFromDisk, reviewSegments, type ReplayGame } from '../test/replayGame';
import { knownSlip, knownSlipsAt } from './knownSlips';
import { readBoard } from './boardComputers';
import { extractArrowableSans } from './arrowEngine';
import { Chess } from 'chess.js';

const GAME = JSON.parse(readFileSync('src/test/fixtures/danya-scotch-gambit.json', 'utf8')) as ReplayGame;
const said = (game: ReplayGame): Map<number, string> => {
  const out = new Map<number, string>();
  for (const s of reviewSegments(game, 1500)) out.set(s.ply, s.narration ?? '');
  return out;
};
const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ').filter(Boolean)) c.move(s); return c.fen(); };

describe('Review says the known slip ahead, both seats, on his Scotch Gambit game', () => {
  const walk = said(GAME);
  it('2.Nf3 and 3.d4: the mistake the student (Black) could make next — said on the move that reached the board', () => {
    expect(walk.get(3)).toContain('A known mistake here: …f6, and after Nxe5 they win a pawn.');
    // Its words rotate on how many the game has said: one formula is never
    // said three times a game.
    expect(walk.get(5)).toContain('…f6 is a known mistake on this board, and after Bc4 they have the better game.');
  });
  it('4…Bc5: the trap set for them — called a trap because it clears the trap bar, its material counted off the line', () => {
    // 4.Ng5?! (the curated gem, …Be7 +1.7) is said on ply 6 first, so the words
    // have rotated by here.
    expect(walk.get(6)).toContain('Here, Ng5 is a known mistake at club level: after …Be7 you have the better game.');
    expect(walk.get(8)).toContain('Nxd4 is a known trap on this board, and after …Bxd4 you win two knights for a bishop and a pawn.');
  });
  it('their slip ahead is the student\'s chance ("you"), the student\'s own is "they"', () => {
    expect(walk.get(10)).toContain('Here, Qd5 is a known mistake at club level: after …Qe7 you have the better game.');
    expect(walk.get(11)).toContain('A known mistake here: …Kf8, and after Bb3 they have the better game.');
  });
  it('one a move, and a board the index holds no slip for says none', () => {
    for (const [ply, text] of walk) {
      expect((text.match(/known (?:mistake|trap) (?:here|on this board|at club level)/g) ?? []).length).toBeLessThanOrEqual(1);
      if (ply > 12) expect(text).not.toMatch(/known (?:mistake|trap) (?:here|on this board|at club level)/);
      // A REASON, NOT A STATISTIC (prod Review 2026-11-06): the share that
      // chose the slip is never said.
      expect(text).not.toMatch(/club players under|\d+(?:\.\d+)?%/);
    }
  });
});

describe('Review says the slip that was played, as why it was a mistake', () => {
  // The Scholar's-mate board: 3…Nf6?? is the index's most-played trap there.
  const SANS = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'];
  it('the student\'s own slip (Black): a known trap, and the mate — said on the move that played it', () => {
    const walk = said({ sans: SANS, studentSide: 'black', reads: [] });
    expect(walk.get(6)).toContain('Club players go wrong with …Nf6 here — a known trap: Qxf7 is mate.');
    expect(walk.get(5)).not.toMatch(/known trap|go wrong with/);
    // A trap's material is counted off its line: g6?? Qxe5+ wins a rook, a
    // knight and a pawn — never "the queen" for nine points.
    expect(walk.get(3)).toContain('A known trap here: …g6, and after Qxe5+ they win a rook, a knight and a pawn.');
  });
  it('their slip (the student is White): the same trap, said to the student who punishes it', () => {
    const walk = said({ sans: SANS, studentSide: 'white', reads: [] });
    expect(walk.get(6)).toContain('Club players go wrong with …Nf6 here — a known trap: Qxf7 is mate.');
    expect(walk.get(3)).toContain('after Qxe5+ you win a rook, a knight and a pawn.');
  });
});

describe('the computer, through the registry', () => {
  const index = knownSlipIndexFromDisk();
  const board = fenAfter('e4 e5 Nf3 Nc6 d4');
  it('reads the index board by board, and is the one fact with its proof', () => {
    // The slip ahead on the board the move reached is a trap named before it
    // lands (its own registry row and kind since 2026-11-05).
    const f = readBoard('trapAhead', { fen: board, gems: knownSlipsAt(index, board), played: 'exd4', student: 'b', verdictPunish: null, saidNext: null, told: 0 });
    expect(f?.kind).toBe('trap-ahead');
    expect(f?.seat).toBe('student');
    expect(f?.computer).toBe('knownSlip');
    expect(f && 'line' in f.proof ? f.proof.line?.sans.slice(0, 2) : null).toEqual(['f6', 'Bc4']);
  });
  it('a slip the next move\'s refuted alternative names is said there, not here', () => {
    expect(knownSlip({ fen: board, gems: knownSlipsAt(index, board), played: 'exd4', on: 'reached', student: 'b', verdictPunish: null, saidNext: 'f6', told: 0 })).toBeNull();
  });
  it('a punishment the verdict already named is not said twice: only the slip is named as a known one', () => {
    const r = knownSlip({ fen: board, gems: knownSlipsAt(index, board), played: 'f6', on: 'played', student: 'b', verdictPunish: 'Bc4', saidNext: null, told: 0 });
    expect(r?.text).toBe('That was a known mistake at club level.');
  });
  it('the slip is said, never arrowed as a move to play — in every rotation', () => {
    for (const told of [0, 1, 2]) {
      for (const [on, played] of [['reached', 'exd4'], ['played', 'f6']] as const) {
        const r = knownSlip({ fen: board, gems: knownSlipsAt(index, board), played, on, student: 'b', verdictPunish: null, saidNext: null, told });
        expect(r).not.toBeNull();
        expect(extractArrowableSans(r?.text ?? '')).not.toContain('f6');
        expect(extractArrowableSans(r?.text ?? '')).toContain('Bc4');
      }
    }
  });
  it('a known mistake under the trap bar is never called a trap', () => {
    const r = knownSlip({ fen: board, gems: knownSlipsAt(index, board), played: 'f6', on: 'played', student: 'b', verdictPunish: null, saidNext: null, told: 0 });
    expect(r?.text).toMatch(/^That was a known mistake\b/);
  });
});

// Prod Review 2026-11-06 (AUDIT_GAME_ID=jYSkjcuG, Carlsen–Caruana, the Ruy
// Lopez, student White): the same slip was said on two boards in a row —
// "d5 is a known mistake on this board, and after Nxe5 you win a pawn." on
// 3.Bb5, then "Here, d5 is a known mistake at club level: after Nxe5 you win
// a pawn." on 5.d3. The say-once key was the BOARD, so a second board was a
// second claim. The claim is the slip: who plays it, the move, the punishment.
describe('a known slip is said once a game, wherever it stays available', () => {
  const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'd3', 'd6', 'c3', 'g6'];
  const index = knownSlipIndexFromDisk();
  const reached = (sans: string, played: string, told: number): ReturnType<typeof knownSlip> => {
    const fen = fenAfter(sans);
    return knownSlip({ fen, gems: knownSlipsAt(index, fen), played, on: 'reached', student: 'w', verdictPunish: null, saidNext: null, told });
  };

  it('…d5 / Nxe5 said on 3.Bb5 is not said again on 5.d3', () => {
    const walk = said({ sans: SANS, studentSide: 'white', reads: [] });
    expect(walk.get(5)).toContain('…d5 is a known mistake on this board, and after Nxe5 you win a pawn.');
    const again = [...walk].filter(([ply, text]) => ply > 5 && /\bd5\b[^.]*known mistake|known mistake[^.]*\bd5\b/.test(text));
    expect(again).toEqual([]);
  });

  it('two boards, one slip, one key', () => {
    const atBb5 = reached('e4 e5 Nf3 Nc6 Bb5', 'a6', 0);
    const atD3 = reached('e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 d3', 'd6', 1);
    expect(atBb5?.text).toMatch(/\bd5\b.*Nxe5/);
    expect(atD3?.text).toMatch(/\bd5\b.*Nxe5/);
    expect(atD3?.key).toBe(atBb5?.key);
  });

  // The same move punished ANOTHER way is another claim, and is still said:
  // his Scotch Gambit's f6 / Nxe5 on 2.Nf3, then f6 / Bc4 on 3.d4 (the first
  // describe's "2.Nf3 and 3.d4" case).
  it('the same move punished another way has another key', () => {
    const r = (sans: string, played: string): ReturnType<typeof knownSlip> => {
      const fen = fenAfter(sans);
      return knownSlip({ fen, gems: knownSlipsAt(index, fen), played, on: 'reached', student: 'b', verdictPunish: null, saidNext: null, told: 0 });
    };
    const nxe5 = r('e4 e5 Nf3', 'Nc6');
    const bc4 = r('e4 e5 Nf3 Nc6 d4', 'exd4');
    expect(nxe5?.text).toMatch(/f6, and after Nxe5/);
    expect(bc4?.text).toMatch(/f6, and after Bc4/);
    expect(bc4?.key).not.toBe(nxe5?.key);
  });
});
