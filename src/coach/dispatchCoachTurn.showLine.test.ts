import { Chess } from 'chess.js';
/**
 * "SHOW ME" PLAYS THE LAST PROOF (WO-CHAT-01). A student who heard a line
 * says "show me" / "play it out" and the board plays it — on every screen,
 * from the one door, never a second line of reasoning about the words.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations, lastLineFor } from './dispatchCoachTurn';
import { readTurnInCode } from './chatTurnCodeReader';

// 1.e4 e5 2.Nf3 Nc6 3.Bc4 — the student is White, Black to move.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  setChatTurnReaderForTests(async () => null as never);
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const ask = (q: string) => dispatchCoachTurn({
  surface: 'game-chat', ask: q, origin: 'typed',
  liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'black', studentColor: 'white', moveHistory: LINE, currentRoute: '/coach/teach' },
} as never, { maxToolRoundTrips: 1 });

describe('"show me"', () => {
  it.each(['show me', 'Show me!', 'play it out', 'walk me through it', 'show me the line'])('"%s" is read in code as the show-line request', (q) => {
    const t = readTurnInCode(q, { fen: FEN, history: LINE, studentColor: 'white' } as never);
    expect(t?.steps?.map((s) => s.action)).toEqual(['show-line']);
  });
  it.each(['show me the Italian', 'show me how to castle', 'what does that show me?'])('"%s" is not', (q) => {
    const t = readTurnInCode(q, { fen: FEN, history: LINE, studentColor: 'white' } as never);
    expect(t?.steps?.some((s) => s.action === 'show-line') ?? false).toBe(false);
  });
  it('with nothing said yet, asks for a line first and walks nothing', async () => {
    const a = await ask('show me');
    expect(a.autoWalk).toBeUndefined();
    expect(a.text).toMatch(/no line to show yet/);
  }, 60_000);
  it('after an answer with a proof, plays that proof', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'attack-piece', referents: [{ type: 'square', square: 'c4' }], seat: 'them', topic: null }) as never);
    const first = await ask('can they attack my bishop on c4?');
    setChatTurnReaderForTests(async () => null as never);
    const proof = first.lines?.[0];
    expect(proof).toBeDefined();
    expect(lastLineFor('game-chat')).toEqual(proof);
    const shown = await ask('show me');
    expect(shown.autoWalk).toEqual(proof);
    expect(shown.text).toMatch(/^Playing the line out on the board/);
  }, 60_000);
});

describe('hard walk 2026-10-10', () => {
  it('"what did their move threaten" on a board with no move list says so, then reads the threats — never the best move', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'what-did-their-move-change', referents: [], seat: 'them', topic: null }) as never);
    const a = await dispatchCoachTurn({
      surface: 'standalone-chat', ask: 'What did their last move Kg8 threaten, two moves deep?', origin: 'typed',
      liveState: { surface: 'standalone-chat', fen: '6k1/p1p4p/1p2n1p1/3pQ3/3P1nN1/2PB2qP/PP4P1/6K1 w - - 18 33', whoseTurn: 'white', studentColor: 'white', moveHistory: [], currentRoute: '/coach/session/explain-position' },
    } as never, { maxToolRoundTrips: 1 });
    expect(a.text).toMatch(/^There's no move list on this board.*they threaten …Qxg2# — mate/);
    expect(a.text).not.toMatch(/best move/i);
  }, 60_000);
});

describe('hard walk 2026-10-11 — a question with "show me" is answered first', () => {
  const BEFORE_QG7 = '2r4k/pp5p/2q1P3/7N/4p3/4P1Q1/bPPr1P2/2K3N1 w - - 0 24';
  it('"is there a forced mate for me now? show me" names Qg7# and walks it, never the old line', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'attack-piece', referents: [{ type: 'square', square: 'c4' }], seat: 'them', topic: null }) as never);
    await ask('can they attack my bishop on c4?');
    expect(lastLineFor('game-chat')).not.toBeNull();
    // The model read it as a request to show a line — the worst case.
    setChatTurnReaderForTests(async () => ({ kind: 'command', referents: [], seat: null, topic: null, steps: [{ action: 'show-line', opening: null, side: null, account: null }] }) as never);
    const a = await dispatchCoachTurn({
      surface: 'game-chat', ask: 'Is there a forced mate for me now? How many moves? Show me.', origin: 'typed',
      liveState: { surface: 'game-chat', fen: BEFORE_QG7, whoseTurn: 'white', studentColor: 'white', moveHistory: [], currentRoute: '/coach/teach' },
    } as never, { maxToolRoundTrips: 1 });
    expect(a.text).toMatch(/Qg7#/);
    expect(a.text).not.toMatch(/^Playing the line out/);
    expect(a.autoWalk?.plies.map((p) => p.san)).toEqual(['Qg7#']);
  }, 60_000);
});

describe('hard walk 2026-10-11 — "was g4 best, or Qh2?"', () => {
  const H = 'd4 d5 Bf4 Nf6 e3 g6 Nc3 Bg7 h4 O-O h5 Nxh5 Rxh5 gxh5 Qxh5 e6 Bd3 f5 g4 Nd7'.split(' ');
  const NOW = 'r1bq1rk1/pppn2bp/4p3/3p1p1Q/3P1BP1/2NBP3/PPP2P2/R3K1N1 w Q - 1 11';
  it('compares Qh2 with g4 where g4 was played — never "Qh2 isn\'t in this game"', async () => {
    const { setBoardEngineForTests } = await import('./boardTurnAnswer');
    setBoardEngineForTests({
      analysis: async () => ({ topLines: [{ rank: 1, evaluation: 200, mate: null, moves: ['h5h2', 'd8f6'] }, { rank: 2, evaluation: -85, mate: null, moves: ['g2g4', 'b8d7'] }], evaluation: 200, isMate: false, mateIn: null, depth: 18, seldepth: 20, wdl: null }) as never,
      candidate: async () => ({ evalCp: 200, mateIn: null, lineUci: ['d8f6'] }),
    });
    setChatTurnReaderForTests(async () => ({ kind: 'retrospective-move', referents: [{ type: 'move', san: 'g4' }, { type: 'move', san: 'Qh2' }], seat: 'me', topic: null }) as never);
    const a = await dispatchCoachTurn({
      surface: 'game-chat', ask: 'Was g4 best? The engine might prefer Qh2 — explain the difference.', origin: 'typed',
      liveState: { surface: 'game-chat', fen: NOW, whoseTurn: 'white', studentColor: 'white', moveHistory: H, currentRoute: '/coach/teach' },
    } as never, { maxToolRoundTrips: 1 });
    expect(a.text).not.toMatch(/isn't in this game/);
    expect(a.servedIntent).toBe('board:compare-my-move');
    expect(a.text).toMatch(/^You played g4 there\./);
    setBoardEngineForTests(null);
  }, 60_000);
});

describe('re-walk 2026-10-11 — Q5, Q14, Q16', () => {
  const G = 'd4 d5 Bf4 Nf6 e3 g6 Nc3 Bg7 h4 O-O h5 Nxh5 Rxh5 gxh5 Qxh5 e6 Bd3 f5 g4 Nd7 gxf5 Nf6 Qh2 exf5 O-O-O Ne4 Bxc7 Qe8'.split(' ');
  const fenAt = (n: number): string => { const c = new Chess(); for (const m of G.slice(0, n)) c.move(m); return c.fen(); };
  const askAt = (q: string, n: number) => dispatchCoachTurn({
    surface: 'game-chat', ask: q, origin: 'typed',
    liveState: { surface: 'game-chat', fen: fenAt(n), whoseTurn: 'white', studentColor: 'white', moveHistory: G.slice(0, n), currentRoute: '/coach/teach' },
  } as never, { maxToolRoundTrips: 1 });
  it('Q5: the second half — the line — is answered too', async () => {
    const a = await askAt('Was h4 sound? What after Nh5, can g4 kick it?', 10);
    expect(a.text).toMatch(/After …Nh5 and g4/);
  }, 60_000);
  it('Q14: a played move is never "not legal here"', async () => {
    const a = await askAt('Was Bxc7 safe? What if Nxc3 first — calculate Nxc3 bxc3 Qxd5.', 28);
    expect(a.text).not.toMatch(/isn't legal/);
  }, 60_000);
  it('Q16: a question with "show the line" is answered, never an old replay', async () => {
    setChatTurnReaderForTests(async () => ({ kind: 'command', referents: [], seat: null, topic: null, steps: [{ action: 'show-line', opening: null, side: null, account: null }] }) as never);
    const a = await askAt('What does Rc8 threaten? Show the line if I ignore it with Be5.', 28);
    expect(a.text).not.toMatch(/^Playing the line out/);
  }, 60_000);
});
