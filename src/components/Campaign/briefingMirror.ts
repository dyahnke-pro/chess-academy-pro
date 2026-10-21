/**
 * A briefing faces the student (WO-CAMPAIGN-MASTER, Lane C): one written for
 * the other colour is mirrored — the board flipped, the colours swapped, and
 * every move re-derived on the mirrored board by chess.js — so the try is
 * always the student's own move.
 */
import { Chess } from 'chess.js';
import type { MissionBriefing } from '../../missions/missionCard';

const mirrorSquare = (sq: string): string => `${sq[0]}${9 - Number(sq[1])}`;

/** The same position seen from the other side: ranks flipped, colours swapped. */
export function mirrorFen(fen: string): string {
  const [board, turn, castling, ep, ...rest] = fen.split(' ');
  const swapCase = (c: string): string => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
  const rows = board.split('/').reverse().map((r) => r.replace(/[a-z]/gi, swapCase));
  const cast = castling === '-' ? '-' : castling.replace(/[a-z]/gi, swapCase).replace(/^([kq]*)([KQ]*)$/, '$2$1');
  return [rows.join('/'), turn === 'w' ? 'b' : 'w', cast, ep === '-' ? '-' : mirrorSquare(ep), ...rest].join(' ');
}

/** The briefing for the student's colour: mirrored when its try is the other
 *  side's move. Every move is re-derived on the mirrored board by chess.js. */
export function briefingFor(b: MissionBriefing, student: 'w' | 'b'): MissionBriefing {
  if (new Chess(b.tryFen).turn() === student) return b;
  const demo = new Chess(b.demoFen);
  const mirrored = new Chess(mirrorFen(b.demoFen));
  const demoSans: string[] = [];
  for (const san of b.demoSans) {
    const m = demo.move(san);
    demoSans.push(mirrored.move({ from: mirrorSquare(m.from), to: mirrorSquare(m.to), ...(m.promotion ? { promotion: m.promotion } : {}) }).san);
  }
  const mirrorUci = (u: string): string => `${mirrorSquare(u.slice(0, 2))}${mirrorSquare(u.slice(2, 4))}${u.slice(4)}`;
  return { ...b, demoFen: mirrorFen(b.demoFen), demoSans, tryFen: mirrorFen(b.tryFen), tryAnswersUci: b.tryAnswersUci.map(mirrorUci) };
}
