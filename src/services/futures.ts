/**
 * THE TWO FUTURES, AND WHAT CHANGED BETWEEN THEM (WO-PICTURE-01 P2, fixes 2–3,
 * David 2026-11-19: "identify everything needed").
 *
 * Danya rules a try out by what it does to the board a few moves on, never by a
 * number: "…Rxh5 and the rook is alive", "…Kf7-e6 and it is a fortress",
 * "…Qf6 hits e6 and a1". Of his 194 refuted tries, 51 cost the RESULT with the
 * material kept, and nothing read what was different about the board after
 * them. This does:
 *  - `futureBoards`: a line's key boards — after the reply, and at the quiet
 *    end (the first board past the reply whose move was neither a capture nor
 *    a check, or the line's end);
 *  - `whatChanged`: every board computer read on the try's board and on the
 *    best line's board at the same point (`readEveryComputer`, one bundle);
 *    what the try's board has that the best's does not is what the try let
 *    happen, and the reverse is what it gave up.
 *
 * Pure: chess.js and the board computers, over the lines the engine already
 * read (no engine call). A fact is matched across the two boards by its
 * computer and its claims, so "their rook is active" on both is no change.
 */
import { Chess, type Color } from 'chess.js';
import { readEveryComputer, type BoardBundle } from './boardBundle';
import type { CoachFact } from './coachFact';
import { stakeValue } from './factStakes';
import { PICTURE_ROLE, type PictureRole } from './positionPicture';

export interface FutureBoard {
  fen: string;
  /** Plies from the board the line starts on. */
  ply: number;
  /** The rest of the line from here, UCI. */
  rest: readonly string[];
}

export interface LineRead {
  moves: readonly string[];
  /** White's seat. */
  cp: number | null;
  mate: number | null;
}

const MAX_PLIES = 8;

/** The line's key boards: after the reply, then the quiet end. */
export function futureBoards(fen: string, moves: readonly string[]): { reply: FutureBoard | null; quiet: FutureBoard | null } {
  let b: Chess;
  try { b = new Chess(fen); } catch { return { reply: null, quiet: null }; }
  let reply: FutureBoard | null = null;
  let quiet: FutureBoard | null = null;
  const n = Math.min(moves.length, MAX_PLIES);
  for (let i = 0; i < n; i += 1) {
    const u = moves[i];
    let m;
    try { m = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    const here: FutureBoard = { fen: b.fen(), ply: i + 1, rest: moves.slice(i + 1) };
    if (i === 1) reply = here;
    if (i >= 1 && !m.captured && !/[+#]$/.test(m.san)) { quiet = here; break; }
    quiet = here;
  }
  return { reply, quiet };
}

function bundleAt(f: FutureBoard, line: LineRead, student: Color, rating: number): BoardBundle {
  return {
    fen: f.fen,
    student,
    lines: [{ moves: [...f.rest], cp: line.cp, mate: line.mate }],
    rating,
    history: [],
    priorMove: null,
    priorMoveSeat: null,
    priorLines: null,
  };
}

function factKey(f: CoachFact): string {
  return `${f.computer}|${[...f.claims].sort().join(',') || f.text}`;
}
/** The same fact on both boards: the same claims, or the same words. */
function sameOn(f: CoachFact, other: { keys: ReadonlySet<string>; texts: ReadonlySet<string> }): boolean {
  return other.keys.has(factKey(f)) || other.texts.has(`${f.computer}|${f.text}`);
}
/** The squares the line acts on, its first moves' from and to, and both kings
 *  on the board it reaches: a change there is what the line did, a change
 *  elsewhere is the rest of the board. */
function touched(fen: string, moves: readonly string[], upTo: string): Set<string> {
  const out = new Set<string>();
  for (const u of moves.slice(0, 4)) { out.add(u.slice(0, 2)); out.add(u.slice(2, 4)); }
  try {
    const b = new Chess(upTo);
    for (const c of ['w', 'b'] as const) for (const k of b.findPiece({ type: 'k', color: c })) out.add(k);
  } catch { /* no kings read */ }
  void fen;
  return out;
}

/** The roles a difference can be: what the board holds, not what to do. */
const CHANGE_ROLES: ReadonlySet<PictureRole> = new Set<PictureRole>(['threat', 'resource', 'asset', 'weakness', 'board', 'standing']);
const ROLE_ORDER: Record<PictureRole, number> = {
  threat: 0, resource: 1, standing: 2, asset: 3, weakness: 4, board: 5,
  try: 9, plan: 9, move: 9, line: 9, habit: 9, theory: 9, story: 9,
};

export interface Change {
  /** Where it was read: after the reply, or at the quiet end. */
  at: 'reply' | 'quiet';
  fact: CoachFact;
  /** It is about a square the line acted on, or a king. */
  inLine: boolean;
}

export interface WhatChanged {
  /** On the try's board and not the best's: what the try let happen. */
  appeared: Change[];
  /** On the best's board and not the try's: what the try gave up. */
  lost: Change[];
}

function rank(c: Change): number {
  const role = PICTURE_ROLE[c.fact.computer] ?? 'board';
  return (c.inLine ? 0 : 1e9) + ROLE_ORDER[role] * 1e7 - (stakeValue(c.fact.stakes) ?? 0) + (c.at === 'reply' ? 0 : 1);
}

/**
 * What the try changed: every computer read on both futures, at the same
 * point. Most telling first: a threat or a resource before a standing, the
 * fact worth most within a role, the reply's board before the quiet end.
 */
export function whatChanged(args: {
  fen: string;
  student: Color;
  rating: number;
  /** The try's line from `fen` (the try first). */
  tryLine: LineRead;
  /** The best line from `fen`. */
  bestLine: LineRead;
}): WhatChanged {
  const t = futureBoards(args.fen, args.tryLine.moves);
  const b = futureBoards(args.fen, args.bestLine.moves);
  const appeared: Change[] = [];
  const lost: Change[] = [];
  for (const at of ['reply', 'quiet'] as const) {
    const tf = t[at];
    const bf = b[at];
    if (!tf || !bf) continue;
    const onTry = readEveryComputer(bundleAt(tf, args.tryLine, args.student, args.rating))
      .filter((f) => CHANGE_ROLES.has(PICTURE_ROLE[f.computer] ?? 'board'));
    const onBest = readEveryComputer(bundleAt(bf, args.bestLine, args.student, args.rating))
      .filter((f) => CHANGE_ROLES.has(PICTURE_ROLE[f.computer] ?? 'board'));
    const index = (xs: CoachFact[]) => ({ keys: new Set(xs.map(factKey)), texts: new Set(xs.map((f) => `${f.computer}|${f.text}`)) });
    const ti = index(onTry);
    const bi = index(onBest);
    const tT = touched(args.fen, args.tryLine.moves, tf.fen);
    const bT = touched(args.fen, args.bestLine.moves, bf.fen);
    for (const f of onTry) if (!sameOn(f, bi)) appeared.push({ at, fact: f, inLine: f.squares.some((q) => tT.has(q)) });
    for (const f of onBest) if (!sameOn(f, ti)) lost.push({ at, fact: f, inLine: f.squares.some((q) => bT.has(q)) });
  }
  const seen = new Set<string>();
  const once = (xs: Change[]): Change[] => xs.sort((x, y) => rank(x) - rank(y)).filter((c) => {
    const k = factKey(c.fact);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { appeared: once(appeared), lost: once(lost) };
}

// ── WHAT THE TRY'S LINE DOES (his "with a perpetual check", "and White
// promotes", "the back-rank checkmate") — read off the line's own moves ──

export type LineStoryKind = 'perpetual' | 'promotes' | 'mates';

export interface LineStory {
  kind: LineStoryKind;
  /** From the seat of the side that played the try (`own` / `other`). */
  text: string;
  /** The squares it is about. */
  squares: string[];
}

const PERPETUAL_CHECKS = 3;

/**
 * What the try's line does that no single board shows:
 *  - `perpetual`: the other side checks on every move from its reply on, at
 *    least three times or until a position repeats — "…Rg1+, and the checks
 *    never stop";
 *  - `promotes`: a pawn of the other side reaches the last rank in the line;
 *  - `mates`: the other side mates in the line.
 * Null when the line does none of these. Pure: chess.js over the line.
 */
export function lineStory(fen: string, tryLine: readonly string[], other: 'your' | 'their'): LineStory | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const mover = b.turn();
  const seen = new Map<string, number>();
  const posKey = (c: Chess): string => c.fen().split(' ').slice(0, 4).join(' ');
  seen.set(posKey(b), 1);
  let checks = 0;
  let firstCheck: string | null = null;
  let checker: string | null = null;
  let checksBroken = false;
  const theirWord = other === 'your' ? 'you' : 'they';
  for (let i = 0; i < tryLine.length; i += 1) {
    const u = tryLine[i];
    let m;
    try { m = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    const byOther = m.color !== mover;
    const sanWords = `${m.color === 'b' ? '…' : ''}${m.san}`;
    if (byOther && b.isCheckmate()) return { kind: 'mates', text: `${sanWords} is mate.`, squares: [m.to] };
    if (byOther && m.promotion) return { kind: 'promotes', text: `${other === 'your' ? 'Your' : 'Their'} ${m.from[0]}-pawn runs through and queens on ${m.to}.`, squares: [m.from, m.to] };
    if (byOther && !checksBroken) {
      if (/\+$/.test(m.san)) {
        checks += 1;
        if (!firstCheck) { firstCheck = sanWords; checker = m.to; }
      } else if (i > 0) checksBroken = true;
    }
    const k = posKey(b);
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (!checksBroken && firstCheck && (checks >= PERPETUAL_CHECKS || n >= 2)) {
      return { kind: 'perpetual', text: `${firstCheck} starts a perpetual check: ${theirWord} keep checking and the king can't get away.`, squares: checker ? [checker] : [] };
    }
  }
  return null;
}

/** The change a try lets happen, as the reason it falls short: the line's own
 *  story first, then a threat or a resource that appears on the board after
 *  it, about a square the line acted on or a king. Null when none. */
export function changeReason(args: {
  fen: string;
  student: Color;
  rating: number;
  tryLine: LineRead;
  bestLine: LineRead;
  other: 'your' | 'their';
}): string | null {
  const story = lineStory(args.fen, args.tryLine.moves, args.other);
  if (story) return story.text;
  const wc = whatChanged(args);
  // A reason is what the OTHER side gains: a fact about the try's own side
  // (advice to it, "before you take…") is no reason the try fails.
  const theirSeat = args.other === 'their' ? 'opponent' : 'student';
  const hit = wc.appeared.find((c) => c.inLine && c.fact.seat === theirSeat && ['threat', 'resource'].includes(PICTURE_ROLE[c.fact.computer] ?? 'board'));
  return hit ? hit.fact.text : null;
}
