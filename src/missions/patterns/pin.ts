/**
 * PATTERN · PIN — a bishop, rook or queen of the side pins an enemy piece.
 *
 * The test is the app's ONE pin test (`pinGeometry.isRealPin`), walked over
 * the side's sliders exactly as `tacticsDetector.findPins` walks them
 * (`lineGeometry.traceRay`, the first two pieces on each ray). The computer
 * that teaches a pin is the one that finds it here.
 *
 * PRESENT for `side` (whoever is to move — a pin is a standing constraint)
 * when one of its sliders has, along a line it moves on, two ENEMY pieces —
 * the FRONT one, then the one BEHIND — and all five of `isRealPin`'s clauses
 * hold:
 *   `worth-more`  — the piece behind is worth more than the front one (the
 *                   king counts as more than anything);
 *   `can-leave`   — the front piece has a move in its pattern that leaves the
 *                   line (a pawn pinned down its own file cannot, so it is
 *                   not pinned);
 *   `cannot-take` — the front piece cannot take the pinner at an even trade
 *                   or better;
 *   `not-hanging` — a relative pin (piece behind is not the king) on a front
 *                   piece nobody defends is a capture, not a pin;
 *   `bites`       — taking the piece behind wins: it is the king, or worth
 *                   more than the pinner, or undefended once the front piece
 *                   steps off; and the pinner is free to take it.
 *
 * NEAR MISSES: a ray with two enemy pieces where EXACTLY ONE of those five
 * clauses fails — named `no-<clause>` (`no-worth-more`, `no-can-leave`,
 * `no-cannot-take`, `no-not-hanging`, `no-bites`).
 */
import type { Chess, Color, PieceSymbol, Square } from 'chess.js';
import { canLeaveLine, isRealPin, pinBites } from '../../services/pinGeometry';
import { BISHOP_DIRS, ROOK_DIRS, traceRay } from '../../services/lineGeometry';
import { codes, load, other, pieces, VALUE, type PatternProbe } from './board';

export interface PinRay {
  chess: Chess;
  dir: [number, number];
  attacker: Square;
  pinned: Square;
  behind: Square;
  frontValue: number;
  behindValue: number;
}

const SLIDER_DIRS: Partial<Record<PieceSymbol, Array<[number, number]>>> = {
  b: BISHOP_DIRS,
  r: ROOK_DIRS,
  q: [...BISHOP_DIRS, ...ROOK_DIRS],
};

/** Every ray from one of `side`'s sliders whose first two pieces are enemies. */
export function candidateRays(fen: string, side: Color): PinRay[] {
  const chess = load(fen);
  if (!chess) return [];
  const enemy = other(side);
  const out: PinRay[] = [];
  for (const p of pieces(chess)) {
    if (p.color !== side) continue;
    const dirs = SLIDER_DIRS[p.type];
    if (!dirs) continue;
    for (const dir of dirs) {
      const ray = traceRay(chess, p.square, dir);
      if (ray.length < 2 || ray[0].color !== enemy || ray[1].color !== enemy) continue;
      out.push({
        chess, dir, attacker: p.square, pinned: ray[0].square, behind: ray[1].square,
        frontValue: VALUE[ray[0].type], behindValue: VALUE[ray[1].type],
      });
    }
  }
  return out;
}

/** `isRealPin`'s five clauses, each read on its own — the decomposition the
 *  near-miss names come from. `pin.test.ts` proves all five holding ⇔
 *  `isRealPin` on real boards. */
export function pinClauses(r: PinRay): Record<'worth-more' | 'can-leave' | 'cannot-take' | 'not-hanging' | 'bites', boolean> {
  const front = r.chess.get(r.pinned);
  const pinner = r.chess.get(r.attacker);
  const behind = r.chess.get(r.behind);
  const takesPinner = !!front && !!pinner
    && r.chess.attackers(r.attacker, front.color).includes(r.pinned)
    && VALUE[front.type] <= VALUE[pinner.type];
  const hangs = !!front && !!behind && behind.type !== 'k'
    && r.chess.attackers(r.pinned, front.color).length === 0;
  return {
    'worth-more': r.behindValue > r.frontValue,
    'can-leave': canLeaveLine(r.chess, r.pinned, r.dir),
    'cannot-take': !takesPinner,
    'not-hanging': !hangs,
    bites: pinBites(r.chess, r.attacker, r.pinned, r.behind),
  };
}

function present(fen: string, side: Color): boolean {
  return candidateRays(fen, side).some((r) => isRealPin(r));
}

function nearMisses(fen: string, side: Color): readonly string[] {
  const rays = candidateRays(fen, side);
  if (rays.some((r) => isRealPin(r))) return [];
  const out: string[] = [];
  for (const r of rays) {
    const failed = Object.entries(pinClauses(r)).filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length === 1) out.push(`no-${failed[0]}`);
  }
  return codes(out);
}

export const PIN: PatternProbe = {
  id: 'pin',
  present,
  nearMisses,
  nearMissCodes: ['no-bites', 'no-can-leave', 'no-cannot-take', 'no-not-hanging', 'no-worth-more'],
  failTwins: [
    '1nr3k1/r3qpp1/p3b2p/1Bpp4/8/Q3PN2/PP3PPP/2R2RK1 w - - 2 17',
    'r1bqkb1r/5ppp/p1p1pn2/3P4/4P3/3B4/PP3PPP/RNBQ1RK1 b kq - 0 9',
    'rnb2rk1/p1p1qpp1/1p5p/3p4/3P4/4PN2/PP3PPP/R2QKB1R w KQ - 0 11',
    'r1bqk2r/4bppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 b kq - 3 12',
    'rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9',
    'r1b1k2r/3qbppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 w kq - 4 13',
    'r2qk2r/pp1b1ppp/2n5/1B1N4/3b4/4P3/PP3PPP/R2QK2R w KQkq - 0 12',
    '3q3k/2r1r1pn/4P2p/p1p2R2/2Bp3P/1P4Q1/P5P1/5RK1 w - - 1 32',
    'r4rk1/4bppp/p3bn2/2Bp4/N7/3B4/PP3PPP/R3R1K1 b - - 4 16',
  ],
};
