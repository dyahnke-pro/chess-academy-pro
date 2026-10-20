// OS-1 root cause 1: chat's "their ideas" ran a THIRD detector of their wanted
// pin/fork, with its own safety rule, beside Learn's prevention and the
// obvious-stop verdict. It now reads the one owner, so the three agree.
import { describe, it, expect } from 'vitest';
import { opponentIdeas } from './groundedAnswer';
import { theirWantedMoves, findProphylaxis } from './prophylaxis';

const FEN = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';

describe('their ideas in chat come from the one owner (OS-1)', () => {
  it('…Bg4 is named as the pin of your knight on f3 against your queen on d1', () => {
    expect(opponentIdeas(FEN, 'w')).toContain('…Bg4 would pin your knight on f3 against your queen on d1');
  });
  it('every idea chat names is one the owner found — and the owner\'s prevention threat is among them', () => {
    const owned = theirWantedMoves(FEN, 'w').map((w) => w.san);
    const said = opponentIdeas(FEN, 'w').map((s) => s.match(/^…?(\S+) would/)?.[1]);
    expect(said).toEqual(owned);
    expect(owned).toContain(findProphylaxis(FEN)!.intent.san);
  });
});
