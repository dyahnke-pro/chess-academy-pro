// pawnMajority — THE PAWN MAJORITY ON A WING (Danya: "White gets a queenside
// pawn majority, you get a kingside majority"; "kingside pawn majority you
// could push with g4 — let's go for it"; "roll the kingside majority"). More
// pawns than the other side on one wing means a passed pawn can be made there:
// push them together and one of them comes through.
//
// THE READ, on the one wing read (`boardStructure.wingPawns`, queenside a–d,
// kingside e–h): a side has a majority on a wing when it has more pawns there
// than the other side and the other side has at least one (no pawns against
// is a passed pawn, said by its own computers). It can make a passed pawn —
// it is HEALTHY — when its pawns stand on more files than the other side has
// pawns there; doubled pawns that leave it fewer files are a crippled
// majority (the Exchange Ruy Lopez's queenside). Its LEAD is its most
// advanced pawn with no enemy pawn on its file ahead: the one that can run.
//
// THE MOVE, either seat, against the board before it — or, when the move
// takes back in a trade, the board before the trade began (`prior`), so a
// pawn trade in flight never reads as a majority made and lost:
//   created  — a majority neither had before (both, when a trade splits the
//              wings: the Alekhine Exchange's …cxd6);
//   crippled — a healthy majority left doubled on fewer files;
//   gave-up  — a majority gone;
//   advance  — the mover's own healthy majority set moving: one of its pawns
//              leaves its starting rank.
// Silent while the trade is still in flight (the reply takes back without
// loss, `boardState.inFluxAfter`).
//
// PURE: chess.js and the structure reader.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { wingPawns, type Wing } from './boardStructure';
import { inFluxAfter } from './boardState';
import { materialBalance } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';
import type { IdeaKind } from './ideaKind';

export interface WingMajority {
  side: Color;
  wing: Wing;
  /** The side's pawns on the wing, and the other side's. */
  count: number;
  against: number;
  /** It can make a passed pawn: on more files than the pawns against it. */
  healthy: boolean;
  /** Its most advanced pawn with no enemy pawn ahead on its file. */
  lead: Square | null;
  /** Its doubled files on the wing (why a majority is crippled). */
  doubled: string[];
}

export type MajorityEvent = 'created' | 'crippled' | 'gave-up' | 'advance';

export interface PawnMajority {
  event: MajorityEvent;
  /** The side that moved, and the square its move landed on. */
  mover: Color;
  to: Square;
  /** The majority the move changed, read after it (before it, for gave-up). */
  majority: WingMajority;
  /** The other side's majority the same trade made, on the other wing. */
  split: WingMajority | null;
  /** The pawns on the wing after the move, for gave-up. */
  now: { count: number; against: number };
  key: string;
}

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

/** How far `sq` stands up the board from `side`'s seat: 1 its back rank. */
function relRank(sq: string, side: Color): number {
  return side === 'w' ? Number(sq[1]) : 9 - Number(sq[1]);
}

/** Every wing majority on the board. */
export function wingMajorities(fen: string): WingMajority[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  const pawns = wingPawns(c);
  const out: WingMajority[] = [];
  for (const side of ['w', 'b'] as const) {
    for (const wing of ['queenside', 'kingside'] as const) {
      const mine = pawns[side][wing];
      const theirs = pawns[other(side)][wing];
      if (mine.length <= theirs.length || theirs.length === 0) continue;
      const files = new Set(mine.map((s) => s[0]));
      const doubled = [...files].filter((f) => mine.filter((s) => s[0] === f).length >= 2).sort();
      const ahead = (s: string): boolean => theirs.some((t) => t[0] === s[0] && relRank(t, side) > relRank(s, side));
      const free = mine.filter((s) => !ahead(s)).sort((a, b) => relRank(b, side) - relRank(a, side));
      out.push({
        side, wing, count: mine.length, against: theirs.length,
        healthy: files.size > theirs.length,
        lead: (free[0] as Square | undefined) ?? null,
        doubled,
      });
    }
  }
  return out;
}

const find = (ms: readonly WingMajority[], side: Color, wing: Wing): WingMajority | undefined =>
  ms.find((m) => m.side === side && m.wing === wing);

/**
 * The majority made, crippled, given up or set moving by `san` on
 * `fenBefore` (either seat), or null. `prior`: the move before it (the board
 * before it and its SAN), so a recapture is read against the board before the
 * trade began; null where there was none.
 */
export function pawnMajority(fenBefore: string, san: string, prior: { fenBefore: string; san: string } | null): PawnMajority | null {
  let c: Chess;
  let m: Move;
  try { c = new Chess(fenBefore); m = c.move(san.replace(/[!?]+$/, '')); } catch { return null; }
  // A trade still in flight is not the board the game goes on with.
  if (inFluxAfter(fenBefore, m.san)) return null;
  // The move takes back: the trade began a move earlier.
  const priorInFlux = prior ? inFluxAfter(prior.fenBefore, prior.san) : null;
  if (m.captured && !prior) return null;
  const base = prior && priorInFlux && m.captured ? prior.fenBefore : fenBefore;
  const fenAfter = c.fen();
  const was = wingMajorities(base);
  const now = wingMajorities(fenAfter);
  // With the pawns level a majority on one wing is a minority on the other —
  // the structure. A side a pawn up has a majority by material: a pawn won or
  // lost is said by what the move won, not as a majority made or given up.
  const level = (fen: string): boolean => {
    try { const p = wingPawns(new Chess(fen)); return p.w.queenside.length + p.w.kingside.length === p.b.queenside.length + p.b.kingside.length; } catch { return false; }
  };
  // And the trade a pawn matter: the material balance where it began, so a
  // pawn won with a piece, or a queen taken by a pawn, is the material's to say.
  const even = materialBalance(base) === materialBalance(fenAfter);
  const levelNow = even && level(fenAfter);
  const levelBefore = even && level(base);
  const mover = m.color;
  const sides: Color[] = [mover, other(mover)];
  const wings: Wing[] = ['queenside', 'kingside'];
  const key = (e: MajorityEvent, x: WingMajority): string => `pawn-majority:${e}:${x.side}:${x.wing}`;

  // Made: a majority neither had, and the other side's made with it.
  for (const side of sides) {
    for (const wing of wings) {
      const n = find(now, side, wing);
      if (!n || find(was, side, wing)) continue;
      const otherWing: Wing = wing === 'queenside' ? 'kingside' : 'queenside';
      const s = find(now, other(side), otherWing);
      const split = s && !find(was, other(side), otherWing) ? s : null;
      // A majority that cannot make a passed pawn is worth saying only beside
      // the other side's, as the trade's two halves (the Exchange Ruy Lopez).
      if (!levelNow || (!n.healthy && !split)) continue;
      return { event: 'created', mover, to: m.to, majority: n, split, now: { count: n.count, against: n.against }, key: key('created', n) };
    }
  }
  // Crippled and given up, with the pawns level both sides of the move.
  for (const side of (levelNow && levelBefore ? sides : [])) {
    for (const wing of wings) {
      const b = find(was, side, wing);
      if (!b) continue;
      const n = find(now, side, wing);
      if (n && b.healthy && !n.healthy && n.doubled.length > 0) {
        return { event: 'crippled', mover, to: m.to, majority: n, split: null, now: { count: n.count, against: n.against }, key: key('crippled', n) };
      }
      if (!n) {
        const p = wingPawns(c);
        return { event: 'gave-up', mover, to: m.to, majority: b, split: null, now: { count: p[side][wing].length, against: p[other(side)][wing].length }, key: key('gave-up', b) };
      }
    }
  }
  // Set moving: a pawn of the mover's healthy majority leaves its starting
  // rank, with the queens off — the majority's game is the ending's.
  if (m.piece === 'p' && !m.captured && relRank(m.from, mover) === 2 && c.findPiece({ type: 'q', color: 'w' }).length + c.findPiece({ type: 'q', color: 'b' }).length === 0) {
    const wing: Wing = 'abcd'.includes(m.from[0]) ? 'queenside' : 'kingside';
    const b = find(was, mover, wing);
    const n = find(now, mover, wing);
    if (b?.healthy && n?.healthy && n.lead) {
      return { event: 'advance', mover, to: m.to, majority: n, split: null, now: { count: n.count, against: n.against }, key: key('advance', n) };
    }
  }
  return null;
}

/** The squares the line names: the leads it points at. */
export function pawnMajoritySquares(x: PawnMajority): string[] {
  if (x.event === 'gave-up' || x.event === 'crippled') return [];
  return [x.majority.healthy ? x.majority.lead : null, x.split?.healthy ? x.split.lead : null].filter((s): s is Square => !!s);
}

/** The idea each event is, for the step a turn says it in. */
const IDEA_OF: Record<MajorityEvent, IdeaKind> = { created: 'passed-pawn', advance: 'passed-pawn', crippled: 'weakness', 'gave-up': 'weakness' };

/** The idea of a majority fact, read off its key (`pawn-majority:<event>:…`). */
export function majorityIdea(key: string): IdeaKind {
  const e = key.split(':')[1] as MajorityEvent | undefined;
  return (e && IDEA_OF[e]) || 'passed-pawn';
}

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const num = (n: number): string => COUNT[n] ?? String(n);

/** Said from the student's seat (`student`). Rotated on the board after the
 *  move. It never names the move: the turn already did. */
export function pawnMajorityLine(x: PawnMajority, student: Color, fenAfter: string): string {
  const k = stemKeyOf(`${fenAfter}|pawn-majority`);
  const g = x.majority;
  const mine = g.side === student;
  const own = mine ? 'your' : 'their';
  const who = mine ? 'you' : 'them';
  const ratio = `${num(g.count)} pawns against ${num(g.against)}`;
  // The pawn the move just pushed is named by its file ("your f-pawn"): the
  // turn already named its square, and "that pawn" points at nothing once a
  // line about another piece stands between them.
  const lead = g.lead === x.to && x.event === 'advance' ? `${own} ${g.lead[0]}-pawn` : g.lead ? `${own} pawn on ${g.lead}` : null;
  switch (x.event) {
    case 'created': {
      if (x.split) {
        const s = x.split;
        const sOwn = s.side === student ? 'your' : 'their';
        const sWho = s.side === student ? 'you' : 'they';
        const head = `That trade splits the pawns: ${mine ? 'you get' : 'they get'} a ${g.wing} majority, ${ratio}, and ${sWho} get one on the ${s.wing}.`;
        const poss = (o: string): string => (o === 'your' ? 'yours' : 'theirs');
        const leads = g.healthy && s.healthy && g.lead && s.lead
          ? `Each can make a passed pawn: ${poss(own)} with the pawn on ${g.lead}, ${poss(sOwn)} with the pawn on ${s.lead}.`
          : g.healthy && g.lead
            ? `Only ${poss(own)} can make a passed pawn, led by the pawn on ${g.lead}: the doubled pawns on the ${s.wing} cannot.`
            : s.healthy && s.lead
              ? `Only ${poss(sOwn)} can make a passed pawn, led by the pawn on ${s.lead}: the doubled pawns on the ${g.wing} cannot.`
              : 'Neither can make a passed pawn yet: both are doubled.';
        return `${head} ${leads}`;
      }
      if (!g.healthy) {
        return `That gives ${who} a ${g.wing} majority, ${ratio}, but the doubled pawns on the ${g.doubled[0]}-file mean it cannot make a passed pawn.`;
      }
      return rotateStem([
        `That gives ${who} a ${g.wing} majority: ${ratio}. Pushed together, those pawns make a passed one, and ${lead} is the one that can run.`,
        `${openSentence(own)} pawns are ${ratio} on the ${g.wing} now, a majority that can make a passed pawn. ${lead ? openSentence(lead) : 'Its lead pawn'} leads it.`,
      ], k);
    }
    case 'crippled':
      return `That leaves ${own} pawns doubled on the ${g.doubled[0]}-file, so ${own} ${g.wing} majority can no longer make a passed pawn.`;
    case 'gave-up': {
      const there = `${num(x.now.count)} pawns against ${num(x.now.against)} there now`;
      return x.mover === g.side
        ? rotateStem([
          `That gives up ${own} ${g.wing} majority: ${there}, and the passed pawn it could make is gone.`,
          `${openSentence(own)} ${g.wing} majority is gone: ${there}.`,
        ], k)
        : rotateStem([
          `That takes away ${own} ${g.wing} majority: ${there}, and the passed pawn it could make is gone.`,
          `${openSentence(own)} ${g.wing} majority is gone after that: ${there}.`,
        ], k);
    }
    case 'advance':
      return rotateStem([
        `That sets ${own} ${g.wing} majority moving: ${ratio}, and ${lead} is the one that can become passed.`,
        `${openSentence(own)} ${g.wing} majority starts to roll, ${ratio}. Pushed together, those pawns make a passed one: ${lead} is the one that can run.`,
      ], k);
    default:
      return '';
  }
}
