import { describe, expect, it } from 'vitest';
import { Chess, type Square } from 'chess.js';
import type { MissionGame } from '../missionCard';
import { IDLE, stepMission, type RunnerState, type Step } from '../missionRunner';
import { MISSIONS } from '../registry';
import library from '../scenarios/wrongRookPawn.json';
import {
  WRONG_ROOK_PAWN_BRIEFING,
  checkWrongRookPawn,
  cornerBoardAt,
  wrongRookPawnCorner,
  wrongRookPawnProgress,
  wrongRookPawnShowMove,
  type CornerBoard,
} from './wrongRookPawn';

const LIB = library as unknown as { w: CornerBoard[]; b: CornerBoard[] };
const W = LIB.w[0];
const B = LIB.b[0];

const sanOf = (fen: string, uci: string): string =>
  new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;

/** Plays UCI moves from `fen`, returning their SANs. */
function sansOf(fen: string, ucis: string[]): string[] {
  const b = new Chess(fen);
  return ucis.map((u) => b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
}

function game(startFen: string, sans: string[], opts: { color?: 'w' | 'b'; startPly?: number; forgiven?: number[] } = {}): MissionGame {
  return {
    sans,
    startFen,
    studentColor: opts.color ?? (startFen.split(' ')[1] as 'w' | 'b'),
    forgiven: new Set(opts.forgiven ?? []),
    startPly: opts.startPly ?? 0,
  };
}

/** The board after `ucis` from `fen`. */
function boardAfter(fen: string, ucis: string[]): Chess {
  const b = new Chess(fen);
  for (const u of ucis) b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  return b;
}

// Off-library boards, built and checked here with chess.js. A White h-pawn
// promotes on h8 — a DARK square — so a LIGHT bishop is the wrong one.
/** Black (the student) on g7, one step from h8; White Kf5, light bishop e4, pawn h5. */
const ONE_STEP = '8/6k1/8/5K1P/4B3/8/8/8 b - - 0 1';
/** The same board with the bishop on the DARK square e3 — the RIGHT bishop: no question posed. */
const RIGHT_BISHOP = '8/6k1/8/5K1P/8/4B3/8/8 b - - 0 1';
/** The student's king beside an unguarded pawn: taking it leaves king and bishop — bare material. */
const TAKES_PAWN = '8/8/8/8/2B4P/2K3k1/8/8 b - - 0 1';

describe('every fixture is a legal board', () => {
  it.each([ONE_STEP, RIGHT_BISHOP, TAKES_PAWN])('%s', (fen) => {
    const b = new Chess(fen);
    expect(b.isGameOver()).toBe(false);
    const them = b.turn() === 'w' ? 'b' : 'w';
    const king = b.board().flat().find((c) => c && c.type === 'k' && c.color === them);
    expect(king && b.isAttacked(king.square, b.turn())).toBe(false);
  });
});

describe('the board check — PASS', () => {
  it('1. the king onto the promotion square passes, on or off the library', () => {
    expect(checkWrongRookPawn(game(ONE_STEP, ['Kh8']))).toEqual({ state: 'pass', ply: 0 });
  });

  it('2. on every library board: the corner-ward first move, ANY coach reply, then the step into the corner passes', () => {
    let reached = 0;
    for (const row of [...LIB.w, ...LIB.b]) {
      const corner = wrongRookPawnCorner(new Chess(row.fen), row.fen.split(' ')[1] as 'w' | 'b') as Square;
      const m1 = row.draws[0];
      for (const r of Object.keys(row.tree[m1] ?? {})) {
        const b2 = boardAfter(row.fen, [m1, r]);
        const step = b2.moves({ verbose: true }).find((m) => m.piece === 'k' && m.to === corner);
        if (!step) continue;
        reached++;
        expect(checkWrongRookPawn(game(row.fen, sansOf(row.fen, [m1, r, `${step.from}${step.to}`]))), `${row.fen} ${m1} ${r}`).toEqual({ state: 'pass', ply: 2 });
      }
    }
    expect(reached).toBeGreaterThan(0);
  });
});

describe('the board check — MISS', () => {
  it('3. the natural wrong move at the first decision → MISS, showing the drawing move nearest the corner', () => {
    for (const row of [W, B]) {
      expect(checkWrongRookPawn(game(row.fen, [sanOf(row.fen, row.wrong)]))).toEqual({
        state: 'miss', ply: 0, reason: 'lost-the-corner-race',
        showMove: { from: row.draws[0].slice(0, 2), to: row.draws[0].slice(2, 4) },
      });
    }
  });

  it('4. every losing move at every second decision the library holds → MISS at that ply', () => {
    let misses = 0;
    for (const row of [W, B]) {
      for (const [m1, branch] of Object.entries(row.tree)) {
        for (const [r, d2] of Object.entries(branch)) {
          const b2 = boardAfter(row.fen, [m1, r]);
          for (const m of b2.moves({ verbose: true })) {
            const u = `${m.from}${m.to}`;
            if (d2.includes(u)) continue;
            misses++;
            const status = checkWrongRookPawn(game(row.fen, sansOf(row.fen, [m1, r, u])));
            expect(status, `${row.fen} ${m1} ${r} ${u}`).toMatchObject({ state: 'miss', ply: 2, reason: 'lost-the-corner-race' });
          }
        }
      }
    }
    expect(misses).toBeGreaterThan(0);
  });

  it('5. a drawing first move is never a miss', () => {
    for (const row of [...LIB.w, ...LIB.b]) {
      for (const u of row.draws) expect(checkWrongRookPawn(game(row.fen, [sanOf(row.fen, u)])).state, `${row.fen} ${u}`).toBe('pending');
    }
  });
});

describe('FAIL TWINS — looks like the pattern, one condition missing, never a pass', () => {
  it('6. the same step into the corner with the RIGHT bishop poses nothing: no pass', () => {
    expect(wrongRookPawnCorner(new Chess(RIGHT_BISHOP), 'b')).toBeNull();
    expect(sanOf(RIGHT_BISHOP, 'g7h8')).toBe('Kh8');
    expect(checkWrongRookPawn(game(RIGHT_BISHOP, ['Kh8']))).toEqual({ state: 'pending' });
  });

  it('7. a step NEXT TO the corner is no pass', () => {
    expect(checkWrongRookPawn(game(ONE_STEP, ['Kg8']))).toEqual({ state: 'pending' });
    expect(checkWrongRookPawn(game(ONE_STEP, ['Kh7']))).toEqual({ state: 'pending' });
  });

  it('8. the student with a piece of their own (not a bare king) poses nothing', () => {
    const withKnight = '8/6k1/8/5K1P/4B3/8/8/n7 b - - 0 1';
    expect(wrongRookPawnCorner(new Chess(withKnight), 'b')).toBeNull();
    expect(checkWrongRookPawn(game(withKnight, ['Kh8']))).toEqual({ state: 'pending' });
  });

  it('9. off the library no move but the corner is judged — the check cannot know the result there', () => {
    // Kf6 walks away from the corner; no verdict is held for this board.
    expect(cornerBoardAt(ONE_STEP)).toBeNull();
    expect(checkWrongRookPawn(game(ONE_STEP, ['Kf8']))).toEqual({ state: 'pending' });
  });
});

describe('the board check — the edges', () => {
  it('10. a miss played on from is walked past; the corner still passes after it', () => {
    const wrong = sanOf(W.fen, W.wrong);
    expect(checkWrongRookPawn(game(W.fen, [wrong], { forgiven: [0] }))).toEqual({ state: 'pending' });
    expect(checkWrongRookPawn(game(ONE_STEP, ['Kf8', 'Kf6', 'Kg8', 'Ke7', 'Kh8'], { forgiven: [0] }))).toEqual({ state: 'pass', ply: 4 });
  });

  it('11. taking their pawn draws on the spot — incomplete: the draw held, the corner was not shown', () => {
    expect(checkWrongRookPawn(game(TAKES_PAWN, ['Kxh4']))).toEqual({ state: 'incomplete', ply: 0 });
  });

  it('12. no ply before the card went live is judged; the coach\'s moves are never judged', () => {
    expect(checkWrongRookPawn(game(W.fen, [sanOf(W.fen, W.wrong)], { startPly: 1 }))).toEqual({ state: 'pending' });
    expect(checkWrongRookPawn(game(ONE_STEP, ['Kh8'], { color: 'w' }))).toEqual({ state: 'pending' });
  });

  it('13. the banner counts the king\'s steps to the corner, never a move', () => {
    expect(wrongRookPawnProgress({ sans: [], studentColor: 'w', forgiven: new Set(), startPly: 0 })).toBe('Get your king to the corner');
    expect(wrongRookPawnProgress(game(ONE_STEP, []))).toBe('The corner: 1 step away');
    expect(wrongRookPawnProgress(game(ONE_STEP, ['Kh8']))).toBe('In the corner');
    const d = Math.max(...[W].map((r) => {
      const b = new Chess(r.fen);
      const k = b.board().flat().find((c) => c && c.type === 'k' && c.color === b.turn())!.square;
      const corner = wrongRookPawnCorner(b, b.turn())!;
      return Math.max(Math.abs(k.charCodeAt(0) - corner.charCodeAt(0)), Math.abs(Number(k[1]) - Number(corner[1])));
    }));
    expect(wrongRookPawnProgress(game(W.fen, []))).toBe(`The corner: ${d} steps away`);
  });

  it('14. the card\'s shown move: the drawing move nearest the corner, the engine\'s pick among ties; null off the library', () => {
    expect(wrongRookPawnShowMove(W.fen, 'w', [])).toEqual({ from: W.draws[0].slice(0, 2), to: W.draws[0].slice(2, 4) });
    const m1 = W.draws[0];
    const r = Object.keys(W.tree[m1])[0];
    const fen2 = boardAfter(W.fen, [m1, r]).fen();
    const shown = wrongRookPawnShowMove(fen2, 'w', []);
    expect(shown).not.toBeNull();
    expect(W.tree[m1][r]).toContain(`${shown!.from}${shown!.to}`);
    expect(wrongRookPawnShowMove(ONE_STEP, 'b', [])).toBeNull();
  });
});

describe('the briefing is true on the board', () => {
  it('the demo starts on a library board with its corner-ward move and ends with the king in the corner — a pass', () => {
    const start = cornerBoardAt(WRONG_ROOK_PAWN_BRIEFING.demoFen);
    expect(start).not.toBeNull();
    expect(sanOf(WRONG_ROOK_PAWN_BRIEFING.demoFen, start!.draws[0])).toBe(WRONG_ROOK_PAWN_BRIEFING.demoSans[0]);
    const status = checkWrongRookPawn(game(WRONG_ROOK_PAWN_BRIEFING.demoFen, [...WRONG_ROOK_PAWN_BRIEFING.demoSans]));
    expect(status).toEqual({ state: 'pass', ply: WRONG_ROOK_PAWN_BRIEFING.demoSans.length - 1 });
  });

  it('the try is a library board; its answers are exactly its drawing moves', () => {
    const board = cornerBoardAt(WRONG_ROOK_PAWN_BRIEFING.tryFen);
    expect(board).not.toBeNull();
    expect([...WRONG_ROOK_PAWN_BRIEFING.tryAnswersUci].sort()).toEqual([...board!.draws].sort());
    expect(WRONG_ROOK_PAWN_BRIEFING.tryFen).not.toBe(WRONG_ROOK_PAWN_BRIEFING.demoFen);
  });
});

describe('the runner plays the card', () => {
  const CARD = MISSIONS['wrong-rook-pawn'];
  const loaded = (fen: string): RunnerState => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD] });
    expect(s0.effects).toEqual([
      { kind: 'briefing', card: CARD },
      { kind: 'load-position', scenarioId: 'wrong-rook-pawn', card: CARD },
      { kind: 'say', line: 'announce', text: CARD.announce },
    ]);
    return stepMission(s0.state, { kind: 'scenario-loaded', fen }).state;
  };
  const moved = (s: RunnerState, fenBefore: string, sans: string[], color: 'w' | 'b', candidatesUci: string[] = []): Step =>
    stepMission(s, { kind: 'moved', game: { sans, studentColor: color }, fenBefore, candidatesUci });

  it('the card is the Level 22 endgame mission', () => {
    expect(CARD).toMatchObject({
      level: 22, phase: 'endgame', classification: 'live', arrivalBar: 0.95, skill: 'endgames',
      checkModule: 'wrongRookPawn', scenario: { providerId: 'wrong-rook-pawn' }, foundAt: null, unlock: { after: [] },
    });
  });

  it('the wrong move pauses with the fixed phrase; a second time shows the corner-ward move and plays on', () => {
    const colour = W.fen.split(' ')[1] as 'w' | 'b';
    const wrong = [sanOf(W.fen, W.wrong)];
    const miss = moved(loaded(W.fen), W.fen, wrong, colour);
    expect(miss.state).toMatchObject({ phase: 'paused', pause: { ply: 0, reason: 'lost-the-corner-race' } });
    expect(miss.effects).toEqual([{ kind: 'say', line: 'miss', text: CARD.missPhrase }, { kind: 'hold' }]);
    const s = stepMission(miss.state, { kind: 'try-again' }).state;
    const again = moved(s, W.fen, wrong, colour);
    expect(again.effects).toEqual([
      { kind: 'say', line: 'miss', text: CARD.missPhrase },
      { kind: 'show', move: { from: W.draws[0].slice(0, 2), to: W.draws[0].slice(2, 4) } },
      { kind: 'record', card: CARD, outcome: 'miss-shown', missPly: 0, reason: 'lost-the-corner-race', scenario: true },
      { kind: 'reply' },
    ]);
  });

  it('the race won clean is a first-try pass, recorded as a scenario phase', () => {
    for (const row of [...LIB.w, ...LIB.b]) {
      const colour = row.fen.split(' ')[1] as 'w' | 'b';
      const corner = wrongRookPawnCorner(new Chess(row.fen), colour) as Square;
      const m1 = row.draws[0];
      const r = Object.keys(row.tree[m1] ?? {}).find((reply) => boardAfter(row.fen, [m1, reply]).moves({ verbose: true }).some((m) => m.piece === 'k' && m.to === corner));
      if (!r) continue;
      const b2 = boardAfter(row.fen, [m1, r]);
      const step = b2.moves({ verbose: true }).find((m) => m.piece === 'k' && m.to === corner)!;
      let s = loaded(row.fen);
      const first = moved(s, row.fen, sansOf(row.fen, [m1]), colour);
      expect(first.effects).toEqual([{ kind: 'reply' }]);
      s = first.state;
      const last = moved(s, b2.fen(), sansOf(row.fen, [m1, r, `${step.from}${step.to}`]), colour);
      expect(last.state).toMatchObject({ outcome: 'pass-first-try', resolvedAtPly: 2 });
      expect(last.effects).toContainEqual({ kind: 'say', line: 'pass', text: CARD.passLine });
      expect(last.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'pass-first-try', scenario: true });
      return;
    }
    throw new Error('no library board reaches the corner on its second move');
  });
});
