/**
 * WHAT WOULD THEY DO IF YOU PASSED? (Mistakes round 2.) Review's reason for a
 * good defensive move: on the board the student moved from, the opponent's
 * threat if the student had made no move at all — a mate in one, or a piece
 * of theirs won on the spot (the null-move probe, `mustDefendPieces`) — and
 * whether the move played answered it.
 *
 * Deterministic and pure (chess.js only). A board where the student is in
 * check has no pass (the probe would take a king) and returns null.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { mustDefendPieces } from './threatOut';

export interface PassThreat {
  kind: 'mate' | 'wins';
  /** Their move on the pass board (SAN): the mate, or the capture. */
  san: string;
  /** The square the threat lands on. */
  square: string;
  /** Their piece that carries it out (a word: "queen"). */
  attacker: string;
  /** What it wins, for `wins` (a word: "knight"). */
  victim: string | null;
  /** The student's move took the threat off the board. */
  answered: boolean;
}

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The board with the other side to move, en passant cleared; null when the
 *  side to move is in check (no legal pass). */
function passBoard(fen: string): Chess | null {
  try {
    const c = new Chess(fen);
    if (c.inCheck()) return null;
    const f = fen.split(' ');
    f[1] = f[1] === 'w' ? 'b' : 'w';
    f[3] = '-';
    return new Chess(f.join(' '));
  } catch { return null; }
}

/** Their mate in one on the pass board, as SAN. */
function mateInOne(c: Chess): { san: string; to: string; piece: string } | null {
  for (const m of c.moves({ verbose: true })) {
    const t = new Chess(c.fen());
    t.move(m);
    if (t.isCheckmate()) return { san: m.san, to: m.to, piece: m.piece };
  }
  return null;
}

export function passThreat(fenBefore: string, playedSan: string, student: Color): PassThreat | null {
  let after: string;
  try {
    const c = new Chess(fenBefore);
    if (c.turn() !== student) return null;
    if (!c.move(playedSan)) return null;
    after = c.fen();
  } catch { return null; }
  const pass = passBoard(fenBefore);
  if (!pass) return null;
  const mate = mateInOne(pass);
  if (mate) {
    // Answered: the same move is no mate (or not legal) once the student's move stands.
    let still = false;
    try { const t = new Chess(after); still = !!t.move(mate.san) && t.isCheckmate(); } catch { still = false; }
    return { kind: 'mate', san: mate.san, square: mate.to, attacker: NAME[mate.piece], victim: null, answered: !still };
  }
  const hit = mustDefendPieces(fenBefore, student)[0];
  if (!hit || hit.value < 3) return null;
  // Their capture of it on the pass board.
  const take = pass.moves({ verbose: true })
    .filter((m) => m.to === hit.square && !!m.captured)
    .sort((a, b) => (VAL[a.piece] ?? 9) - (VAL[b.piece] ?? 9))[0];
  if (!take) return null;
  const after3 = mustDefendPieces(after, student);
  const answered = !after3.some((p) => p.value >= 3);
  return { kind: 'wins', san: take.san, square: hit.square, attacker: NAME[take.piece], victim: NAME[hit.piece.toLowerCase()] ?? 'piece', answered };
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** The Review sentence for an answered threat, past tense: what they had if
 *  the student passed, and that the move stopped it. Null when the move did
 *  not answer it (the error computer says that miss). */
export function passThreatSentence(t: PassThreat, square: Square | string = t.square): string | null {
  if (!t.answered) return null;
  return t.kind === 'mate'
    ? `If you had passed, their ${t.attacker} to ${square} was mate. Your move stopped it.`
    : `If you had passed, their ${t.attacker} took your ${t.victim} on ${square}. Your move stopped it.`;
}
