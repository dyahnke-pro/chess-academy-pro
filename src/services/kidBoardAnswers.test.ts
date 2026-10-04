import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { GUIDED_GAMES } from '../data/guidedGames';
import {
  classifyKidBoardQuestion,
  kidBoardLine,
  kidHintFacts,
  kidSafetyFacts,
  kidWhereFacts,
  resolvePieceRef,
} from './kidBoardAnswers';

// Every position here is a REAL kid position: the board the child is looking
// at in a shipped guided game, just before their scripted move.
function before(gameId: string, moveIdx: number): { fen: string; kid: 'w' | 'b'; san: string; concept?: string } {
  const g = GUIDED_GAMES.find((x) => x.id === gameId);
  if (!g) throw new Error(`no game ${gameId}`);
  const fen = moveIdx === 0 ? g.startFen : g.moves[moveIdx - 1].fen;
  const m = g.moves[moveIdx];
  return { fen, kid: g.playerColor, san: m.san, concept: m.teachingConcept };
}

const SAN_RE = /\b(O-O(?:-O)?|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8][+#]?)\b/;
const PRAISE_RE = /\b(great|good job|well done|excellent|awesome|nice|amazing|perfect|brilliant)\b/i;

describe('classifyKidBoardQuestion — the three quick-asks and typed questions', () => {
  it('routes the quick-asks to hint', () => {
    expect(classifyKidBoardQuestion('Why is this a good move?')).toBe('hint');
    expect(classifyKidBoardQuestion('What should I do next?')).toBe('hint');
    expect(classifyKidBoardQuestion('Can you help me find a good move?')).toBe('hint');
  });
  it('routes safety and where questions, misspelled and kid-worded', () => {
    expect(classifyKidBoardQuestion('is my queen safe')).toBe('is-it-safe');
    expect(classifyKidBoardQuestion('is anything in danger??')).toBe('is-it-safe');
    expect(classifyKidBoardQuestion('can they take my horsey')).toBe('is-it-safe');
    expect(classifyKidBoardQuestion('where can my horse go')).toBe('where-can-it-go');
    expect(classifyKidBoardQuestion('how does the bishop move')).toBe('where-can-it-go');
  });
  it('leaves concept and chit-chat to the caller', () => {
    expect(classifyKidBoardQuestion('what is a fork?')).toBeNull();
    expect(classifyKidBoardQuestion('hi coach!')).toBeNull();
  });
});

describe('resolvePieceRef — the seat decides "my"', () => {
  it('"my knight" is the kid\'s knights; "their knight" the other side\'s', () => {
    const { fen, kid } = before('legals-mate', 4); // after 1.e4 e5 2.Nf3 Nc6
    const mine = resolvePieceRef('where can my knight go', fen, kid);
    const theirs = resolvePieceRef('where can their knight go', fen, kid);
    expect(mine?.kind === 'squares' ? [...mine.squares].sort() : mine).toEqual(['b1', 'f3']);
    expect(theirs?.kind === 'squares' ? [...theirs.squares].sort() : theirs).toEqual(['c6', 'g8']);
  });
  it('a named empty square is reported as empty, not invented', () => {
    const { fen, kid } = before('scholars-mate', 0);
    expect(resolvePieceRef('is the piece on e4 safe', fen, kid)).toEqual({ kind: 'empty', square: 'e4' });
  });
});

describe('kidHintFacts — the scripted move, spelled out, and why', () => {
  it('Scholar\'s Mate bishop: names the move, the f7 target and the concept', () => {
    const p = before('scholars-mate', 2);
    const out = kidHintFacts({ fen: p.fen, kid: p.kid, expectedNextSan: p.san, teachingConcept: p.concept });
    expect(out).toBe('Try this: move your bishop from f1 to c4. From c4 your bishop will attack their pawn on f7. This move is about development.');
  });
  it('the mating move says checkmate', () => {
    const p = before('scholars-mate', 6);
    const out = kidHintFacts({ fen: p.fen, kid: p.kid, expectedNextSan: p.san, teachingConcept: p.concept });
    expect(out).toMatch(/move your queen from f3 to f7, capturing their pawn\. That is checkmate/);
  });
  it('the opponent\'s turn is said, not a move for them', () => {
    const g = GUIDED_GAMES.find((x) => x.id === 'scholars-mate')!;
    const out = kidHintFacts({ fen: g.moves[0].fen, kid: 'w', expectedNextSan: undefined });
    expect(out).toMatch(/^It is their turn right now/);
  });
  it('an illegal scripted move falls to the board line, never a guessed move', () => {
    const p = before('scholars-mate', 0);
    expect(kidHintFacts({ fen: p.fen, kid: p.kid, expectedNextSan: 'Qh5' })).toMatch(/^Let's look at the board together\./);
  });
});

describe('kidSafetyFacts — attackers, protectors and the costly trade', () => {
  it('Legal\'s Mate: the pinned knight on f3 is attacked by the g4 bishop and protected twice', () => {
    const p = before('legals-mate', 8);
    expect(kidSafetyFacts('is my knight on f3 safe', p.fen, p.kid)).toBe(
      'Your knight on f3 is under attack from their bishop on g4. Your pawn on g2 and your queen on d1 protect it.',
    );
  });
  it('nothing attacked is said plainly', () => {
    const p = before('scholars-mate', 0);
    expect(kidSafetyFacts('is anything in danger', p.fen, p.kid)).toBe('None of your pieces is under attack right now.');
    expect(kidSafetyFacts('is my queen safe', p.fen, p.kid)).toBe('Your queen on d1 is safe right now — nothing is attacking it.');
  });
  it('a missing piece is said, not invented', () => {
    const p = before('legals-mate', 10); // White's queen was just taken
    expect(kidSafetyFacts('is my queen safe', p.fen, p.kid)).toBe('You have no queen left on the board.');
  });
});

describe('kidWhereFacts — every legal square, captures named', () => {
  it('the knight on f3 in Legal\'s Mate', () => {
    const p = before('legals-mate', 4);
    const out = kidWhereFacts('where can my knight on f3 go', p.fen, p.kid);
    expect(out).toBe('On this board: Your knight on f3 can go to d4, g5, h4 or g1. It can also capture their pawn on e5.');
  });
  it('works while it is the opponent\'s turn', () => {
    const g = GUIDED_GAMES.find((x) => x.id === 'scholars-mate')!;
    expect(kidWhereFacts('where can my horse on g1 go', g.moves[0].fen, 'w')).toBe('On this board: Your knight on g1 can go to e2, f3 or h3.');
  });
});

describe('every kid answer is board-true and kid-safe across every shipped guided game', () => {
  it('no SAN, no praise, and every "<piece> on <square>" claim matches the board', () => {
    let checked = 0;
    for (const g of GUIDED_GAMES) {
      g.moves.forEach((m, i) => {
        if (m.color !== g.playerColor || m.autoPlay) return;
        const fen = i === 0 ? g.startFen : g.moves[i - 1].fen;
        const board = new Chess(fen);
        const outs = [
          kidHintFacts({ fen, kid: g.playerColor, expectedNextSan: m.san, teachingConcept: m.teachingConcept }),
          kidSafetyFacts('is anything in danger?', fen, g.playerColor),
          kidWhereFacts('where can my knight go', fen, g.playerColor),
          kidWhereFacts('where can my queen go', fen, g.playerColor),
          kidBoardLine(fen, g.playerColor),
        ];
        for (const out of outs) {
          expect(out).not.toMatch(SAN_RE);
          expect(out).not.toMatch(PRAISE_RE);
          for (const claim of out.matchAll(/\b(your|their) (pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/gi)) {
            // A hint names where the piece WILL be — only check claims about
            // the current board (the "From X your …" clause is post-move).
            if (out.startsWith('Try this') && /From [a-h][1-8] your/.test(out) && (claim.index ?? 0) > out.indexOf('From ')) continue;
            const piece = board.get(claim[3] as Parameters<typeof board.get>[0]);
            const word = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const;
            expect(piece, `${g.id} #${i}: ${claim[0]} in "${out}"`).toBeTruthy();
            expect(word[piece!.type]).toBe(claim[2].toLowerCase());
            expect(piece!.color === g.playerColor ? 'your' : 'their').toBe(claim[1].toLowerCase());
            checked += 1;
          }
        }
      });
    }
    expect(checked).toBeGreaterThan(50);
  });
});
