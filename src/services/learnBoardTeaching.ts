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
import { lineWins, lineArrows, mateLine, type MateLine } from './lineCalc';
/** A line as board arrows, ply by ply (one door for the page). */
export { lineArrows as lineArrowClaims };
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
import { autopilotGuard, blunderCheck, keepPressing } from './safetyHabits';
import { pawnEndingTrade, outsidePasserDecoy, spareTempoWasted, kingCourse } from './endgamePawnReads';
import { readZugzwang, zugzwangSentence } from './zugzwang';
import { strongChoice, warmStrongChoice } from './strongChoice';
import { stalemateWatch } from './stalemateWatch';
import { criticalMomentFound, readCriticalMoment, type CriticalFanLine } from './criticalMoment';
import { SAID_BEFORE_MOVE } from './computerRoles';
import { fileClaimed } from './planRace';
import { sayMoveNoun } from './spokenMove';
import { detectTacticType } from './missedTacticService';
import { tacticTypeLabel } from './tacticAlertService';
import type { TacticType } from '../types';
import { countMethod } from './countMethod';
import { splitPosition } from './splitPosition';
import { planChoice, type PlanChoiceLine } from './planChooser';
import { openingIdentityLine, warmOpeningIdentity } from './openingIdentity';
import { trapAheadAt } from './gemCrushLines';
import { noteTrapMeeting, trapSpeaks, type TrapState } from './trapLearning';
import { ruledOutSans, extractMentionedSans } from './arrowEngine';
import { slipAnswerText, studentMovePoint } from './playCommentary';
import { threatStoppedBy } from './opponentMovePurpose';
import { trickSidestepped } from './forkTrick';
import { gameArcs } from './lookaheadPlan';

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
  /** A known trap on this board (trapAhead only): the slip, and whether the
   *  coach speaks this time or holds back as a test (`trapLearning`). */
  trap?: { slip: string; confirmed: boolean; state: TrapState; speak: boolean };
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

  // THE LINE BEHIND A WINNING MOVE (David 2026-09-30: "teach more line
  // calculations"): the student played the engine's move and its line wins
  // material — say it to where it lands, and draw it. One claim with the
  // found-move line, so a critical moment says it once.
  try {
    const me = i.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
    const bare = (x: string): string => x.replace(/[+#]$/, '');
    if (i.bestSan && bare(i.bestSan) === bare(i.san) && i.bestLine?.moves?.length) {
      const ml = mateLine(i.fenBefore, i.bestLine.moves, me, i.san);
      const w = ml ? null : winningLine(i.fenBefore, i.san, i.bestLine.moves, me);
      if (ml) out.push({ lane: 'movePoint', text: ml.text, squares: [to, ...ml.taken], claims: [`wins-line:${i.fenBefore.split(' ').slice(0, 2).join(' ')}`], event: { name: 'coach_mate_line', props: { surface: 'coach-teach', quiet: ml.quiet } }, arrows: mateArrows(ml, me) });
      if (w) out.push({ lane: 'movePoint', text: `That wins ${w.what}: ${w.sans.join(' ')}.`, squares: [to], claims: [`wins-line:${i.fenBefore.split(' ').slice(0, 2).join(' ')}`], event: { name: 'coach_winning_line', props: { surface: 'coach-teach' } }, arrows: w.arrows });
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

  // THE OPEN FILE, TAKEN (planRace file collision, live — P3): both sides
  // wanted it and the student's rook got there on a clean move. Said after the
  // move, and it records: the board asked who takes the file.
  if (i.cpLoss < 50) {
    const fc = fileClaimed(i.fenBefore, i.san);
    if (fc) out.push({ lane: 'fileRace', text: fc.text, squares: [to], claims: [`file-race:${fc.file}`], event: { name: 'coach_file_claimed', props: { surface: 'coach-teach', contested: fc.contested } }, arrows: [], evidence: { tag: 'passive-rook', posedImportance: 60 } });
  }

  // THE SAFETY HABITS (P3 method beats) — earned only by what the board did.
  {
    const bc = blunderCheck(i.fenBefore, i.san, i.reply, i.cpLoss);
    if (bc) out.push({ lane: 'blunderCheck', text: bc, squares: [], claims: ['method:blunder-check'], event: { name: 'coach_blunder_check_taught', props: { surface: 'coach-teach' } }, arrows: [] });
    const ap = autopilotGuard(i.san, i.cpLoss, i.popularTopSan ?? null);
    if (ap) out.push({ lane: 'autopilot', text: ap, squares: [to], claims: ['method:autopilot'], event: { name: 'coach_autopilot_taught', props: { surface: 'coach-teach' } }, arrows: [] });
    // THE PAWN ENDING (Naroditsky's endgame series): the move that takes the
    // last pieces off is counted first; and once only kings and pawns remain,
    // an outside passer is a decoy. Each once per game (claims).
    const st = spareTempoWasted(i.fenBefore, i.san, i.bestSan, i.cpLoss);
    if (st) out.push({ lane: 'pawnEnding', text: st, squares: [to], claims: ['method:spare-tempo'], event: { name: 'coach_spare_tempo_taught', props: { surface: 'coach-teach' } }, arrows: [] });
    const pe = pawnEndingTrade(i.fenBefore, i.san, i.reply, i.cpLoss, i.cpAfter);
    if (pe) out.push({ lane: 'pawnEnding', text: pe.text, squares: [to], claims: ['method:pawn-ending-trade'], event: { name: 'coach_pawn_ending_trade', props: { surface: 'coach-teach', verdict: pe.verdict } }, arrows: [] });
    try {
      const me: 'w' | 'b' = i.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
      const c = new Chess(i.fenBefore); c.move(i.san);
      const decoy = outsidePasserDecoy(c.fen(), me);
      if (decoy) out.push({ lane: 'pawnEnding', text: decoy.text, squares: decoy.squares, claims: [`decoy:${decoy.passer[0]}`], event: { name: 'coach_outside_passer_decoy', props: { surface: 'coach-teach' } }, arrows: [] });
    } catch { /* a bonus, never a blocker */ }
    const kp = keepPressing(i.fenBefore, i.san, i.bestSan, i.cpLoss, i.cpAfter);
    if (kp) out.push({ lane: 'keepPressing', text: kp, squares: [], claims: ['method:keep-pressing'], event: { name: 'coach_keep_pressing_taught', props: { surface: 'coach-teach' } }, arrows: [] });
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

/** The plan chooser (census #52): the engine's two best lines carry
 *  different plans for the student — level, or one clearly stronger. */
export function planChoiceTeaching(
  fen: string, lines: readonly PlanChoiceLine[], studentColor: 'white' | 'black',
  lastMove: { fenBefore: string; san: string } | null,
): TeachingHint | null {
  const pc = planChoice(fen, lines, studentColor, lastMove);
  if (!pc) return null;
  return {
    lane: 'planArc', text: pc.text, squares: [], claims: ['plan-choice', pc.key],
    event: { name: 'coach_plan_choice_named', props: { surface: 'coach-teach' } },
    arrows: [],
  };
}

/** Split the position (P3): opposite-side castling with queens on. */
export function splitPositionTeaching(fen: string, student: 'w' | 'b'): TeachingHint | null {
  const sp = splitPosition(fen, student);
  if (!sp) return null;
  return {
    lane: 'splitPosition', text: sp.text, squares: sp.squares, claims: ['split-position'],
    event: { name: 'coach_split_position_taught', props: { surface: 'coach-teach' } },
    arrows: [],
  };
}

/** Count before you take (P3): an exchange square the count decides. */
export function countMethodTeaching(fen: string, student: 'w' | 'b'): TeachingHint | null {
  const m = countMethod(fen, student);
  if (!m) return null;
  return {
    lane: 'countMethod', text: m.text, squares: [m.square], claims: ['count-method'],
    event: { name: 'coach_count_method_taught', props: { surface: 'coach-teach' } },
    arrows: [],
  };
}

/** EVERY MOVE A LINE NAMES GETS ITS ARROW (G6; the walk 2026-09-30 drew
 *  arrows on 7 of 64 plies — "Their Bg3 prepares h4", "Rxe1+ was the trade"
 *  and "Kd8 refutes it" all spoke with none). The fallback for a line that
 *  carries no arrows of its own: each SAN it names, resolved on its board
 *  (or the other side to move), the student's in `play`, theirs in `theirs`. */
export function namedMoveArrows(text: string, fen: string, student: 'w' | 'b'): ArrowClaim[] {
  const out: ArrowClaim[] = [];
  const seen = new Set<string>();
  const ruledOut = ruledOutSans(text);
  for (const san of extractMentionedSans(text)) {
    // A move the line rules out is said, never arrowed (the arrow door's rule):
    // "it stops your Ra5" drew Ra5 green as if to play it (Learn walk 2026-10-01).
    if (ruledOut.has(san)) continue;
    for (const f of [fen, flipTurn(fen)]) {
      try {
        const c = new Chess(f);
        const mv = c.move(san);
        if (!mv) continue;
        const k = `${mv.from}${mv.to}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push({ from: mv.from, to: mv.to, role: mv.color === student ? 'play' : 'theirs', fen: f, source: 'learn.namedMove' });
        }
        break;
      } catch { /* not legal on this side — try the other */ }
    }
  }
  return out;
}
function flipTurn(fen: string): string {
  const p = fen.split(' ');
  if (p.length < 2) return fen;
  p[1] = p[1] === 'w' ? 'b' : 'w';
  p[3] = '-';
  return p.join(' ');
}

/** A KNOWN TRAP AHEAD (practical lore): the student's natural-looking move
 *  here is a curated, engine-verified trap that club players fall into. Names
 *  the move to be careful with and the share that plays it; never the
 *  refutation, and never the student's best move. */
export function trapAheadTeaching(fen: string, student: 'w' | 'b'): TeachingHint | null {
  // THE STUDENT'S move only (walk 2026-09-30, game 1: it warned about White's
  // Nxd4 to a Black student, on the coach's own think board).
  if (fen.split(' ')[1] !== student) return null;
  const t = trapAheadAt(fen);
  if (!t) return null;
  const to = t.san.replace(/[+#]/g, '').slice(-2);
  // WARN, OR TEST (David 2026-09-30): grey and red always warn; once heeded
  // in enough games the coach holds back once, and an unaided avoid is green.
  const parts = fen.split(' ');
  const ply = (Number(parts[5] ?? 1) - 1) * 2 + (parts[1] === 'b' ? 1 : 0) + 1;
  const learnt = trapSpeaks(fen, ply);
  // THE ARROWS SHOW THE TRAP (David 2026-09-30: "arrows showing the move and
  // the punishment lines"): the natural move in red, then their punishing
  // reply — the reason it is a trap, on the board.
  const arrows: ArrowClaim[] = [];
  // NAME THE CAPTURE BY BOTH PIECES (walk 2026-09-30: "the knight taking on d4"
  // right after THEIR knight took on d4 read as their move). A trade says so.
  let moveNoun = sayMoveNoun(t.san);
  try {
    const c = new Chess(fen);
    const slip = c.move(t.san);
    if (slip?.captured) {
      const P: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
      moveNoun = slip.captured === slip.piece
        ? `trading ${P[slip.piece]}s on ${slip.to}`
        : `your ${P[slip.piece]} taking their ${P[slip.captured]} on ${slip.to}`;
    }
    if (slip) {
      arrows.push({ from: slip.from, to: slip.to, role: 'missed', fen, source: 'learn.trapAhead' });
      // …then the WHOLE punishing line, every ply on the board it is played
      // from — never just its first move.
      for (const san of t.punish) {
        const before = c.fen();
        const pu = c.move(san);
        if (!pu) break;
        arrows.push({ from: pu.from, to: pu.to, role: 'line', fen: before, source: 'learn.trapAhead' });
      }
    }
  } catch { /* no arrows — the line still speaks */ }
  return {
    lane: 'trapAhead',
    text: `Careful here: ${moveNoun} looks natural, and ${t.freqPct}% of club players play it — but it walks into a known trap.`,
    squares: /^[a-h][1-8]$/.test(to) ? [to] : [], claims: [t.key],
    event: { name: 'coach_trap_ahead', props: { surface: 'coach-teach', freq: t.freqPct, state: learnt.state, spoken: learnt.speak } },
    arrows,
    trap: { slip: t.san, confirmed: t.confirmed, state: learnt.state, speak: learnt.speak },
  };
}

/** The student's move on a trap board — warned or held back as a test — is
 *  the trap's answer, recorded either way (`trapLearning`). */
export function trapAnswered(args: { fen: string; playedSan: string; slipSan: string; warned: boolean; confirmed: boolean; gameId: string | null }): 'held' | 'broken' {
  return noteTrapMeeting(args);
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

/** WHAT THE OPENING IS (the identity computer), from the student's seat —
 *  said once per game, right after the opening is named. Null until the
 *  identity file has loaded (it warms here), for a waypoint name, or when the
 *  master data gives this opening no signature. */
export function openingIdentityTeaching(name: string, student: 'w' | 'b'): TeachingHint | null {
  warmOpeningIdentity();
  const line = openingIdentityLine(name, student, 'seat');
  if (!line) return null;
  return {
    lane: 'openingIdentity', text: line.text, squares: line.squares, claims: [line.key],
    event: { name: 'coach_opening_identity', props: { surface: 'coach-teach' } },
    arrows: [],
  };
}

/** The student's own master-game break at `fen` (the one `openingPlanTeaching`
 *  names), for the opening summary later. */
export function openingBreakFor(fen: string, student: 'w' | 'b'): { san: string; square: string } | null {
  const read = mastersPlanRead(fen, mastersMovesSync);
  const mine = read ? (student === 'w' ? read.white : read.black) : null;
  return mine ? { san: mine.san, square: mine.square } : null;
}

/** THE OPENING SUMMARY (census #52): the opening is over — did the student get
 *  the break the opening is played for? Read against the board, never assumed:
 *  played it; still there to play (legal now); or the position moved past it. */
export function openingSummaryLine(brk: { san: string; square: string }, studentSans: readonly string[], fenNow: string): string | null {
  const bare = (x: string): string => x.replace(/[+#!?]+$/, '');
  const say = sayMoveNoun(brk.san);
  if (studentSans.some((s) => bare(s) === bare(brk.san))) {
    return `The opening is over, and you got its break in — ${say}, the move this opening is played for.`;
  }
  let legalNow = false;
  try {
    const c = new Chess(fenNow);
    legalNow = c.moves().some((m) => bare(m) === bare(brk.san));
  } catch { legalNow = false; }
  return legalNow
    ? `The opening is over and its break, ${say}, has not come yet — it is still there to play when it is prepared.`
    : `The opening is over without its break, ${say} — the position has moved past it, so the plan now comes from the middlegame.`;
}

/** POSITIVE TRANSFER (census: "transfer — slips only"): the student played the
 *  engine's move and it lands a tactic whose motif they have DRILLED from their
 *  own mistakes. The loop closing in the green direction, said once per motif. */
export function drilledTransferLine(
  fenBefore: string,
  playedUci: string,
  bestUci: string | null,
  drilled: ReadonlyMap<TacticType, { opponentName: string | null }>,
): { text: string; motif: TacticType } | null {
  if (!bestUci || bestUci.slice(0, 4) !== playedUci.slice(0, 4) || drilled.size === 0) return null;
  let motif: TacticType;
  try { motif = detectTacticType(fenBefore, playedUci); } catch { return null; }
  const d = drilled.get(motif);
  if (!d || motif === 'tactical_sequence') return null;
  const name = tacticTypeLabel(motif);
  const from = d.opponentName ? ` from your game against ${d.opponentName}` : ' from your own games';
  return { motif, text: `That is the ${name} you drilled${from} — this time you found it at the board.` };
}

/** THE VERDICT ON A FOUND MOVE (P2 #2): at a real decision moment on the board
 *  before the move, the student played one of the only moves that held. */
export function foundMoveTeaching(fenBefore: string, san: string, preLines: readonly CriticalFanLine[] | undefined, student: 'w' | 'b', to: string): TeachingHint | null {
  if (!preLines || preLines.length < 2) return null;
  const found = criticalMomentFound(readCriticalMoment({ topLines: preLines, moverColor: student, fen: fenBefore }), san);
  if (!found) return null;
  // THE LINE THAT MAKES IT WORK (pass-2 walk 2026-09-30: "Nxd5 was the only
  // move that kept you on top" — he says why: it wins a pawn, because …Bxc3+
  // follows WITH CHECK). When the found move is the engine's and its own line
  // wins material, the line is said to where the material lands, and drawn.
  const ml = mateLine(fenBefore, preLines[0]?.moves ?? [], student, san);
  const won = ml ? null : winningLine(fenBefore, san, preLines[0]?.moves ?? [], student);
  const text = ml ? `${found} ${ml.text}` : won ? `${found} It wins ${won.what}: ${won.sans.join(' ')}.` : found;
  const arrows: ArrowClaim[] = ml ? mateArrows(ml, student) : won ? won.arrows : [];
  // A real decision moment (only one or two moves held) answered is calculation
  // proven — importance 90, above the green bar, because the board posed it.
  return { lane: 'foundMove', text, squares: [to], claims: [`found-${san}`, ...(won || ml ? [`wins-line:${fenBefore.split(' ').slice(0, 2).join(' ')}`] : [])], event: { name: 'coach_found_move_named', props: { surface: 'coach-teach' } }, arrows, evidence: { tag: 'calculation-depth', posedImportance: 90 } };
}

/** A mate line as board arrows, ply by ply, seated. */
function mateArrows(ml: MateLine, student: 'w' | 'b'): ArrowClaim[] {
  return ml.plies.map((p) => ({ from: p.from, to: p.to, role: p.color === student ? 'play' : 'theirs', fen: p.fen, source: 'learn.foundMove.mate' }));
}

/** The engine line starting with the played move, when the student ends it up
 *  material — said to the last capture, drawn ply by ply (`lineCalc`). */
export function winningLine(fen: string, san: string, lineUci: readonly string[], student: 'w' | 'b'): { what: string; sans: string[]; arrows: ArrowClaim[] } | null {
  const w = lineWins(fen, lineUci, student, san);
  if (!w) return null;
  return { what: w.what, sans: w.sans, arrows: w.plies.map((p) => ({ from: p.from, to: p.to, role: p.color === student ? 'play' : 'theirs', fen: p.fen, source: 'learn.foundMove.line' })) };
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
  const out = hints.map((h) => h.text);
  // WHAT A QUIET MOVE IS FOR — Learn's move point (Play on demand, David
  // 2026-10-02). Quiet moves only: a capture's point is the trade.
  if (out.length === 0 && !/x/.test(history[ply])) {
    const point = studentMovePoint(fenBefore, history[ply], ply >= 1 ? history[ply - 1] : null);
    if (point) out.push(point);
  }
  return out;
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
  // WHAT IT STOPPED — the threat of yours their move took away, or the fork
  // trick it sidestepped. The same static computers Learn and Review speak
  // (Play on demand, David 2026-10-02).
  const prev = ply >= 1 ? replayTo(history, ply - 1) : null;
  const stop = prev ? threatStoppedBy(prev, fenBefore, history[ply], student) : null;
  const mover: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const trick = stop ? null : trickSidestepped(fenBefore, history[ply], mover, 'your');
  if (stop) out.push(stop.text);
  else if (trick) out.push(trick.text);
  const cost = theirMoveTeaching(fenBefore, history[ply], student);
  if (cost) out.push(cost.text);
  const tempo = tempoTeaching(history.slice(0, ply + 1), student);
  if (tempo) out.push(tempo.text);
  // YOUR ANSWER, when their move left you clearly better — the move and its
  // point. Asked for, so it is named (the student's own question).
  if (best && ply === history.length - 1 && best.moves[0]) {
    const studentPov = student === 'w' ? best.evaluation : -best.evaluation;
    const after = replayTo(history, ply + 1);
    if (after && studentPov >= 100) {
      try {
        const u = best.moves[0];
        const answerSan = new Chess(after).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })?.san ?? null;
        const text = slipAnswerText(after, history[ply], answerSan, 'now');
        if (text) out.push(text);
      } catch { /* the answer is a bonus */ }
    }
  }
  return out;
}

/** "What's the plan?" — the plan each side has been building so far, from the
 *  same plan-arc computer Learn speaks live and Review reads over the game
 *  (Play on demand, David 2026-10-02). The latest plan per side that EMERGED
 *  or ARRIVED; yours first. */
export function planArcAnswerLines(history: readonly string[], studentColor: 'white' | 'black'): string[] {
  const arcs = gameArcs(history, studentColor);
  const plies = [...arcs.keys()].sort((a, b) => b - a);
  const out: string[] = [];
  for (const seat of ['student', 'opponent'] as const) {
    for (const p of plies) {
      const ev = (arcs.get(p) ?? []).find((e) => e.seat === seat);
      if (ev) { out.push(ev.text); break; }
    }
  }
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
  const cnt = countMethodTeaching(fen, student);
  if (cnt) out.push(cnt.text);
  const sp = splitPositionTeaching(fen, student);
  if (sp) out.push(sp.text);
  return out;
}

/** True when a turn spoke a lane that warns BEFORE the student moves (a threat,
 *  a tactic, a gem, a stalemate, how to meet check). The page marks that board
 *  so the student's next move from it is filed as PROMPTED — told, not proven. */
export function announcesTheMove(spoke: readonly LearnLane[]): boolean {
  return spoke.some((l) => SAID_BEFORE_MOVE.has(l));
}

/** ZUGZWANG at the student's turn (tablebase, ≤7 pieces) — the fact that
 *  decides pawn endings, said once per position. Null out of range. */
export async function zugzwangTeaching(fen: string): Promise<TeachingHint | null> {
  if (fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length > 7) return null;
  const z = await readZugzwang(fen);
  if (!z) return null;
  return { lane: 'pawnEnding', text: zugzwangSentence(z, true), squares: [], claims: [`zugzwang:${fen.split(' ').slice(0, 2).join(' ')}`], event: { name: 'coach_zugzwang_named', props: { surface: 'coach-teach', mutual: z.mutual } }, arrows: [] };
}

/** CHART A COURSE at the student's turn (kings and pawns only): the king's
 *  target is the weak pawn, not the centre. Once per game (claim). */
export function kingCourseTeaching(fen: string, student: 'w' | 'b'): TeachingHint | null {
  const kc = kingCourse(fen, student);
  if (!kc) return null;
  return { lane: 'pawnEnding', text: kc.text, squares: [kc.target], claims: ['king-course'], event: { name: 'coach_king_course', props: { surface: 'coach-teach' } }, arrows: [] };
}
