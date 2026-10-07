// moveInsight — THE COACH'S INSIGHT (David 2026-10-05: "This app is missing
// insight" … "Do I need to keep pressing? Do I need to defend something? Do I
// need more pieces in the attack?" … "Why was the knight to one square better
// than the other when they both checked the king???").
//
// The app computed facts (check, fork, loose piece) and spoke them as labels.
// Insight is the RELATION between facts, and every piece of it here is read
// off the board (G0 — no model, no guess):
//
//   • positionAsk — what THIS position asks of the student: defend, press,
//     bring one more piece, or improve. The answer move is never named; the
//     idea is (David: "the idea, not the answer").
//   • moveMissed — what the student's own move actually does along the
//     engine's reply: a check the king walks out of, material it gives back.
//   • doubleAttack — the mechanism a move carries: one piece hitting two
//     targets. This is what separates two checks that look alike.
//   • walkableLine — every line spoken comes as arrows plus a Walk button
//     (David: "Button tap to play out any lines the user wants").
//
// One computer, read by every coach surface: Learn drills and hints, the
// puzzle boards, the chat compare, and review (through compareTwoMoves).
import { Chess, type Move, type Square } from 'chess.js';
import { walkableLine } from './proof';
import type { WalkableLine } from '../types';
import { CAPTURE_VALUE } from './pieceValues';
import { PIECE_NAMES } from '../types/tacticTypes';
import { computeMustDefend } from './threatOut';
import { countKingAttack } from './kingSafety';
import { settledNetForLine } from './exchangeLedger';
import { sayMoveClause } from './spokenMove';
import { andList } from '../utils/andList';
import { countWords } from '../utils/countWords';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { theirMoveCost } from './theirMoveCost';
import { openingWindowOpen } from './moveFundamentals';
import { readConversion } from './conversionMethod';
import { minorsAtHome } from './development';
import { tradeJudgement } from './tradeJudgement';
import { detectTactics } from './tacticsDetector';
import { castleSide, heldByTactic, keepTension, skipMiddleman, rightPieceForHole, keepSquareForKnight, takeTheSting, queenGlue, retreatKeepsBreak } from './speedRunReads';
import { findLoosePieces } from './loosePieces';
import { noPawnCanChallenge } from './outpost';
import { findHangingBySee, findKnightReroute, findWeakPawns } from './positionReadingService';
import { findWorstPlacedPiece } from './nextPlans';
import { detectLatentDanger, latentDangerClause } from './latentDanger';
import { findTrappedPiece } from './reviewTeachingPoints';
import { detectNewThreat } from './groundedAnswer';

export type PositionMode = 'defend' | 'press' | 'reinforce' | 'improve';

export interface PositionAsk {
  mode: PositionMode;
  /** One or two sentences, addressed to the side to move. Never names the move. */
  text: string;
  /** Squares the text names, for highlights. */
  squares: string[];
}

export interface DoubleAttack {
  /** The square the moving piece lands on. */
  from: string;
  /** What it hits, biggest first: "the king", "the queen on d8". */
  targets: Array<{ square: string; piece: string; phrase: string }>;
}

const name = (p: string): string => PIECE_NAMES[p] ?? 'piece';
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const num = (n: number): string => NUMBER_WORDS[n] ?? String(n);

function play(fen: string, san: string): { board: Chess; move: Move } | null {
  try {
    const board = new Chess(fen);
    const move = board.move(san);
    return move ? { board, move } : null;
  } catch { return null; }
}

/**
 * ONE PIECE, TWO TARGETS. After `san`, the enemy pieces the moved piece
 * attacks that it can actually win: the king (a check), anything worth more
 * than the attacker, or anything undefended. Null below two targets.
 */
export function doubleAttack(fenBefore: string, san: string): DoubleAttack | null {
  // THE fork detector decides (`tacticsDetector`, its winnability gate
  // included) — this only reads the fork the moved piece makes.
  const r = play(fenBefore, san);
  if (!r) return null;
  const { board, move } = r;
  let fork: { involvedSquares: string[] } | undefined;
  try {
    fork = detectTactics(board.fen()).tactics.find((t) => t.type === 'fork' && t.beneficiary === move.color && t.involvedSquares[0] === move.to);
  } catch { fork = undefined; }
  if (!fork) return null;
  const targets: DoubleAttack['targets'] = fork.involvedSquares.slice(1).flatMap((sq) => {
    const p = board.get(sq as Square);
    return p ? [{ square: sq, piece: p.type, phrase: p.type === 'k' ? 'the king' : `the ${name(p.type)} on ${sq}` }] : [];
  });
  if (targets.length < 2) return null;
  targets.sort((a, b) => (CAPTURE_VALUE[b.piece] ?? 0) - (CAPTURE_VALUE[a.piece] ?? 0));
  return { from: move.to, targets };
}

/** How the best move works, in words that do not name it. */
function directionFor(fen: string, bestSan: string | undefined): string | null {
  if (!bestSan) return null;
  const r = play(fen, bestSan);
  if (!r) return null;
  // A named attacking pattern is the idea itself (his articles): say it.
  const gg = greekGift(fen, bestSan);
  if (gg) return gg.hint;
  const esc = escapeSquareFirst(fen, bestSan);
  if (esc) return esc.hint;
  if (skewer(fen, bestSan)) return 'Look for a check that lines up with something standing behind the king.';
  if (doubleAttack(fen, bestSan)) {
    return r.move.san.includes('+')
      ? 'Look for a check that does more than check — one move that hits two things at once.'
      : 'Look for one move that hits two things at once.';
  }
  if (r.move.san.includes('#')) return 'There is a mate here — start with the checks.';
  if (r.move.san.includes('+')) return 'Start with the checks.';
  if (r.move.captured) return 'Start with the captures.';
  return null;
}

/**
 * WHAT THIS POSITION ASKS of the side to move. `bestSan` (the engine's or the
 * drill's move) only steers the DIRECTION — "start with the checks", "one move
 * that hits two things" — and is never named.
 */
export function positionAsk(fen: string, opts: { bestSan?: string; lastMove?: { fenBefore: string; san: string } } = {}): PositionAsk {
  const core = positionAskCore(fen, opts);
  // AN ALIGNMENT TO WATCH (catalogue §10 — "their king and rook are on the same
  // diagonal, always be alert to that"): the student's own pin or skewer in
  // waiting, from the latent-danger computer.
  const base = (() => {
    try {
      const me = new Chess(fen).turn();
      const d = detectLatentDanger(fen, me, { latentOnly: true });
      if (!d || core.mode === 'press') return core;
      return { ...core, text: [core.text, cap(latentDangerClause(d).replace(/\.?$/, '.'))].filter(Boolean).join(' '), squares: [...core.squares, d.frontSquare, d.backSquare] };
    } catch { return core; }
  })();
  // WHAT THEIR LAST MOVE CHANGED leads (catalogue §1 — "when a move is made, I
  // consider its drawbacks"): the reading he does before anything else.
  if (!opts.lastMove) return base;
  let me: 'w' | 'b';
  try { me = new Chess(fen).turn(); } catch { return base; }
  const changed = theirMoveChanged(opts.lastMove.fenBefore, opts.lastMove.san, me);
  if (!changed) return base;
  return { mode: base.mode, text: [changed.text, base.text].filter(Boolean).join(' '), squares: [...changed.squares, ...base.squares] };
}

function positionAskCore(fen: string, opts: { bestSan?: string }): PositionAsk {
  let board: Chess;
  try { board = new Chess(fen); } catch { return { mode: 'improve', text: '', squares: [] }; }
  const me = board.turn();
  const them = me === 'w' ? 'b' : 'w';
  const best = opts.bestSan ? play(fen, opts.bestSan) : null;
  const bestForcing = !!best && (best.move.san.includes('+') || best.move.san.includes('#') || !!best.move.captured || !!doubleAttack(fen, opts.bestSan as string));
  const direction = directionFor(fen, opts.bestSan);

  if (board.inCheck()) {
    return { mode: 'defend', text: 'You are in check — the king comes first.', squares: [] };
  }

  const allMust = computeMustDefend(fen, me).pieces;
  const must = allMust[0];
  if (must) {
    // The cheapest piece of theirs hitting it — the one that takes first.
    const attackerSq = (() => {
      try {
        const sqs = board.attackers(must.square as Square, them);
        return sqs.sort((a, b) => (CAPTURE_VALUE[board.get(a)?.type ?? 'k'] ?? 0) - (CAPTURE_VALUE[board.get(b)?.type ?? 'k'] ?? 0))[0] ?? null;
      } catch { return null; }
    })();
    const attackerPiece = attackerSq ? board.get(attackerSq) : null;
    const by = attackerSq && attackerPiece ? `their ${name(attackerPiece.type)} on ${attackerSq}` : 'they';
    const hit = `${cap(by)} ${by === 'they' ? 'are hitting' : 'is hitting'} your ${name(must.piece)} on ${must.square}`;
    // IS THE THREAT REAL? (his "How To Ignore A Threat And Win"): the best move
    // leaves the attacked piece where it stands with no new guard and is not
    // forcing — the threat is not the issue here.
    if (best && !bestForcing && best.move.from !== must.square
      && guards(best.board, must.square as Square, me).length <= guards(board, must.square as Square, me).length) {
      return {
        mode: 'improve',
        text: `${hit}, but that is not the real issue here — you can leave it and play the move the position needs.`,
        squares: [must.square],
      };
    }
    if (bestForcing) {
      return {
        mode: 'press',
        text: `${hit}, but there is something stronger than defending it. ${direction ?? 'Start with the forcing moves — checks, captures, threats.'}`,
        squares: [must.square],
      };
    }
    // A guard only helps when nothing cheaper than the piece is hitting it —
    // against a pawn attack a defender changes nothing (replay, game 2 8.Bc4).
    const cheaperHits = (() => { try { return board.attackers(must.square as Square, them).some((a) => (CAPTURE_VALUE[board.get(a)?.type ?? 'k'] ?? 99) < (CAPTURE_VALUE[must.piece] ?? 0)); } catch { return true; } })();
    const cheap = must.piece !== 'p' && !cheaperHits ? pawnCanGuard(fen, must.square) : null;
    // YOU CAN'T SAVE EVERYTHING AT ONCE (game 1: "black has all these threats
    // … we won't be able to save everything"): two or more of your pieces hit
    // at once — choose what to give up.
    // …unless one capture answers both: take the piece doing the hitting.
    const forker = (() => {
      try {
        const a = board.attackers(allMust[0].square as Square, them);
        const b2 = allMust[1] ? board.attackers(allMust[1].square as Square, them) : [];
        return a.find((x) => b2.includes(x)) ?? null;
      } catch { return null; }
    })();
    const forkerTakeable = !!forker && (() => { try { return board.attackers(forker, me).length > 0; } catch { return false; } })();
    if (allMust.length >= 2 && !forkerTakeable) {
      return {
        mode: 'defend',
        text: `Two things of yours are hit at once — your ${name(allMust[0].piece)} on ${allMust[0].square} and your ${name(allMust[1].piece)} on ${allMust[1].square}. You can't save everything; decide what to give up, and make them pay for it.`,
        squares: [allMust[0].square, allMust[1].square],
      };
    }
    return { mode: 'defend', text: `${hit} — deal with that first.${cheap ? ' A pawn can guard it — the cheapest defender there is.' : ''}`, squares: [must.square] };
  }

  const loose = findHangingBySee(fen).filter((h) => h.color === them && h.piece !== 'k').sort((a, b) => b.gain - a.gain)[0];
  const attack = countKingAttack(board, me);
  const attackers = attack?.attackers.size ?? 0;
  const defenders = attack?.defenders.size ?? 0;

  if (bestForcing || loose) {
    const lead = loose
      ? `Their ${name(loose.piece)} on ${loose.square} is not properly protected.`
      : attackers > defenders && attackers >= 2
        ? `You have ${num(attackers)} pieces bearing on their king against ${num(defenders)} defending it.`
        : 'You have the initiative here.';
    return {
      mode: 'press',
      text: `${lead} Keep pressing. ${direction ?? 'Start with the forcing moves — checks, captures, threats.'}`,
      squares: loose ? [loose.square] : [],
    };
  }

  // A quiet best move with a named idea (the escape square, a pattern) leads.
  if (direction) {
    return { mode: 'press', text: direction, squares: [] };
  }

  const hookNow = pawnHook(fen, me);
  // STILL IN THE OPENING (replay, game 2: "complete your development and
  // castle"): the opening's question comes before any attack talk.
  const mover = me === 'w' ? 'white' : 'black';
  if (openingWindowOpen(fen, mover)) {
    const home = homeMinors(board, me);
    const canStillCastle = board.getCastlingRights(me).k || board.getCastlingRights(me).q;
    const bits: string[] = [];
    if (home.length > 0) bits.push(`your ${andList(home.map((h) => `${name(h.type)} on ${h.square}`))} ${home.length === 1 ? 'is' : 'are'} still at home`);
    if (canStillCastle) bits.push('your king has not castled yet');
    if (bits.length > 0) {
      const queensOn = board.board().flat().some((x) => x && x.type === 'q');
      return {
        mode: 'improve',
        text: queensOn
          ? `You are still in the opening — ${andList(bits)}. Finish developing before anything else.`
          : `The queens are off, but ${andList(bits)} — develop it now; there is no attack to fear.`,
        squares: home.map((h) => h.square),
      };
    }
  }
  if (attack && attackers >= 2 && attackers <= defenders) {
    return {
      mode: 'reinforce',
      text: `You have ${num(attackers)} ${attackers === 1 ? 'piece' : 'pieces'} near their king and they have ${num(defenders)} defending — bring one more before you strike.${hookNow ? ` ${hookNow.text}` : ''}`,
      squares: hookNow ? [attack.king, hookNow.hook] : [attack.king],
    };
  }

  // IMPROVE — the quiet position, said the way he says it: the target to aim
  // at (catalogue §5) and the piece that stands worst (§6, "if one piece stands
  // badly, the whole game stands badly"), from the app's own computers.
  const parts: string[] = [];
  const sq: string[] = [];
  const mat = materialPlan(fen, me);
  if (mat) parts.push(mat.text);
  const loosePieces = looseOwnPieces(fen, me);
  if (loosePieces.length > 0) {
    parts.push(`Your ${andList(loosePieces.map((l) => `${name(l.piece)} on ${l.square}`))} ${loosePieces.length === 1 ? 'has' : 'have'} no guard — loose pieces are what a double attack collects.`);
    sq.push(...loosePieces.map((l) => l.square));
  }
  const chased = noRetreat(fen, me);
  if (chased) { parts.push(`If they push a pawn to ${chased.push}, your ${name(chased.piece)} on ${chased.square} has nowhere to go — give it a retreat square first.`); sq.push(chased.square, chased.push); }
  const tied = heavyTiedDown(fen, me);
  if (tied) { parts.push(`Your ${name(tied.piece)} on ${tied.defender} is the only guard on your ${name(tied.guardedPiece)} on ${tied.guarded} — a heavy piece makes a poor defender; free it.`); sq.push(tied.defender, tied.guarded); }
  const byHand = castleByHand(fen, me);
  if (byHand) { parts.push(byHand.text); sq.push(...byHand.squares); }
  if (hookNow) { parts.push(hookNow.text); sq.push(hookNow.hook, hookNow.pawn); }
  const contest = diagonalContest(fen, me);
  if (contest) { parts.push(contest.text); sq.push(contest.mine, contest.theirs, contest.block); }
  const opening = fileToOpen(fen, me);
  if (opening) { parts.push(opening.text); sq.push(opening.rook); }
  const weak = findWeakPawns(fen, them);
  const target = [...weak.isolated, ...weak.backward].find((t) => fileOpenFor(board, t[0], me));
  if (target) {
    parts.push(`Their pawn on ${target} is a target on a file your rooks can use.`);
    sq.push(target);
  }
  const reroute = findKnightReroute(fen, me);
  if (reroute) {
    parts.push(`Your knight on ${reroute.from} wants ${reroute.to}${reroute.via ? `, by way of ${reroute.via}` : ''}.`);
    sq.push(reroute.from, reroute.to);
  } else {
    const worst = findWorstPlacedPiece(board, me);
    if (worst) {
      parts.push(`Your ${name(worst.type)} on ${worst.sq} is your worst-placed piece — give it a better job.`);
      sq.push(worst.sq);
    }
  }
  return {
    mode: 'improve',
    text: parts.length > 0
      ? `No piece is loose and no attack is ready. ${parts.join(' ')}`
      : 'No piece is loose and no attack is ready — find your worst-placed piece and give it a better job.',
    squares: sq,
  };
}

/** SANs of a UCI principal variation from `fen`, stopping at the first illegal move. */
export function pvSans(fen: string, pvUci: readonly string[] | undefined, max = 6): string[] {
  const out: string[] = [];
  if (!pvUci) return out;
  let c: Chess;
  try { c = new Chess(fen); } catch { return out; }
  for (const uci of pvUci.slice(0, max)) {
    try {
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      if (!m) break;
      out.push(m.san);
    } catch { break; }
  }
  return out;
}

export interface MoveMissed {
  text: string;
  /** The weakness this miss is evidence of — the diagnosis half (both ways). */
  tag: MisconceptionTagId;
  /** The student's move and the engine's answer to it, for arrows + Walk. */
  line: WalkableLine | null;
}

/**
 * WHAT THE STUDENT'S MOVE ACTUALLY DOES, read along the engine's reply line
 * (`replyPv`: UCI, from the board AFTER the move). Null when the line shows
 * nothing worth saying.
 */
export function moveMissed(fenBefore: string, san: string, replyPv: readonly string[] | undefined): MoveMissed | null {
  const r = play(fenBefore, san);
  if (!r) return null;
  const me = r.move.color;
  // THE WHOLE ENGINE LINE (David 2026-10-05: "is the narration accurate to the
  // longer line?" — measured: reading five plies said "4 points down" where the
  // line settles at 5, "two pawns" where it settles at one). The claim is read
  // where the line ends, not where it was cut.
  const replies = pvSans(r.board.fen(), replyPv, 16);
  const line = walkableLine(fenBefore, [r.move.san, ...replies], r.move.san);
  const you = cap(sayMoveClause(r.move.san, fenBefore));
  const reply = replies[0] ? play(r.board.fen(), replies[0]) : null;
  const net = settledNetForLine(fenBefore, [r.move.san, ...replies], me);
  // THE PAWN-GRAB SAFETY CHECK (catalogue §33): the piece that just captured
  // can be trapped along the engine's reply line.
  if (r.move.captured) {
    const trapped = findTrappedPiece(r.board.fen(), me, replyPv ?? null);
    if (trapped && trapped.square === r.move.to) {
      return { text: `${you} grabs material, but the ${name(trapped.piece)} on ${trapped.square} has no way out — they trap it.`, line, tag: 'greedy-pawn-grab' };
    }
  }
  // YOUR OWN MOVE'S DRAWBACK (catalogue §35 — "Qd6 steps off the diagonal,
  // dropping the guard on e7"): what your move left unguarded, when the reply
  // goes after exactly that.
  const ownWeak = weakenedBy(fenBefore, r.move.san).filter((w) => w.color === me);
  const replyHits = !!reply && reply.move.to === ownWeak[0]?.square;
  if (ownWeak.length > 0 && replyHits) {
    const w = ownWeak[0];
    return { text: `${you} leaves your ${name(w.piece)} on ${w.square} ${w.after === 0 ? 'with no guard' : 'short of guards'}, and ${sayMoveClause(reply.move.san, r.board.fen())}.`, line, tag: 'hung-material' };
  }

  if (net !== null && net <= -1) {
    // A queen's worth or more is said as a floor that stays true however deep
    // the line runs (audit: 11 points at ply 8, 14 by the end of a mating line).
    const lost = -net >= 9 ? 'more than a queen\'s worth' : countWords(-net);
    return {
      text: reply
        ? `${you}? Then ${sayMoveClause(reply.move.san, r.board.fen())}${reply.move.san.includes('+') ? ', check' : ''}, and by the end of the line you come out ${lost} down.`
        : `${you} gives away ${lost}.`,
      line,
      tag: 'hung-material',
    };
  }
  // DON'T HAND THEM A TEMPO (catalogue §37 — "Nc6 now lets d5 with tempo"):
  // the engine's reply is a pawn push that hits one of your pieces.
  if (reply && reply.move.piece === 'p' && !reply.move.captured) {
    const hit = (() => {
      for (const row of reply.board.board()) for (const cell of row) {
        if (!cell || cell.color !== me || cell.type === 'p' || cell.type === 'k') continue;
        try { if (reply.board.attackers(cell.square, reply.move.color).includes(reply.move.to)) return cell; } catch { /* skip */ }
      }
      return null;
    })();
    if (hit) return { text: `${you}? Then ${sayMoveClause(reply.move.san, r.board.fen())} comes with tempo, hitting your ${name(hit.type)} on ${hit.square}.`, line, tag: 'tempo-handed' };
  }
  // A BAD TRADE — THE trade computer judges it (`tradeJudgement`, census
  // "trade judgement"); never a second copy here.
  const tj = replies[0] ? tradeJudgement(fenBefore, r.move.san, replies[0], me, 100) : null;
  if (tj && (tj.reason === 'behind' || tj.reason === 'gave-best')) {
    return { text: tj.text, line, tag: 'bad-trade' };
  }
  // AN EMPTY THREAT (catalogue B4): it hits a piece, the piece steps away.
  const empty = emptyThreat(fenBefore, r.move.san, replies[0]);
  if (empty && (net ?? 0) <= 0) {
    return { text: `${you} hits their ${name(empty.piece)} on ${empty.target}, but it simply steps to ${empty.to} and the threat has done nothing.`, line, tag: 'overvalued-attack' };
  }
  // A HOLE THEY CAN REACH (game 2, inaccessibility — the other direction): the
  // pawn move gave up a square their knight gets to in a move or two.
  const holed = holeAccess(fenBefore, r.move.san);
  if (holed && holed.moves !== null && holed.moves <= 2) {
    return { text: holed.text, line, tag: 'created-pawn-weakness' };
  }
  // A HOOK FOR THEIR PAWNS (catalogue A6/B1): the push in front of your king.
  const hooked = hookCreated(fenBefore, r.move.san);
  if (hooked) {
    return { text: `${you} gives their pawn on ${hooked.pawn} a hook to latch onto in front of your king — it can pry a file open there.`, line, tag: 'weakened-king-safety' };
  }
  if (r.move.san.includes('+') && reply && reply.move.piece === 'k') {
    return { text: `${you} checks, but the king steps to ${reply.move.to} and nothing follows.`, line, tag: 'missed-tactic' };
  }
  if (r.move.captured && reply?.move.captured && reply.move.to === r.move.to && (net ?? 0) <= 0) {
    return { text: `${you} takes, but they take back and you have gained nothing.`, line, tag: 'missed-tactic' };
  }
  return null;
}

/**
 * THE DIFFERENCE between two moves, in the mechanism that makes it — for the
 * compare answers (chat, review). Empty when there is no mechanism to name;
 * the engine's material verdict still stands on its own then.
 */
export function mechanismContrast(fenBefore: string, betterSan: string, worseSan: string): string | null {
  const better = doubleAttack(fenBefore, betterSan);
  if (!better) return null;
  const worse = doubleAttack(fenBefore, worseSan);
  if (worse) return null;
  const b = play(fenBefore, betterSan);
  const w = play(fenBefore, worseSan);
  if (!b || !w) return null;
  const betterSaid = `${cap(sayMoveClause(b.move.san, fenBefore))} hits ${andList(better.targets.map((t) => t.phrase))} at once`;
  const worseHits = w.move.san.includes('+') ? 'only checks' : 'hits only one thing';
  return `${betterSaid}; ${sayMoveClause(w.move.san, fenBefore)} ${worseHits}.`;
}

// ── TYPE 1 — WHAT THEIR MOVE CHANGED (Naroditsky catalogue §1) ───────────────
// "fxe5 — but now b7 loses its last defender"; "Rhf8 leaves e6 weak"; "Nc6 — and
// the rook stops covering e6"; "Nxe5+ — the king must leave d7, weakening e6".
// The reading he does on EVERY opponent move ("when a move is made, I consider
// its drawbacks"), computed: every piece whose defenders drop to none, whatever
// the cause — the defender moved away, a line got blocked, a defender was taken,
// the king stepped off. Plus the holes / shut bishops / structure the move cost
// (`theirMoveCost`, the one computer for those).

export interface Weakened {
  square: string;
  piece: string;
  color: 'w' | 'b';
  /** Defenders before and after the move (the king counts — it guards too). */
  before: number;
  after: number;
  /** The other side's attackers on it after the move. */
  attackers: number;
  /** The square that guards it now, when exactly one is left. */
  lastGuard: string | null;
}

function guards(board: Chess, sq: Square, color: 'w' | 'b'): Square[] {
  try { return board.attackers(sq, color); } catch { return []; }
}

/** No pawn of `color` on this file — the file is open to that side's rooks. */
function fileOpenFor(board: Chess, file: string, color: 'w' | 'b'): boolean {
  for (let r = 1; r <= 8; r += 1) {
    const p = board.get(`${file}${r}` as Square);
    if (p && p.type === 'p' && p.color === color) return false;
  }
  return true;
}

/** A rook or queen of `color` on this file. */
function heavyOnFile(board: Chess, file: string, color: 'w' | 'b'): boolean {
  for (let r = 1; r <= 8; r += 1) {
    const p = board.get(`${file}${r}` as Square);
    if (p && p.color === color && (p.type === 'r' || p.type === 'q')) return true;
  }
  return false;
}

/**
 * Every piece (never a king, never the piece that just moved) whose defenders
 * DROPPED with `san` and that is now a target: no defender left, fewer
 * defenders than attackers, or one defender left on a file open to the other
 * side's rooks (measured on G1, Nxe5+ Kd8: e6 went from two guards to the rook
 * on f6 alone, on the e-file White's rooks stand on — "weakening e6").
 */
export function weakenedBy(fenBefore: string, san: string): Weakened[] {
  const r = play(fenBefore, san);
  if (!r) return [];
  let before: Chess;
  try { before = new Chess(fenBefore); } catch { return []; }
  const out: Weakened[] = [];
  for (const row of r.board.board()) {
    for (const cell of row) {
      if (!cell || cell.type === 'k' || cell.square === r.move.to) continue;
      const was = before.get(cell.square);
      if (!was || was.type !== cell.type || was.color !== cell.color) continue;
      const enemy: 'w' | 'b' = cell.color === 'w' ? 'b' : 'w';
      const b = guards(before, cell.square, cell.color).length;
      const nowGuards = guards(r.board, cell.square, cell.color);
      const a = nowGuards.length;
      if (a >= b) continue;
      const att = guards(r.board, cell.square, enemy).length;
      // A TARGET, not a footnote: under fire now, or on a file the other side's
      // rook or queen already stands on (open to it). "f7 has no defender" with
      // nothing able to reach it is not insight.
      const pressed = att > 0 || (fileOpenFor(r.board, cell.square[0], enemy) && heavyOnFile(r.board, cell.square[0], enemy));
      if (!pressed) continue;
      const target = a === 0 || a < att || a === 1;
      if (!target) continue;
      out.push({ square: cell.square, piece: cell.type, color: cell.color, before: b, after: a, attackers: att, lastGuard: a === 1 ? nowGuards[0] : null });
    }
  }
  out.sort((x, y) => (y.attackers - y.after) - (x.attackers - x.after) || (CAPTURE_VALUE[y.piece] ?? 0) - (CAPTURE_VALUE[x.piece] ?? 0));
  return out;
}

function weakenedPhrase(board: Chess, w: Weakened, whose: 'their' | 'your'): string {
  const it = `${whose} ${name(w.piece)} on ${w.square}`;
  if (w.after === 0) return `${it} has no defender${w.attackers > 0 ? ' and is already attacked' : ''}`;
  if (w.after < w.attackers) return `${it} is attacked more times than it is defended`;
  const g = w.lastGuard ? board.get(w.lastGuard as Square) : null;
  return `now only the ${g ? name(g.type) : 'piece'} on ${w.lastGuard} guards ${it}`;
}

export interface MoveChanged {
  text: string;
  squares: string[];
}

/**
 * What THEIR last move changed, from the student's seat: their pieces left with
 * no defender (a target), ours left with none (a worry), and the lasting costs
 * `theirMoveCost` reads (holes, a bishop shut in, structure). Null when the move
 * changed nothing a student can use.
 */
export function theirMoveChanged(fenBefore: string, san: string, studentColor: 'w' | 'b'): MoveChanged | null {
  const r = play(fenBefore, san);
  if (!r || r.move.color === studentColor) return null;
  const parts: string[] = [];
  const squares: string[] = [];
  // WHAT THEY WANT (catalogue §2): the concrete threat their move just made —
  // a fork, a mate, a winning capture — leads, because it must be answered.
  try {
    const threat = detectNewThreat(fenBefore, r.board.fen(), r.move.color);
    if (threat) parts.push(`${cap(sayMoveClause(r.move.san, fenBefore))} threatens ${sayMoveClause(threat.san, r.board.fen())} — ${threat.detail}.`);
  } catch { /* no threat read */ }
  const weak = weakenedBy(fenBefore, san);
  const theirs = weak.filter((w) => w.color !== studentColor);
  const ours = weak.filter((w) => w.color === studentColor);
  const said = cap(sayMoveClause(r.move.san, fenBefore));
  if (theirs.length > 0) {
    parts.push(`${said}, and ${weakenedPhrase(r.board, theirs[0], 'their')}.`);
    squares.push(theirs[0].square);
  }
  if (ours.length > 0) {
    parts.push(`${parts.length > 0 ? 'Careful — ' : `${said}, and `}${weakenedPhrase(r.board, ours[0], 'your')}.`);
    squares.push(ours[0].square);
  }
  if (parts.length === 0) {
    const cost = theirMoveCost(fenBefore, san, studentColor);
    if (cost) { parts.push(cap(cost.text.replace(/\.?$/, '.'))); squares.push(...cost.squares); }
  }
  return parts.length > 0 ? { text: parts.join(' '), squares } : null;
}

/** The last move played along `moves` (UCI or SAN) from `startFen`, with the
 *  board it was played from — so a surface can say what that move changed. */
export function lastMoveAlong(startFen: string, moves: ReadonlyArray<string | { from: string; to: string; promotion?: string }>): { fenBefore: string; san: string } | null {
  if (moves.length === 0) return null;
  let c: Chess;
  try { c = new Chess(startFen); } catch { return null; }
  let last: { fenBefore: string; san: string } | null = null;
  for (const m of moves) {
    const fenBefore = c.fen();
    let mv: Move | null = null;
    try {
      mv = typeof m === 'string'
        ? (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m) ? c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }) : c.move(m))
        : c.move({ from: m.from, to: m.to, promotion: m.promotion });
    } catch { mv = null; }
    if (!mv) return null;
    last = { fenBefore, san: mv.san };
  }
  return last;
}

/** The last move of a game PGN with the board it was played from. */
export function lastMoveFromPgn(pgn: string): { fenBefore: string; san: string } | null {
  if (!pgn.trim()) return null;
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const h = c.history({ verbose: true });
    const m = h[h.length - 1];
    return m ? { fenBefore: m.before, san: m.san } : null;
  } catch { return null; }
}

/**
 * THE AUTOPILOT RECAPTURE (catalogue §9 + "Turn Off The Autopilot"): they just
 * captured, the student took straight back, and the right move was something
 * forcing first — the in-between move. Null when the try was not a recapture or
 * the best move is not forcing.
 */
export function autopilotRecapture(
  fenBefore: string,
  trySan: string,
  bestSan: string | undefined,
  lastMove: { fenBefore: string; san: string } | undefined,
): string | null {
  if (!bestSan || !lastMove) return null;
  const last = play(lastMove.fenBefore, lastMove.san);
  const tried = play(fenBefore, trySan);
  const best = play(fenBefore, bestSan);
  if (!last?.move.captured || !tried?.move.captured || !best) return null;
  if (tried.move.to !== last.move.to) return null;
  const forcing = best.move.san.includes('+') || best.move.san.includes('#') || (!!best.move.captured && best.move.to !== last.move.to);
  if (!forcing) return null;
  const kind = best.move.san.includes('#') ? 'a mate' : best.move.san.includes('+') ? 'a check' : 'a capture';
  return `Taking straight back is the autopilot move — there is ${kind} to play first, and the recapture can wait.`;
}

/**
 * THE GREEK GIFT (his chess.com article "The Greek Gift Sacrifice Lives On!"):
 * a bishop sacrifice on h7 (h2) with check against the castled king, so the
 * queen and knight — "the strongest tandem in chess" — come in after it. Board
 * read of the pattern's parts, only when `bestSan` IS the sacrifice (the engine
 * decides it works; this names WHY). His camouflages are the teaching: the
 * knight need not come from f3 — any square that reaches g5 (g4) in one jump.
 */
export function greekGift(fen: string, bestSan: string | undefined): { text: string; hint: string; squares: string[] } | null {
  if (!bestSan) return null;
  const r = play(fen, bestSan);
  if (!r || r.move.piece !== 'b' || !r.move.captured || !r.move.san.includes('+')) return null;
  const white = r.move.color === 'w';
  const target = white ? 'h7' : 'h2';
  const jump = white ? 'g5' : 'g4';
  if (r.move.to !== target) return null;
  let before: Chess;
  try { before = new Chess(fen); } catch { return null; }
  const me = r.move.color;
  const knights: string[] = [];
  for (const row of before.board()) for (const cell of row) {
    if (cell && cell.type === 'n' && cell.color === me && before.moves({ square: cell.square, verbose: true }).some((m) => m.to === jump)) knights.push(cell.square);
  }
  if (knights.length === 0) return null;
  const queen = before.board().flat().find((c) => c && c.type === 'q' && c.color === me);
  if (!queen) return null;
  const route = knights[0] === (white ? 'f3' : 'f6') ? '' : ` — and the knight comes from ${knights[0]}, not the usual square, which is exactly how this pattern hides`;
  return {
    text: `This is the Greek gift: the bishop gives itself on ${target} with check, the knight jumps in on ${jump}, and the queen joins down the h-file — the queen and knight together against a king with no defenders left around it${route}.`,
    // The hint names the pattern and withholds the square (the idea, not the answer).
    hint: 'This is a Greek-gift position — a bishop sacrifice against the castled king, with the knight and queen following it in.',
    squares: [target, jump, knights[0], queen.square],
  };
}

/**
 * TAKE AWAY THE ESCAPE SQUARE FIRST (catalogue §36 — "this would be mate but for
 * the escape square, so can I take it first?"). `bestSan` is quiet; after it, a
 * check we have becomes mate; before it, the same check lets the king out — and
 * the quiet move covers that flight square. Null otherwise.
 */
export function escapeSquareFirst(fen: string, bestSan: string | undefined): { hint: string; text: string; squares: string[] } | null {
  if (!bestSan) return null;
  const b = play(fen, bestSan);
  if (!b || b.move.captured || b.move.san.includes('+') || b.move.san.includes('#')) return null;
  const me = b.move.color;
  // After the quiet move, give them a pass and look for our mate in one.
  const passed = (() => { const parts = b.board.fen().split(' '); parts[1] = me; parts[3] = '-'; try { return new Chess(parts.join(' ')); } catch { return null; } })();
  if (!passed) return null;
  for (const m of passed.moves({ verbose: true })) {
    const probe = new Chess(passed.fen());
    probe.move(m.san);
    if (!probe.isCheckmate()) continue;
    // The same move before the quiet one: a check the king walks out of.
    const now = play(fen, m.san);
    if (!now || !now.move.san.includes('+') || now.board.isCheckmate()) continue;
    const kingMoves = now.board.moves({ verbose: true }).filter((x) => x.piece === 'k').map((x) => x.to);
    const covered = kingMoves.filter((sq) => { try { return b.board.attackers(sq, me).length > 0; } catch { return false; } });
    if (covered.length === 0) continue;
    return {
      hint: 'There is a check that is almost mate — the king has one way out. Find the quiet move that takes it away first.',
      text: `${cap(sayMoveClause(m.san, fen))} would be check, but the king escapes to ${covered[0]}. ${cap(sayMoveClause(b.move.san, fen))} takes ${covered[0]} away first — then that check is mate.`,
      squares: [covered[0]],
    };
  }
  return null;
}


/**
 * WHAT THIS POSITION POSED — the diagnosis half of the insight computer (both
 * ways). The same reads that TEACH (their threat, the escape square, the Greek
 * gift, the autopilot recapture) name the capability the board asked for, so
 * the evidence recorder can mark it held or broken. Importance is the posed
 * question's weight on the heat map's scale.
 */
export function positionPosed(
  fen: string,
  opts: { bestSan?: string; lastMove?: { fenBefore: string; san: string } },
): Array<{ tag: MisconceptionTagId; posedImportance: number }> {
  const out: Array<{ tag: MisconceptionTagId; posedImportance: number }> = [];
  const add = (tag: MisconceptionTagId, w: number): void => { if (!out.some((o) => o.tag === tag)) out.push({ tag, posedImportance: w }); };
  try {
    if (opts.lastMove) {
      const r = play(opts.lastMove.fenBefore, opts.lastMove.san);
      if (r && detectNewThreat(opts.lastMove.fenBefore, r.board.fen(), r.move.color)) add('missed-opponents-threat', 90);
    }
    if (escapeSquareFirst(fen, opts.bestSan) || greekGift(fen, opts.bestSan) || doubleAttack(fen, opts.bestSan ?? '') || (opts.bestSan && skewer(fen, opts.bestSan))) add('missed-tactic', 85);
    const me = new Chess(fen).turn();
    if (castleByHand(fen, me)) add('king-stuck-center', 70);
    if (fileToOpen(fen, me)) add('passive-rook', 60);
    if (noRetreat(fen, me)) add('misplaced-piece', 65);
    if ((materialPlan(fen, me)?.diff ?? 0) <= -3) add('bad-trade', 70);
    if (heavyTiedDown(fen, me)) add('passive-rook', 60);
    if (keepTension(fen, me, opts.bestSan ?? null)) add('mistimed-pawn-break', 60);
    if (castleSide(fen, me)) add('weakened-king-safety', 60);
    if (heldByTactic(fen, me)) add('hung-material', 60);
    if (skipMiddleman(fen, opts.bestSan ?? null)) add('mistimed-pawn-break', 60);
    if (rightPieceForHole(fen, me) || keepSquareForKnight(fen, me, opts.bestSan ?? null)) add('misplaced-piece', 60);
    if (takeTheSting(fen, me, opts.bestSan ?? null)) add('missed-opponents-threat', 80);
    if (queenGlue(fen, me)) add('hung-material', 60);
    if (retreatKeepsBreak(fen, me, opts.bestSan ?? null)) add('mistimed-pawn-break', 60);
  } catch { /* an unreadable board posed nothing */ }
  return out;
}

// ── THE FULL SPEED-RUN READ (catalogue A/B/C) ────────────────────────────────

const FILES = 'abcdefgh';
const ownKing = (board: Chess, c: 'w' | 'b'): Square | null => {
  for (const row of board.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === c) return cell.square;
  return null;
};

/**
 * THE PAWN HOOK (catalogue A6/B1 — "…g6 creates a hook, so h5 opens the
 * h-file"): a pawn of `them` pushed one square in front of its castled king,
 * which a pawn of `me` can reach and capture within two moves (three squares
 * from its home rank, thanks to the double step), prying a file
 * open at the king. Only when `me`'s own king is not on that wing — storming
 * the pawns in front of your own king is a different story.
 */
export function pawnHook(fen: string, me: 'w' | 'b'): { hook: string; pawn: string; contact: string; text: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const them = me === 'w' ? 'b' : 'w';
  const king = ownKing(board, them);
  if (!king) return null;
  const homeRank = them === 'w' ? 1 : 8;
  if (Number(king[1]) !== homeRank) return null;
  const kFile = FILES.indexOf(king[0]);
  const wing = kFile >= 5 ? [5, 6, 7] : kFile <= 2 ? [0, 1, 2] : null;
  if (!wing) return null;
  const mine = ownKing(board, me);
  if (mine && wing.includes(FILES.indexOf(mine[0]))) return null;
  const hookRank = them === 'w' ? 3 : 6;
  const dir = me === 'w' ? 1 : -1;
  for (const f of wing) {
    const hookSq = `${FILES[f]}${hookRank}` as Square;
    const hp = board.get(hookSq);
    if (!hp || hp.type !== 'p' || hp.color !== them) continue;
    const contactRank = hookRank - dir;   // the square that attacks the hook
    for (const af of [f - 1, f + 1]) {
      if (af < 0 || af > 7) continue;
      const contact = `${FILES[af]}${contactRank}`;
      // our pawn on that file, up to two moves short of the contact square, path clear
      for (let steps = 1; steps <= 3; steps += 1) {
        const from = `${FILES[af]}${contactRank - dir * steps}` as Square;
        const p = board.get(from);
        if (!p) continue;
        if (p.type !== 'p' || p.color !== me) break;
        if (steps === 3 && Number(from[1]) !== (me === 'w' ? 2 : 7)) break;   // three squares is two moves only from home
        let clear = true;
        for (let s = 1; s <= steps; s += 1) if (board.get(`${FILES[af]}${contactRank - dir * steps + dir * s}` as Square)) clear = false;
        if (!clear) break;
        return {
          hook: hookSq, pawn: from, contact,
          text: `Their pawn on ${hookSq} is a hook — your pawn on ${from} can march to ${contact} and pry a file open in front of their king.`,
        };
      }
    }
  }
  return null;
}

/** The hook `san` just handed the opponent in front of the mover's own king. */
export function hookCreated(fenBefore: string, san: string): { hook: string; pawn: string } | null {
  const r = play(fenBefore, san);
  if (!r || r.move.piece !== 'p') return null;
  const them = r.move.color === 'w' ? 'b' : 'w';
  if (pawnHook(fenBefore, them)) return null;
  const after = pawnHook(r.board.fen(), them);
  return after && after.hook === r.move.to ? { hook: after.hook, pawn: after.pawn } : null;
}

/**
 * CASTLING BY HAND (catalogue B2 — "…Kf7, …Re8, …Kg8"): the king has lost the
 * right to castle and still stands in the centre of its back rank with queens
 * on — walk it to the g-file shelter, a rook across behind it.
 */
export function castleByHand(fen: string, me: 'w' | 'b'): { text: string; squares: string[] } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const rights = board.getCastlingRights(me);
  if (rights.k || rights.q) return null;
  const king = ownKing(board, me);
  const home = me === 'w' ? 1 : 8;
  if (!king || Number(king[1]) !== home || !'def'.includes(king[0])) return null;
  const queens = board.board().flat().filter((c) => c && c.type === 'q').length;
  if (queens === 0) return null;
  const pawnRank = me === 'w' ? 2 : 7;
  const shelter = ['g', 'h'].every((f) => {
    const p = board.get(`${f}${pawnRank}` as Square);
    return p && p.type === 'p' && p.color === me;
  });
  if (!shelter) return null;
  const g = `g${home}`;
  return {
    text: `Your king has lost the right to castle — walk it to ${g} by hand, a step at a time, with a rook coming across behind it.`,
    squares: [king, g],
  };
}

/**
 * PUT THE ROOK ON THE FILE THAT WILL OPEN (catalogue B11 — "if …e6 trades off,
 * the rook is already there"): your pawn is in contact with theirs, so the
 * capture takes your pawn off its file and opens it — and no rook of yours is
 * on that file yet, though one can reach it in a move along its rank.
 */
export function fileToOpen(fen: string, me: 'w' | 'b'): { file: string; rook: string; text: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  for (const m of board.moves({ verbose: true })) {
    if (m.piece !== 'p' || !m.captured || m.captured !== 'p') continue;
    const file = m.from[0];
    let others = 0;
    for (let r = 1; r <= 8; r += 1) { const p = board.get(`${file}${r}` as Square); if (p && p.type === 'p' && p.color === me && `${file}${r}` !== m.from) others += 1; }
    if (others > 0) continue;
    if (heavyOnFile(board, file, me)) continue;
    // a rook that slides onto the file in one move
    const rookMove = board.moves({ verbose: true }).find((x) => x.piece === 'r' && x.to[0] === file && x.from[1] === x.to[1] && !x.captured);
    if (!rookMove) continue;
    return { file, rook: rookMove.from, text: `The pawns on ${m.from} and ${m.to} are in contact — once they trade, the ${file}-file opens. Put a rook on it first.` };
  }
  return null;
}

/** THE CHEAPEST DEFENDER (catalogue A3/C2 — "defend with a pawn before tying
 *  down a piece"): a pawn move that adds a guard to `square`. */
export function pawnCanGuard(fen: string, square: string): string | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const me = board.turn();
  const before = guards(board, square as Square, me).length;
  for (const m of board.moves({ verbose: true })) {
    if (m.piece !== 'p' || m.captured || m.from === square) continue;
    const r = play(fen, m.san);
    if (!r) continue;
    try { if (r.board.isAttacked(m.to, r.move.color === 'w' ? 'b' : 'w') && !guards(r.board, m.to, me).length) continue; } catch { continue; }
    if (guards(r.board, square as Square, me).length > before) return m.to;
  }
  return null;
}

/**
 * AN EMPTY THREAT (catalogue B4/A1 — "a threat needs a purpose beyond itself";
 * "one-move-itis"): the move attacks a piece of theirs, the reply simply moves
 * that piece away, and the line comes out no better for you.
 */
export function emptyThreat(fenBefore: string, san: string, replySan: string | undefined): { target: string; piece: string; to: string } | null {
  const r = play(fenBefore, san);
  if (!r || r.move.captured || r.move.san.includes('+') || !replySan) return null;
  const them = r.move.color === 'w' ? 'b' : 'w';
  let target: { sq: Square; type: string } | null = null;
  for (const row of r.board.board()) for (const cell of row) {
    if (!cell || cell.color !== them || cell.type === 'p' || cell.type === 'k') continue;
    try {
      const hitNow = r.board.attackers(cell.square, r.move.color).includes(r.move.to);
      const hitBefore = new Chess(fenBefore).attackers(cell.square, r.move.color).length > 0;
      if (hitNow && !hitBefore) target = { sq: cell.square, type: cell.type };
    } catch { /* skip */ }
  }
  if (!target) return null;
  const reply = play(r.board.fen(), replySan);
  if (!reply || reply.move.from !== target.sq || reply.move.captured) return null;
  return { target: target.sq, piece: target.type, to: reply.move.to };
}

/** Material for `c` in pawns (king excluded). */
function material(board: Chess, c: 'w' | 'b'): number {
  let n = 0;
  for (const row of board.board()) for (const cell of row) if (cell && cell.color === c && cell.type !== 'k') n += CAPTURE_VALUE[cell.type] ?? 0;
  return n;
}

/**
 * GRADE EVERY PIECE'S SAFETY (catalogue B7 — "a piece is safe only when a pawn
 * guards it"): your pieces with no guard at all. Loose pieces are what a
 * double attack collects, so they are named before anything lands on them.
 */
export function looseOwnPieces(fen: string, me: 'w' | 'b'): Array<{ square: string; piece: string }> {
  // THE loose-piece computer decides what is loose; this adds only "they can
  // hit it next move" — a rook asleep on its home square is not a teaching point.
  const them = me === 'w' ? 'b' : 'w';
  let theirMoves: Move[] = [];
  try { theirMoves = new Chess([fen.split(' ')[0], them, '-', '-', '0', '1'].join(' ')).moves({ verbose: true }); } catch { return []; }
  return findLoosePieces(fen, me)
    .filter((l) => l.type !== 'p' && l.type !== 'q')
    .filter((l) => theirMoves.some((m) => { try { const b = new Chess(m.before); b.move(m.san); return b.attackers(l.square, them).length > 0; } catch { return false; } }))
    .map((l) => ({ square: l.square, piece: l.type }));
}

/**
 * GIVE YOUR PIECE A RETREAT SQUARE BEFORE IT IS CHASED (catalogue B6, the
 * mirror of §36 — "a bolt-hole on h7 makes a later Nh4 harmless"): one pawn
 * push of theirs would hit this piece, and from there it has no safe square.
 */
export function noRetreat(fen: string, me: 'w' | 'b'): { square: string; piece: string; push: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const them = me === 'w' ? 'b' : 'w';
  const parts = fen.split(' ');
  const theirTurn = [parts[0], them, '-', '-', '0', '1'].join(' ');
  let tb: Chess;
  try { tb = new Chess(theirTurn); } catch { return null; }
  for (const m of tb.moves({ verbose: true })) {
    if (m.piece !== 'p' || m.captured) continue;
    const after = new Chess(theirTurn); after.move(m.san);
    if (after.isAttacked(m.to, me) && !guards(after, m.to, them).length) continue;   // the push just hangs
    for (const row of after.board()) for (const cell of row) {
      if (!cell || cell.color !== me || cell.type === 'p' || cell.type === 'k') continue;
      if (!after.attackers(cell.square, them).includes(m.to)) continue;
      if (board.attackers(cell.square, them).length > 0) continue;   // already hit — a different story
      let mine: Chess;
      try { mine = new Chess([after.fen().split(' ')[0], me, '-', '-', '0', '1'].join(' ')); } catch { continue; }
      const val = CAPTURE_VALUE[cell.type] ?? 0;
      const safe = mine.moves({ square: cell.square, verbose: true }).some((x) => {
        const b2 = new Chess(mine.fen()); b2.move(x.san);
        if (x.captured && (CAPTURE_VALUE[x.captured] ?? 0) >= val) return true;
        const hitters = b2.attackers(x.to, them);
        return hitters.length === 0 || (guards(b2, x.to, me).length > 0 && hitters.every((h) => (CAPTURE_VALUE[b2.get(h)?.type ?? 'q'] ?? 9) >= val));
      });
      if (!safe) return { square: cell.square, piece: cell.type, push: m.to };
    }
  }
  return null;
}

/**
 * WHAT THE MATERIAL SAYS ABOUT TRADES (catalogue type 7 + A11/B8 — "down a
 * piece, keep pieces on"; "when lost, complicate"): ahead by a piece or more,
 * trade pieces; behind, keep them on and make it messy.
 */
export function materialPlan(fen: string, me: 'w' | 'b'): { diff: number; text: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const diff = material(board, me) - material(board, me === 'w' ? 'b' : 'w');
  // Trade talk needs pieces to trade (replay, game 2: a king-and-pawn ending
  // was told to "trade pieces, not pawns").
  const pieces = (c: 'w' | 'b'): number => board.board().flat().filter((x) => x && x.color === c && x.type !== 'k' && x.type !== 'p').length;
  if (pieces('w') === 0 || pieces('b') === 0) return null;
  // UP THE EXCHANGE (game 2: "when you're up the exchange, the rooks need open
  // lines — bring everything in, double the rooks, infiltrate the seventh").
  const count = (c: 'w' | 'b', t: string): number => board.board().flat().filter((x) => x && x.color === c && x.type === t).length;
  const them = me === 'w' ? 'b' : 'w';
  const minors = (c: 'w' | 'b'): number => count(c, 'n') + count(c, 'b');
  if (count(me, 'r') > count(them, 'r') && minors(them) > minors(me) && diff >= 1 && diff <= 4) {
    return { diff, text: 'You are up the exchange — rooks need open files: open lines, double them, and aim for the seventh rank.' };
  }
  // Ahead: THE conversion method speaks (`readConversion` — trade, attack or
  // make a passer); never a second copy of it here.
  if (diff >= 3) { const conv = readConversion(fen, me); return conv ? { diff, text: conv.text } : null; }
  if (diff <= -3) return { diff, text: `You are ${countWords(-diff)} down — keep pieces on and make it messy; every trade helps them.` };
  return null;
}


/**
 * A HEAVY PIECE TIED TO A GUARD (catalogue C3 — "queens and rooks make bad
 * defenders"): your queen or rook is the only thing keeping an attacked piece
 * of yours alive.
 */
export function heavyTiedDown(fen: string, me: 'w' | 'b'): { defender: string; piece: string; guarded: string; guardedPiece: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const them = me === 'w' ? 'b' : 'w';
  for (const row of board.board()) for (const cell of row) {
    if (!cell || cell.color !== me || cell.type === 'k' || cell.type === 'q') continue;
    if (board.attackers(cell.square, them).length === 0) continue;
    const g = guards(board, cell.square, me);
    if (g.length !== 1) continue;
    const d = board.get(g[0]);
    if (d && (d.type === 'q' || d.type === 'r')) return { defender: g[0], piece: d.type, guarded: cell.square, guardedPiece: cell.type };
  }
  return null;
}

function homeMinors(board: Chess, c: 'w' | 'b'): Array<{ square: string; type: string }> {
  // THE development reading (`development.minorsAtHome`) — never a second copy.
  return minorsAtHome(board, c).map((m) => ({ square: m.square, type: m.type }));
}

/**
 * THE SKEWER (game 2, 20.Bb4+ — "their king and rook are on the same
 * diagonal, always be alert to that"): the move checks with a line piece, and
 * the first piece standing behind the king on that line is worth taking.
 */
export function skewer(fenBefore: string, san: string): { behind: string; piece: string } | null {
  // THE skewer detector decides (`tacticsDetector`); this reads the one the
  // moved piece makes.
  const r = play(fenBefore, san);
  if (!r) return null;
  try {
    const sk = detectTactics(r.board.fen()).tactics.find((t) => t.type === 'skewer' && t.beneficiary === r.move.color && t.involvedSquares[0] === r.move.to);
    const behind = sk?.involvedSquares[2];
    const p = behind ? r.board.get(behind as Square) : null;
    return behind && p ? { behind, piece: p.type } : null;
  } catch { return null; }
}


// ── INACCESSIBILITY (game 2 full transcript) ─────────────────────────────────

const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

/** Fewest knight moves from any knight of `c` to `target`, through squares not
 *  held by `c`'s own pieces. Null when no knight of `c` can get there. */
export function knightReach(fen: string, target: string, c: 'w' | 'b'): { from: string; moves: number } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const sq = (f: number, r: number): string => `${String.fromCharCode(97 + f)}${r + 1}`;
  let best: { from: string; moves: number } | null = null;
  for (const cell of board.board().flat()) {
    if (!cell || cell.type !== 'n' || cell.color !== c) continue;
    const seen = new Set<string>([cell.square]);
    let frontier = [cell.square as string];
    for (let d = 1; d <= 8 && frontier.length; d += 1) {
      const next: string[] = [];
      for (const s0 of frontier) for (const [df, dr] of KNIGHT_JUMPS) {
        const f = s0.charCodeAt(0) - 97 + df; const r = Number(s0[1]) - 1 + dr;
        if (f < 0 || f > 7 || r < 0 || r > 7) continue;
        const s1 = sq(f, r);
        if (seen.has(s1)) continue;
        seen.add(s1);
        if (s1 === target) { if (!best || d < best.moves) best = { from: cell.square, moves: d }; next.length = 0; frontier = []; break; }
        const occ = board.get(s1 as Square);
        if (occ && occ.color === c) continue;
        next.push(s1);
      }
      if (frontier.length === 0) break;
      frontier = next;
    }
  }
  return best;
}

/**
 * INACCESSIBILITY (his "the square is weak, but his knight needs eight moves to
 * get there — an eternity"): the pawn move just played leaves a square no
 * pawn of yours can ever cover again. Whether it matters is how fast their
 * knight gets there.
 */
export function holeAccess(fenBefore: string, san: string): { hole: string; moves: number | null; from: string | null; text: string } | null {
  let before: Chess; let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return null; }
  let m;
  try { m = after.move(san); } catch { return null; }
  if (!m || m.piece !== 'p') return null;
  const me = m.color; const them = me === 'w' ? 'b' : 'w';
  const f = m.from.charCodeAt(0);
  for (const df of [-1, 1]) {
    const ff = f + df;
    if (ff < 97 || ff > 104) continue;
    for (const rel of [4, 5]) {
      const rank = them === 'w' ? rel : 9 - rel;
      const hole = `${String.fromCharCode(ff)}${rank}`;
      if (after.get(hole as Square)) continue;
      // It was coverable by your pawns before, and is not now.
      if (noPawnCanChallenge(before, hole, them) || !noPawnCanChallenge(after, hole, them)) continue;
      const reach = knightReach(after.fen(), hole, them);
      const said = sayMoveClause(m.san, fenBefore);
      // No knight of theirs at all: the hole is no story (replay, game 2 endgame).
      if (!reach) return null;
      return reach.moves >= 4
        ? { hole, moves: reach.moves, from: reach.from, text: `After ${said}, ${hole} is weak for good, but their knight needs ${num(reach.moves)} moves to get there — an eternity, so don't worry about it.` }
        : { hole, moves: reach.moves, from: reach.from, text: `After ${said}, ${hole} is weak for good, and their knight on ${reach.from} gets there in ${num(reach.moves)} — that square is theirs now.` };
    }
  }
  return null;
}


/**
 * THE PIECE THAT CONTESTS YOUR DIAGONAL (game 1: "we need to take a tempo to
 * eliminate the light-squared bishop so that our bishop remains uncontested on
 * this diagonal"): your bishop's line runs at their king, and their bishop of
 * the same colour can step onto that line in one move and block or trade it.
 */
export function diagonalContest(fen: string, me: 'w' | 'b'): { mine: string; theirs: string; block: string; text: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const them = me === 'w' ? 'b' : 'w';
  const king = ownKing(board, them);
  if (!king) return null;
  const kf = king.charCodeAt(0); const kr = Number(king[1]);
  let theirTurn: Chess;
  try { theirTurn = new Chess([fen.split(' ')[0], them, '-', '-', '0', '1'].join(' ')); } catch { return null; }
  for (const cell of board.board().flat()) {
    if (!cell || cell.color !== me || cell.type !== 'b') continue;
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ray: string[] = [];
      let x = cell.square.charCodeAt(0) + dx; let y = Number(cell.square[1]) + dy; let aimed = false;
      while (x >= 97 && x <= 104 && y >= 1 && y <= 8) {
        const sq = `${String.fromCharCode(x)}${y}`;
        if (Math.abs(x - kf) <= 1 && Math.abs(y - kr) <= 1) { aimed = true; break; }
        if (board.get(sq as Square)) break;
        ray.push(sq);
        x += dx; y += dy;
      }
      if (!aimed || ray.length < 2) continue;
      const block = theirTurn.moves({ verbose: true }).find((m) => m.piece === 'b' && ray.includes(m.to) && !m.captured);
      if (block) {
        return {
          mine: cell.square, theirs: block.from, block: block.to,
          text: `Your bishop on ${cell.square} is aimed at their king, but their bishop on ${block.from} can step to ${block.to} and contest that diagonal — trading it off keeps the line yours.`,
        };
      }
    }
  }
  return null;
}
