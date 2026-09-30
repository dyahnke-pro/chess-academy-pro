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
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { recordLaneEvidence } from './capabilityEvidence';
import type { AnalysisLine } from '../types';
import type { LearnLane } from './learnTurnDoor';
import type { ArrowClaim } from './arrowDoor';
import { recaptureChoice } from './recaptureChoice';
import { kingAttack } from './kingAttack';
import { ruleException } from './ruleException';
import { falseAlarm } from './falseAlarm';
import { theirMoveCost } from './theirMoveCost';
import { pushOrHold } from './pushOrHold';
import { threatAnswer, type ThreatAnswer } from './threatAnswer';
import { mastersPlanLine, mastersPlanRead } from './mastersPlanRead';
import { ensureMastersDbLoaded, mastersMovesSync } from './masterPlayLookup';
import { tempoCount } from './tempoCount';
import { readTiming, timingClause } from './moveTiming';
import { checkMethod } from './checkMethod';
import { tradeJudgement } from './tradeJudgement';
import type { PieceValue } from './pieceValueRead';
import { kneeJerk } from './kneeJerk';
import { autopilotGuard, blunderCheck } from './safetyHabits';
import { strongChoice, warmStrongChoice } from './strongChoice';
import { stalemateWatch } from './stalemateWatch';
import { criticalMomentFound, readCriticalMoment, type CriticalFanLine } from './criticalMoment';

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
  /** DUAL-USE (P4): what this line proves the student CAN do, coupled at
   *  emission. Only HELD rows — a miss is already recorded by the live slip
   *  capture, so a broken row here would count it twice. */
  evidence?: { tag: MisconceptionTagId; posedImportance: number };
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
  /** The engine's per-piece table (`evalBoard`) at `fenBefore` — fetched by the
   *  page only when the move completed a trade, for the good-piece /
   *  bad-piece read. Absent → the trade is judged without it. */
  evalBefore?: readonly PieceValue[];
  /** The move most players at the student's level play at `fenBefore` (the
   *  amateur cache's top move), for the autopilot guard. Absent → silent. */
  popularTopSan?: string | null;
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
      // The right recapture chosen (no better one named) answers the
      // capture-toward-centre question — held (P4 dual-use).
      if (rc) out.push({ lane: 'recapture', text: rc, squares: [to], claims: [`recapture-${to}`], event: null, arrows: [], ...(bestRe ? {} : { evidence: { tag: 'capture-toward-centre' as const, posedImportance: 60 } }) });
    }
  } catch { /* a bonus, never a blocker */ }

  // QUESTION THE KNEE-JERK (P3 method beat): the reflex recapture that cost.
  {
    const theirLast = i.history.length >= 2 ? i.history[i.history.length - 2] : null;
    const kj = kneeJerk(theirLast, i.san, i.bestSan, i.cpLoss);
    if (kj) out.push({ lane: 'kneeJerk', text: kj, squares: [to], claims: ['method:knee-jerk'], event: { name: 'coach_knee_jerk_taught', props: { surface: 'coach-teach' } }, arrows: [] });
  }

  // A STRONG PLAYER'S CHOICE HERE — from the games DB, depersonalized, said
  // after the move (P3 "his data on the live board").
  warmStrongChoice();
  {
    const sc = strongChoice(i.fenBefore, i.san);
    if (sc) out.push({ lane: 'strongChoice', text: sc.text, squares: [], claims: [`strong-choice:${i.history.length}`], event: { name: 'coach_strong_choice_named', props: { surface: 'coach-teach', same: sc.same } }, arrows: [] });
  }

  // THE SAFETY HABITS (P3 method beats) — earned only by what the board did.
  {
    const bc = blunderCheck(i.fenBefore, i.san, i.reply, i.cpLoss);
    if (bc) out.push({ lane: 'blunderCheck', text: bc, squares: [], claims: ['method:blunder-check'], event: { name: 'coach_blunder_check_taught', props: { surface: 'coach-teach' } }, arrows: [] });
    const ap = autopilotGuard(i.san, i.cpLoss, i.popularTopSan ?? null);
    if (ap) out.push({ lane: 'autopilot', text: ap, squares: [to], claims: ['method:autopilot'], event: { name: 'coach_autopilot_taught', props: { surface: 'coach-teach' } }, arrows: [] });
  }

  // WAS THE TRADE A GOOD DEAL (P3, T3 #45) — a like-for-like trade the reply
  // completed, judged by the first reason the board supports.
  try {
    const tj = tradeJudgement(i.fenBefore, i.san, i.reply, new Chess(i.fenBefore).turn(), i.cpLoss, i.evalBefore);
    if (tj) out.push({ lane: 'trade', text: tj.text, squares: tj.squares, claims: [`trade-${tj.reason}`, `capture:${to}:${i.history.length}`, ...(tj.reason === 'their-best' ? [`piece-quality:${to}`] : [])], event: { name: 'coach_trade_judged', props: { surface: 'coach-teach', reason: tj.reason } }, arrows: [],
      // A good trade the student chose is the 'bad-trade' question answered well.
      ...(tj.reason !== 'behind' && tj.reason !== 'gave-best' ? { evidence: { tag: 'bad-trade' as const, posedImportance: 60 } } : {}) });
  } catch { /* a bonus, never a blocker */ }

  // THE TIMING (capability parity with review, WO-TEACH-GAPS P3): "b4 is
  // finally right — a move earlier their queen would have taken on b3". Only on
  // a sound move; the board a move earlier is replayed from the game itself.
  // QUIET MOVES ONLY (run J, 2026-09-30: "The timing of Ncxd4 matters" on a
  // recapture, "The timing of Qh2+" on a check). The lesson is a quiet move
  // played at the right moment; a capture or a check is its own reason.
  if (i.cpLoss < 50 && i.history.length >= 3 && !/[x+#]/.test(i.san)) {
    try {
      const early = new Chess();
      for (const san of i.history.slice(0, -3)) early.move(san);
      const t = readTiming(early.fen(), i.fenBefore, i.san);
      if (t) out.push({ lane: 'timing', text: `${timingClause(t)}.`, squares: [to, t.square], claims: [`timing:${i.san}`], event: { name: 'coach_move_timing_named', props: { surface: 'coach-teach' } }, arrows: [],
        // A pawn push played at the right moment answers the mistimed-break question.
        ...(/^[a-h]/.test(i.san) ? { evidence: { tag: 'mistimed-pawn-break' as const, posedImportance: 70 } } : {}) });
    } catch { /* a bonus, never a blocker */ }
  }

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
            // A threat rightly ignored (the engine's move, and not worse) is the
            // opponent-threat question answered — held (P4 dual-use).
            evidence: { tag: 'missed-opponents-threat', posedImportance: 70 },
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

/** Tempo, counted (P2 #7): their reply is a piece's third move in the opening
 *  while the student has more pieces out. `history` ends with THEIR reply. */
export function tempoTeaching(history: readonly string[], student: 'w' | 'b'): TeachingHint | null {
  const t = tempoCount(history, student);
  if (!t) return null;
  return {
    lane: 'tempo', text: t.text, squares: t.squares, claims: [`tempo-count:${t.pieceId}`],
    event: { name: 'coach_tempo_counted', props: { surface: 'coach-teach', moves: t.moves } },
    arrows: [],
  };
}

/** Stalemate watch (P2 #9): student to move at `fen`, winning, and one of
 *  their moves stalemates the opponent. */
export function stalemateTeaching(fen: string, student: 'w' | 'b'): TeachingHint | null {
  const w = stalemateWatch(fen, student);
  if (!w) return null;
  return {
    lane: 'stalemate', text: w.text, squares: w.squares, claims: [`stalemate-watch:${fen.split(' ')[0]}`],
    event: { name: 'coach_stalemate_warned', props: { surface: 'coach-teach', moves: w.moves.length } },
    arrows: [],
  };
}

/** Three ways to meet check (P3 method beat): the student is in check and the
 *  best answer is not the king move. Names the kinds, never the move. */
export function checkMethodTeaching(fen: string, student: 'w' | 'b', bestUci: string | null): TeachingHint | null {
  const m = checkMethod(fen, student, bestUci);
  if (!m) return null;
  return {
    lane: 'checkMethod', text: m.text, squares: m.squares, claims: ['check-method'],
    event: { name: 'coach_check_method_taught', props: { surface: 'coach-teach', kinds: m.kinds.join(',') } },
    arrows: [],
  };
}

/** A held row for a lane the page composes itself (moveOrder, moveIntent, a
 *  plan arriving) — the same writer, the same honesty about `prompted`. */
export function recordHeld(tag: MisconceptionTagId, posedImportance: number, ctx: { fen: string; playedSan: string; prompted: boolean; gameId: string | null }): void {
  recordTeachingEvidence({ lane: 'movePoint', text: '', squares: [], claims: [], event: null, arrows: [], evidence: { tag, posedImportance } }, ctx);
}

/** Write the line's evidence row, if it carries one (P4 dual-use). The ONE
 *  impure export here: the page hands every queued hint through it so a lane
 *  that teaches also records. `prompted` = the student was told the moment
 *  before they moved (the critical-moment announcement). */
export function recordTeachingEvidence(h: TeachingHint, ctx: { fen: string; playedSan: string; prompted: boolean; gameId: string | null }): void {
  if (!h.evidence) return;
  void recordLaneEvidence({
    tag: h.evidence.tag, outcome: 'held', fen: ctx.fen, playedSan: ctx.playedSan,
    posedImportance: h.evidence.posedImportance, origin: 'learn', prompted: ctx.prompted,
    ...(ctx.gameId ? { sourceGameId: ctx.gameId } : {}),
  });
}

/** The answer to a threat the coach just named ("Watch out — their bishop pins
 *  your knight …"): question first, then what the engine's move does about it
 *  (census T4). Appended to the threat line itself, never a lane of its own —
 *  a threat and its answer are one claim. */
export function threatAnswerTeaching(i: {
  fen: string;
  squares: readonly string[];
  shape: 'line' | 'hit';
  bestUci: string | null;
  /** White-POV engine eval at `fen`, or null. */
  whiteCp: number | null;
  student: 'w' | 'b';
  ply: number;
}): ThreatAnswer | null {
  const studentCp = i.whiteCp === null ? null : i.student === 'w' ? i.whiteCp : -i.whiteCp;
  return threatAnswer({ fen: i.fen, squares: i.squares, bestUci: i.bestUci, studentCp, student: i.student, ply: i.ply, shape: i.shape });
}

/** THE OPENING'S PLAN, COMPUTED FROM MASTER GAMES (WO-TEACH-GAPS P2 #0): the
 *  pawn break each side's master games go for from this board, with its share.
 *  Warms the masters file on first call; silent until it has loaded. */
export function openingPlanTeaching(fen: string, student: 'w' | 'b'): TeachingHint | null {
  void ensureMastersDbLoaded();
  const plan = mastersPlanLine(mastersPlanRead(fen, mastersMovesSync), student);
  if (!plan) return null;
  return {
    lane: 'openingIdea', text: plan.text, squares: plan.squares, claims: plan.squares.map((q) => `break-${q}`),
    event: { name: 'coach_opening_plan_named', props: { surface: 'coach-teach' } },
    arrows: plan.arrows.map((a) => ({ from: a.from, to: a.to, role: 'play', fen, source: 'learn.openingPlan' })),
  };
}

/** THE VERDICT ON A FOUND MOVE (P2 #2): at a real decision moment on the board
 *  before the move, the student played one of the only moves that held. */
export function foundMoveTeaching(fenBefore: string, san: string, preLines: readonly CriticalFanLine[] | undefined, student: 'w' | 'b', to: string): TeachingHint | null {
  if (!preLines || preLines.length < 2) return null;
  const text = criticalMomentFound(readCriticalMoment({ topLines: preLines, moverColor: student, fen: fenBefore }), san);
  if (!text) return null;
  // A real decision moment (only one or two moves held) answered is calculation
  // proven — importance 90, above the green bar, because the board posed it.
  return { lane: 'foundMove', text, squares: [to], claims: [`found-${san}`], event: { name: 'coach_found_move_named', props: { surface: 'coach-teach' } }, arrows: [], evidence: { tag: 'calculation-depth', posedImportance: 90 } };
}

// ── PLAY ASKS THE SAME COMPUTERS (David 2026-09-30: "Play still needs access to
// these computers to answer questions on demand"). One composer for Learn's
// narration and Play's answers, so a question gets the same fact the lesson
// would have said. TEXT ONLY: answering a question never writes evidence — the
// move was already recorded when it was played.

function replayTo(history: readonly string[], ply: number): string | null {
  try { const c = new Chess(); for (const san of history.slice(0, ply)) c.move(san); return c.fen(); } catch { return null; }
}

/** "Was that a good move?" — every board-level teaching line for the student's
 *  move at `ply` (0-based index into `history`). */
export function studentMoveAnswerLines(history: readonly string[], ply: number, cpLoss: number, bestSan: string | null): string[] {
  const fenBefore = replayTo(history, ply);
  if (!fenBefore || ply < 0 || ply >= history.length) return [];
  const hints = studentMoveTeaching({
    fenBefore, san: history[ply], history: history.slice(0, ply + 1), cpLoss, bothCp: true,
    bestSan, bestLine: undefined, reply: history[ply + 1] ?? null, cpAfter: null,
  });
  return hints.map((h) => h.text);
}

/** "What did their move do? Do I have to deal with it?" — what it cost them,
 *  the tempo count, and — when their move is the last on the board and the
 *  engine's best line at the current position is known — whether its threat can
 *  wait (`falseAlarm`). `ply` is the index of THEIR move. */
export function theirMoveAnswerLines(history: readonly string[], ply: number, student: 'w' | 'b', best?: AnalysisLine): string[] {
  const fenBefore = replayTo(history, ply);
  if (!fenBefore || ply < 0 || ply >= history.length) return [];
  const out: string[] = [];
  if (best && ply === history.length - 1) {
    const after = replayTo(history, ply + 1);
    const fa = after ? falseAlarm(fenBefore, after, best, null) : null;
    if (fa) out.push(fa.text);
  }
  const cost = theirMoveTeaching(fenBefore, history[ply], student);
  if (cost) out.push(cost.text);
  const tempo = tempoTeaching(history.slice(0, ply + 1), student);
  if (tempo) out.push(tempo.text);
  return out;
}

/** "How am I doing / what should I watch?" — the warnings the board earns now:
 *  a move that would stalemate them, and the three ways to meet a check. */
export function dangerAnswerLines(fen: string, student: 'w' | 'b', bestUci: string | null): string[] {
  const out: string[] = [];
  const st = stalemateTeaching(fen, student);
  if (st) out.push(st.text);
  const cm = checkMethodTeaching(fen, student, bestUci);
  if (cm) out.push(cm.text);
  return out;
}
