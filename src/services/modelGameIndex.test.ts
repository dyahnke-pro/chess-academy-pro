import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';

const files = new Map<string, unknown>();
vi.mock('./dataFile', () => ({ loadDataJson: (p: string): Promise<unknown> => Promise.resolve(files.get(p) ?? null) }));

const { modelGamesForLine, recordToModelGame, recordToEndgamePlan, __resetModelGameIndex } = await import('./modelGameIndex');

// A real master win from The Week in Chess (Svidler–Navara, Cez Trophy 2012):
// a Ruy Lopez won in a rook ending that began at ply 67.
const SANS = 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 Nbd2 a6 Bxc6 bxc6 Re1 Re8 h3 Bb6 Nf1 h6 Ng3 Be6 Be3 Bxe3 Rxe3 c5 Qc2 Nd7 d4 cxd4 cxd4 exd4 Nxd4 a5 b3 Nc5 Rd1 Bd7 e5 dxe5 Nf3 Nb7 Nxe5 Nd6 a4 Be6 Qc3 Qg5 Nf3 Qd8 Nd4 Kh8 Nh5 Qg5 Nxe6 Rxe6 Rxe6 fxe6 Qxc7 Qxh5 Qxd6 Qe2 Qd3 Qxd3 Rxd3 Rc8 Re3 Rc1+ Kh2 Rc2 f3 Rc6 Re5 Ra6 Kg3 Kg8 Kf4 Kf7 Rb5 Kf6 h4 Ra8 g4 Ra7 Ke4 g5 hxg5+ hxg5 Kd4 Rd7+ Kc4 Ra7 b4 axb4 Kxb4 Ke7 Rxg5 Kd6 a5 Rf7 a6 Kc6 Ra5 Rf4+ Kc3 Rxf3+ Kd2';
const rec = { white: 'Svidler,P', black: 'Navara,D', wElo: 2741, bElo: 2706, event: 'Cez Trophy', year: 2012, result: '1-0' as const, sans: SANS, eg: { ply: 67, kind: 'rook' } };
const key = (n: number): string => { const c = new Chess(); for (const s of SANS.split(' ').slice(0, n)) c.move(s); return c.fen().split(' ').slice(0, 4).join(' '); };
function hash(k: string): string { let h = 0x811c9dc5; for (let i = 0; i < k.length; i += 1) { h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }

describe('modelGamesForLine', () => {
  beforeEach(() => { files.clear(); __resetModelGameIndex(); });

  it('meets the line at the deepest board the index holds for the student\'s side', async () => {
    const board = key(12);
    files.set('/data/model-games/meta.json', { gameFiles: 64 });
    files.set(`/data/model-games/index/${hash(board).slice(0, 2)}.json`, { [board]: { w: { wins: 412, game: 7, endings: [{ kind: 'rook', share: 22, game: 7 }] } } });
    files.set('/data/model-games/games/7.json', { 7: rec });
    const line = SANS.split(' ').slice(0, 16);
    const out = await modelGamesForLine(line, 'white', 'ruy-lopez');
    expect(out.modelGame?.white).toBe('Svidler,P');
    expect(out.modelGame?.studentSide).toBe('white');
    expect(out.modelGame?.overview).toMatch(/^Svidler \(2741\) beat Navara \(2706\) in 55 moves — the strongest win for White among the 412 master wins/);
    expect(out.endgames).toHaveLength(1);
    expect(out.endgames[0].id.endsWith('-endgame')).toBe(true);
    // Black's side: nothing in the index → nothing shown.
    expect((await modelGamesForLine(line, 'black', 'ruy-lopez')).modelGame).toBeNull();
  });
});

describe('recordToEndgamePlan', () => {
  it('starts on the board the ending began on (the game\'s own moves to it) and plays the ending out legally', () => {
    const plan = recordToEndgamePlan(7, rec, 'ruy-lopez', 'rook', 22)!;
    expect(plan.lineMoves).toEqual(SANS.split(' ').slice(0, 67));
    const c = new Chess(plan.criticalPositionFen);
    for (const s of plan.playableLines![0].moves) expect(() => c.move(s)).not.toThrow();
    expect(plan.overview).toBe('22% of the master wins from this line reached a rook ending. Svidler won this one (Cez Trophy 2012).');
  });

  it('no ending, no plan', () => {
    expect(recordToEndgamePlan(7, { ...rec, eg: null }, 'x', 'rook', 22)).toBeNull();
  });
});

describe('recordToModelGame', () => {
  it('carries the whole game as SAN the viewer replays', () => {
    const g = recordToModelGame(7, rec, 'ruy-lopez', 'white', 412);
    const c = new Chess();
    for (const s of g.pgn.split(' ')) expect(() => c.move(s)).not.toThrow();
    expect(g.id).toBe('computed-mg-7');
  });
});
