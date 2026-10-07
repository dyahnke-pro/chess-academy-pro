// queenGrabTrap — CHECK THE QUEEN'S EXITS BEFORE YOU GRAB (teach-brief §3; the
// poisoned-pawn family: Qxb2 Rb1, the queen walled in on b2).
//
// A capture by the queen that LOOKS free — the piece it takes is not defended
// enough to win it back — but after one reply the queen stands attacked with
// no safe square (`trappedOnBoard`, the same board fact review's trap lane
// reads). DUAL-USE: Learn warns before the grab; a review can name the grab
// that walked into it.
//
// It states the BOARD FACT ("after Rb1 your queen has no safe square"), never
// the outcome ("you lose the queen") — that needs a line that actually takes
// it (WO-OUTCOME-01), which a pre-move warning does not have.
// PURE: chess.js + the existing trap and SEE computers.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { trappedOnBoard } from './reviewTeachingPoints';
import { legalSeeGainFor } from './positionReadingService';
import { withProof, type Proof, type ProofSize } from './proof';
import { PIECE_NAMES } from '../types/tacticTypes';

export interface QueenGrabTrap {
  /** The tempting capture. */
  san: string;
  from: Square;
  to: Square;
  captured: PieceSymbol;
  /** The reply that leaves the queen with no safe square. */
  replySan: string;
  replyFrom: Square;
  replyTo: Square;
  /** The proof: every square the queen could run to after the reply, and the
   *  pieces that cover them (exact — read off the board, not an engine). */
  exits: Square[];
  coverers: { piece: PieceSymbol; square: Square }[];
}

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

/** Every queen grab for the side to move that looks free and walks into a
 *  trap; [] when none. */
export function findQueenGrabTraps(fen: string): QueenGrabTrap[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const me: Color = chess.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const out: QueenGrabTrap[] = [];
  for (const m of chess.moves({ verbose: true })) {
    if (m.piece !== 'q' || !m.captured || m.captured === 'q') continue;
    // It must LOOK free: taking it does not lose material on the spot.
    if (legalSeeGainFor(fen, m.to, me) <= 0) continue;
    const after = new Chess(fen);
    after.move(m);
    for (const r of after.moves({ verbose: true })) {
      if (r.captured) continue;   // a capture back is the exchange, not the trap
      after.move(r);
      // A trap needs the queen attacked; most replies are not, and the full
      // flight count is the expensive part.
      const trapped = after.isAttacked(m.to, them) && trappedOnBoard(after.fen(), me);
      after.undo();
      if (trapped && trapped.square === m.to) {
        after.move(r);
        const { exits, coverers } = queenExits(after, m.to, me);
        after.undo();
        out.push({ san: m.san, from: m.from, to: m.to, captured: m.captured, replySan: r.san, replyFrom: r.from, replyTo: r.to, exits, coverers });
        break;
      }
    }
  }
  return out;
}

/** The queen's flight squares on `chess` (the queen's side given the move)
 *  and the enemy pieces that cover them. */
function queenExits(chess: Chess, sq: Square, me: Color): { exits: Square[]; coverers: { piece: PieceSymbol; square: Square }[] } {
  const parts = chess.fen().split(' ');
  parts[1] = me; parts[3] = '-';
  let probe: Chess;
  try { probe = new Chess(parts.join(' ')); } catch { return { exits: [], coverers: [] }; }
  const them: Color = me === 'w' ? 'b' : 'w';
  const exits = [...new Set(probe.moves({ square: sq, verbose: true }).map((m) => m.to))];
  const seen = new Set<string>();
  const coverers: { piece: PieceSymbol; square: Square }[] = [];
  for (const e of exits) {
    for (const a of probe.attackers(e, them)) {
      const p = probe.get(a);
      if (p && !seen.has(a)) { seen.add(a); coverers.push({ piece: p.type, square: a }); }
    }
  }
  return { exits, coverers };
}

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'];

/**
 * The proof (proof.ts). THE VOICE SAYS ITS SHAPE, THE BOARD SHOWS ITS DETAIL:
 * the attacker and the count of the queen's squares are spoken; every exit
 * and every piece guarding one is MARKED (a ten-square list read aloud is a
 * firehose — the first backfire of the proof rule, 2026-10-07). Exact: the
 * flights are read off the board, the same test `trappedOnBoard` passed.
 */
export function queenGrabTrapProof(t: QueenGrabTrap): Proof {
  const n = t.exits.length;
  const full = n === 0
    ? `${t.replySan} attacks it there, and it has no move at all.`
    : `${t.replySan} attacks it there, and ${n === 1 ? 'its one square is' : `every one of its ${COUNT[n] ?? 'many'} squares is`} guarded or loses it in a trade.`;
  return {
    kind: 'squares', exact: true,
    short: n === 0 ? 'It has no move at all.' : 'Every square it could run to is guarded.',
    full,
    squares: [...t.exits, ...t.coverers.map((c) => c.square)],
  };
}

/** The warning, said to the student before they grab — with its proof. */
export function queenGrabTrapLine(t: QueenGrabTrap, size: ProofSize = 'full'): string {
  return withProof(`Their ${NAME[t.captured]} on ${t.to} looks free, but after ${t.san} they answer ${t.replySan} and your queen has no safe square`, queenGrabTrapProof(t), size)
    + ' Before the queen grabs, count its way back out.';
}
