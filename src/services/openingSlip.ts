// OPENING SLIP — the student left the book: was it the move ORDER, the wrong
// SQUARE, or a different LINE, and does it matter? (David 2026-11-07: "Minimal
// spoken words … i want to hear if i make a move order mistake, or put a piece
// on a square that goes against the pro lines. I want to hear why the move
// order matters (maybe in some cases it doesn't, so no narration is required)
// and if placed on a wrong square I want to hear why the other square was best
// (does it defend the center, attack a weakness, or is the piece hanging where
// I put it)". Decided 2026-11-08: Learn and the Openings Play rung say it
// identically; a different line stays SILENT when it neither creates a
// tactical opportunity nor takes one away from the student.)
//
// ONE computer, read by both surfaces: Learn's `bookMove` lane (the masters'
// book) and the Play rung (the pro's lines, the masters' where they are thin).
// Each caller hands in its BOOK; everything else is read off the board.
//
//  · ORDER — the move is the book's own, a few moves early. Said only when the
//    order changes a tactic: in the book order the piece pins or hits
//    something it cannot now, or played now it hands them a shot.
//  · SQUARE — the book moves the same piece to another square. Said with what
//    the book square does (`bookMoveWhy`), or that the piece hangs where it
//    went.
//  · LINE — anything else. Said only when it hands them a shot, or gives up
//    one the book move had.
//
// G0/G3: the book is data, the shots are chess.js + the tactic readers
// (`detectTactics`, `findPins`, SEE). Pure: no engine, no fetch.
import { Chess, type Color, type Square, type PieceSymbol, type Move } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { findPins } from './pinGeometry';
import { findHangingBySee, legalSeeGainFor } from './positionReadingService';
import { bookMoveWhy } from './bookMoveWhy';
import { sayMoveNoun } from './spokenMove';
import { CAPTURE_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';
import { andList } from '../utils/andList';
import { masterMovesCachedSync } from './masterPlayLookup';
import { MIN_BOOK_GAMES } from './bookDeparture';
import { bookLinesThrough } from './openingDetectionService';
import { leftBookSentence } from './openingAnnouncement';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** How far into a book line an early move is still the book's own move. */
const ORDER_PLIES = 2;

/** WHERE THE BOOK COMES FROM, and so what it is called: the masters' book is
 *  "the book"; a course's own line (a pro's pet line, a masterclass line on the
 *  Play rung) is "this line" — a pro line is not the book. REQUIRED, so a new
 *  book decides its words. */
export type BookSource = 'theory' | 'course';
const BOOK_WORDS: Record<BookSource, { The: string; move: string; aMove: string }> = {
  theory: { The: 'The book', move: 'the book move', aMove: 'a book move' },
  course: { The: 'This line', move: "this line's move", aMove: "this line's own move" },
};

export interface OpeningBook {
  source: BookSource;
  /** The book's moves at this board, most played first (SAN). */
  moves: readonly string[];
  /** Book lines from this board, each starting with one of `moves` (SAN). */
  lines: readonly (readonly string[])[];
}

type SlipKind = 'order' | 'square' | 'line';

/** A tactic one move changes: a shot it hands them, or one it gives up. */
interface Shot {
  kind: 'mate' | 'hangs' | 'fork' | 'pin';
  /** The sentence that says it, from the student's seat. */
  clause: string;
  squares: string[];
}

interface OpeningSlip {
  kind: SlipKind;
  /** The book move the student left. */
  bookSan: string;
  text: string;
  squares: string[];
  /** The shot the move hands them, or null. */
  created: Shot | null;
  /** The shot the book move (or the book order) had and this move gives up. */
  lost: Shot | null;
}

const after = (fen: string, san: string): { board: Chess; mv: Move } | null => {
  try {
    const board = new Chess(fen);
    const mv = board.move(san);
    return { board, mv };
  } catch { return null; }
};
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
/** Their move said in words, from the student's seat: "their knight can take
 *  on f7", "their queen can go to a4 with check". */
const theirMove = (m: { piece: PieceSymbol; to: string; captured?: PieceSymbol; san: string }): string =>
  `their ${NAME[m.piece]} can ${m.captured ? 'take on' : 'go to'} ${m.to}${/[+#]/.test(m.san) ? ' with check' : ''}`;

/** Their mate in one, if they have it here (they are to move). */
function mateIn1(board: Chess): Move | null {
  for (const m of board.moves({ verbose: true })) {
    board.move(m);
    const mate = board.isCheckmate();
    board.undo();
    if (mate) return m;
  }
  return null;
}

/** Their winning fork here (they are to move): a move whose piece then forks
 *  two of the student's pieces, by the tactic reader's own test. */
function forkReply(board: Chess, student: Color): { move: Move; to: string; targets: Array<{ square: string; piece: PieceSymbol }> } | null {
  const them = other(student);
  const valuable = board.board().flat().filter((p) => p && p.color === student && (p.type === 'k' || CAPTURE_VALUE[p.type] >= 3));
  let best: { move: Move; to: string; targets: Array<{ square: string; piece: PieceSymbol }>; worth: number } | null = null;
  for (const m of board.moves({ verbose: true })) {
    board.move(m);
    // Cheap first: the moved piece must hit two of their valuable pieces.
    const hit = valuable.filter((p) => p && p.square !== m.to && board.attackers(p.square, them).includes(m.to));
    if (hit.length >= 2) {
      const fork = detectTactics(board.fen()).tactics.find((t) => t.type === 'fork' && t.beneficiary === them && t.involvedSquares[0] === m.to);
      // A fork the student meets by taking the forker at no loss wins nothing
      // (…Qa5 Qa4+ is a queen trade, not a fork).
      const metByCapture = fork && board.moves({ verbose: true }).some((r) => r.to === m.to && r.captured && legalSeeGainFor(board.fen(), m.to, student) >= 0);
      if (fork && !metByCapture) {
        const targets = fork.involvedSquares.slice(1).map((sq) => ({ square: sq, piece: (board.get(sq as Square)?.type ?? 'p') }));
        const worth = targets.reduce((s, t) => s + (t.piece === 'k' ? 100 : CAPTURE_VALUE[t.piece]), 0);
        if (!best || worth > best.worth) best = { move: m, to: m.to, targets, worth };
      }
    }
    board.undo();
  }
  return best ? { move: best.move, to: best.to, targets: best.targets } : null;
}

/** The student's pieces they can win here by SEE, biggest first. */
const loose = (board: Chess, side: Color): ReturnType<typeof findHangingBySee> =>
  findHangingBySee(board.fen()).filter((h) => h.color === side);

/** The cheapest piece of `by` that attacks `sq`. */
function cheapestAttacker(board: Chess, sq: Square, by: Color): { square: Square; piece: PieceSymbol } | null {
  let best: { square: Square; piece: PieceSymbol } | null = null;
  for (const a of board.attackers(sq, by)) {
    const p = board.get(a);
    if (p && (!best || CAPTURE_VALUE[p.type] < CAPTURE_VALUE[best.piece])) best = { square: a, piece: p.type };
  }
  return best;
}

const andTargets = (ts: ReadonlyArray<{ square: string; piece: PieceSymbol }>): string =>
  andList(ts.map((t) => `your ${NAME[t.piece]} on ${t.square}`));

/**
 * WHAT THE MOVE HANDS THEM, against the book move: a mate, a piece of the
 * student's they can now win, or a fork — each one the book move did not
 * allow. Both boards have them to move.
 */
function createdShot(book: Chess, played: Chess, playedMove: Move, student: Color): Shot | null {
  const them = other(student);
  const mate = mateIn1(played);
  if (mate && !mateIn1(book)) {
    return { kind: 'mate', clause: `${openSentence(theirMove({ piece: mate.piece, to: mate.to, captured: mate.captured, san: '' }))}, and that is mate.`, squares: [mate.from, mate.to] };
  }
  const was = new Set(loose(book, student).map((h) => `${h.piece}${h.square}`));
  // A piece that just took something and is taken back is a trade, not a
  // hang: what it took counts against what it loses.
  const took = (h: { square: string }): number => (h.square === playedMove.to && playedMove.captured ? CAPTURE_VALUE[playedMove.captured] : 0);
  const hang = loose(played, student).find((h) => !was.has(`${h.piece}${h.square}`) && h.gain - took(h) > 0) ?? null;
  let fork = forkReply(played, student);
  if (fork) {
    const before = forkReply(book, student);
    const f = fork;
    if (before && before.to === f.to && before.targets.every((t) => f.targets.some((u) => u.square === t.square))) fork = null;
  }
  // The bigger shot is the one said: a fork wins the lesser of two pieces, or
  // the other piece when it checks the king.
  const forkGain = fork ? ((): number => {
    const vals = fork.targets.filter((t) => t.piece !== 'k').map((t) => CAPTURE_VALUE[t.piece]).sort((a, b) => b - a);
    return fork.targets.some((t) => t.piece === 'k') ? (vals[0] ?? 0) : (vals[1] ?? 0);
  })() : 0;
  if (fork && forkGain > (hang?.gain ?? 0)) {
    return { kind: 'fork', clause: `${openSentence(theirMove(fork.move))}, forking ${andTargets(fork.targets)}.`, squares: [fork.to, ...fork.targets.map((t) => t.square)] };
  }
  if (hang) {
    const by = cheapestAttacker(played, hang.square, them);
    const piece = NAME[hang.piece];
    const clause = hang.defended
      ? `Your ${piece} on ${hang.square} can be won${by ? ` by their ${NAME[by.piece]} on ${by.square}` : ''}.`
      : `Your ${piece} on ${hang.square} is hanging${by ? `: their ${NAME[by.piece]} on ${by.square} can take it` : ''}.`;
    return { kind: 'hangs', clause, squares: [hang.square, ...(by ? [by.square] : [])] };
  }
  return null;
}

/** The pins the student's piece on `sq` makes on `board`. A pin is the tactic
 *  a book order waits for; a plain attack on a piece is a tempo, answered by
 *  moving it, and is not one (his record 2026-11-08: "the pawn to e5 attacks
 *  their knight on f6, that chance is gone" said of a kick still on next move). */
function piecePins(board: Chess, sq: Square, student: Color): Array<{ target: Square; behind: Square; key: string }> {
  const out: Array<{ target: Square; behind: Square; key: string }> = [];
  for (const p of findPins(board, sq)) {
    if (p.beneficiary !== student) continue;
    const [, target, behind] = p.involvedSquares as Square[];
    // A pawn "pinned" on the ray is not the pin a player plans for.
    if (board.get(target)?.type === 'p') continue;
    out.push({ target, behind, key: `pin:${target}:${behind}` });
  }
  return out;
}

function pinClause(board: Chess, pin: { target: Square; behind: Square }): string | null {
  const target = board.get(pin.target);
  const behind = board.get(pin.behind);
  if (!target || !behind) return null;
  return `pins their ${NAME[target.type]} on ${pin.target} to their ${NAME[behind.type]}`;
}

/** The board with the student to move again — "if they passed" — or null when
 *  that board cannot exist (the student gave check). */
function studentAgain(board: Chess): Chess | null {
  if (board.inCheck()) return null;
  const parts = board.fen().split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  try { return new Chess(parts.join(' ')); } catch { return null; }
}

/**
 * WHAT THE BOOK MOVE HAD THAT THE PLAYED MOVE GIVES UP: a pin the book move
 * makes that the student can no longer make next move. A pin still there to
 * play after the student's move (their next move aside) is delayed, not lost,
 * and says nothing.
 */
function lostShot(book: { board: Chess; mv: Move }, played: Chess, student: Color): Shot | null {
  const had = piecePins(book.board, book.mv.to, student);
  if (had.length === 0) return null;
  const now = new Set<string>();
  for (const row of played.board()) for (const c of row) {
    if (c && c.color === student) for (const p of piecePins(played, c.square, student)) now.add(p.key);
  }
  // Still to be had next move: the same move makes the same pin.
  const again = studentAgain(played);
  if (again) {
    try {
      const m = again.move(book.mv.san);
      for (const p of piecePins(again, m.to, student)) now.add(p.key);
    } catch { /* the book move is gone: the pin with it */ }
  }
  const gone = had.find((p) => !now.has(p.key));
  if (!gone) return null;
  const clause = pinClause(book.board, gone);
  if (!clause) return null;
  return { kind: 'pin', clause, squares: [book.mv.to, gone.target, gone.behind] };
}

/** The book line in which the played move is the student's own move a few
 *  plies on — the move ORDER case — and its index there. */
function orderLine(book: OpeningBook, played: Move): { line: readonly string[]; at: number } | null {
  let best: { line: readonly string[]; at: number } | null = null;
  for (const line of book.lines) {
    for (let k = 2; k < Math.min(line.length, ORDER_PLIES + 1); k += 2) {
      if (line[k].replace(/[+#]/g, '') !== played.san.replace(/[+#]/g, '')) continue;
      if (!best || k < best.at) best = { line, at: k };
      break;
    }
  }
  return best;
}

/**
 * THE ORDER'S REASON: in the book order the piece pins or attacks something
 * it cannot played now — most often because the target is not out yet ("the
 * bishop wants to pin the knight, so wait for their knight to come out").
 */
function orderReason(fen: string, line: readonly string[], at: number, played: { board: Chess; mv: Move }, student: Color): Shot | null {
  let board: Chess;
  try {
    board = new Chess(fen);
    for (const s of line.slice(0, at + 1)) board.move(s);
  } catch { return null; }
  const sq = played.mv.to;
  const p = board.get(sq);
  if (!p || p.color !== student || p.type !== played.mv.piece) return null;
  const then = piecePins(board, sq, student);
  const now = new Set(piecePins(played.board, sq, student).map((x) => x.key));
  const gone = then.find((x) => !now.has(x.key));
  if (!gone) return null;
  const clause = pinClause(board, gone);
  if (!clause) return null;
  const target = board.get(gone.target);
  const there = played.board.get(gone.target);
  // THE TARGET IS NOT OUT YET — the pin waits for the piece it pins ("the
  // bishop wants to pin the knight, so wait for their knight to come out").
  // A pin the board blocks some other way says nothing here.
  if (!target || (there && there.type === target.type && there.color === target.color)) return null;
  const piece = NAME[played.mv.piece];
  const why = `Your ${piece} wants to ${clause.replace(/^pins/, 'pin')}, and that ${NAME[target.type]} is not out yet.`;
  return { kind: 'pin', clause: why, squares: [sq, gone.target, gone.behind] };
}

/** The job of the book square, said as two short sentences, or null. */
function bookJob(fen: string, bookSan: string, playedSan: string, student: Color): { text: string; squares: string[] } | null {
  const w = bookMoveWhy(fen, bookSan, playedSan, student);
  if (!w || !w.job) return null;
  const job = w.job.replace(/ — /g, ': ').replace(/^it /, '');
  // What the student's move left undone, when the book's job names it.
  const left = w.left ? ` ${openSentence(sayMoveNoun(playedSan, fen))} ${w.left}.` : '';
  return { text: `It ${job}.${left}`, squares: [...w.squares] };
}

/**
 * The student's opening slip at `fen` (their move `playedSan`, the book's
 * `book`), or null when the move is the book's or the board says it does not
 * matter. `student` is REQUIRED: every sentence is said from their seat.
 */
export function openingSlip(i: { fen: string; playedSan: string; book: OpeningBook; student: Color }): OpeningSlip | null {
  const { fen, playedSan, book, student } = i;
  const clean = (s: string): string => s.replace(/[+#]/g, '');
  if (book.moves.length === 0 || book.moves.some((m) => clean(m) === clean(playedSan))) return null;
  const played = after(fen, playedSan);
  if (!played || played.mv.color !== student) return null;
  const key = stemKeyOf(`${fen}|${playedSan}`);
  const X = sayMoveNoun(played.mv.san, fen);
  const W = BOOK_WORDS[book.source];

  // SQUARE: the book moves the same piece, to another square.
  const sameSan = book.moves.find((m) => after(fen, m)?.mv.from === played.mv.from);
  if (sameSan) {
    const bk = after(fen, sameSan);
    if (!bk) return null;
    const created = createdShot(bk.board, played.board, played.mv, student);
    const job = bookJob(fen, sameSan, played.mv.san, student);
    if (!created && !job) return null;
    const B = sayMoveNoun(sameSan, fen);
    const piece = NAME[played.mv.piece];
    const lead = rotateStem([
      `${W.The} puts your ${piece} on ${bk.mv.to}, not ${played.mv.to}.`,
      `Your ${piece} belongs on ${bk.mv.to} here.`,
      `${openSentence(B)} is ${W.move}.`,
    ], key);
    const text = [created?.clause, lead, job?.text].filter(Boolean).join(' ');
    return { kind: 'square', bookSan: sameSan, text, squares: [...new Set([played.mv.to, bk.mv.to, ...(created?.squares ?? []), ...(job?.squares ?? [])])], created, lost: null };
  }

  // ORDER: the move is the book's own, a few moves early.
  const order = orderLine(book, played.mv);
  if (order) {
    const bookSan = order.line[0];
    const bk = after(fen, bookSan);
    if (!bk) return null;
    const created = createdShot(bk.board, played.board, played.mv, student);
    const lost = orderReason(fen, order.line, order.at, played, student);
    if (!created && !lost) return null;
    const B = sayMoveNoun(bookSan, fen);
    const early = rotateStem([
      `${openSentence(X)} comes ${order.at === 2 ? 'a move' : 'two moves'} early.`,
      `${openSentence(X)} is ${W.aMove}, just not yet.`,
    ], key);
    const first = rotateStem([
      `${openSentence(B)} first is the more flexible order.`,
      `${W.The} plays ${B} first.`,
    ], key >>> 1);
    const text = [early, created?.clause ?? lost?.clause, first].filter(Boolean).join(' ');
    return { kind: 'order', bookSan, text, squares: [...new Set([played.mv.to, bk.mv.to, ...(created?.squares ?? lost?.squares ?? [])])], created, lost: created ? null : lost };
  }

  // LINE: anything else — said only when the tactics change.
  const bookSan = book.moves[0];
  const bk = after(fen, bookSan);
  if (!bk) return null;
  const created = createdShot(bk.board, played.board, played.mv, student);
  const lost = created ? null : lostShot(bk, played.board, student);
  if (!created && !lost) return null;
  const B = sayMoveNoun(bookSan, fen);
  const text = created
    ? `${created.clause} ${rotateStem([`${openSentence(B)} was ${W.move}.`, `${W.The} plays ${B} here.`], key)}`
    : rotateStem([
      `${W.The} plays ${B} here. It ${lost?.clause ?? ''}, and your move gives that up.`,
      `${openSentence(B)} was ${W.move}: it ${lost?.clause ?? ''}. Your move gives that pin up.`,
    ], key);
  return { kind: 'line', bookSan, text, squares: [...new Set([played.mv.to, bk.mv.to, ...((created ?? lost)?.squares ?? [])])], created, lost };
}

const cleanSan = (s: string): string => s.replace(/[+#]/g, '');

/**
 * THE BOOK FROM TAUGHT LINES — a pro's pet lines on the Openings Play rung
 * (David 2026-11-08: "in a pro opening tab, that pro's pet lines"): every
 * line that passes through the board `history` reaches gives its next move.
 * Null when none of them reaches this board — the pro's games are too thin
 * there, and the caller reads the masters' book instead.
 */
export function bookFromLines(lines: readonly (readonly string[])[], history: readonly string[]): OpeningBook | null {
  const tails: string[][] = [];
  for (const l of lines) {
    if (l.length <= history.length) continue;
    if (history.every((s, i) => cleanSan(l[i]) === cleanSan(s))) tails.push(l.slice(history.length));
  }
  if (tails.length === 0) return null;
  return { source: 'course', moves: [...new Set(tails.map((t) => t[0]))], lines: tails };
}

/**
 * THE MASTERS' BOOK at the board `history` reaches: the moves masters played
 * there in at least `MIN_BOOK_GAMES` games, most played first, and the named
 * lines through it for the order read. Null when the masters' moves for this
 * board are not in memory (never a guess: unknown says nothing).
 */
export function mastersBook(history: readonly string[]): OpeningBook | null {
  let fen: string;
  try {
    const c = new Chess();
    for (const s of history) c.move(s);
    fen = c.fen();
  } catch { return null; }
  const known = masterMovesCachedSync(fen);
  if (!known) return null;
  const moves = known.filter((m) => m.games >= MIN_BOOK_GAMES).sort((a, b) => b.games - a.games).map((m) => m.san);
  if (moves.length === 0) return null;
  const inBook = new Set(moves.map(cleanSan));
  return { source: 'theory', moves, lines: bookLinesThrough(history).filter((l) => inBook.has(cleanSan(l[0]))) };
}

/**
 * THE BOOK READ OF THE MOVE JUST PLAYED on a taught line — the Openings Play
 * rung, move by move, until the game leaves the book (David 2026-11-08: Learn
 * and the Play rung say it identically; "say when they leave the book"). The
 * book is the pro's pet lines, the masters' where those are thin.
 *  · null — the book at the board before the move is unknown: no claim;
 *  · `left: false` — the move is book;
 *  · `left: true` — the move left the book. The student's move says the
 *    opening slip (null text: it does not matter); theirs says that they left
 *    (`leftBookSentence`, the words Learn's opening lane says).
 */
export function bookMoveRead(history: readonly string[], student: Color, proLines: readonly (readonly string[])[]): { left: boolean; text: string | null; squares: string[] } | null {
  if (history.length === 0) return null;
  const before = history.slice(0, -1);
  let fen: string;
  let mover: Color;
  try {
    const c = new Chess();
    for (const s of before) c.move(s);
    fen = c.fen();
    mover = c.turn();
  } catch { return null; }
  const book = bookFromLines(proLines, before) ?? mastersBook(before);
  if (!book) return null;
  const san = history[history.length - 1];
  if (book.moves.some((m) => cleanSan(m) === cleanSan(san))) return { left: false, text: null, squares: [] };
  if (mover !== student) return { left: true, text: leftBookSentence('They', san, fen, book.source), squares: [] };
  const s = openingSlip({ fen, playedSan: san, book, student });
  return { left: true, text: s?.text ?? null, squares: s?.squares ?? [] };
}
