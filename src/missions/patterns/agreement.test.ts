/**
 * ONE VOCABULARY — the pattern checks agree with the app's own detectors on
 * real boards (every board of the first master games in `model-games.json`,
 * played by chess.js). The knight fork restates `tacticsDetector.findForks`
 * (private, and too slow to run per knight move); the pin walks
 * `pinGeometry.isRealPin` the way `findPins` does. If either side drifts, this
 * fails — the same computer must teach the pattern and catch it.
 */
import { describe, expect, it } from 'vitest';
import { Chess, type Color } from 'chess.js';
import modelGames from '../../data/model-games.json';
import { detectTactics } from '../../services/tacticsDetector';
import { isRealPin } from '../../services/pinGeometry';
import { knightJumps, VALUE } from './board';
import { readKnightFork } from './knight-fork';
import { candidateRays, pinClauses, PIN } from './pin';

function realBoards(games: number): Array<{ fen: string; turn: Color }> {
  const out: Array<{ fen: string; turn: Color }> = [];
  for (const g of (modelGames as Array<{ pgn: string }>).slice(0, games)) {
    const c = new Chess();
    for (const san of g.pgn.split(/\s+/).filter(Boolean)) {
      try { c.move(san); } catch { break; }
      out.push({ fen: c.fen(), turn: c.turn() });
    }
  }
  return out;
}

describe('pattern checks agree with the detectors that teach them', () => {
  it('knight fork: the restated rule and tacticsDetector.findForks say the same on every gated knight move', () => {
    let compared = 0;
    let forks = 0;
    for (const { fen, turn } of realBoards(10)) {
      const board = new Chess(fen);
      for (const m of board.moves({ verbose: true })) {
        if (m.piece !== 'n') continue;
        const hits = knightJumps(m.to).filter((sq) => {
          const at = board.get(sq);
          return !!at && at.color !== turn && VALUE[at.type] >= 3;
        }).length;
        if (hits < 2) continue;
        board.move(m);
        const after = board.fen();
        board.undo();
        const read = readKnightFork(after, m.to, turn);
        const mine = !!read && read.targets.length >= 2 && read.winnable >= 2 && read.safe;
        const theirs = detectTactics(after).tactics
          .some((t) => t.type === 'fork' && t.beneficiary === turn && t.involvedSquares[0] === m.to);
        expect(mine, `${after} ${m.san}`).toBe(theirs);
        compared += 1;
        if (mine) forks += 1;
      }
    }
    // Non-vacuous: real comparisons, and both verdicts occur.
    expect(compared).toBeGreaterThan(20);
    expect(forks).toBeGreaterThan(0);
    expect(forks).toBeLessThan(compared);
  }, 120_000);

  it('pin: present ⇔ tacticsDetector.findPins finds a pin for that side', () => {
    let pins = 0;
    const boards = realBoards(2);
    for (const { fen } of boards) {
      const found = detectTactics(fen).tactics.filter((t) => t.type === 'pin');
      for (const side of ['w', 'b'] as const) {
        const theirs = found.some((t) => t.beneficiary === side);
        expect(PIN.present(fen, side), `${fen} ${side}`).toBe(theirs);
        if (theirs) pins += 1;
      }
    }
    expect(pins).toBeGreaterThan(0);
    expect(pins).toBeLessThan(boards.length * 2);
  }, 60_000);

  it("pin: the five clauses all holding is exactly isRealPin, ray by ray", () => {
    let rays = 0;
    let real = 0;
    for (const { fen } of realBoards(20)) {
      for (const side of ['w', 'b'] as const) {
        for (const r of candidateRays(fen, side)) {
          const all = Object.values(pinClauses(r)).every(Boolean);
          expect(all, `${fen} ${r.attacker}-${r.pinned}-${r.behind}`).toBe(isRealPin(r));
          rays += 1;
          if (all) real += 1;
        }
      }
    }
    expect(rays).toBeGreaterThan(100);
    expect(real).toBeGreaterThan(0);
    expect(real).toBeLessThan(rays);
  }, 30_000);
});
