// LEARN BOARD TEACHING — the board-level teaching computers, composed ONCE
// (surfaceComposition gate: the page must not import each computer directly).
//
// For the STUDENT's move: which piece took back and why (census #8), what it
// adds to the attack on their king (#2), a rule it breaks for a reason (#10),
// and a threat of theirs it rightly ignored (#7). For THEIR move: what it cost
// them (#5). Each returns the line, the squares it names and the claims it
// makes; the page queues them into the Learn door, which ranks them.
//
// Pure: the engine reads are handed in by the page.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import type { LearnLane } from './learnTurnDoor';
import type { ArrowClaim } from './arrowDoor';
import { recaptureChoice } from './recaptureChoice';
import { kingAttack } from './kingAttack';
import { ruleException } from './ruleException';
import { falseAlarm } from './falseAlarm';
import { theirMoveCost } from './theirMoveCost';
import { pushOrHold } from './pushOrHold';

export interface TeachingHint {
  lane: LearnLane;
  text: string;
  squares: string[];
  claims: string[];
  /** The analytics event this line fires when queued. */
  event: { name: string; props: Record<string, string | number | boolean> } | null;
  /** The arrows that illustrate THIS line, computed with it (David 2026-09-30:
   *  "make sure arrows are firing to illustrate the ideas being spoken"). They
   *  are validated by the arrow door on the live board and drawn only when the
   *  line survives the turn. */
  arrows: ArrowClaim[];
}

/** The board after the student's move and their reply, or null. */
function boardAfter(fenBefore: string, san: string, reply: string | null): Chess | null {
  try {
    const c = new Chess(fenBefore);
    c.move(san);
    if (reply) c.move(reply.replace(/^…/, ''));
    return c;
  } catch { return null; }
}

export interface StudentMoveInput {
  fenBefore: string;
  /** The student's move, SAN. */
  san: string;
  /** Every SAN of the game up to AND INCLUDING the student's move. */
  history: readonly string[];
  /** Cost of the move against the engine's best, centipawns, student POV. */
  cpLoss: number;
  /** Both engine reads are centipawns (no mate on either side). */
  bothCp: boolean;
  /** The engine's best move at `fenBefore`, SAN. */
  bestSan: string | null;
  /** The engine's best line at `fenBefore` (White POV). */
  bestLine: AnalysisLine | undefined;
  /** Their answer to the student's move, SAN, when already on the board. */
  reply: string | null;
  /** The engine's eval AFTER the student's move, centipawns, student POV; null
   *  when either read is a mate. */
  cpAfter: number | null;
}

/** Everything the student's move teaches on the board, in no particular order —
 *  the Learn door ranks. */
export function studentMoveTeaching(i: StudentMoveInput): TeachingHint[] {
  const out: TeachingHint[] = [];
  let to = '';
  try { to = new Chess(i.fenBefore).move(i.san).to; } catch { return out; }

  // WHICH PIECE TAKES BACK, AND WHY — the better recapture named only when the
  // played one cost >= 50cp against it (a near-tie is taste).
  try {
    const theirLast = i.history.length >= 2 ? i.history[i.history.length - 2] : null;
    const tookOn = theirLast ? /x([a-h][1-8])/.exec(theirLast)?.[1] ?? null : null;
    if (tookOn && to === tookOn && i.san.includes('x')) {
      const bestRe = i.bestSan && new RegExp(`x${tookOn}`).test(i.bestSan) && i.cpLoss >= 50 ? i.bestSan : null;
      const rc = recaptureChoice(i.fenBefore, i.san, bestRe, i.reply);
      if (rc) out.push({ lane: 'recapture', text: rc, squares: [to], claims: [`recapture-${to}`], event: null, arrows: [] });
    }
  } catch { /* a bonus, never a blocker */ }

  // BRINGING PIECES TO THEIR KING — not on a move that cost a pawn; that
  // move's lesson is the cost.
  if (i.cpLoss < 100) {
    const ka = kingAttack(i.fenBefore, i.san);
    if (ka) {
      out.push({
        lane: 'kingAttack', text: ka.text, squares: ka.squares,
        // "Qe1 heads for their king — Qg3 next" and "Qe1 prepares Qg3" are one idea.
        claims: [`king-attack-${ka.kind}`, ...(ka.next ? [`prepares:${ka.next.uci}`] : [])],
        event: { name: 'coach_king_attack_named', props: { surface: 'coach-teach', kind: ka.kind } },
        // "…heads for their king — Qg3 next": the next hop, as the move to play.
        arrows: ka.next ? [{ from: ka.next.uci.slice(0, 2), to: ka.next.uci.slice(2, 4), role: 'play', source: 'learn.kingAttack' }] : [],
      });
    }
  }

  // A RULE AND ITS EXCEPTION — only on a move the engine agrees with, so the
  // exception is proven, not excused.
  if (i.bothCp && i.cpLoss <= 20) {
    const rx = ruleException(i.fenBefore, i.san, i.history.slice(0, -1));
    if (rx) {
      // "…here it hits the pawn on g2": the sight line — only while the target
      // is still standing there after their reply.
      const hitSq = rx.squares[1];
      const live = boardAfter(i.fenBefore, i.san, i.reply);
      const stillThere = !!hitSq && !!live?.get(hitSq as never);
      out.push({
        lane: 'ruleException', text: rx.text, squares: rx.squares, claims: [`rule-${rx.rule}-${to}`],
        event: { name: 'coach_rule_exception_named', props: { surface: 'coach-teach', rule: rx.rule } },
        arrows: stillThere ? [{ from: to, to: hitSq, role: 'vision', source: 'learn.ruleException' }] : [],
      });
    }
  }

  // DON'T PANIC — their last move made a real threat, the engine's move
  // ignored it, and the student played exactly that move. The board before
  // their move is replayed from the game and must lead to this board.
  if (i.bothCp && i.cpLoss <= 20 && i.bestSan === i.san && i.history.length >= 2) {
    try {
      const g = new Chess();
      for (const s of i.history.slice(0, -2)) g.move(s);
      const beforeTheirs = g.fen();
      g.move(i.history[i.history.length - 2]);
      if (g.fen().split(' ')[0] === i.fenBefore.split(' ')[0]) {
        const fa = falseAlarm(beforeTheirs, i.fenBefore, i.bestLine, i.reply);
        if (fa) {
          // Their threat, red — only while it is still coming (not once played).
          const played = i.reply && i.reply.replace(/^…/, '') === fa.threat.san;
          out.push({
            lane: 'falseAlarm', text: fa.text, squares: fa.squares, claims: [`false-alarm-${fa.threat.landing}`],
            event: { name: 'coach_false_alarm_named', props: { surface: 'coach-teach', kind: fa.threat.kind } },
            arrows: played ? [] : [{ from: fa.threat.from, to: fa.threat.landing, role: 'threat', source: 'learn.falseAlarm' }],
          });
        }
      }
    } catch { /* a bonus, never a blocker */ }
  }
  // PUSH OR HOLD — what a pawn up or down is worth in THIS ending, only while
  // the engine keeps it in the band where the choice matters.
  if (i.cpAfter !== null) {
    try {
      const after = new Chess(i.fenBefore);
      const mv = after.move(i.san);
      const ph = pushOrHold(after.fen(), mv.color, i.cpAfter);
      if (ph) {
        out.push({
          lane: 'pushOrHold', text: ph.text, squares: [], claims: [`ending-${ph.cls}-${ph.side}`],
          event: { name: 'coach_push_or_hold_named', props: { surface: 'coach-teach', cls: ph.cls, side: ph.side } },
          arrows: [],
        });
      }
    } catch { /* a bonus, never a blocker */ }
  }
  return out;
}

/** What THEIR move cost them, for the student to use — "…e6 opens a square your
 *  knight jumps into", "the passive …d6 blocks in the bishop". */
export function theirMoveTeaching(fenBefore: string, san: string, student: 'w' | 'b'): TeachingHint | null {
  const cost = theirMoveCost(fenBefore, san, student);
  if (!cost) return null;
  // A hole your knight can use: its first hop, as the move to play.
  const arrows: ArrowClaim[] = cost.kind === 'hole' && cost.squares.length >= 2
    ? [{ from: cost.squares[1], to: cost.squares[2] ?? cost.squares[0], role: 'play', source: 'learn.theirMoveCost' }]
    : [];
  return {
    lane: 'theirMoveCost', text: cost.text, squares: cost.squares, claims: [`cost-${cost.kind}-${cost.squares[0]}`],
    event: { name: 'coach_their_move_cost_named', props: { surface: 'coach-teach', kind: cost.kind } },
    arrows,
  };
}
