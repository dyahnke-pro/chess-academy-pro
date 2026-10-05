// PP on the PP (David 2026-10-05): the pin concept carries its principle where
// it is relevant — a pin on THIS board whose holder can pile on and win the
// pinned piece — from either seat, said once per pin.
import { describe, it, expect } from 'vitest';
import { computePositionFacts } from './positionFacts';

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = (cp: number) => ({ topLines: [line(1, cp), line(2, cp - 20), line(3, cp - 40)], evaluation: cp, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 400, draw: 400, loss: 200 } });

// Bg5 pins the f6-knight to the queen on d8; e4-e5 attacks it with a pawn.
const PILE_ON = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3PP3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5';
// Same pin with no pawn to pile on — nothing to say beyond today's clause.
const NO_PAWN = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3P4/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5';

const conceptOf = async (fen: string, student: 'w' | 'b', alreadySaid?: ReadonlySet<string>) => {
  const mover = fen.split(' ')[1] as 'w' | 'b';
  const r = await computePositionFacts({ posture: 'walk', fen, moverColor: mover, studentColor: student, analysis: flat(40), alreadySaid } as never);
  return { clause: r.clauses.find((c) => c.kind === 'concept'), remember: r.remember };
};

describe('positionFacts — the pin concept carries PP on the PP', () => {
  it('the student holds the pin: the principle, the move and why it works', async () => {
    const { clause } = await conceptOf(PILE_ON, 'w');
    expect(clause, 'a concept clause speaks — even in the opening').toBeDefined();
    expect(clause!.text).toMatch(/^Your bishop on g5 pins their knight on f6 to their queen on d8\./);
    expect(clause!.text).toMatch(/pinned|attack it again|pressure/i);
    expect(clause!.text).toMatch(/e5 adds a pawn on the knight, and it can't step away\./);
    expect(clause!.text).not.toMatch(/\b(we|our|us)\b/i);
    // The named move is drawn (G6).
    expect(clause!.lines?.[0]?.sans).toEqual(['e5']);
  });

  it('the opponent holds it: the warning, their move and the way out', async () => {
    const { clause } = await conceptOf(PILE_ON.replace(' w KQkq', ' b KQkq'), 'b');
    expect(clause).toBeDefined();
    expect(clause!.text).toMatch(/^Their bishop on g5 pins your knight on f6 to your queen on d8\./);
    expect(clause!.text).toMatch(/e5 is the pile-on\./);
    expect(clause!.text).toMatch(/Break the pin/);
    expect(clause!.text).not.toMatch(/add a defender/); // a pawn pile-on is not met by a defender
  });

  it('is said once per pin', async () => {
    const first = await conceptOf(PILE_ON, 'w');
    expect(first.clause).toBeDefined();
    const again = await conceptOf(PILE_ON, 'w', new Set(first.remember));
    expect(again.clause).toBeUndefined();
  });

  it('a pin with nothing to pile on is left as it is today (silent in the opening)', async () => {
    const { clause } = await conceptOf(NO_PAWN, 'w');
    expect(clause?.text ?? '').not.toMatch(/pile|attack it again|can't step away/i);
  });
});
