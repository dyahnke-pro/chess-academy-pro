/**
 * reasonCheck — decide, in code, which of a move's reasons are TRUE on a board.
 *
 * David 2026-08-17: *"why only pick one if there are multiple reasons to play a
 * certain move. this is the cap that i want removed."* Keeping every reason is
 * only safe if something can tell which of them still apply, because in free
 * play the student reaches a SIMILAR position, not the identical one. A `Bd7`
 * note carries three reasons; if the student's knight already sits on c6 then
 * "deprives the b8 knight of a square" is false on their board and must not be
 * spoken. With one stored reason the coach must choose between silence and a
 * false claim. With three checkable ones it can still teach.
 *
 * This is G0 in its plainest form: **code decides which reasons apply, the
 * model only phrases the survivors.** Nothing here consults a model, and
 * nothing here writes prose.
 *
 * It is also the guard the transcripts turned out to need. Measured over the
 * first ten lessons, the auto-caption text was loose three separate times — a
 * "trapped" bishop with five escape squares, a queen trap that trapped nothing,
 * a mate on c8 that did not exist. Each would have shipped as confident false
 * teaching. A reason that cannot be expressed as one of the kinds below cannot
 * be checked, and an uncheckable claim is exactly the kind that slips through.
 *
 * WHO USES IT. Learn's free play (every move, since "similar position" is what
 * makes per-reason checking load-bearing), Review (all survivors, retrospective
 * register), the taught walkthroughs (the arrows come from the squares a
 * surviving reason NAMES, never from the model's prose), and — ON DEMAND ONLY —
 * Play. Play stays a pure playing surface: it may answer "why was that good?"
 * when the student asks, and never volunteers a reason mid-game.
 */
import { Chess } from 'chess.js';
import type { Color, Move, PieceSymbol, Square } from 'chess.js';

/** A single atomic claim a move makes about the board.
 *
 *  ATOMIC ON PURPOSE. A prose blob ("develops, hits the centre and stops Bg4")
 *  cannot be filtered, so a blob forces the all-or-nothing choice this module
 *  exists to remove. Each reason names the squares it claims, and each is
 *  independently true or false. */
export type Reason =
  /** The mover now attacks the enemy piece standing on `square`. */
  | { kind: 'attacks'; square: Square }
  /** The mover now defends the friendly piece standing on `square`. */
  | { kind: 'defends'; square: Square }
  /** The mover now contests `square`, which is empty. */
  | { kind: 'controls'; square: Square }
  /** The piece on `from` could reach `square` before the move, and can no
   *  longer. The "it's depriving the b8 knight of a square" claim.
   *
   *  EITHER SIDE'S PIECE. This first required an ENEMY piece, which rejected
   *  the very example it was written from: Black's ...Bd7 deprives BLACK's own
   *  b8 knight, and that self-block is precisely what makes the move awkward.
   *  Whose piece it is changes what the reason MEANS — a cost when it is ours,
   *  a restriction when it is theirs — but not whether it is checkable, so the
   *  owner is reported and the caller phrases it. */
  | { kind: 'deprives'; from: Square; square: Square }
  /** A specific enemy reply was available before the move and is now ILLEGAL. */
  | { kind: 'prevents'; san: string }
  /** A specific enemy reply is still legal, but the square it lands on is now
   *  covered by us — so playing it runs into something.
   *
   *  SEPARATE FROM `prevents` BECAUSE TEACHERS SAY "STOP" FOR BOTH. "We move it
   *  to e2 in order to stop bishop g4" sounds like a legality claim and is not:
   *  ...Bg4 stays perfectly legal after Be2, it is simply met by taking. Checked
   *  as a prevention it reads FALSE, and a note written from that would have
   *  either dropped a true idea or asserted an illegality that does not exist. */
  | { kind: 'meets'; san: string }
  /** The line between `from` and `to` was clear before the move and is now
   *  obstructed — the "cuts the contact between the queen and the centre"
   *  shape. Both squares must be on one rank, file or diagonal. */
  | { kind: 'blocks'; from: Square; to: Square }
  /** The line between `from` and `to` was obstructed and is now clear. */
  | { kind: 'opens'; from: Square; to: Square }
  /** The enemy piece on `square` cannot legally move: every destination it had
   *  is gone. The claim that killed a note when checked — a "trapped" bishop
   *  with five escape squares. */
  | { kind: 'traps'; square: Square };

export interface ReasonVerdict {
  reason: Reason;
  holds: boolean;
  /** Why it failed, for the person writing the note. Never shown to a student —
   *  a reason that does not hold is simply not spoken. */
  note?: string;
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** Squares strictly between two squares on a shared rank, file or diagonal.
 *  Empty when they do not share a line, which callers treat as "unverifiable"
 *  rather than "false" — a claim we cannot express is not a claim we disprove. */
function between(from: Square, to: Square): Square[] {
  const f = (s: Square): [number, number] => [s.charCodeAt(0) - 97, Number(s[1]) - 1];
  const [fx, fy] = f(from);
  const [tx, ty] = f(to);
  const dx = Math.sign(tx - fx);
  const dy = Math.sign(ty - fy);
  const straight = fx === tx || fy === ty;
  const diagonal = Math.abs(tx - fx) === Math.abs(ty - fy);
  if (!straight && !diagonal) return [];
  const out: Square[] = [];
  let x = fx + dx;
  let y = fy + dy;
  while (x !== tx || y !== ty) {
    out.push((String.fromCharCode(97 + x) + String(y + 1)) as Square);
    x += dx;
    y += dy;
  }
  return out;
}

const clear = (game: Chess, from: Square, to: Square): boolean =>
  between(from, to).every((sq) => !game.get(sq));

/** Can the piece on `from` reach `square`, ignoring whose turn it is?
 *
 *  TURN HAS TO BE FORCED. `moves()` only ever lists the side to move, so asking
 *  "where can Black's b8 knight go" right after Black moved returns nothing and
 *  every `deprives` claim silently reads as true — the failure mode where a
 *  checker that always passes is worse than no checker. */
function canReach(fen: string, from: Square, square: Square): boolean {
  const probe = new Chess(fen);
  const piece = probe.get(from);
  if (!piece) return false;
  probe.setTurn(piece.color);
  try {
    return probe.moves({ square: from, verbose: true }).some((m) => m.to === square);
  } catch {
    return false;
  }
}

/** Every legal destination of the piece on `square`, from its owner's turn. */
function destinations(fen: string, square: Square): number {
  const probe = new Chess(fen);
  const piece = probe.get(square);
  if (!piece) return 0;
  probe.setTurn(piece.color);
  try {
    return probe.moves({ square, verbose: true }).length;
  } catch {
    return 0;
  }
}

const OWNER: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * Check one reason against a real board.
 *
 * `fenBefore` plus the move is the input rather than just the resulting FEN,
 * because half of these claims are about a CHANGE — a square that used to be
 * available, a reply that used to be legal. Those cannot be evaluated from the
 * end position alone, and this is exactly the same shape the free-play surface
 * has: the student just played a move, so both sides of it are in hand.
 */
export function checkReason(fenBefore: string, san: string, reason: Reason): ReasonVerdict {
  const before = new Chess(fenBefore);
  const mover = before.turn();
  const after = new Chess(fenBefore);
  // chess.js THROWS on an illegal move rather than returning null, so the catch
  // is the whole guard — an extra falsy check after it is dead code.
  let played: Move;
  try {
    played = after.move(san);
  } catch {
    return { reason, holds: false, note: `${san} is not legal in this position` };
  }
  const landed = played.to;
  const fenAfter = after.fen();

  switch (reason.kind) {
    case 'attacks': {
      const target = after.get(reason.square);
      if (!target) return { reason, holds: false, note: `${reason.square} is empty` };
      if (target.color === mover) return { reason, holds: false, note: `${reason.square} is our own piece` };
      // The MOVER must be the attacker. Some other piece already hitting the
      // square is not a reason to play this move.
      const hits = after.attackers(reason.square, mover).includes(landed);
      return { reason, holds: hits, note: hits ? undefined : `the ${OWNER[played.piece]} on ${landed} does not hit ${reason.square}` };
    }
    case 'defends': {
      const target = after.get(reason.square);
      if (!target) return { reason, holds: false, note: `${reason.square} is empty` };
      if (target.color !== mover) return { reason, holds: false, note: `${reason.square} is not our piece` };
      const hits = after.attackers(reason.square, mover).includes(landed);
      return { reason, holds: hits, note: hits ? undefined : `the ${OWNER[played.piece]} on ${landed} does not cover ${reason.square}` };
    }
    case 'controls': {
      if (after.get(reason.square)) return { reason, holds: false, note: `${reason.square} is occupied, so this is attack or defence, not control` };
      const hits = after.attackers(reason.square, mover).includes(landed);
      return { reason, holds: hits, note: hits ? undefined : `the ${OWNER[played.piece]} on ${landed} does not reach ${reason.square}` };
    }
    case 'deprives': {
      const piece = before.get(reason.from);
      if (!piece) return { reason, holds: false, note: `no piece on ${reason.from}` };
      const could = canReach(fenBefore, reason.from, reason.square);
      if (!could) {
        return { reason, holds: false, note: `the ${OWNER[piece.type]} on ${reason.from} could not reach ${reason.square} anyway` };
      }
      const still = canReach(fenAfter, reason.from, reason.square);
      return { reason, holds: !still, note: still ? `the ${OWNER[piece.type]} on ${reason.from} can still go to ${reason.square}` : undefined };
    }
    case 'prevents': {
      // Available to the OPPONENT before, gone after. Checked from their turn
      // both times, since before the move it is not their turn.
      const pre = new Chess(fenBefore);
      pre.setTurn(other(mover));
      const wasLegal = pre.moves().includes(reason.san) || pre.moves().includes(`${reason.san}+`);
      if (!wasLegal) return { reason, holds: false, note: `${reason.san} was not available anyway` };
      const nowLegal = after.moves().includes(reason.san) || after.moves().includes(`${reason.san}+`);
      return { reason, holds: !nowLegal, note: nowLegal ? `${reason.san} is still playable` : undefined };
    }
    case 'meets': {
      // Still legal, but landing on a square we cover. Played on the real board
      // rather than reasoned about, so a reply that is only legal because of a
      // pin or a check cannot slip through.
      const probe = new Chess(fenAfter);
      const reply = probe.moves({ verbose: true })
        .find((m) => m.san === reason.san || m.san === `${reason.san}+`);
      if (!reply) return { reason, holds: false, note: `${reason.san} is not playable here` };
      const covered = after.attackers(reply.to, mover).length > 0;
      return { reason, holds: covered, note: covered ? undefined : `nothing of ours covers ${reply.to}` };
    }
    case 'blocks': {
      const path = between(reason.from, reason.to);
      if (!path.length) return { reason, holds: false, note: `${reason.from} and ${reason.to} share no line` };
      const wasClear = clear(before, reason.from, reason.to);
      if (!wasClear) return { reason, holds: false, note: `the line ${reason.from}-${reason.to} was already blocked` };
      const nowClear = clear(after, reason.from, reason.to);
      return { reason, holds: !nowClear, note: nowClear ? `the line ${reason.from}-${reason.to} is still open` : undefined };
    }
    case 'opens': {
      const path = between(reason.from, reason.to);
      if (!path.length) return { reason, holds: false, note: `${reason.from} and ${reason.to} share no line` };
      if (clear(before, reason.from, reason.to)) return { reason, holds: false, note: `the line ${reason.from}-${reason.to} was already open` };
      const nowClear = clear(after, reason.from, reason.to);
      return { reason, holds: nowClear, note: nowClear ? undefined : `the line ${reason.from}-${reason.to} is still blocked` };
    }
    case 'traps': {
      const target = after.get(reason.square);
      if (!target) return { reason, holds: false, note: `${reason.square} is empty` };
      if (target.color === mover) return { reason, holds: false, note: `${reason.square} is our own piece` };
      const left = destinations(fenAfter, reason.square);
      return {
        reason,
        holds: left === 0,
        note: left === 0 ? undefined : `the ${OWNER[target.type]} on ${reason.square} still has ${left} square${left === 1 ? '' : 's'}`,
      };
    }
    default: {
      // Exhaustiveness: a new reason kind must add a checker, never fall through
      // to a silent pass.
      const never: never = reason;
      return { reason: never, holds: false, note: 'unknown reason kind' };
    }
  }
}

/** Check a move's whole reason list. Returns every verdict, in order — the
 *  caller decides how many of the survivors to speak (Watch several, a Learn
 *  cue the sharpest one, Review all of them). */
export function checkReasons(fenBefore: string, san: string, reasons: readonly Reason[]): ReasonVerdict[] {
  return reasons.map((r) => checkReason(fenBefore, san, r));
}

/** The reasons that are true on this board. This is what a surface speaks. */
export function survivingReasons(fenBefore: string, san: string, reasons: readonly Reason[]): Reason[] {
  return checkReasons(fenBefore, san, reasons).filter((v) => v.holds).map((v) => v.reason);
}
