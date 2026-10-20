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
// ROUTED COMPUTERS (David 2026-10-14: "Any computers you can route in?"): the
// registry's own reads, run on the board after the book move and after the
// student's, so the reason speaks the same vocabulary the coach teaches and
// catches with everywhere else.
import { findProphylaxis } from './prophylaxis';
import { kickOn } from './kickMap';
import { findEnablingMove } from './enablingMove';
import { masterMovesCachedSync } from './masterPlayLookup';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const CENTER: readonly Square[] = ['d4', 'd5', 'e4', 'e5'];

export type BookJobKind = 'rescue' | 'guard' | 'stopsPin' | 'stopsPush' | 'tempo' | 'prepares' | 'castle' | 'develop' | 'center' | 'recapture' | 'capture' | 'fork' | 'attack';

interface BookMoveWhy {
  kind: BookJobKind;
  /** "The book move is Ne2: it adds a second guard to your knight on c3, which
   *  their bishop on b4 pins — Nf3 leaves it with one." */
  text: string;
  /** The squares the sentence names, for the board. */
  squares: Square[];
  /** The book move's job alone ("it adds one guard to your pawn on e5, which
   *  their knight on f3 attacks"), true of the move whatever the rival — what
   *  Review says when the student PLAYED the book move. Null when the job is
   *  only the rival's cost (a tempo handed over). */
  job: string | null;
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
function pinBy(board: Chess, from: Square, student: Color): { pinned: Square; behind: Square; pinnedType: PieceSymbol; behindType: PieceSymbol } | null {
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
      const front = board.get(first);
      if (!front) break;
      if (q.type === 'k' || CAPTURE_VALUE[q.type] > CAPTURE_VALUE[front.type]) {
        if (front.type !== 'p' && front.type !== 'k') return { pinned: first, behind: s, pinnedType: front.type, behindType: q.type };
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
    if (pin) out.push({ square: pin.pinned, piece: pin.pinnedType, by: c.square, pin: true });
  }
  for (const row of board.board()) for (const c of row) {
    if (!c || c.color !== student || c.type === 'k') continue;
    const by = board.attackers(c.square, them)[0];
    // A PAWN counts only when it would fall: hit more often than guarded
    // (sample 2026-10-14: "Nc6 defends e5" scored as no job at all).
    if (c.type === 'p' && by && board.attackers(c.square, them).length <= board.attackers(c.square, student).length - 1) continue;
    if (by && !out.some((o) => o.square === c.square)) out.push({ square: c.square, piece: c.type, by, pin: false });
  }
  return out;
}

/** WHOSE MOVE THE SENTENCE IS ABOUT. The jobs are read in the MOVER's seat
 *  (`student` below is the side that moved); these are the words that seat
 *  is spoken with, so the student's move says "your knight" and the
 *  opponent's says "their knight" from the one phrasing. */
interface SeatWords { own: string; other: string; you: string }
export const MINE: SeatWords = { own: 'your', other: 'their', you: 'you' };
export const THEIRS: SeatWords = { own: 'their', other: 'your', you: 'they' };

// ONE COUNTER (lead 2026-10-20: "a third guard" then "another guard" on the
// same knight — the fourth guard was counted, then not said).
const ORDINAL = ['one', 'a second', 'a third', 'a fourth', 'a fifth', 'a sixth'];
const times = (n: number): string => ORDINAL[n - 1] ?? 'another';


type Job = Omit<BookMoveWhy, 'text' | 'job'> & { clause: string; short: string };

/** A job whose clause carries CONTEXT a walk may already have said — the pin
 *  or attack that makes the guard matter ("which their bishop on c4 pins").
 *  `compact` is the clause without it; `contextKey` names the context, so
 *  the second guard of the same pinned knight says only the guard. */
export interface JobContext { compact?: string; contextKey?: string }

/** Safe for the side to move to play `san` on this board — legal, and the
 *  piece is not simply lost on its new square. */
function safePush(board: Chess, side: Color, from: Square, to: Square): boolean {
  const t = asIfTheirMove(board, side);
  if (!t) return false;
  const m = t.moves({ verbose: true }).find((x) => x.from === from && x.to === to);
  if (!m) return false;
  const u = new Chess(t.fen());
  u.move(m.san);
  return legalSeeGainOn(u, to) <= 0;
}

/** 2b. STOPS THEIR PAWN — an advance they have after the student's move (and
 *  had already) that hits one of the student's pieces is gone, or now loses
 *  the pawn, after the book move ("a4, the prophylactic that stops b5"). */
function stopsPushJob(main: Chess, played: Chess, student: Color, before: Chess, w: SeatWords = MINE): Job | null {
  const them: Color = student === 'w' ? 'b' : 'w';
  const p2 = asIfTheirMove(played, them);
  if (!p2) return null;
  for (const z of p2.moves({ verbose: true })) {
    if (z.piece !== 'p' || z.captured) continue;
    const t = new Chess(p2.fen());
    t.move(z.san);
    const hits: Square[] = [];
    for (const row of t.board()) for (const c of row) {
      if (c && c.color === student && c.type !== 'p' && c.type !== 'k' && t.attackers(c.square, them).includes(z.to)) hits.push(c.square);
    }
    if (hits.length === 0) continue;
    if (!safePush(before, them, z.from, z.to)) continue;
    if (!safePush(played, them, z.from, z.to)) continue;
    if (safePush(main, them, z.from, z.to)) continue;
    const victim = t.get(hits[0]);
    if (!victim) continue;
    return {
      kind: 'stopsPush',
      squares: [z.to, hits[0]],
      clause: `it stops ${w.other} pawn coming to ${z.to}, where it would hit ${w.own} ${NAME[victim.type]} on ${hits[0]}`,
      short: `lets it come`,
    };
  }
  return null;
}

/** 2c. PREPARES THE PUSH — a central pawn advance that would lose the pawn
 *  now becomes safe after the book move ("c3, preparing d4"). */
function preparesJob(main: Chess, played: Chess, student: Color, w: SeatWords = MINE): Job | null {
  const forward = student === 'w' ? 1 : -1;
  for (const row of main.board()) for (const c of row) {
    if (!c || c.color !== student || c.type !== 'p' || !'cdef'.includes(c.square[0])) continue;
    // THE SAME PAWN ON BOTH BOARDS — the pawn the book move itself pushed is
    // not "prepared" (sample 2026-10-14: "e4 prepares e5").
    const twin = played.get(c.square);
    if (!twin || twin.color !== student || twin.type !== 'p') continue;
    const r = Number(c.square[1]);
    for (const n of [1, 2]) {
      const to = `${c.square[0]}${r + forward * n}` as Square;
      if (!CENTER.includes(to)) continue;
      if (!safePush(main, student, c.square, to)) continue;
      if (safePush(played, student, c.square, to)) continue;
      return { kind: 'prepares', squares: [to], clause: `it prepares ${to}: after it, ${w.own} pawn can come to ${to} and hold there`, short: `leaves ${to} a square your pawn cannot hold yet` };
    }
  }
  return null;
}


/** The masters' line from `fen` starting with `firstSan`, as UCI: the book
 *  move, then the most-played reply at each step while the book knows it. */
function bookLineUci(fen: string, firstSan: string, plies: number): string[] {
  const out: string[] = [];
  let c: Chess;
  try { c = new Chess(fen); } catch { return out; }
  let san: string | null = firstSan;
  for (let i = 0; i < plies && san; i += 1) {
    let m;
    try { m = c.move(san); } catch { break; }
    out.push(`${m.from}${m.to}${m.promotion ?? ''}`);
    const next = masterMovesCachedSync(c.fen());
    san = next && next.length ? [...next].sort((a, b) => b.games - a.games)[0].san : null;
  }
  return out;
}

/** 2a. PROPHYLAXIS (the `prophylaxis` computer): the book move is the quiet
 *  move that stops their fork, pin or kick, and the student's leaves it on. */
function prophylaxisJob(fen: string, mainMv: NonNullable<ReturnType<typeof after>>, playedMv: NonNullable<ReturnType<typeof after>>, student: Color, w: SeatWords = MINE): Job | null {
  const ph = findProphylaxis(fen);
  if (!ph || ph.prevention.from !== mainMv.from || ph.prevention.to !== mainMv.to) return null;
  const them: Color = student === 'w' ? 'b' : 'w';
  const p2 = asIfTheirMove(playedMv.board, them);
  if (!p2 || !p2.moves({ verbose: true }).some((m) => m.from === ph.intent.from && m.to === ph.intent.to)) return null;
  const verb = ph.kind === 'pin' ? 'pin' : ph.kind === 'fork' ? 'fork' : 'hit';
  return {
    kind: ph.kind === 'pin' ? 'stopsPin' : 'stopsPush',
    squares: [ph.intent.to, ph.victim.square],
    clause: `it covers ${ph.intent.to}, where ${sayMoveNoun(ph.intent.san, p2.fen())} would ${verb} ${w.own} ${NAME[ph.victim.piece]} on ${ph.victim.square}`,
    short: `leaves ${ph.intent.to} open for it`,
  };
}

/** 2d. NO TEMPO HANDED OVER (the `kickMap` computer): after the student's
 *  move a pawn push chases the piece that just moved, and after the book move
 *  nothing chases it ("Ne2, not Nf3 — f3 invites …e4 with tempo"). */
function tempoJob(mainMv: NonNullable<ReturnType<typeof after>>, playedMv: NonNullable<ReturnType<typeof after>>): Job | null {
  if (playedMv.piece === 'p' || playedMv.piece === 'k') return null;
  const k = kickOn(playedMv.board.fen(), playedMv.to);
  if (!k) return null;
  if (mainMv.piece !== 'p' && mainMv.piece !== 'k' && kickOn(mainMv.board.fen(), mainMv.to)) return null;
  return {
    kind: 'tempo',
    squares: [playedMv.to],
    clause: '',
    short: `lets them chase your ${NAME[playedMv.piece]} with ${sayMoveNoun(k.kick, playedMv.board.fen())} and gain a move`,
  };
}

/** 2e. CLEARS THE ROAD (the `enablingMove` computer, on the masters' line):
 *  the book move steps off the road a long piece takes next. */
function clearsRoadJob(fen: string, mainSan: string, w: SeatWords = MINE): Job | null {
  const o = findEnablingMove(fen, bookLineUci(fen, mainSan, 3));
  if (!o || o.first.san.replace(/[+#]/g, '') !== mainSan.replace(/[+#]/g, '')) return null;
  return {
    kind: 'prepares',
    squares: [o.opened, o.then.from, o.then.to],
    clause: `it clears ${o.opened}, so ${w.own} ${NAME[o.then.piece]} on ${o.then.from} can come to ${o.then.to} next`,
    short: `leaves that road shut`,
  };
}

/** 0. RESCUE — the piece the book move moves was attacked and would be lost
 *  where it stood; the book move takes it somewhere safe and the student's
 *  move leaves it there to be taken (audit 2026-10-14: h3 hits the bishop on
 *  g4, the book is Bh5, the student played Nc6 and the coach said nothing). */
function rescueJob(before: Chess, mainMv: NonNullable<ReturnType<typeof after>>, played: Chess, student: Color, w: SeatWords = MINE): Omit<BookMoveWhy, 'text' | 'job'> & { clause: string; short: string } | null {
  const them: Color = student === 'w' ? 'b' : 'w';
  const pass = asIfTheirMove(before, them);
  if (!pass || legalSeeGainOn(pass, mainMv.from) <= 0) return null;
  if (legalSeeGainOn(mainMv.board, mainMv.to) > 0) return null;
  const left = played.get(mainMv.from);
  if (!left || left.color !== student || left.type !== mainMv.piece) return null;
  if (legalSeeGainOn(played, mainMv.from) <= 0) return null;
  const by = before.attackers(mainMv.from, them)
    .map((sq) => ({ sq, p: before.get(sq) }))
    .filter((a): a is { sq: Square; p: NonNullable<ReturnType<Chess['get']>> } => !!a.p)
    .sort((a, b) => CAPTURE_VALUE[a.p.type] - CAPTURE_VALUE[b.p.type])[0];
  if (!by) return null;
  return {
    kind: 'rescue',
    squares: [mainMv.from, by.sq, mainMv.to],
    clause: `it takes ${w.own} ${NAME[mainMv.piece]} out of reach of ${w.other} ${NAME[by.p.type]} on ${by.sq}`,
    short: `leaves it on ${mainMv.from} for them to take`,
  };
}

/** 1. GUARD — the book move adds a defender to a piece under pressure and the
 *  student's move does not. */
function guardJob(main: Chess, played: Chess, student: Color, mainTo: Square, w: SeatWords = MINE): (Omit<BookMoveWhy, 'text' | 'job'> & { clause: string; short: string } & JobContext) | null {
  for (const p of underPressure(main, student)) {
    // THE BOOK MOVE ITSELF IS THE NEW GUARD — not a count that rose because
    // the student's move took a guard away (hand grade 2026-10-14: "c6 adds a
    // third guard to your knight on f6" after the knight left d7).
    if (!main.attackers(p.square, student).includes(mainTo)) continue;
    const mine = main.attackers(p.square, student).length;
    const theirs = played.get(p.square)?.color === student && played.get(p.square)?.type === p.piece ? played.attackers(p.square, student).length : -1;
    if (theirs < 0 || mine <= theirs) continue;
    const byPiece = main.get(p.by);
    if (!byPiece) continue;
    const pressure = p.pin ? `which ${w.other} ${NAME[byPiece.type]} on ${p.by} pins` : `which ${w.other} ${NAME[byPiece.type]} on ${p.by} attacks`;
    return {
      kind: 'guard',
      squares: [p.square, p.by],
      clause: `it adds ${times(mine)} guard to ${w.own} ${NAME[p.piece]} on ${p.square}, ${pressure}`,
      compact: `it adds ${times(mine)} guard to ${w.own} ${NAME[p.piece]} on ${p.square}`,
      contextKey: `${p.pin ? 'pin' : 'hit'}:${p.by}:${p.square}`,
      short: theirs === 0 ? 'leaves it unguarded' : `leaves it guarded ${theirs === 1 ? 'once' : theirs === 2 ? 'twice' : 'fewer times'}`,
    };
  }
  return null;
}

/** 2. STOPS A PIN / A TEMPO — a move the opponent has after the student's move
 *  (a pin on a student piece, or a cheaper piece hitting a dearer one) is
 *  illegal or loses material after the book move. */
function stopsJob(main: Chess, played: Chess, student: Color, before: Chess, w: SeatWords = MINE): Omit<BookMoveWhy, 'text' | 'job'> & { clause: string; short: string } | null {
  const them: Color = student === 'w' ? 'b' : 'w';
  const p2 = asIfTheirMove(played, them);
  const m2 = asIfTheirMove(main, them);
  const b2 = asIfTheirMove(before, them);
  if (!p2 || !m2 || !b2) return null;
  for (const z of p2.moves({ verbose: true })) {
    if (z.captured) continue;
    const t = new Chess(p2.fen());
    t.move(z.san);
    const pin = pinBy(t, z.to, student);
    let threat: string | null = null;
    let squares: Square[] = [];
    let pinnedType: PieceSymbol | null = null;
    if (pin) {
      threat = `${z.san}, pinning your ${NAME[pin.pinnedType]} on ${pin.pinned} to your ${NAME[pin.behindType]}`;
      squares = [z.to, pin.pinned];
      pinnedType = pin.pinnedType;
    }
    if (!threat || !pinnedType) continue;
    // THE PIN MUST WORK AFTER THE STUDENT'S MOVE: a pinner that is simply lost
    // on its square threatens nothing, so the book move stopped nothing (hand
    // grade 2026-10-14: "d4 keeps their bishop off g4" when Bg4 lost a piece
    // either way).
    if (legalSeeGainOn(t, z.to) > 0) continue;
    // THE PIN WAS ALREADY COMING: it lands from the board before either move,
    // so the book move prevents it rather than the student's move creating it
    // (sample 2026-10-14: "a3 keeps their bishop off h3" when only the
    // student's queen move made the pin).
    const pre = b2.moves({ verbose: true }).find((m) => m.from === z.from && m.to === z.to);
    if (!pre) continue;
    const tb = new Chess(b2.fen());
    tb.move(pre.san);
    const preePin = pinBy(tb, z.to, student);
    if (!preePin || preePin.pinned !== squares[1]) continue;
    // After the book move, is the same move gone or does it lose the piece?
    const legal = m2.moves({ verbose: true }).find((m) => m.from === z.from && m.to === z.to);
    let stopped = !legal;
    if (legal) {
      const t2 = new Chess(m2.fen());
      t2.move(legal.san);
      // Stopped when landing there now LOSES material (…h6: Bg5 hxg5 Nxg5 is
      // a bishop for a pawn), not only when it loses the whole piece.
      stopped = legalSeeGainOn(t2, z.to) > 0;
    }
    if (!stopped) continue;
    return {
      kind: 'stopsPin',
      squares,
      clause: `it keeps ${w.other} ${NAME[z.piece]} off ${z.to}, where it would pin ${w.own} ${NAME[pinnedType]} on ${squares[1]}`,
      short: `allows ${sayMoveNoun(z.san, p2.fen())}`,
    };
  }
  return null;
}

/** 3. CASTLE — the book move clears the way to castle and the student's does not. */
function castleJob(main: Chess, played: Chess, student: Color, mainFrom: Square, mainPiece: PieceSymbol, w: SeatWords = MINE): Omit<BookMoveWhy, 'text' | 'job'> & { clause: string; short: string } | null {
  // ONLY A PIECE THAT STOOD IN THE WAY clears the way (sample 2026-10-14: "the
  // pawn to d4 clears the last piece between your king and rook").
  const rank = student === 'w' ? '1' : '8';
  if (mainFrom[1] !== rank || mainPiece === 'k' || mainPiece === 'r') return null;
  const can = (b: Chess): { k: boolean; q: boolean } => {
    const t = asIfTheirMove(b, student);
    if (!t) return { k: false, q: false };
    const ms = t.moves();
    return { k: ms.includes('O-O'), q: ms.includes('O-O-O') };
  };
  const a = can(main); const b = can(played);
  const kSide = 'fg'.includes(mainFrom[0]); const qSide = 'bcd'.includes(mainFrom[0]);
  if (kSide && a.k && !b.k) return { kind: 'castle', squares: [], clause: `it clears the last piece between ${w.own} king and rook, so ${w.you} can castle next move`, short: 'keeps your king in the middle a move longer' };
  if (qSide && a.q && !b.q) return { kind: 'castle', squares: [], clause: 'it clears the way to castle long next move', short: 'keeps your king in the middle a move longer' };
  return null;
}

/** 4. DEVELOP — the book move brings a minor piece out from home while the
 *  student's move pushes a wing pawn or moves a piece that was already out. */
function developJob(mainMv: NonNullable<ReturnType<typeof after>>, playedMv: NonNullable<ReturnType<typeof after>>, student: Color, w: SeatWords = MINE): Omit<BookMoveWhy, 'text' | 'job'> & { clause: string; short: string } | null {
  const home = student === 'w' ? '1' : '8';
  const developsNew = (mainMv.piece === 'n' || mainMv.piece === 'b') && mainMv.from[1] === home;
  if (!developsNew) return null;
  const playedRepeats = playedMv.piece !== 'p' && playedMv.piece !== 'k' && playedMv.from[1] !== home;
  const playedWingPawn = playedMv.piece === 'p' && !'cdef'.includes(playedMv.from[0]);
  if (playedRepeats) {
    return { kind: 'develop', squares: [mainMv.to], clause: `it brings ${w.own} ${NAME[mainMv.piece]} out`, short: `moves your ${NAME[playedMv.piece]} a second time while the ${NAME[mainMv.piece]} still sits at home` };
  }
  if (playedWingPawn) {
    return { kind: 'develop', squares: [mainMv.to], clause: `it brings ${w.own} ${NAME[mainMv.piece]} out`, short: 'spends the move on a wing pawn, and a pawn move can\'t be taken back' };
  }
  return null;
}

/** 5. CENTRE — the book move hits more of d4/d5/e4/e5 than the student's. */
function centerJob(main: Chess, played: Chess, student: Color, mainTo: Square): Omit<BookMoveWhy, 'text' | 'job'> & { clause: string; short: string } | null {
  const hit = (b: Chess): Square[] => CENTER.filter((s) => b.attackers(s, student).length > 0 || b.get(s)?.color === student);
  // THE SQUARES ARE THE BOOK PIECE'S OWN — it stands there or hits them (hand
  // grade 2026-10-14: "f4 covers d5 and e4", squares the departing knight
  // used to cover).
  const own = CENTER.filter((x) => x === mainTo || main.attackers(x, student).includes(mainTo));
  const b = hit(played);
  const gained = own.filter((x) => !b.includes(x));
  if (gained.length === 0) return null;
  // Only the book piece itself STANDS on its square; a pawn already there is covered.
  const stands = gained.filter((x) => x === mainTo);
  const covers = gained.filter((x) => !stands.includes(x));
  const parts = [stands.length ? `it stands on ${stands.join(' and ')}` : '', covers.length ? `it covers ${covers.join(' and ')}` : ''].filter(Boolean);
  return { kind: 'center', squares: gained, clause: `it fights for the centre — ${parts.join(' and ')}`, short: `leaves ${gained.join(' and ')} to them` };
}

/** What castling does, in the mover's seat. */
function castlesClause(san: string, w: SeatWords): string {
  return san.startsWith('O-O-O')
    ? `it takes ${w.own} king out of the centre and brings ${w.own} rook to the d-file`
    : `it tucks ${w.own} king away on the wing and brings ${w.own} rook toward the centre`;
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
  // A CAPTURE'S POINT IS THE CAPTURE — what skipping it costs is the error
  // lane's (`errorWhy`), never a side effect read as its reason (sample
  // 2026-10-14: "the c-pawn taking on d5 keeps their bishop off h3").
  if (/x/.test(mainSan)) return null;
  let before: Chess;
  try { before = new Chess(fen); } catch { return null; }
  const castles = /^O-O/.test(mainSan) && !/^O-O/.test(playedSan)
    ? { kind: 'castle' as const, squares: [] as Square[], clause: castlesClause(mainSan, MINE), short: 'keeps your king in the middle a move longer' }
    : null;
  const castlesNext = castleJob(mainMv.board, playedMv.board, student, mainMv.from, mainMv.piece);
  const develops = developJob(mainMv, playedMv, student);
  // THE JOB, THEN ITS CONSEQUENCE (his register): a developing move that also
  // clears the way to castle is said as both — "it brings your knight out and
  // clears the way to castle next move" (vs-his-reads 2026-10-14: castle was
  // leading where he said "develops").
  const developsAndCastles = develops && castlesNext
    ? { ...develops, clause: `${develops.clause} and clears the way to castle next move` }
    : null;
  const job = rescueJob(before, mainMv, playedMv.board, student)
    ?? castles
    ?? guardJob(mainMv.board, playedMv.board, student, mainMv.to)
    ?? stopsJob(mainMv.board, playedMv.board, student, before)
    ?? prophylaxisJob(fen, mainMv, playedMv, student)
    ?? stopsPushJob(mainMv.board, playedMv.board, student, before)
    ?? tempoJob(mainMv, playedMv)
    ?? developsAndCastles
    ?? develops
    ?? clearsRoadJob(fen, mainSan)
    ?? preparesJob(mainMv.board, playedMv.board, student);
  const late = job ?? castlesNext ?? centerJob(mainMv.board, playedMv.board, student, mainMv.to);
  if (!late) return null;
  return {
    kind: late.kind,
    squares: late.squares,
    job: late.clause || null,
    // A job with no clause of its own (no tempo handed over) is said as the
    // student's move's cost: "The book move is X; Y lets them chase…".
    text: late.clause
      ? `The book move is ${sayMoveNoun(mainSan, fen)}: ${late.clause} — ${sayMoveNoun(playedSan, fen)} ${late.short}.`
      : `The book move is ${sayMoveNoun(mainSan, fen)}; ${sayMoveNoun(playedSan, fen)} ${late.short}.`,
  };
}
/** Every job a move does against the board BEFORE it (no rival move) — the
 *  read the measurement scores against his explanations of the same move. */
export function moveJobs(fen: string, san: string, student: Color): BookJobKind[] {
  const mv = after(fen, san);
  if (!mv) return [];
  let before: Chess;
  try { before = new Chess(fen); } catch { return []; }
  const them: Color = student === 'w' ? 'b' : 'w';
  const pass = asIfTheirMove(before, them);
  if (!pass) return [];
  const out: BookJobKind[] = [];
  if (guardJob(mv.board, pass, student, mv.to)) out.push('guard');
  if (stopsJob(mv.board, pass, student, before)) out.push('stopsPin');
  if (stopsPushJob(mv.board, pass, student, before)) out.push('stopsPush');
  const home = student === 'w' ? '1' : '8';
  if ((mv.piece === 'n' || mv.piece === 'b') && mv.from[1] === home) out.push('develop');
  if (preparesJob(mv.board, pass, student) || clearsRoadJob(fen, san)) out.push('prepares');
  const ph = findProphylaxis(fen);
  if (ph && ph.prevention.from === mv.from && ph.prevention.to === mv.to) out.push(ph.kind === 'pin' ? 'stopsPin' : 'stopsPush');
  if (/^O-O/.test(san) || castleJob(mv.board, pass, student, mv.from, mv.piece)) out.push('castle');
  if (centerJob(mv.board, pass, student, mv.to)) out.push('center');
  return out;
}

/** The capture the move before this one made, so a recapture can be said as
 *  one ("they took a pawn on f7; you take back a knight"). */
export interface PriorCapture { to: Square; captured: PieceSymbol }

/** Their pieces the moved piece now hits that matter: one worth more than
 *  it, or one hit more often than it is guarded. */
function hitTargets(board: Chess, from: Square, mover: Color, pawns = false): Array<{ square: Square; piece: PieceSymbol; attackers: number; with: Square[] }> {
  const me = board.get(from);
  if (!me) return [];
  const them: Color = mover === 'w' ? 'b' : 'w';
  const out: Array<{ square: Square; piece: PieceSymbol; attackers: number; with: Square[] }> = [];
  for (const row of board.board()) for (const c of row) {
    if (!c || c.color !== them || c.type === 'k') continue;
    const by = board.attackers(c.square, mover);
    if (!by.includes(from)) continue;
    const guards = board.attackers(c.square, them).length;
    // A PAWN is a target when it is hit more often than it is guarded: an
    // undefended pawn (2.Nf3 against e5, the fact 2…Nc6 then answers) or one
    // whose guards this move outnumbers (4.Ng5: knight and bishop against
    // f7, the king alone guarding it). A guarded pawn hit once is no attack.
    if (c.type === 'p' && !(pawns && by.length > guards)) continue;
    if (CAPTURE_VALUE[c.type] > CAPTURE_VALUE[me.type] || by.length > guards) out.push({ square: c.square, piece: c.type, attackers: by.length, with: by.filter((x) => x !== from) });
  }
  return out;
}

/** CAPTURES. A capture's point is what it takes and what it leaves: taking
 *  back what was just taken, a capture that also forks, a capture that wins
 *  material outright, or a trade they can answer. Read off the board. */
function captureJob(fen: string, mv: NonNullable<ReturnType<typeof after>>, mover: Color, w: SeatWords, prior: PriorCapture | null): (Omit<BookMoveWhy, 'text' | 'job'> & { clause: string } & JobContext) | null {
  let before: Chess;
  try { before = new Chess(fen); } catch { return null; }
  const took = before.get(mv.to);
  if (!took || took.color === mover) return null;
  const forks = hitTargets(mv.board, mv.to, mover);
  if (forks.length >= 2) {
    const named = forks.slice(0, 2).map((f) => `${w.other} ${NAME[f.piece]} on ${f.square}`).join(' and ');
    return { kind: 'fork', squares: [mv.to, ...forks.map((f) => f.square)], clause: `it takes on ${mv.to} and hits ${named} at once` };
  }
  if (prior && prior.to === mv.to) {
    const gain = CAPTURE_VALUE[took.type] - CAPTURE_VALUE[prior.captured];
    const giver = w.you === 'you' ? 'they' : 'you';
    // THE PRICE OF TAKING WITH THE KING (lead 2026-10-20, the Fried Liver's
    // …Kxf7): a piece given for a pawn bought the king's walk off its back
    // rank — that is what the sacrifice was for, and it is the point.
    const kingOut = mv.piece === 'k' && mv.to[1] !== (mover === 'w' ? '1' : '8');
    return {
      kind: 'recapture',
      squares: [mv.to],
      clause: gain > 0
        ? `it takes back on ${mv.to}: ${w.you} get ${withArticle(NAME[took.type])} for the ${NAME[prior.captured]} ${giver} took${kingOut ? `, but ${w.own} king has left its back rank to do it, out in the open — that is what ${giver} gave the ${NAME[took.type]} for` : ''}`
        : `it takes back on ${mv.to}, and the material is level again`,
    };
  }
  const back = mv.board.attackers(mv.to, mover === 'w' ? 'b' : 'w').length > 0;
  if (!back) return { kind: 'capture', squares: [mv.to], clause: `it wins ${w.other} ${NAME[took.type]} on ${mv.to}, and nothing can take back` };
  return { kind: 'capture', squares: [mv.to], clause: `it takes ${w.other} ${NAME[took.type]} on ${mv.to}, and ${w.you === 'you' ? 'they' : 'you'} can take back` };
}
const withArticle = (noun: string): string => (/^[aeiou]/.test(noun) ? `an ${noun}` : `a ${noun}`);

/** ADDS AN ATTACKER — the moved piece joins the attack on a piece of theirs
 *  that was already under fire, or hits one worth more than itself. */
function attackJob(mv: NonNullable<ReturnType<typeof after>>, mover: Color, w: SeatWords): (Omit<BookMoveWhy, 'text' | 'job'> & { clause: string }) | null {
  // The dearest target first: a piece over a pawn.
  const t = hitTargets(mv.board, mv.to, mover, true).sort((x, y) => CAPTURE_VALUE[y.piece] - CAPTURE_VALUE[x.piece])[0];
  if (!t) return challengeJob(mv, mover, w);
  const mate = t.with.length === 1 ? mv.board.get(t.with[0]) : null;
  const clause = t.attackers === 1
    ? `it attacks ${w.other} ${NAME[t.piece]} on ${t.square}`
    : mate
      ? `it joins ${w.own} ${NAME[mate.type]} on ${t.with[0]} against ${w.other} ${NAME[t.piece]} on ${t.square}`
      : `it adds ${times(t.attackers)} attacker on ${w.other} ${NAME[t.piece]} on ${t.square}`;
  return { kind: 'attack', squares: [mv.to, t.square, ...t.with], clause };
}

/** CHALLENGES AN EQUAL PIECE (10…Qf6 against the queen on f3): the moved
 *  piece faces one of theirs of the same value. When it is guarded where it
 *  stands, taking it is a trade — the move offers one. */
function challengeJob(mv: NonNullable<ReturnType<typeof after>>, mover: Color, w: SeatWords): (Omit<BookMoveWhy, 'text' | 'job'> & { clause: string }) | null {
  const me = mv.board.get(mv.to);
  if (!me || me.type === 'p' || me.type === 'k') return null;
  const them: Color = mover === 'w' ? 'b' : 'w';
  for (const row of mv.board.board()) for (const c of row) {
    if (!c || c.color !== them || c.type !== me.type) continue;
    if (!mv.board.attackers(c.square, mover).includes(mv.to)) continue;
    const guarded = mv.board.attackers(mv.to, mover).length > 0;
    const trade = me.type === 'q' ? 'queens' : `${NAME[me.type]}s`;
    return { kind: 'attack', squares: [mv.to, c.square], clause: guarded ? `it challenges ${w.other} ${NAME[c.type]} on ${c.square}, offering to trade ${trade}` : `it challenges ${w.other} ${NAME[c.type]} on ${c.square}` };
  }
  return null;
}

const TIMES = ['', 'once', 'twice', 'three times', 'four times'];
/**
 * WHAT A MOVE NOW ASKS OF THE OTHER SIDE (lead 2026-10-20: 4.Ng5 after the
 * story already said Ng5 joins the bishop against f7 — say what it asks, not
 * the claim again): the target is hit more often than it is guarded, so it
 * needs an answer this move. Null when it does not.
 */
export function whatItAsks(fenAfter: string, target: string, mover: Color, w: SeatWords): string | null {
  let b: Chess;
  try { b = new Chess(fenAfter); } catch { return null; }
  const x = b.get(target as Square);
  const them: Color = mover === 'w' ? 'b' : 'w';
  if (!x || x.color !== them) return null;
  const hit = b.attackers(target as Square, mover).length;
  const guards = b.attackers(target as Square, them);
  if (hit <= guards.length) return null;
  const by = guards.map((g) => NAME[b.get(g)?.type ?? 'p']);
  const guarded = guards.length === 0 ? 'not guarded at all'
    : `guarded ${TIMES[guards.length] ?? `${guards.length} times`}, by ${w.other} ${by.join(' and ')}`;
  return `Now ${w.other} ${NAME[x.type]} on ${target} is attacked ${TIMES[hit] ?? `${hit} times`} and ${guarded} — it needs an answer this move`;
}

/** "it guards d5" + "it gets out of reach" → one clause, in that order. */
const andThen = (first: string, second: string): string => `${first}, and ${second.replace(/^it /, '')}`;

/**
 * WHAT A MOVE DOES, WITH NO RIVAL (BACKLOG §6: the review walk says each
 * opening move's job as it is played, both sides). The same jobs
 * `bookMoveWhy` reads, against the board before the move instead of against
 * another move, in the MOVER's seat with the words of `w`. Null when the
 * board shows no job — never a generic line.
 */
export function moveJob(fen: string, san: string, mover: Color, w: SeatWords, prior: PriorCapture | null = null): (Omit<BookMoveWhy, 'text' | 'job'> & { clause: string } & JobContext) | null {
  const mv = after(fen, san);
  if (!mv) return null;
  let before: Chess;
  try { before = new Chess(fen); } catch { return null; }
  const them: Color = mover === 'w' ? 'b' : 'w';
  const pass = asIfTheirMove(before, them);
  if (!pass) return null;
  const job = rankedMoveJob(fen, san, mv, before, pass, mover, w, prior);
  // A CHECK IS ALWAYS SAID — it is what the move forces first.
  if (/\+$/.test(san)) {
    const check = (c: string): string => `it gives check and ${c.replace(/^it /, '')}`;
    return job ? { ...job, clause: check(job.clause), ...(job.compact ? { compact: check(job.compact) } : {}) } : { kind: 'attack', squares: [mv.to], clause: 'it gives check' };
  }
  return job;
}

/** The job, ranked by what the move CHANGES (lead 2026-10-20): a capture's
 *  own point, then a new attack, then the defence of a threatened piece, then
 *  development and the centre. A king's step that guards a piece says the
 *  guard first and the escape after. */
function rankedMoveJob(fen: string, san: string, mv: NonNullable<ReturnType<typeof after>>, before: Chess, pass: Chess, mover: Color, w: SeatWords, prior: PriorCapture | null): (Omit<BookMoveWhy, 'text' | 'job'> & { clause: string } & JobContext) | null {
  const them: Color = mover === 'w' ? 'b' : 'w';
  if (/x/.test(san)) return captureJob(fen, mv, mover, w, prior);
  if (/^O-O/.test(san)) return { kind: 'castle', squares: [], clause: castlesClause(san, w) };
  const home = mover === 'w' ? '1' : '8';
  const develops = (mv.piece === 'n' || mv.piece === 'b') && mv.from[1] === home
    ? { kind: 'develop' as const, squares: [mv.to], clause: `it brings ${w.own} ${NAME[mv.piece]} out` } : null;
  const castlesNext = castleJob(mv.board, pass, mover, mv.from, mv.piece, w);
  const rescue = rescueJob(before, mv, pass, mover, w);
  const guard = guardJob(mv.board, pass, mover, mv.to, w);
  // A KING STEP OUT OF CHECK is said as one: escaping a check is not
  // "taking the king out of reach" of a piece that merely eyed it.
  const checker = mv.piece === 'k' && before.inCheck()
    ? before.attackers(mv.from, them).map((sq) => ({ sq, p: before.get(sq) })).find((x) => !!x.p) ?? null
    : null;
  const escape = checker?.p ? { kind: 'rescue' as const, squares: [checker.sq], clause: `it gets ${w.own} king out of the check from ${w.other} ${NAME[checker.p.type]} on ${checker.sq}` } : null;
  const flight = escape ?? (mv.piece === 'k' ? rescue : null);
  if (mv.piece === 'k' && guard) {
    return {
      ...guard,
      squares: [...guard.squares, ...(flight?.squares ?? [])],
      clause: flight ? andThen(guard.clause, flight.clause) : guard.clause,
      ...(guard.compact ? { compact: flight ? andThen(guard.compact, flight.clause) : guard.compact } : {}),
    };
  }
  if (escape) return escape;
  // AN ATTACK THAT ALSO HOLDS A PIECE says both — 8…Nb4 hits c2 AND is the
  // third guard of the pinned knight on d5; either half alone misses the move.
  const attack = attackJob(mv, mover, w);
  const held = guard ? mv.board.get(guard.squares[0]) : null;
  if (attack && guard && held && held.type !== 'p') {
    return { ...guard, kind: 'attack', squares: [...attack.squares, ...guard.squares], clause: andThen(attack.clause, guard.clause), ...(guard.compact ? { compact: andThen(attack.clause, guard.compact) } : {}) };
  }
  return attack
    ?? rescue
    ?? guard
    ?? stopsJob(mv.board, pass, mover, before, w)
    ?? prophylaxisJob(fen, mv, { ...mv, board: pass }, mover, w)
    ?? stopsPushJob(mv.board, pass, mover, before, w)
    ?? (develops && castlesNext ? { ...develops, clause: `${develops.clause} and clears the way to castle next move` } : null)
    ?? clearsRoadJob(fen, san, w)
    ?? preparesJob(mv.board, pass, mover, w)
    ?? castlesNext
    ?? develops
    ?? centerJob(mv.board, pass, mover, mv.to);
}
