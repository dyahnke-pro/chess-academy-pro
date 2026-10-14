// THE WHY BEHIND THE BOOK MOVE (David 2026-10-14: "the knight should have gone
// to e2 to protect the knight on c3" → "And the WHY behind the move!! … WHY WHY
// WHY"). When the student leaves the book, the coach names the move masters
// play there and says what it DOES — read off the board, never recalled — and
// what the student's move left undone. Theory is knowledge, not a calculation
// to find, so naming the book move after the student has left it is the lesson
// (the Learn carve-out; a tactical miss still waits for "Show me").
//
// The register is his opening speedruns: the job of the move ("Bb3 keeps the
// bishop on its diagonal and takes the sting out of …Nxe4"), the tempting
// alternative and why it falls short, and the consequence. Every job below is
// a fact the board proves; a job the board cannot show is never said.
import { Chess, type Color, type Square, type PieceSymbol } from 'chess.js';
import { CAPTURE_VALUE } from './pieceValues';
import { legalSeeGainOn } from './positionReadingService';
import { sayMoveNoun } from './spokenMove';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const CENTER: readonly Square[] = ['d4', 'd5', 'e4', 'e5'];

export type BookJobKind = 'guard' | 'stopsPin' | 'castle' | 'develop' | 'center';

export interface BookMoveWhy {
  kind: BookJobKind;
  /** "The book move is Ne2: it adds a second guard to your knight on c3, which
   *  their bishop on b4 pins — Nf3 leaves it with one." */
  text: string;
  /** The squares the sentence names, for the board. */
  squares: Square[];
}

function after(fen: string, san: string): { board: Chess; to: Square; from: Square; piece: PieceSymbol } | null {
  try {
    const b = new Chess(fen);
    const m = b.move(san);
    return { board: b, to: m.to, from: m.from, piece: m.piece };
  } catch { return null; }
}

/** The opponent to move: the same board with the side to move flipped. */
function asIfTheirMove(board: Chess, them: Color): Chess | null {
  if (board.turn() === them) return board;
  const parts = board.fen().split(' ');
  parts[1] = them; parts[3] = '-';
  try { return new Chess(parts.join(' ')); } catch { return null; }
}

const STEPS: Record<string, Array<[number, number]>> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
};
const sq = (f: number, r: number): Square | null => (f < 0 || f > 7 || r < 0 || r > 7 ? null : (`${'abcdefgh'[f]}${r + 1}` as Square));

/** A pin the slider on `from` makes: the first student piece on a ray, with a
 *  more valuable student piece (or the king) right behind it. */
function pinBy(board: Chess, from: Square, student: Color): { pinned: Square; behind: Square } | null {
  const p = board.get(from);
  if (!p || !STEPS[p.type]) return null;
  const f0 = from.charCodeAt(0) - 97; const r0 = Number(from[1]) - 1;
  for (const [df, dr] of STEPS[p.type]) {
    let first: Square | null = null;
    for (let i = 1; i < 8; i += 1) {
      const s = sq(f0 + df * i, r0 + dr * i);
      if (!s) break;
      const q = board.get(s);
      if (!q) continue;
      if (q.color !== student) break;
      if (!first) { first = s; continue; }
      const front = board.get(first)!;
      if (q.type === 'k' || CAPTURE_VALUE[q.type] > CAPTURE_VALUE[front.type]) {
        if (front.type !== 'p' && front.type !== 'k') return { pinned: first, behind: s };
      }
      break;
    }
  }
  return null;
}

/** Student pieces the opponent attacks or pins on this board. */
function underPressure(board: Chess, student: Color): Array<{ square: Square; piece: PieceSymbol; by: Square; pin: boolean }> {
  const them: Color = student === 'w' ? 'b' : 'w';
  const out: Array<{ square: Square; piece: PieceSymbol; by: Square; pin: boolean }> = [];
  for (const row of board.board()) for (const c of row) {
    if (!c || c.color !== them) continue;
    const pin = pinBy(board, c.square, student);
    if (pin) out.push({ square: pin.pinned, piece: board.get(pin.pinned)!.type, by: c.square, pin: true });
  }
  for (const row of board.board()) for (const c of row) {
    if (!c || c.color !== student || c.type === 'k' || c.type === 'p') continue;
    const by = board.attackers(c.square, them)[0];
    if (by && !out.some((o) => o.square === c.square)) out.push({ square: c.square, piece: c.type, by, pin: false });
  }
  return out;
}

const times = (n: number): string => (n === 1 ? 'one' : n === 2 ? 'a second' : n === 3 ? 'a third' : 'another');

/** 1. GUARD — the book move adds a defender to a piece under pressure and the
 *  student's move does not. */
function guardJob(main: Chess, played: Chess, student: Color): Omit<BookMoveWhy, 'text'> & { clause: string; short: string } | null {
  for (const p of underPressure(main, student)) {
    const mine = main.attackers(p.square, student).length;
    const theirs = played.get(p.square)?.color === student && played.get(p.square)?.type === p.piece ? played.attackers(p.square, student).length : -1;
    if (theirs < 0 || mine <= theirs) continue;
    const byPiece = main.get(p.by)!;
    const pressure = p.pin ? `which their ${NAME[byPiece.type]} on ${p.by} pins` : `which their ${NAME[byPiece.type]} on ${p.by} attacks`;
    return {
      kind: 'guard',
      squares: [p.square, p.by],
      clause: `it adds ${times(mine)} guard to your ${NAME[p.piece]} on ${p.square}, ${pressure}`,
      short: theirs === 0 ? 'leaves it unguarded' : `leaves it guarded ${theirs === 1 ? 'once' : `${theirs} times`}`,
    };
  }
  return null;
}

/** 2. STOPS A PIN / A TEMPO — a move the opponent has after the student's move
 *  (a pin on a student piece, or a cheaper piece hitting a dearer one) is
 *  illegal or loses material after the book move. */
function stopsJob(main: Chess, played: Chess, student: Color): Omit<BookMoveWhy, 'text'> & { clause: string; short: string } | null {
  const them: Color = student === 'w' ? 'b' : 'w';
  const p2 = asIfTheirMove(played, them);
  const m2 = asIfTheirMove(main, them);
  if (!p2 || !m2) return null;
  for (const z of p2.moves({ verbose: true })) {
    if (z.captured) continue;
    const t = new Chess(p2.fen());
    t.move(z.san);
    const pin = pinBy(t, z.to, student);
    let threat: string | null = null;
    let squares: Square[] = [];
    if (pin) {
      const pinned = t.get(pin.pinned)!; const behind = t.get(pin.behind)!;
      threat = `${z.san}, pinning your ${NAME[pinned.type]} on ${pin.pinned} to your ${NAME[behind.type]}`;
      squares = [z.to, pin.pinned];
    }
    if (!threat) continue;
    // After the book move, is the same move gone or does it lose the piece?
    const legal = m2.moves({ verbose: true }).find((m) => m.from === z.from && m.to === z.to);
    let stopped = !legal;
    if (legal) {
      const t2 = new Chess(m2.fen());
      t2.move(legal.san);
      // Stopped when landing there now LOSES material (…h6: Bg5 hxg5 Nxg5 is
      // a bishop for a pawn), not only when it loses the whole piece.
      stopped = legalSeeGainOn(t2, z.to as Square) > 0;
    }
    if (!stopped) continue;
    return {
      kind: 'stopsPin',
      squares,
      clause: `it keeps their ${NAME[z.piece]} off ${z.to}, where it would pin your ${NAME[t.get(squares[1])!.type]} on ${squares[1]}`,
      short: `allows ${sayMoveNoun(z.san, p2.fen())}`,
    };
  }
  return null;
}

/** 3. CASTLE — the book move clears the way to castle and the student's does not. */
function castleJob(main: Chess, played: Chess, student: Color): Omit<BookMoveWhy, 'text'> & { clause: string; short: string } | null {
  const can = (b: Chess): { k: boolean; q: boolean } => {
    const t = asIfTheirMove(b, student);
    if (!t) return { k: false, q: false };
    const ms = t.moves();
    return { k: ms.includes('O-O'), q: ms.includes('O-O-O') };
  };
  const a = can(main); const b = can(played);
  if (a.k && !b.k) return { kind: 'castle', squares: [], clause: 'it clears the last piece between your king and rook, so you can castle next move', short: 'keeps your king in the middle a move longer' };
  if (a.q && !b.q) return { kind: 'castle', squares: [], clause: 'it clears the way to castle long next move', short: 'keeps your king in the middle a move longer' };
  return null;
}

/** 4. DEVELOP — the book move brings a minor piece out from home while the
 *  student's move pushes a wing pawn or moves a piece that was already out. */
function developJob(mainMv: NonNullable<ReturnType<typeof after>>, playedMv: NonNullable<ReturnType<typeof after>>, student: Color): Omit<BookMoveWhy, 'text'> & { clause: string; short: string } | null {
  const home = student === 'w' ? '1' : '8';
  const developsNew = (mainMv.piece === 'n' || mainMv.piece === 'b') && mainMv.from[1] === home;
  if (!developsNew) return null;
  const playedRepeats = playedMv.piece !== 'p' && playedMv.piece !== 'k' && playedMv.from[1] !== home;
  const playedWingPawn = playedMv.piece === 'p' && !'cdef'.includes(playedMv.from[0]);
  if (playedRepeats) {
    return { kind: 'develop', squares: [mainMv.to], clause: `it brings your ${NAME[mainMv.piece]} out`, short: `moves your ${NAME[playedMv.piece]} a second time while the ${NAME[mainMv.piece]} still sits at home` };
  }
  if (playedWingPawn) {
    return { kind: 'develop', squares: [mainMv.to], clause: `it brings your ${NAME[mainMv.piece]} out`, short: 'spends the move on a wing pawn, and a pawn move can\'t be taken back' };
  }
  return null;
}

/** 5. CENTRE — the book move hits more of d4/d5/e4/e5 than the student's. */
function centerJob(main: Chess, played: Chess, student: Color): Omit<BookMoveWhy, 'text'> & { clause: string; short: string } | null {
  const hit = (b: Chess): Square[] => CENTER.filter((s) => b.attackers(s, student).length > 0 || b.get(s)?.color === student);
  const a = hit(main); const b = hit(played);
  const gained = a.filter((s) => !b.includes(s));
  if (gained.length === 0 || a.length <= b.length) return null;
  return { kind: 'center', squares: gained, clause: `it fights for the centre — it covers ${gained.join(' and ')}`, short: `leaves ${gained.join(' and ')} to them` };
}

/**
 * The why of the book move against the move the student played, or null when
 * the board shows no job the student's move left undone. Ordered by what is
 * at stake: a piece under pressure, then a pin about to land, then king
 * safety, then development, then the centre.
 */
export function bookMoveWhy(fen: string, mainSan: string, playedSan: string, student: Color): BookMoveWhy | null {
  if (mainSan === playedSan) return null;
  const mainMv = after(fen, mainSan);
  const playedMv = after(fen, playedSan);
  if (!mainMv || !playedMv) return null;
  const job = guardJob(mainMv.board, playedMv.board, student)
    ?? stopsJob(mainMv.board, playedMv.board, student)
    ?? castleJob(mainMv.board, playedMv.board, student)
    ?? developJob(mainMv, playedMv, student)
    ?? centerJob(mainMv.board, playedMv.board, student);
  if (!job) return null;
  return {
    kind: job.kind,
    squares: job.squares,
    text: `The book move is ${sayMoveNoun(mainSan, fen)}: ${job.clause} — ${sayMoveNoun(playedSan, fen)} ${job.short}.`,
  };
}
