import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import type { MissionGame } from '../missionCard';
import { IDLE, stepMission, type RunnerState, type Step } from '../missionRunner';
import { MISSIONS } from '../registry';
import library from '../scenarios/rookCutOff.json';
import {
  ROOK_CUT_OFF_BRIEFING,
  checkRookCutOff,
  cutBoardAt,
  kingCutOff,
  rookCutOffProgress,
  rookCutOffShowMove,
} from './rookCutOff';

const W = library.w[0];
const B = library.b[0];

const sanOf = (fen: string, uci: string): string => {
  const b = new Chess(fen);
  return b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
};

function game(startFen: string, sans: string[], opts: { color?: 'w' | 'b'; startPly?: number; forgiven?: number[] } = {}): MissionGame {
  return {
    sans,
    startFen,
    studentColor: opts.color ?? (startFen.split(' ')[1] as 'w' | 'b'),
    forgiven: new Set(opts.forgiven ?? []),
    startPly: opts.startPly ?? 0,
  };
}

/** A legal king move of the student's on `fen` (a move that is neither the cut nor the push). */
function kingMove(fen: string): string {
  const b = new Chess(fen);
  const m = b.moves({ verbose: true }).find((mv) => mv.piece === 'k');
  if (!m) throw new Error(`no king move on ${fen}`);
  return m.san;
}

/** A rook move that lands on a file NEXT TO the winning cut's file but not between king and pawn —
 *  it looks like the cut and is not. Null when the board has none. */
function nearMissRookMove(fen: string, cutUci: string): string | null {
  const b = new Chess(fen);
  const cutFile = cutUci.charCodeAt(2);
  for (const m of b.moves({ verbose: true })) {
    if (m.piece !== 'r' || m.captured) continue;
    const after = new Chess(fen); after.move(m);
    if (Math.abs(m.to.charCodeAt(0) - cutFile) === 1 && !kingCutOff(after, b.turn())) return m.san;
  }
  return null;
}

describe('the board check — PASS', () => {
  it('1. the winning cut from a library board passes, either colour', () => {
    expect(checkRookCutOff(game(W.fen, [sanOf(W.fen, W.wins[0])]))).toEqual({ state: 'pass', ply: 0 });
    expect(checkRookCutOff(game(B.fen, [sanOf(B.fen, B.wins[0])]))).toEqual({ state: 'pass', ply: 0 });
  });

  it('2. every winning cut of every library board passes', () => {
    for (const row of [...library.w, ...library.b]) {
      for (const uci of row.wins) {
        expect(checkRookCutOff(game(row.fen, [sanOf(row.fen, uci)])).state, `${row.fen} ${uci}`).toBe('pass');
      }
    }
  });
});

describe('the board check — MISS', () => {
  it('3. pushing the pawn first → MISS pushed-before-the-cut', () => {
    expect(checkRookCutOff(game(W.fen, [sanOf(W.fen, W.push)]))).toEqual({ state: 'miss', ply: 0, reason: 'pushed-before-the-cut' });
    expect(checkRookCutOff(game(B.fen, [sanOf(B.fen, B.push)]))).toEqual({ state: 'miss', ply: 0, reason: 'pushed-before-the-cut' });
  });

  it('4. a king move instead of the cut → MISS king-not-cut-off', () => {
    expect(checkRookCutOff(game(W.fen, [kingMove(W.fen)]))).toEqual({ state: 'miss', ply: 0, reason: 'king-not-cut-off' });
    expect(checkRookCutOff(game(B.fen, [kingMove(B.fen)]))).toEqual({ state: 'miss', ply: 0, reason: 'king-not-cut-off' });
  });
});

describe('FAIL TWINS — looks like the pattern, one condition missing, never a pass', () => {
  it('5. a rook move one file beside the cut (the king still not cut off) is a miss, not a pass', () => {
    let found = 0;
    for (const row of [...library.w, ...library.b]) {
      const near = nearMissRookMove(row.fen, row.wins[0]);
      if (!near) continue;
      found++;
      expect(checkRookCutOff(game(row.fen, [near])), `${row.fen} ${near}`).toEqual({ state: 'miss', ply: 0, reason: 'king-not-cut-off' });
    }
    expect(found).toBeGreaterThan(0);
  });

  it('6. the same cut on a board the library does not hold (their rook a file over) is no pass — the check cannot know the result there', () => {
    const b = new Chess(W.fen);
    const theirRook = b.board().flat().find((c) => c && c.type === 'r' && c.color !== b.turn());
    expect(theirRook).toBeTruthy();
    // Move their rook to another empty square that keeps the board legal.
    let twin: string | null = null;
    for (let f = 0; f < 8 && !twin; f++) for (let r = 1; r <= 8 && !twin; r++) {
      const sq = `${'abcdefgh'[f]}${r}` as Parameters<Chess['get']>[0];
      if (b.get(sq)) continue;
      const t = new Chess(W.fen);
      t.remove(theirRook!.square);
      t.put({ type: 'r', color: theirRook!.color }, sq);
      const fen = t.fen();
      try {
        const c = new Chess(fen);
        if (c.isGameOver() || cutBoardAt(fen)) continue;
        c.move({ from: W.wins[0].slice(0, 2), to: W.wins[0].slice(2, 4) });
        twin = fen;
      } catch { /* not legal there */ }
    }
    expect(twin).not.toBeNull();
    expect(checkRookCutOff(game(twin!, [sanOf(twin!, W.wins[0])]))).toEqual({ state: 'pending' });
  });

  it('7. a live game from the standard start is never judged (no library board)', () => {
    expect(checkRookCutOff({ sans: ['e4', 'e5', 'Nf3'], studentColor: 'w', forgiven: new Set(), startPly: 0 })).toEqual({ state: 'pending' });
  });
});

describe('the board check — the edges', () => {
  it('8. the decision played on from ends the card incomplete', () => {
    expect(checkRookCutOff(game(W.fen, [sanOf(W.fen, W.push)], { forgiven: [0] }))).toEqual({ state: 'incomplete', ply: 0 });
  });

  it('9. no ply before the card went live is judged; the coach\'s moves are never judged', () => {
    expect(checkRookCutOff(game(W.fen, [sanOf(W.fen, W.push)], { startPly: 1 }))).toEqual({ state: 'pending' });
    // The same board, but the student plays the other colour: the move is the coach's.
    expect(checkRookCutOff(game(W.fen, [sanOf(W.fen, W.push)], { color: 'b' }))).toEqual({ state: 'pending' });
  });

  it('10. the shown move: the engine\'s candidate among the cuts, else the tablebase\'s best; null off the library', () => {
    const best = { from: W.wins[0].slice(0, 2), to: W.wins[0].slice(2, 4) };
    expect(rookCutOffShowMove(W.fen, 'w', [])).toEqual(best);
    expect(rookCutOffShowMove(W.fen, 'w', [W.push, ...W.wins.slice().reverse()])).toEqual({
      from: W.wins[W.wins.length - 1].slice(0, 2), to: W.wins[W.wins.length - 1].slice(2, 4),
    });
    expect(rookCutOffShowMove('8/8/8/8/8/8/8/K6k w - - 0 1', 'w', [])).toBeNull();
  });

  it('11. the banner reads whether their king is cut off, never a move', () => {
    expect(rookCutOffProgress({ sans: [], studentColor: 'w', forgiven: new Set(), startPly: 0 })).toBe('Cut their king off, then push');
    expect(rookCutOffProgress(game(W.fen, []))).toBe('Their king: not cut off yet');
    expect(rookCutOffProgress(game(W.fen, [sanOf(W.fen, W.wins[0])]))).toBe('Their king: cut off');
  });
});

describe('the briefing is true on the board', () => {
  it('the demo is legal, opens with a winning cut, and pushes the pawn after it', () => {
    const b = new Chess(ROOK_CUT_OFF_BRIEFING.demoFen);
    expect(cutBoardAt(ROOK_CUT_OFF_BRIEFING.demoFen)).not.toBeNull();
    expect(checkRookCutOff(game(ROOK_CUT_OFF_BRIEFING.demoFen, [ROOK_CUT_OFF_BRIEFING.demoSans[0]]))).toEqual({ state: 'pass', ply: 0 });
    const me = b.turn();
    let pushed = false;
    for (const san of ROOK_CUT_OFF_BRIEFING.demoSans) {
      const m = b.move(san);
      if (m.color === me && m.piece === 'p') pushed = true;
    }
    expect(pushed).toBe(true);
    expect(b.isGameOver()).toBe(false);
  });

  it('the try is a library board; its answers are exactly that board\'s winning cuts', () => {
    const board = cutBoardAt(ROOK_CUT_OFF_BRIEFING.tryFen);
    expect(board).not.toBeNull();
    expect([...ROOK_CUT_OFF_BRIEFING.tryAnswersUci].sort()).toEqual([...board!.wins].sort());
    expect(ROOK_CUT_OFF_BRIEFING.tryFen).not.toBe(ROOK_CUT_OFF_BRIEFING.demoFen);
  });
});

describe('the runner plays the card', () => {
  const CARD = MISSIONS['rook-cut-off'];
  const loaded = (fen: string): RunnerState => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD] });
    expect(s0.effects).toEqual([
      { kind: 'briefing', card: CARD },
      { kind: 'load-position', scenarioId: 'rook-cut-off', card: CARD },
      { kind: 'say', line: 'announce', text: CARD.announce },
    ]);
    return stepMission(s0.state, { kind: 'scenario-loaded', fen }).state;
  };
  const moved = (s: RunnerState, fen: string, sans: string[], candidatesUci: string[] = []): Step =>
    stepMission(s, { kind: 'moved', game: { sans, studentColor: fen.split(' ')[1] as 'w' | 'b' }, fenBefore: fen, candidatesUci });

  it('the card is the Level 24 endgame mission', () => {
    expect(CARD).toMatchObject({
      level: 24, phase: 'endgame', classification: 'live', arrivalBar: 0.95, skill: 'endgames',
      checkModule: 'rookCutOff', scenario: { providerId: 'rook-cut-off' }, found: null, unlock: { after: [] },
    });
  });

  it('the push pauses with the fixed phrase; "Try again" undoes it; the cut is a retry pass', () => {
    const miss = moved(loaded(W.fen), W.fen, [sanOf(W.fen, W.push)]);
    expect(miss.state).toMatchObject({ phase: 'paused', pause: { ply: 0, reason: 'pushed-before-the-cut' } });
    expect(miss.effects).toEqual([{ kind: 'say', line: 'miss', text: CARD.missPhraseFor?.['pushed-before-the-cut'] }, { kind: 'hold' }]);
    const undo = stepMission(miss.state, { kind: 'try-again' });
    const pass = moved(undo.state, W.fen, [sanOf(W.fen, W.wins[0])]);
    expect(pass.state).toMatchObject({ phase: 'resolved', outcome: 'pass-retry' });
    expect(pass.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'pass-retry', scenario: true });
  });

  it('a second miss at the same decision shows the cut and plays on — miss-shown', () => {
    let s = moved(loaded(B.fen), B.fen, [kingMove(B.fen)]).state;
    s = stepMission(s, { kind: 'try-again' }).state;
    const again = moved(s, B.fen, [kingMove(B.fen)], [B.push, B.wins[0]]);
    expect(again.effects).toEqual([
      { kind: 'say', line: 'miss', text: CARD.missPhraseFor?.['king-not-cut-off'] },
      { kind: 'show', move: { from: B.wins[0].slice(0, 2), to: B.wins[0].slice(2, 4) } },
      { kind: 'record', card: CARD, outcome: 'miss-shown', missPly: 0, reason: 'king-not-cut-off', scenario: true },
      { kind: 'reply' },
    ]);
  });

  it('the cut first time is a first-try pass, recorded as a scenario phase', () => {
    const pass = moved(loaded(W.fen), W.fen, [sanOf(W.fen, W.wins[0])]);
    expect(pass.state).toMatchObject({ outcome: 'pass-first-try', resolvedAtPly: 0 });
    expect(pass.effects).toContainEqual({ kind: 'say', line: 'pass', text: CARD.passLine });
    expect(pass.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'pass-first-try', scenario: true });
  });
});
