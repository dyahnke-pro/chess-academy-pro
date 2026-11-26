// THE THEORY READERS the composer speaks beside the plan and the decision
// (round 10, David 2026-11-26: structure, move order, gambit, endgame on the
// theory surfaces too). Pure over chess.js and the one computers that already
// own each fact: `namedStructure`, `boardStructure`, `openingEquivalence`. A
// reader returns a sentence only when the move CHANGED the board that way —
// never a standing description repeated every move.
import { Chess, type Color } from 'chess.js';
import { namedStructureFormed, namedStructureLine } from './namedStructure';
import { lockedPawnPairs, structureSignature } from './boardStructure';
import { openingEquivalence } from './openingEquivalence';
import { openingAtPosition } from './openingPositions';
import { transposedOpening } from './openingPositions';
import { detectOpeningByOrder } from './openingDetectionService';
import type { LocalDbMove } from './masterPlayLookup';
import { moveJob, MINE } from './bookMoveWhy';
import { NO_FOLLOW } from './exchangeLedger';
import { hangLine, trapLine } from './trapLine';
import { slipNoun } from './trapWords';
import { withoutCastleTail, composeTheoryTurn } from './theoryComposer';

export interface TheoryRead { text: string; squares: string[] }

const FILE_NAME: Record<string, string> = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h' };

/** The pawn structure the move made: a NAMED one (Carlsbad, Maroczy…), else a
 *  locked centre, an isolated central pawn, doubled pawns or a newly open file. */
export function structureRead(i: { fenBefore: string; san: string; mover: Color }): TheoryRead | null {
  const named = namedStructureFormed(i.fenBefore, i.san);
  if (named) return { text: namedStructureLine(named, i.mover), squares: named.squares };
  let after: Chess;
  try { after = new Chess(i.fenBefore); after.move(i.san); } catch { return null; }
  const was = structureSignature(i.fenBefore);
  const now = structureSignature(after.fen());
  if (!was || !now) return null;
  if (now.lockedCenter && !was.lockedCenter) {
    const pairs = lockedPawnPairs(after).filter((p) => 'cdef'.includes(p.white[0]));
    return { text: `The centre is locked: ${pairs.map((p) => `${p.white} and ${p.black}`).join(' and ')} face each other, so neither side can push there and the play moves to the wings.`, squares: pairs.flatMap((p) => [p.white, p.black]) };
  }
  if (now.iqp && !was.iqp) return { text: 'That leaves an isolated pawn in the centre: it grips the squares in front of it, but it has no pawn to guard it, so its pieces must.', squares: [] };
  if (now.doubled && !was.doubled) return { text: 'That doubles a pawn: a weakness to aim at, paid for with an open file.', squares: [] };
  const opened = now.openFiles.filter((f) => !was.openFiles.includes(f));
  if (opened.length) return { text: `The ${opened.map((f) => FILE_NAME[f] ?? f).join(' and ')}-file is open now: that is where rooks belong.`, squares: [] };
  return null;
}

/** A pawn the move offers: the opponent can take it and nothing takes back. */
export function gambitRead(i: { fenBefore: string; san: string; mover: Color }): TheoryRead | null {
  let c: Chess;
  try { c = new Chess(i.fenBefore); c.move(i.san); } catch { return null; }
  const them: Color = i.mover === 'w' ? 'b' : 'w';
  for (const m of c.moves({ verbose: true })) {
    if (m.captured !== 'p' || m.color !== them) continue;
    const t = new Chess(c.fen());
    t.move(m.san);
    if (t.attackers(m.to, i.mover).length === 0) {
      return { text: `It offers the pawn on ${m.to}. That is a gambit: the pawn is given for time and open lines, and the pawn can be taken because nothing takes the capturing piece back.`, squares: [m.to] };
    }
  }
  return null;
}

/** The queens come off: the game turns toward an endgame. */
export function endgameRead(i: { fenBefore: string; san: string }): TheoryRead | null {
  const was = structureSignature(i.fenBefore);
  let after: string;
  try { const c = new Chess(i.fenBefore); c.move(i.san); after = c.fen(); } catch { return null; }
  const now = structureSignature(after);
  if (!was || !now || !was.queensOn || now.queensOn) return null;
  return { text: 'The queens come off, so the game heads for an endgame: the pawn structure and an active king decide it now.', squares: [] };
}

/** The board is a named opening reached another way, or the same one with the
 *  colours reversed — the move order matters. */
export function moveOrderRead(i: { history: readonly string[]; student: Color }): TheoryRead | null {
  const eq = openingEquivalence(i.history, i.student);
  return eq ? { text: eq.text, squares: eq.squares } : null;
}

/** A TRANSPOSITION, said where the move order matters: the board IS a named
 *  opening the move order did not reach, or the masters' usual reply lands on
 *  one. "If they answer …c5, it transposes into the Sicilian Defense." */
export function transpositionRead(i: { history: readonly string[]; movesAt: (fen: string) => readonly LocalDbMove[] | null }): TheoryRead | null {
  const c = new Chess();
  try { for (const s of i.history) c.move(s); } catch { return null; }
  const now = transposedOpening(c.fen(), i.history.length, detectOpeningByOrder([...i.history]));
  if (now) return { text: `This transposes into the ${now}: the same position by another move order.`, squares: [] };
  const roads = i.movesAt(c.fen()) ?? [];
  const total = roads.reduce((n, m) => n + m.games, 0);
  for (const r of [...roads].sort((a, b) => b.games - a.games)) {
    if (total === 0 || r.games / total < 0.1) break;
    const next = new Chess(c.fen());
    let mv;
    try { mv = next.move(r.san); } catch { continue; }
    const into = transposedOpening(next.fen(), i.history.length + 1, detectOpeningByOrder([...i.history, r.san]));
    if (into) return { text: `If the reply is ${mv.color === 'b' ? '…' : ''}${r.san.replace(/[+#]$/, '')}, the game transposes into the ${into}.`, squares: [mv.to] };
    // …or the move after it does.
    const second = i.movesAt(next.fen()) ?? [];
    const total2 = second.reduce((n, m) => n + m.games, 0);
    for (const s2 of [...second].sort((a, b) => b.games - a.games)) {
      if (total2 === 0 || s2.games / total2 < 0.1) break;
      const n2 = new Chess(next.fen());
      let m2;
      try { m2 = n2.move(s2.san); } catch { continue; }
      const into2 = transposedOpening(n2.fen(), i.history.length + 2, detectOpeningByOrder([...i.history, r.san, s2.san]));
      if (into2) return { text: `After ${mv.color === 'b' ? '…' : ''}${r.san.replace(/[+#]$/, '')} and ${m2.color === 'b' ? '…' : ''}${s2.san.replace(/[+#]$/, '')}, the game transposes into the ${into2}.`, squares: [mv.to, m2.to] };
    }
  }
  return null;
}

const PIECE_NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** What the piece that just moved DOES where it stands (a piece move), or the
 *  fianchetto a pawn move prepares. Said by its job; no job, no sentence. */
export function pieceJobRead(i: { fenBefore: string; san: string; mover: Color }): TheoryRead | null {
  let c: Chess;
  let mv;
  try { c = new Chess(i.fenBefore); mv = c.move(i.san); } catch { return null; }
  const home = i.mover === 'w' ? '1' : '8';
  if (mv.piece === 'p' && ['g3', 'b3', 'g6', 'b6'].includes(mv.to) && c.get(`${mv.to[0] === 'g' ? 'f' : 'c'}${home}` as never)?.type === 'b') {
    return { text: `It prepares the fianchetto: the bishop will own the long diagonal from ${mv.to[0] === 'g' ? 'g' : 'b'}${home === '1' ? '2' : '7'}.`, squares: [mv.to] };
  }
  if (!PIECE_NAME[mv.piece]) return null;
  let job: ReturnType<typeof moveJob> = null;
  try { job = moveJob(i.fenBefore, i.san, i.mover, MINE, null, NO_FOLLOW); } catch { job = null; }
  if (!job?.clause) return null;
  const clause = withoutCastleTail(job.clause);
  return { text: `${PIECE_NAME[mv.piece].charAt(0).toUpperCase()}${PIECE_NAME[mv.piece].slice(1)} to ${mv.to}. It ${clause.replace(/^it /, '')}.`.replace(/^(\w+) to (\w+)\. It /, '$1 on $2: it '), squares: [mv.to] };
}

interface ClubGemRow { slip: string; punish: string }
/** THE TRAPS AROUND THE MOVE, from the club-gem index (`boards`, by 4-field
 *  FEN): the move played IS a known slip; a slip is available on this board;
 *  or one waits behind the masters' usual reply. Every line is replayed by
 *  `trapLine` (a blow that hits, checks, mates or takes nothing is not said). */
export function trapRead(i: { fenBefore: string; san: string; mover: Color; boards: Record<string, ClubGemRow[]>; movesAt: (fen: string) => readonly LocalDbMove[] | null }): TheoryRead | null {
  const key = (f: string): string => f.split(' ').slice(0, 4).join(' ');
  const them: Color = i.mover === 'w' ? 'b' : 'w';
  const slipBy = (slipper: Color): 'student' | 'opponent' => (slipper === i.mover ? 'student' : 'opponent');
  const say = (fen: string, g: ClubGemRow, slipper: Color, lead: string): TheoryRead | null => {
    const t = trapLine({ fen, slip: g.slip, punish: g.punish.split(/\s+/).filter(Boolean), slipBy: slipBy(slipper) });
    if (!t) return null;
    return { text: slipBy(slipper) === 'student' ? t.text : `${lead}${t.text}`, squares: t.squares };
  };
  // 1. The move played is a known slip.
  const slipHere = (i.boards[key(i.fenBefore)] ?? []).find((g) => g.slip.replace(/[+#]$/, '') === i.san.replace(/[+#]$/, ''));
  if (slipHere) {
    const r = say(i.fenBefore, slipHere, i.mover, '');
    if (r) return { text: `That is a known ${slipNoun('known-mistake', 'student')}. ${r.text}`, squares: r.squares };
  }
  let after: Chess;
  try { after = new Chess(i.fenBefore); after.move(i.san); } catch { return null; }
  // 2. A slip is on offer on this board.
  for (const g of i.boards[key(after.fen())] ?? []) {
    const r = say(after.fen(), g, them, 'A trap is set here. ');
    if (r) return r;
  }
  // 2b. The move attacks something, and a reply masters play ignores it.
  const hang = hangRead({ fen: after.fen(), mover: i.mover, movesAt: i.movesAt });
  if (hang) return hang;
  // 3. One waits behind the masters' usual reply.
  const roads = i.movesAt(after.fen()) ?? [];
  const total = roads.reduce((n, m) => n + m.games, 0);
  for (const road of [...roads].sort((a, b) => b.games - a.games)) {
    if (total === 0 || road.games / total < 0.15) break;
    const next = new Chess(after.fen());
    try { next.move(road.san); } catch { continue; }
    for (const g of i.boards[key(next.fen())] ?? []) {
      const r = say(next.fen(), g, i.mover, 'Behind the usual reply, a trap waits. ');
      if (r) return r;
    }
  }
  return null;
}

/** A GAMBIT ON OFFER: one of the masters' moves here reaches a position the
 *  opening index names a gambit ("Budapest Gambit", "Benko Gambit"). */
export function gambitAheadRead(i: { fen: string; movesAt: (fen: string) => readonly LocalDbMove[] | null }): TheoryRead | null {
  const roads = i.movesAt(i.fen) ?? [];
  const total = roads.reduce((n, m) => n + m.games, 0);
  for (const r of [...roads].sort((a, b) => b.games - a.games)) {
    if (total === 0 || r.games / total < 0.02) break;
    const c = new Chess(i.fen);
    let mv;
    try { mv = c.move(r.san); } catch { continue; }
    const name = openingAtPosition(c.fen())?.name;
    const gambit = name?.split(':')[0].match(/[A-Z][\w'’ -]*Gambit(?: (?:Accepted|Declined))?/)?.[0];
    if (gambit && !/(Queen|King).s Gambit (Accepted|Declined)/.test(gambit)) {
      return { text: `${mv.color === 'b' ? '…' : ''}${r.san.replace(/[+#]$/, '')} is the ${gambit}: a pawn is offered for time and open lines.`, squares: [mv.to] };
    }
  }
  return null;
}

const CENTRE: string[] = ['d4', 'e4', 'd5', 'e5'];
/** THE CENTRE, said when the move changes it: who holds it with pawns, or the
 *  tension between them. */
export function centreRead(i: { fenBefore: string; san: string; mover: Color }): TheoryRead | null {
  let b: Chess; let a: Chess;
  try { b = new Chess(i.fenBefore); a = new Chess(i.fenBefore); a.move(i.san); } catch { return null; }
  const held = (c: Chess, col: Color): string[] => CENTRE.filter((sq) => { const p = c.get(sq as never); return !!p && p.type === 'p' && p.color === col; });
  const sw = (col: Color): string => (col === 'w' ? 'White' : 'Black');
  const mine = held(a, i.mover); const myBefore = held(b, i.mover);
  const them: Color = i.mover === 'w' ? 'b' : 'w';
  if (mine.length >= 2 && myBefore.length < mine.length) return { text: `${sw(i.mover)} takes the centre with pawns on ${mine.join(' and ')}: space, and the pieces get room behind them.`, squares: mine };
  const theirs = held(a, them);
  if (mine.length && theirs.length) {
    const faced = mine.filter((sq) => theirs.some((t) => t[0] === sq[0]) || theirs.some((t) => Math.abs(t.charCodeAt(0) - sq.charCodeAt(0)) === 1 && Number(t[1]) !== Number(sq[1])));
    if (faced.length && held(b, i.mover).join() !== mine.join()) return { text: `The centre is tense: ${mine[0]} and ${theirs[0]} face each other, and a capture there can open the position.`, squares: [mine[0], theirs[0]] };
  }
  return null;
}

/** The hand-written and mined gems filed by the board of their slip, in the
 *  shape `trapRead` reads (the club index's own shape). Pure. */
export function gemBoards(gems: ReadonlyArray<{ lineMoves: string; inaccuracy: string; punish: string; punishSeq?: string[]; tier?: string; engineCp?: number | null }>): Record<string, ClubGemRow[]> {
  const out: Record<string, ClubGemRow[]> = {};
  for (const g of gems) {
    if (g.tier !== 'confirmed') continue;
    try {
      const c = new Chess();
      for (const m of g.lineMoves.split(/\s+/).filter(Boolean)) c.move(m);
      const key = c.fen().split(' ').slice(0, 4).join(' ');
      (out[key] ??= []).push({ slip: g.inaccuracy, punish: (g.punishSeq && g.punishSeq.length ? g.punishSeq : [g.punish]).join(' ') });
    } catch { /* a line that does not play is no gem */ }
  }
  return out;
}

let gemIndex: Record<string, ClubGemRow[]> | null = null;
/** The hand-written and mined gems by board, built once from the gem files. */
export function ownGemBoards(gems: Parameters<typeof gemBoards>[0]): Record<string, ClubGemRow[]> {
  gemIndex ??= gemBoards(gems);
  return gemIndex;
}

/** EVERYTHING ELSE THE THEORY SAYS ABOUT A MOVE, composed in order by
 *  `composeTheoryTurn`: the pawn structure it makes (or the centre it takes), a
 *  gambit it offers or one on offer, the transposition, the queens coming off,
 *  and a trap around it. A structure, an endgame turn or a gambit is news once a
 *  game (`said`). The piece's own job is said only when `withPieceJob` (the
 *  caller has no why of its own for the move). */
export function theoryExtras(i: {
  history: readonly string[]; fenBefore: string; san: string; mover: Color;
  movesAt: (fen: string) => readonly LocalDbMove[] | null;
  boards: Record<string, ClubGemRow[]>;
  said: Set<string>;
  withPieceJob: boolean;
}): string[] {
  const once = (kind: string, r: TheoryRead | null): TheoryRead | null => {
    if (!r || i.said.has(r.text) || i.said.has(`kind:${kind}`)) return null;
    i.said.add(`kind:${kind}`); i.said.add(r.text);
    return r;
  };
  const fresh = (r: TheoryRead | null): TheoryRead | null => { if (!r || i.said.has(r.text)) return null; i.said.add(r.text); return r; };
  const turn = composeTheoryTurn({
    fen: i.fenBefore, san: i.san, mover: i.mover, whose: 'your', roads: [],
    structure: once('structure', structureRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover }) ?? centreRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover })),
    gambit: once('gambit', gambitRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover }) ?? gambitAheadRead({ fen: (() => { const c = new Chess(i.fenBefore); c.move(i.san); return c.fen(); })(), movesAt: i.movesAt })),
    endgame: once('endgame', endgameRead({ fenBefore: i.fenBefore, san: i.san })),
    moveOrder: fresh(moveOrderRead({ history: [...i.history, i.san], student: i.mover }) ?? transpositionRead({ history: [...i.history, i.san], movesAt: i.movesAt })),
    trapSaid: fresh(trapRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover, boards: i.boards, movesAt: i.movesAt })),
    pieceJob: i.withPieceJob ? fresh(pieceJobRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover })) : null,
    said: i.said,
  });
  return turn.map((t) => t.text);
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
/** A REPLY THAT IGNORES THE ATTACK: the move just played attacks a piece (worth
 *  more than the attacker, or undefended), a reply the masters really play
 *  leaves it there, and the capture wins it. Said as the approved off-line hang. */
export function hangRead(i: { fen: string; mover: Color; movesAt: (fen: string) => readonly LocalDbMove[] | null }): TheoryRead | null {
  const them: Color = i.mover === 'w' ? 'b' : 'w';
  const roads = i.movesAt(i.fen) ?? [];
  const total = roads.reduce((n, m) => n + m.games, 0);
  if (total === 0) return null;
  for (const road of [...roads].sort((a, b) => b.games - a.games)) {
    if (road.games / total < 0.03) break;
    const c = new Chess(i.fen);
    try { c.move(road.san); } catch { continue; }
    for (const cap of c.moves({ verbose: true })) {
      if (cap.color !== i.mover || !cap.captured || cap.captured === 'p') continue;
      const worth = (VAL[cap.captured] ?? 0) - ((VAL[cap.piece] ?? 9));
      const t = new Chess(c.fen());
      t.move(cap.san);
      const defended = t.attackers(cap.to, them).length > 0;
      if (defended && worth <= 0) continue;
      const line = hangLine({ fen: i.fen, ignore: road.san, takes: cap.san, ignoredBy: 'opponent' });
      if (line) return line;
    }
  }
  return null;
}

