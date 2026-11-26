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
import { pawnMajority } from './pawnMajority';
import { inFluxAfter } from './boardState';
import { openingAtPosition } from './openingPositions';
import { transposedOpening } from './openingPositions';
import { detectOpeningByOrder } from './openingDetectionService';
import type { LocalDbMove } from './masterPlayLookup';
import { moveJob, MINE } from './bookMoveWhy';
import { NO_FOLLOW } from './exchangeLedger';
import { hangLine, trapLine } from './trapLine';
import { slipNoun, knownLead } from './trapWords';
import { classifySlip, type SlipKind } from './trapComputer';
import { MATE_CP } from './mateScale';
import type { ClubGem } from './clubGems';
import { withoutCastleTail, composeTheoryTurn } from './theoryComposer';
import { andList } from '../utils/andList';

export interface TheoryRead { text: string; squares: string[] }

const FILE_NAME: Record<string, string> = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h' };

/** The pawn structure the move made: a NAMED one (Carlsbad, Maroczy…), else a
 *  locked centre, an isolated central pawn, doubled pawns or a newly open file. */
export function structureRead(i: { fenBefore: string; san: string; mover: Color;
  /** The move before this one (its board and SAN), so a recapture is read
   *  against the board before the trade began. */
  prior?: { fenBefore: string; san: string } | null;
}): TheoryRead | null {
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
  // A capture the other side takes back at once is an exchange in flight: the
  // doubled or isolated pawn it shows is not on the board after the recapture.
  const inFlight = inFluxAfter(i.fenBefore, i.san) !== null;
  if (now.iqp && !was.iqp && !inFlight) return { text: 'That leaves an isolated pawn in the centre: it grips the squares in front of it, but it has no pawn to guard it, so its pieces must.', squares: [] };
  if (now.doubled && !was.doubled && !inFlight) return { text: 'That doubles a pawn: a weakness to aim at, paid for with an open file.', squares: [] };
  const opened = now.openFiles.filter((f) => !was.openFiles.includes(f));
  if (opened.length) return { text: `The ${opened.map((f) => FILE_NAME[f] ?? f).join(' and ')}-file is open now: that is where rooks belong.`, squares: [] };
  // A pawn majority the move made: more pawns on a wing (or in the centre)
  // than the other side has there — the passed pawn of the long run.
  const pawnsOn = (c: Chess, f: string, col: Color): string[] => ['1', '2', '3', '4', '5', '6', '7', '8'].map((r) => `${f}${r}`).filter((sq) => { const p = c.get(sq as never); return !!p && p.type === 'p' && p.color === col; });
  const before = new Chess(i.fenBefore);
  const centre = (c: Chess, col: Color): number => pawnsOn(c, 'd', col).length + pawnsOn(c, 'e', col).length;
  // A recapture is read against the board before the trade began.
  const base = i.prior && inFluxAfter(i.prior.fenBefore, i.prior.san) ? new Chess(i.prior.fenBefore) : before;
  let majority: string | null = null;
  for (const col of ['w', 'b'] as Color[]) {
    const foe: Color = col === 'w' ? 'b' : 'w';
    if (!majority && !inFlight && centre(after, col) > centre(after, foe) && !(centre(base, col) > centre(base, foe))) {
      majority = `${col === 'w' ? 'White' : 'Black'} has the central pawn majority now: more pawns on the d- and e-files to build the centre with.`;
    }
  }
  // A wing majority made: the one majority computer (`pawnMajority`), read
  // against the board before the trade began.
  if (!majority) {
    const made = pawnMajority(i.fenBefore, i.san, i.prior ?? null);
    if (made?.event === 'created' && made.majority.healthy) {
      majority = `${made.majority.side === 'w' ? 'White' : 'Black'} has the ${made.majority.wing} pawn majority now: in the long run it makes a passed pawn there.`;
    }
  }
  // A file half-open for one side (its own pawn gone, theirs still there): the
  // rook's file, aimed at that pawn. The mover's file first.
  for (const col of [i.mover, i.mover === 'w' ? 'b' : 'w'] as Color[]) {
    const foe: Color = col === 'w' ? 'b' : 'w';
    for (const f of 'abcdefgh') {
      if (pawnsOn(before, f, col).length === 0 || pawnsOn(after, f, col).length > 0) continue;
      const target = pawnsOn(after, f, foe);
      if (!target.length || pawnsOn(before, f, foe).length === 0) continue;
      const aim = col === 'w' ? target[0] : target[target.length - 1];
      return { text: `The ${f}-file is half-open for ${col === 'w' ? 'White' : 'Black'} now: a rook there bears down on the pawn on ${aim}.${majority ? ` ${majority}` : ''}`, squares: [aim] };
    }
  }
  if (majority) return { text: majority, squares: [] };
  // A PAWN CHAIN the move makes: the moved pawn joins a diagonal of three or
  // more of the mover's pawns. Its base (the pawn nearest home) is where the
  // other side strikes at it.
  const mv = after.history({ verbose: true }).pop();
  if (mv?.piece === 'p') {
    const mine = (c: Chess, sq: string): boolean => { const p = c.get(sq as never); return !!p && p.type === 'p' && p.color === i.mover; };
    const chainThrough = (c: Chess, sq: string): string[] => {
      const best: string[][] = [];
      for (const df of [1, -1]) {
        const line = [sq];
        for (const dir of [1, -1]) {
          let f = sq.charCodeAt(0); let r = Number(sq[1]);
          for (;;) {
            f += df * dir; r += dir;
            const s = `${String.fromCharCode(f)}${r}`;
            if (f < 97 || f > 104 || r < 1 || r > 8 || !mine(c, s)) break;
            line.push(s);
          }
        }
        best.push(line);
      }
      return best.sort((a, b) => b.length - a.length)[0];
    };
    const chain = chainThrough(after, mv.to);
    if (chain.length >= 3 && chainThrough(before, mv.from).length < 3) {
      const sorted = [...chain].sort((a, b) => (i.mover === 'w' ? Number(a[1]) - Number(b[1]) : Number(b[1]) - Number(a[1])));
      return { text: `That makes a pawn chain, ${andList(sorted)}: solid, and its base on ${sorted[0]} is where it can be attacked.`, squares: sorted };
    }
    // SPACE: a centre pawn on the fifth rank no pawn of theirs can take.
    const fifth = i.mover === 'w' ? '5' : '4';
    if ('cdef'.includes(mv.to[0]) && mv.to[1] === fifth && after.attackers(mv.to as never, i.mover === 'w' ? 'b' : 'w').every((s) => after.get(s)?.type !== 'p')) {
      return { text: `The pawn on ${mv.to} takes space: it cramps their pieces behind it and splits the board.`, squares: [mv.to] };
    }
  }
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

/** The queens come off: the game turns toward an endgame. Said when the move
 *  takes the last queen off, when the queens are already off (an opening that
 *  goes straight to an ending, the Berlin's), or when the masters' usual reply
 *  trades them. */
export function endgameRead(i: { fenBefore: string; san: string; movesAt?: (fen: string) => readonly LocalDbMove[] | null }): TheoryRead | null {
  const was = structureSignature(i.fenBefore);
  let after: string;
  try { const c = new Chess(i.fenBefore); c.move(i.san); after = c.fen(); } catch { return null; }
  const now = structureSignature(after);
  if (!was || !now) return null;
  if (was.queensOn && !now.queensOn) return { text: 'The queens come off, so the game heads for an endgame: the pawn structure and an active king decide it now.', squares: [] };
  if (!was.queensOn && !now.queensOn) return { text: 'With the queens off the board, this is already an endgame in spirit: the pawn structure and the king\'s activity matter more than an attack.', squares: [] };
  const roads = i.movesAt?.(after) ?? [];
  const total = roads.reduce((n, m) => n + m.games, 0);
  const top = [...roads].sort((a, b) => b.games - a.games)[0];
  if (top && total > 0 && top.games / total >= 0.3) {
    const c = new Chess(after);
    let mv;
    try { mv = c.move(top.san); } catch { return null; }
    if (mv.captured === 'q' && mv.piece === 'q') return { text: `The usual reply ${mv.color === 'b' ? '…' : ''}${top.san.replace(/[+#]$/, '')} trades the queens: the game is heading for an endgame.`, squares: [mv.to] };
  }
  return null;
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
/** A name with its article: "the Sicilian Defense", "Petrov's Defense". */
const theName = (name: string): string => (/^(?!King|Queen)\S+['’]s\b/.test(name) ? name : `the ${name}`);

export function transpositionRead(i: { history: readonly string[]; movesAt: (fen: string) => readonly LocalDbMove[] | null }): TheoryRead | null {
  const c = new Chess();
  try { for (const s of i.history) c.move(s); } catch { return null; }
  const now = transposedOpening(c.fen(), i.history.length, detectOpeningByOrder([...i.history]));
  if (now) return { text: `This transposes into ${theName(now)}: the same position by another move order.`, squares: [] };
  // The masters' roads ahead, shallowest first: a road at the next move counts
  // from 2% of their games (the named-roads bar), a deeper one from 10%.
  type Node = { fen: string; sans: string[]; history: string[] };
  let frontier: Node[] = [{ fen: c.fen(), sans: [], history: [...i.history] }];
  for (let depth = 1; depth <= 3; depth += 1) {
    const next: Node[] = [];
    for (const node of frontier) {
      const roads = i.movesAt(node.fen) ?? [];
      const total = roads.reduce((n, m) => n + m.games, 0);
      for (const r of [...roads].sort((a, b) => b.games - a.games)) {
        if (total === 0 || r.games / total < (depth === 1 ? 0.02 : 0.1)) break;
        const n2 = new Chess(node.fen);
        let mv;
        try { mv = n2.move(r.san); } catch { continue; }
        const said = `${mv.color === 'b' ? '…' : ''}${r.san.replace(/[+#]$/, '')}`;
        const history = [...node.history, r.san];
        const into = transposedOpening(n2.fen(), history.length, detectOpeningByOrder(history));
        const sans = [...node.sans, said];
        if (into) {
          return sans.length === 1
            ? { text: `If the reply is ${sans[0]}, the game transposes into ${theName(into)}.`, squares: [mv.to] }
            : { text: `After ${andList(sans)}, the game transposes into ${theName(into)}.`, squares: [mv.to] };
        }
        next.push({ fen: n2.fen(), sans, history });
      }
    }
    frontier = next;
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

/** THE TRAPS AROUND THE MOVE, from the one known-slip index (`slipsAt` —
 *  `knownSlips.knownSlipsAt`: the club index, the curated gems where it holds
 *  none): the move played IS a known slip; a slip is available on this board;
 *  or one waits behind a road masters play. Each slip is classified by the one
 *  trap computer (`classifySlip`: a trap, a known mistake, or nothing to say)
 *  and worded by the seat (`trapWords`); every line is replayed by `trapLine`
 *  (a blow that hits, checks, mates or takes nothing is not said). */
export function trapRead(i: { fenBefore: string; san: string; mover: Color; slipsAt: (fen: string) => readonly ClubGem[]; movesAt: (fen: string) => readonly LocalDbMove[] | null }): TheoryRead | null {
  const them: Color = i.mover === 'w' ? 'b' : 'w';
  const slipBy = (slipper: Color): 'student' | 'opponent' => (slipper === i.mover ? 'student' : 'opponent');
  const kindOf = (fen: string, g: ClubGem): SlipKind | null => classifySlip({ engineCp: g.mate ? MATE_CP : g.endCp, line: { fen, slip: g.slip, punish: g.punish.split(/\s+/).filter(Boolean) } });
  const say = (fen: string, g: ClubGem, slipper: Color, lead: (kind: SlipKind) => string): TheoryRead | null => {
    const kind = kindOf(fen, g);
    if (!kind) return null;
    const t = trapLine({ fen, slip: g.slip, punish: g.punish.split(/\s+/).filter(Boolean), slipBy: slipBy(slipper) });
    if (!t) return null;
    return { text: slipBy(slipper) === 'student' ? t.text : `${lead(kind)}${t.text}`, squares: t.squares };
  };
  // 1. The move played is a known slip.
  const slipHere = i.slipsAt(i.fenBefore).find((g) => g.slip.replace(/[+#]$/, '') === i.san.replace(/[+#]$/, ''));
  if (slipHere) {
    const kind = kindOf(i.fenBefore, slipHere);
    const r = kind ? say(i.fenBefore, slipHere, i.mover, () => '') : null;
    if (kind && r) return { text: `That is ${knownLead(kind, 'student')}. ${r.text}`, squares: r.squares };
  }
  let after: Chess;
  try { after = new Chess(i.fenBefore); after.move(i.san); } catch { return null; }
  // 2. A slip is on offer on this board.
  for (const g of i.slipsAt(after.fen())) {
    const r = say(after.fen(), g, them, (kind) => (slipNoun(kind, 'opponent') === 'trap' ? 'A trap is set here. ' : 'A known mistake is on offer here. '));
    if (r) return r;
  }
  // 2b. The move attacks something, and a reply masters play ignores it.
  const hang = hangRead({ fen: after.fen(), mover: i.mover, movesAt: i.movesAt });
  if (hang) return hang;
  // 3. One waits behind the masters' usual reply.
  const roads = i.movesAt(after.fen()) ?? [];
  const total = roads.reduce((n, m) => n + m.games, 0);
  for (const road of [...roads].sort((a, b) => b.games - a.games)) {
    // The roads masters play (the named-roads bar: 2% of their games).
    if (total === 0 || road.games / total < 0.02) break;
    const next = new Chess(after.fen());
    try { next.move(road.san); } catch { continue; }
    // The slip behind the road is the mover's own: said as a "Watch out".
    for (const g of i.slipsAt(next.fen())) {
      const r = say(next.fen(), g, i.mover, () => '');
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
  // Where masters' games are thin, any legal move the opening index names a
  // gambit ("5.Nd5!? is the Belgrade gambit").
  if (!roads.length) {
    let c: Chess;
    try { c = new Chess(i.fen); } catch { return null; }
    for (const m of c.moves({ verbose: true })) {
      c.move(m.san);
      const name = openingAtPosition(c.fen())?.name;
      c.undo();
      const last = name?.split(/[:,]/).pop()?.trim() ?? '';
      const here = openingAtPosition(i.fen)?.name ?? '';
      if (!name || name === here || !/Gambit$/.test(last) || here.includes(last)) continue;
      const offer = gambitRead({ fenBefore: i.fen, san: m.san, mover: m.color })?.squares[0];
      return { text: `${m.color === 'b' ? '…' : ''}${m.san.replace(/[+#]$/, '')} is the ${last}: it gives up ${offer ? `the pawn on ${offer}` : 'material'} for time and open lines.`, squares: [m.to, ...(offer ? [offer] : [])] };
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

/** EVERYTHING ELSE THE THEORY SAYS ABOUT A MOVE, composed in order by
 *  `composeTheoryTurn`: the pawn structure it makes (or the centre it takes), a
 *  gambit it offers or one on offer, the transposition, the queens coming off,
 *  and a trap around it. A structure, an endgame turn or a gambit is news once a
 *  game (`said`). The piece's own job is said only when `withPieceJob` (the
 *  caller has no why of its own for the move). */
/** The move before the last of `history`, with its board. */
function priorOf(history: readonly string[]): { fenBefore: string; san: string } | null {
  if (!history.length) return null;
  try { const c = new Chess(); for (const s of history.slice(0, -1)) c.move(s); return { fenBefore: c.fen(), san: history[history.length - 1] }; } catch { return null; }
}

export function theoryExtras(i: {
  history: readonly string[]; fenBefore: string; san: string; mover: Color;
  movesAt: (fen: string) => readonly LocalDbMove[] | null;
  slipsAt: (fen: string) => readonly ClubGem[];
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
    structure: once('structure', structureRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover, prior: priorOf(i.history) }) ?? centreRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover })),
    gambit: once('gambit', gambitRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover }) ?? gambitAheadRead({ fen: (() => { const c = new Chess(i.fenBefore); c.move(i.san); return c.fen(); })(), movesAt: i.movesAt }) ?? gambitStandingRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover })),
    endgame: once('endgame', endgameRead({ fenBefore: i.fenBefore, san: i.san, movesAt: i.movesAt })),
    namedRoads: fresh(namedRoadsRead({ fen: (() => { const c = new Chess(i.fenBefore); c.move(i.san); return c.fen(); })(), movesAt: i.movesAt })),
    moveOrder: fresh(moveOrderRead({ history: [...i.history, i.san], student: i.mover }) ?? transpositionRead({ history: [...i.history, i.san], movesAt: i.movesAt })),
    trapSaid: fresh(trapRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover, slipsAt: i.slipsAt, movesAt: i.movesAt })),
    pieceJob: i.withPieceJob ? fresh(pieceJobRead({ fenBefore: i.fenBefore, san: i.san, mover: i.mover })) : null,
    said: i.said,
  });
  return turn.map((t) => t.text);
}

/** An opening name said relative to the one the game is in: the family part
 *  dropped when shared ("the Mieses Variation"), with its article. Null when
 *  it is the current opening itself. */
export function nameRelativeTo(name: string, current: string): string | null {
  const n = name.trim();
  let base = current.trim();
  if (!n || n === base) return null;
  // The longest part of the current name the new one extends: "Vienna Game:
  // Stanley Variation, Meitner-Mieses Gambit" under "Vienna Game: Stanley
  // Variation" is "the Meitner-Mieses Gambit".
  let short = n;
  for (;;) {
    if (n.startsWith(`${base},`) || n.startsWith(`${base}:`)) { short = n.slice(base.length + 1).trim(); break; }
    const cut = Math.max(base.lastIndexOf(','), base.lastIndexOf(':'));
    if (cut <= 0) break;
    base = base.slice(0, cut).trim();
  }
  // The road's own name is its last part ("Stanley Variation, Three Knights
  // Variation" → "Three Knights Variation").
  short = short.split(',').pop()?.trim() ?? '';
  if (!short) return null;
  // A bare adjective is said with its family ("Closed" → "Closed Sicilian").
  if (!/(?:Variation|Defen[cs]e|Gambit|Attack|System|Line|Opening|Game|Countergambit|Trap)$/i.test(short)) {
    const head = n.split(':')[0].replace(/\s+(?:Defen[cs]e|Opening|Game)$/i, '').trim();
    if (head && !short.includes(head)) short = `${short} ${head}`;
  }
  return /^\S+['’]s\b/.test(short) ? short : `the ${short}`;
}

/** THE ROADS BY NAME (Wikibooks' way: "5.Nd5!? is the Belgrade gambit"). The
 *  side to move's legal moves that reach a position the opening index names,
 *  each said by its name relative to where the game is. Masters' moves first.
 *  A gambit road is left to `gambitAheadRead`. Null with no named road. */
export function namedRoadsRead(i: { fen: string; movesAt: (fen: string) => readonly LocalDbMove[] | null; skip?: ReadonlySet<string> }): TheoryRead | null {
  let c: Chess;
  try { c = new Chess(i.fen); } catch { return null; }
  const here = openingAtPosition(i.fen)?.name ?? '';
  const share = new Map((i.movesAt(i.fen) ?? []).map((m) => [m.san.replace(/[+#]$/, ''), m.games]));
  const roads: Array<{ san: string; to: string; said: string; games: number }> = [];
  const names = new Set<string>();
  for (const m of c.moves({ verbose: true })) {
    c.move(m.san);
    const name = openingAtPosition(c.fen())?.name;
    c.undo();
    if (!name || name === here || names.has(name)) continue;
    if (/Gambit/.test(name.split(',').pop() ?? '')) continue;
    const said = here ? nameRelativeTo(name, here) : `the ${name}`;
    if (!said || i.skip?.has(said)) continue;
    names.add(name);
    roads.push({ san: m.san, to: m.to, said, games: share.get(m.san.replace(/[+#]$/, '')) ?? 0 });
  }
  // A bar, never a count: the named roads masters play (2% of their games
  // here) — a road nobody plays is a name, not theory.
  const total = [...share.values()].reduce((n, g) => n + g, 0);
  const said = roads.filter((r) => total > 0 && r.games / total >= 0.02).sort((a, b) => b.games - a.games);
  if (!said.length) return null;
  const mover = c.turn();
  const parts = said.map((r) => `${mover === 'b' ? '…' : ''}${r.san.replace(/[+#]$/, '')} ${r.said}`);
  const text = parts.length === 1
    ? `${parts[0].replace(/ (the |\S+['’]s )/, ' is $1')}.`
    : `The roads from here have names: ${andList(parts)}.`;
  return { text, squares: said.map((r) => r.to) };
}


const MAT: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function balance(c: Chess): { pawns: number; pieces: number } {
  let pawns = 0; let pieces = 0;
  for (const row of c.board()) for (const p of row) {
    if (!p) continue;
    const s = p.color === 'w' ? 1 : -1;
    if (p.type === 'p') pawns += s; else pieces += s * MAT[p.type];
  }
  return { pawns, pieces };
}
/** THE GAMBIT STANDING: one side is a pawn or two down, the pieces level, and
 *  it was so before the move too (a capture waiting to be taken back is not a
 *  standing). Said from the board: who gave the pawn and what it buys. */
export function gambitStandingRead(i: { fenBefore: string; san: string; mover: Color }): TheoryRead | null {
  let b: Chess; let a: Chess;
  try { b = new Chess(i.fenBefore); a = new Chess(i.fenBefore); a.move(i.san); } catch { return null; }
  const was = balance(b); const now = balance(a);
  if (now.pieces !== 0 || was.pieces !== 0) return null;
  if (Math.abs(now.pawns) < 1 || Math.abs(now.pawns) > 2 || Math.sign(was.pawns) !== Math.sign(now.pawns)) return null;
  // A pawn the side down can take back at once is an exchange in flight.
  const down: Color = now.pawns > 0 ? 'b' : 'w';
  if (a.turn() === down && a.moves({ verbose: true }).some((m) => m.captured === 'p' && a.attackers(m.to, down === 'w' ? 'b' : 'w').length === 0)) return null;
  const n = Math.abs(now.pawns);
  const Side = down === 'w' ? 'White' : 'Black';
  return { text: `${Side} is ${n === 1 ? 'a pawn' : 'two pawns'} down here: that is the gambit's price, paid for time, development and open lines.`, squares: [] };
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

