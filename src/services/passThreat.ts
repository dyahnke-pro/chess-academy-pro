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
import { Chess, type Color } from 'chess.js';
import { mustDefendPieces, flipSideToMove } from './threatOut';
import { renderPassThreat } from './teachingSentence';
// ONE PIECE-VALUE TABLE (`onePieceValueTable`): the cheapest capturer, so a
// king must sort last — the CAPTURE semantic (k: 100), never a local copy.
import { CAPTURE_VALUE } from './pieceValues';

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
  // ONE NULL-MOVE RULE (`oneNullMove.gate`, census 2026-10-10): the one flip
  // carries the rule — a side in check cannot pass, and en passant goes with
  // it — so this never clears a FEN field by hand.
  const flipped = flipSideToMove(fen);
  if (!flipped) return null;
  try { return new Chess(flipped); } catch { return null; }
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
    .sort((a, b) => (CAPTURE_VALUE[a.piece] ?? 9) - (CAPTURE_VALUE[b.piece] ?? 9))[0];
  if (!take) return null;
  const after3 = mustDefendPieces(after, student);
  const answered = !after3.some((p) => p.value >= 3);
  return { kind: 'wins', san: take.san, square: hit.square, attacker: NAME[take.piece], victim: NAME[hit.piece.toLowerCase()] ?? 'piece', answered };
}

/** The Review sentence for an answered threat, past tense: what they had if
 *  the student passed, and that the move stopped it. Null when the move did
 *  not answer it (the error computer says that miss). */
export function passThreatSentence(t: PassThreat, square: string = t.square): string | null {
  if (!t.answered) return null;
  // ONE RENDERER WRITES THE TEACHING SENTENCE (CLAUDE.md rule 2): the
  // computer hands over the facts, the renderer words them.
  return renderPassThreat({ kind: t.kind, attacker: t.attacker, victim: t.victim, square, stem: square.charCodeAt(0) });
}
