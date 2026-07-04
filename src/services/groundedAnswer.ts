/**
 * groundedAnswer — Phase 1 of the coach-chat grounding inversion
 * (docs/plans/2026-06-10-coach-chat-grounding-inversion.md).
 *
 * The contract: the LLM voices computed facts; it never reasons about the
 * board. This assembles the FACTS for a move / eval question entirely in
 * code — the engine's best move, the line, the eval, and the GROUNDED reason
 * it's strong (`explainBestMoveGrounded`, the no-LLM "why" the review path
 * already uses). The chat path hands the resulting `facts` string to the LLM
 * with a voice-only instruction; the model adds nothing.
 *
 * Pure + side-effect-free so it's trivially testable and can't regress the
 * live chat. Wiring it into `getCoachChatResponse` is the next step.
 */
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import { seeGain } from './positionReadingService';
import type { TacticsLiveContext, LivePlayerGamesContext } from '../coach/types';
import type { BadHabit } from '../types';
import type { MasterPlayResult } from './masterPlayTypes';
import type { ConceptEntry } from './chessConceptService';
import type { TablebaseLookupResult } from './lichessTablebaseService';

// Pure board-fact constants — universal chess values, leaf-local so this module
// imports nothing that could loop back. coachFeatureService imports these FROM
// here (one direction), instead of the reverse that created the cycle.
export const REVIEW_PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const REVIEW_PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export interface GroundedAnswer {
  /** The plain-language facts the LLM must voice — and ONLY these. */
  facts: string;
  /** SAN of the computed best move (for the arrow + the prompt), or null. */
  bestMoveSan: string | null;
  /** The from/to of the best move, for a `[BOARD: arrow:from-to:green]`. */
  bestMoveFromTo: { from: string; to: string } | null;
  /** Where every fact came from (engine / chess.js) — recorded, never the LLM. */
  sources: string[];
}

/** Convert a centipawn eval (side-to-move POV) into a grounded phrase. Never
 *  invents a number — rounds the real one. */
function evalPhrase(evalCp: number | null | undefined, mateIn: number | null | undefined, mover: 'white' | 'black'): string | null {
  if (typeof mateIn === 'number' && mateIn !== 0) {
    const who = mateIn > 0 ? mover : (mover === 'white' ? 'black' : 'white');
    return `there is a forced mate in ${Math.abs(mateIn)} for ${who}`;
  }
  if (typeof evalCp !== 'number') return null;
  const pawns = evalCp / 100;
  const who = pawns >= 0 ? mover : (mover === 'white' ? 'black' : 'white');
  const mag = Math.abs(pawns);
  if (mag < 0.3) return 'the position is roughly balanced';
  if (mag < 1.0) return `${who} is slightly better (about ${mag.toFixed(1)} pawns)`;
  if (mag < 2.5) return `${who} is clearly better (about ${mag.toFixed(1)} pawns)`;
  return `${who} is winning (about ${mag.toFixed(1)} pawns)`;
}

/**
 * assemblePositionAssessment — "who's winning?", "how do I stand here?",
 * "what's the eval?", "is this good for me?". The fact source is Stockfish's
 * eval (already threaded from the surface) PLUS the one most-relevant fact from
 * `liveTacticsContext` — voiced from the STUDENT's perspective. This grounds
 * the single biggest slice of the free-reasoning chat fallback (a bare
 * "who's better / assess this" readout the LLM used to free-narrate). Returns
 * null when there's nothing computed to say (no eval AND no tactic) so the
 * caller falls through. Takes WHITE-perspective eval (LiveState convention)
 * and converts to the student's POV internally.
 */
export function assemblePositionAssessment(opts: {
  evalCp: number | null | undefined;
  mateIn: number | null | undefined;
  tactics?: TacticsLiveContext | null;
  studentColor: 'white' | 'black';
}): GroundedAnswer | null {
  const { tactics, studentColor } = opts;
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const parts: string[] = [];

  // WHITE-perspective eval → student POV (flip sign for Black).
  const studentEvalCp = typeof opts.evalCp === 'number' ? (studentColor === 'white' ? opts.evalCp : -opts.evalCp) : null;
  const studentMateIn = typeof opts.mateIn === 'number' ? (studentColor === 'white' ? opts.mateIn : -opts.mateIn) : null;

  if (typeof studentMateIn === 'number' && studentMateIn !== 0) {
    parts.push(studentMateIn > 0 ? `You have a forced mate in ${Math.abs(studentMateIn)}.` : `There is a forced mate against you in ${Math.abs(studentMateIn)}.`);
  } else if (typeof studentEvalCp === 'number') {
    const mag = Math.abs(studentEvalCp) / 100;
    const side = studentEvalCp >= 0 ? 'better' : 'worse';
    if (mag < 0.3) parts.push('The position is roughly balanced.');
    else if (mag < 1.0) parts.push(`You're slightly ${side} — about ${mag.toFixed(1)} of a pawn.`);
    else if (mag < 2.5) parts.push(`You're clearly ${side} — about ${mag.toFixed(1)} pawns.`);
    else parts.push(studentEvalCp >= 0 ? `You're winning — about ${mag.toFixed(1)} pawns up.` : `You're losing — about ${mag.toFixed(1)} pawns down.`);
  }

  // Add the single most relevant computed fact so the assessment names a WHY.
  if (tactics) {
    if (tactics.boardFacts?.mateInOne) {
      parts.push(`There is checkmate in one on the board: ${tactics.boardFacts.mateInOne}.`);
    } else if (tactics.immediate[0]?.description) {
      parts.push(`${tactics.immediate[0].description}.`);
    } else {
      const myHang = tactics.hanging.find((h) => h.color === sc);
      if (myHang) parts.push(`Your ${REVIEW_PIECE_NAME[myHang.piece] ?? myHang.piece} on ${myHang.square} is hanging.`);
      else if (tactics.threats[0]?.description) parts.push(`Watch out — ${tactics.threats[0].description}.`);
    }
  }

  if (parts.length === 0) return null;
  const sources = tactics ? ['engine:stockfish', 'board:chess.js'] : ['engine:stockfish'];
  return { facts: parts.join(' '), bestMoveSan: null, bestMoveFromTo: null, sources };
}

/**
 * Assemble the grounded facts for a move / best-move / eval question.
 * Returns null when there's no engine move to ground on (caller falls back
 * to the existing path — this never fabricates).
 */
export function assembleMoveEvalAnswer(opts: {
  fen: string;
  /** Engine best move in UCI (e.g. `g1f3`) — from Stockfish PV[0]. */
  bestMoveUci: string | null;
  evalCp?: number | null;
  mateIn?: number | null;
}): GroundedAnswer | null {
  const { fen, bestMoveUci } = opts;
  if (!bestMoveUci || bestMoveUci.length < 4) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  // SAN + from/to from the UCI — chess.js is the truth, not the LLM.
  let bestMoveSan: string | null = null;
  let fromTo: { from: string; to: string } | null = null;
  try {
    const probe = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
    const mv = probe.move({ from, to, promotion });
    if (mv) {
      bestMoveSan = mv.san;
      fromTo = { from, to };
    }
  } catch {
    return null; // illegal best move → don't ground (never fabricate)
  }
  if (!bestMoveSan) return null;

  // The GROUNDED reason it's strong — no LLM. (playedSan null: we're not
  // contrasting a played move here, just stating what the best move achieves.)
  const why = explainBestMoveGrounded(fen, null, bestMoveUci, mover);
  const evalText = evalPhrase(opts.evalCp, opts.mateIn, mover);

  const parts: string[] = [`The best move is ${bestMoveSan}.`];
  if (why) parts.push(why);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const sources = ['engine:stockfish', 'board:chess.js'];

  return {
    facts: parts.join(' '),
    bestMoveSan,
    bestMoveFromTo: fromTo,
    sources,
  };
}

/**
 * explainBestMoveGrounded — the GROUNDED, LLM-FREE "why" (moved here from
 * coachFeatureService 2026-06-10 to break the import cycle: pure board-fact
 * computers belong in the leaf, not in a service tangled with coachApi). It
 * reports ONLY what chess.js can prove about the board — what the best move
 * concretely wins, whether it gives check, what the played move left hanging —
 * never the engine's deep reasoning it can't see.
 */
export function explainBestMoveGrounded(
  fenBefore: string,
  playedSan: string | null,
  bestMoveUci: string | null,
  moverColor: 'white' | 'black',
): string | null {
  if (!bestMoveUci || bestMoveUci.length < 4) return null;
  const mc: 'w' | 'b' = moverColor === 'white' ? 'w' : 'b';

  let bestClause: string | null = null;
  try {
    const c = new Chess(fenBefore);
    const to = bestMoveUci.slice(2, 4);
    const captured = c.get(to as never);
    const mv = c.move({ from: bestMoveUci.slice(0, 2), to, promotion: bestMoveUci.length > 4 ? bestMoveUci[4] : undefined });
    if (mv) {
      if (captured && captured.color !== mc) {
        const recapturable = c.attackers(to as never, captured.color).length > 0;
        const movedVal = REVIEW_PIECE_VALUE[mv.piece] ?? 0;
        const capVal = REVIEW_PIECE_VALUE[captured.type] ?? 0;
        if (!recapturable || capVal > movedVal) {
          bestClause = `it wins the ${REVIEW_PIECE_NAME[captured.type]} on ${to}`;
        }
      }
      if (!bestClause && c.inCheck()) bestClause = 'it comes with check';
    }
  } catch { /* board fact unavailable — stay silent */ }

  let costClause: string | null = null;
  if (playedSan) {
    try {
      const c = new Chess(fenBefore);
      if (c.move(playedSan)) {
        // A piece is only a real loss if the opponent has a LEGAL capture that
        // wins material by static-exchange eval. `findHangingPieces` /
        // `chess.attackers` count PINNED attackers that can't actually capture
        // — the 2026-06-27 "your move left the pawn on e5 hanging" false
        // positive, whose only attacker was a pinned knight (no legal capture
        // existed). Drive off legal captures + SEE so a pin can never be read
        // as a hang, and a defended-but-exchange-losing piece still is.
        const legalCaps = c.moves({ verbose: true }).filter((m) => m.captured);
        let worst: { square: Square; piece: PieceSymbol; gain: number; san: string } | null = null;
        for (const cap of legalCaps) {
          const to = cap.to;
          const victim = c.get(to);
          if (!victim || victim.color !== mc) continue; // must capture the mover's own piece
          const gain = seeGain(c, to); // material the opponent wins on that square
          if (gain > 0 && (!worst || gain > worst.gain)) {
            worst = { square: to, piece: victim.type, gain, san: cap.san };
          }
        }
        if (worst) {
          const punisher = mc === 'w' ? 'Black' : 'White';
          let givesCheck = false;
          try { const after = new Chess(c.fen()); after.move(worst.san); givesCheck = after.inCheck(); } catch { /* keep false */ }
          costClause = `your move let ${punisher} play ${worst.san}, winning the ${REVIEW_PIECE_NAME[worst.piece]}${givesCheck ? ' with check' : ''}`;
        }
      }
    } catch { /* board fact unavailable — stay silent */ }
  }

  if (bestClause && costClause) return `${cap(bestClause)}, while ${costClause}.`;
  if (bestClause) return `${cap(bestClause)}.`;
  if (costClause) return `${cap(costClause)}.`;
  return null;
}

/** Ray-walk from a slider's square to find a PIN it creates: the first enemy
 *  piece on a ray, with a HIGHER-value enemy piece directly behind it on the
 *  same ray (a relative pin; absolute when the rear piece is the king). Pure
 *  board geometry — this is the "bishop pins the knight to the queen" fact
 *  David asked for (2026-06-27). Returns null when no pin exists. */
function findPinFrom(
  c: Chess,
  from: Square,
  pieceType: PieceSymbol,
  moverColor: 'white' | 'black',
): { pinned: Square; pinnedPiece: PieceSymbol; rear: Square; rearPiece: PieceSymbol } | null {
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dirs = pieceType === 'b' ? DIAG : pieceType === 'r' ? ORTHO : pieceType === 'q' ? [...DIAG, ...ORTHO] : [];
  if (dirs.length === 0) return null;
  const enemy = moverColor === 'white' ? 'b' : 'w';
  const f0 = from.charCodeAt(0) - 97;
  const r0 = Number(from[1]) - 1;

  for (const [df, dr] of dirs) {
    let f = f0 + df;
    let r = r0 + dr;
    let first: { sq: Square; piece: PieceSymbol } | null = null;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const sq = (String.fromCharCode(97 + f) + String(r + 1)) as Square;
      const pc = c.get(sq);
      if (pc) {
        if (pc.color !== enemy) break; // friendly blocker — no pin on this ray
        if (!first) {
          first = { sq, piece: pc.type };
        } else {
          // Second enemy piece behind the first — a pin if it's worth more.
          if ((REVIEW_PIECE_VALUE[pc.type] ?? 0) > (REVIEW_PIECE_VALUE[first.piece] ?? 0)) {
            return { pinned: first.sq, pinnedPiece: first.piece, rear: sq, rearPiece: pc.type };
          }
          break;
        }
      }
      f += df;
      r += dr;
    }
  }
  return null;
}

/** The highest-value enemy piece the piece on `from` now attacks (a developing
 *  TEMPO — the move makes a threat the opponent must answer). Pure board fact. */
function bestAttackFrom(
  c: Chess,
  from: Square,
  moverColor: 'white' | 'black',
): { square: Square; piece: PieceSymbol } | null {
  const mc = moverColor === 'white' ? 'w' : 'b';
  let best: { square: Square; piece: PieceSymbol } | null = null;
  for (const sq of c.board().flat()) {
    if (!sq || sq.color === mc) continue;
    if (sq.type === 'k') continue; // a check is reported separately
    if (c.attackers(sq.square, mc).includes(from)) {
      if (!best || (REVIEW_PIECE_VALUE[sq.type] ?? 0) > (REVIEW_PIECE_VALUE[best.piece] ?? 0)) {
        best = { square: sq.square, piece: sq.type };
      }
    }
  }
  return best;
}

/**
 * describeMoveGeometry — a grounded one-phrase description of what a SINGLE
 * move DOES on the board (David 2026-06-28: "ground the tactics trainers with
 * the new tools"). Detects, in salience order: FORK (hits 2+ enemy pieces),
 * PIN (slider pins a piece to a bigger one), CHECK, MATERIAL win (a capture
 * that holds by SEE), or a single ATTACK (tempo). Pure board geometry — the
 * tactics trainers speak THIS instead of generic "the setup's in" templates.
 * Returns null when the move makes no concrete threat (stay silent, G3).
 */
export function describeMoveGeometry(
  fenBefore: string,
  san: string,
  moverColor: 'white' | 'black',
): string | null {
  let c: Chess;
  let mv;
  try {
    c = new Chess(fenBefore);
    mv = c.move(san);
  } catch {
    return null;
  }
  if (!mv) return null;
  const to = mv.to;
  const mc = moverColor === 'white' ? 'w' : 'b';

  // Every enemy piece the moved piece now attacks (king included).
  const targets: { square: Square; piece: PieceSymbol }[] = [];
  for (const sq of c.board().flat()) {
    if (!sq || sq.color === mc) continue;
    if (c.attackers(sq.square, mc).includes(to)) targets.push({ square: sq.square, piece: sq.type });
  }

  // FORK — the moved piece hits two enemy pieces at once (royal fork when the
  // king is one of them).
  if (targets.length >= 2) {
    const sorted = [...targets].sort((a, b) => (REVIEW_PIECE_VALUE[b.piece] ?? 0) - (REVIEW_PIECE_VALUE[a.piece] ?? 0));
    return `forks the ${REVIEW_PIECE_NAME[sorted[0].piece]} on ${sorted[0].square} and the ${REVIEW_PIECE_NAME[sorted[1].piece]} on ${sorted[1].square}`;
  }

  // PIN.
  if (mv.piece === 'b' || mv.piece === 'r' || mv.piece === 'q') {
    const pin = findPinFrom(c, to, mv.piece, moverColor);
    if (pin) return `pins the ${REVIEW_PIECE_NAME[pin.pinnedPiece]} on ${pin.pinned} to the ${REVIEW_PIECE_NAME[pin.rearPiece]} on ${pin.rear}`;
  }

  // CHECK.
  if (c.inCheck()) return 'gives check';

  // MATERIAL — a capture the opponent can't profitably recapture.
  if (mv.captured && seeGain(c, to) <= 0) {
    return `wins the ${REVIEW_PIECE_NAME[mv.captured]} on ${to}`;
  }

  // Single ATTACK (tempo) on a non-king piece.
  if (targets.length === 1 && targets[0].piece !== 'k') {
    return `attacks the ${REVIEW_PIECE_NAME[targets[0].piece]} on ${targets[0].square}`;
  }

  return null;
}

export interface MoveOrderExplanation {
  /** Grounded prose: why the better order is stronger (+ the cost of the wrong
   *  order when a refutation is supplied). */
  text: string;
  /** Mechanism behind the better move, for telemetry / board-demo selection. */
  mechanism: 'check' | 'pin' | 'tempo' | 'material';
}

/**
 * explainMoveOrder — the grounded "why THIS move first" comparator (David
 * 2026-06-27: "WHY moving my bishop out before bringing the queen to the
 * attack was best — do we have the geometry?"). Same pieces, different order;
 * one order is stronger because the better move makes a threat the wrong order
 * squanders. Names the MECHANISM purely from the board: it comes with CHECK,
 * it PINS an enemy piece to a bigger one, it develops with a TEMPO (attacks an
 * enemy piece), or it wins MATERIAL (SEE). The engine's eval delta (computed
 * by the caller) is what decides the order is better; this names WHY. When a
 * refutation to the worse move is supplied, the cost of the wrong order is
 * spelled out too. Returns null when a move is illegal or no concrete
 * mechanism is found — empty > generic > invented (G3).
 */
export function explainMoveOrder(opts: {
  fenBefore: string;
  betterSan: string;
  worseSan: string;
  moverColor: 'white' | 'black';
  /** Opponent's best reply to the WORSE move (engine PV ply 1), if known. */
  worseRefutationSan?: string | null;
}): MoveOrderExplanation | null {
  const { fenBefore, betterSan, worseSan, moverColor, worseRefutationSan } = opts;
  const mc = moverColor === 'white' ? 'w' : 'b';

  let mv;
  const c = new Chess(fenBefore);
  try {
    mv = c.move(betterSan);
  } catch {
    return null;
  }
  if (!mv) return null;
  // The worse move must also be legal from the SAME position (it's an
  // alternative order, not a fantasy) — verify on a fresh board.
  try {
    const probe = new Chess(fenBefore);
    if (!probe.move(worseSan)) return null;
  } catch {
    return null;
  }

  const to = mv.to;
  let mechanism: MoveOrderExplanation['mechanism'];
  let whyBetter: string;

  if (c.inCheck()) {
    mechanism = 'check';
    whyBetter = `playing ${betterSan} first comes with check, forcing the reply`;
  } else {
    const pin = (mv.piece === 'b' || mv.piece === 'r' || mv.piece === 'q')
      ? findPinFrom(c, to, mv.piece, moverColor)
      : null;
    if (pin) {
      mechanism = 'pin';
      whyBetter = `playing ${betterSan} first pins the ${REVIEW_PIECE_NAME[pin.pinnedPiece]} on ${pin.pinned} to the ${REVIEW_PIECE_NAME[pin.rearPiece]} on ${pin.rear}`;
    } else {
      const captured = mv.captured;
      // seeGain(c, to) = what the OPPONENT wins back by recapturing on `to`.
      // A genuine material win means they can't recapture profitably (≤ 0).
      const oppRecapGain = captured ? seeGain(c, to) : 1;
      const attack = bestAttackFrom(c, to, moverColor);
      if (captured && oppRecapGain <= 0) {
        mechanism = 'material';
        whyBetter = `playing ${betterSan} first wins the ${REVIEW_PIECE_NAME[captured]} on ${to}`;
      } else if (attack) {
        mechanism = 'tempo';
        whyBetter = `playing ${betterSan} first develops with a threat — it attacks the ${REVIEW_PIECE_NAME[attack.piece]} on ${attack.square}, so the opponent must respond instead of freeing their game`;
      } else {
        return null; // no concrete geometry — stay silent
      }
    }
  }

  // Cost of the wrong order, when the engine gave us the refutation.
  let cost: string | null = null;
  if (worseRefutationSan) {
    try {
      const w = new Chess(fenBefore);
      if (w.move(worseSan)) {
        const reply = w.move(worseRefutationSan);
        if (reply) {
          const opp = mc === 'w' ? 'Black' : 'White';
          if (w.inCheck()) {
            cost = `play ${worseSan} first and ${opp} hits back with ${worseRefutationSan}, check`;
          } else if (reply.captured) {
            cost = `play ${worseSan} first and ${opp} gets ${worseRefutationSan}, taking the ${REVIEW_PIECE_NAME[reply.captured]}`;
          } else {
            cost = `play ${worseSan} first and ${opp} equalizes with ${worseRefutationSan}`;
          }
        }
      }
    } catch { /* refutation didn't replay — drop the cost clause */ }
  }

  return { text: cost ? `${cap(whyBetter)}; ${cost}.` : `${cap(whyBetter)}.`, mechanism };
}

/**
 * assemblePlanAnswer — Phase 3 of the grounding inversion: plan / strategy
 * questions ("what's my plan?", "next three moves?"). The fact source is the
 * ENGINE's principal variation (`enginePlan.pvSan`, computed by Stockfish) —
 * real, legal, verified moves, NOT the LLM free-synthesizing a plan. This
 * replays the PV on the board (chess.js is the truth), extracts the student's
 * moves (the plan) + the opponent's expected replies, and packages them for
 * the voiceFacts chokepoint. The plan is built only when the student is to
 * move, so PV[0] is the student's move (even plies = student). Returns null
 * when the PV is empty or doesn't replay legally (never voices a bad line).
 */
export function assemblePlanAnswer(opts: {
  fen: string;
  pvSan: ReadonlyArray<string>;
  /** White-perspective centipawn eval of the line; null when forced mate. */
  evalCp: number | null;
  /** Mate distance in plies (signed, white-positive); null when not forced. */
  mateIn: number | null;
  studentSide: 'white' | 'black';
}): GroundedAnswer | null {
  if (!opts.pvSan || opts.pvSan.length === 0) return null;
  let chess: Chess;
  try {
    chess = new Chess(opts.fen);
  } catch {
    return null;
  }
  const moves: Array<{ san: string; from: string; to: string; isStudent: boolean }> = [];
  for (let i = 0; i < opts.pvSan.length; i += 1) {
    let mv;
    try {
      mv = chess.move(opts.pvSan[i]);
    } catch {
      break; // PV diverged from legality — stop at the last legal ply.
    }
    if (!mv) break;
    moves.push({ san: mv.san, from: mv.from, to: mv.to, isStudent: i % 2 === 0 });
  }
  if (moves.length === 0) return null;

  const studentMoves = moves.filter((m) => m.isStudent).map((m) => m.san);
  const firstReply = moves.find((m) => !m.isStudent)?.san ?? null;

  const parts: string[] = [];
  if (studentMoves.length === 1) {
    parts.push(`Your plan starts with ${studentMoves[0]}.`);
  } else {
    parts.push(`Your plan: ${studentMoves[0]}`);
    const rest = studentMoves.slice(1);
    parts[parts.length - 1] += `, then ${rest.join(', then ')}.`;
  }
  if (firstReply) parts.push(`The opponent's most likely reply is ${firstReply}.`);

  // PV eval is white-perspective; convert to the student's POV for the phrase.
  const studentEvalCp = opts.evalCp == null ? null : (opts.studentSide === 'white' ? opts.evalCp : -opts.evalCp);
  const studentMateIn = opts.mateIn == null ? null : (opts.studentSide === 'white' ? opts.mateIn : -opts.mateIn);
  const evalText = evalPhrase(studentEvalCp, studentMateIn, opts.studentSide);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const first = moves[0];
  return {
    facts: parts.join(' '),
    bestMoveSan: first.san,
    bestMoveFromTo: { from: first.from, to: first.to },
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

/**
 * assembleTacticsAnswer — Phase 2 of the grounding inversion: tactics / danger
 * questions ("is anything hanging?", "what's the threat?", "is there a fork?").
 * The `liveTacticsContext` engine has ALREADY computed everything — the fork
 * descriptions, the hanging pieces, the mate-in-one — deterministically from
 * the FEN. So this just SELECTS the relevant facts and packages them for the
 * voiceFacts chokepoint. The LLM decides nothing; it voices these descriptions.
 * Returns null when there's no concrete tactic (caller takes the one fallback).
 */
export function assembleTacticsAnswer(
  tactics: TacticsLiveContext,
  studentColor: 'white' | 'black',
): GroundedAnswer | null {
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const parts: string[] = [];

  // Most urgent: a forced mate-in-one for the side to move.
  if (tactics.boardFacts?.mateInOne) {
    parts.push(`There is checkmate in one: ${tactics.boardFacts.mateInOne}.`);
  }
  // Immediate tactics on the board now — voice the engine's own descriptions.
  for (const t of tactics.immediate.slice(0, 2)) {
    if (t.description) parts.push(`${t.description}.`);
  }
  // The STUDENT's pieces left hanging — warn concretely.
  for (const h of tactics.hanging.filter((p) => p.color === sc).slice(0, 2)) {
    parts.push(`Your ${REVIEW_PIECE_NAME[h.piece] ?? h.piece} on ${h.square} is hanging.`);
  }
  // Nothing concrete yet → surface the top threat, then the top opportunity.
  if (parts.length === 0 && tactics.threats[0]?.description) {
    parts.push(`Watch out — ${tactics.threats[0].description}.`);
  }
  if (parts.length === 0 && tactics.opportunities[0]?.description) {
    parts.push(`You have a shot: ${tactics.opportunities[0].description}.`);
  }

  if (parts.length === 0) return null;
  return {
    facts: parts.join(' '),
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

/**
 * assembleMasterPlayAnswer — Phase 4 of the grounding inversion: "how do
 * masters play this?" / "what's the most popular move?". The master-play
 * lookup (`masterPlayLookup`, the Lichess explorer / local DB) has ALREADY
 * computed the top moves with their game counts + White/draw/Black splits.
 * This SELECTS the top few and packages them for the voiceFacts chokepoint —
 * the LLM voices the real frequencies, it never invents "masters play X 55%".
 * Returns null when there's no master data (caller falls through).
 */
export function assembleMasterPlayAnswer(current: MasterPlayResult): GroundedAnswer | null {
  if (current.source === 'none' || current.moves.length === 0) return null;
  const fmt = (n: number): string => n.toLocaleString('en-US');
  const top = current.moves.slice(0, 3);
  const lead = top[0];
  const leadWhite = Math.round(lead.whitePct * 100);
  const leadDraw = Math.round(lead.drawPct * 100);
  const leadBlack = Math.round(lead.blackPct * 100);
  const parts: string[] = [
    `The most popular master move here is ${lead.san}, played in ${fmt(lead.games)} game${lead.games === 1 ? '' : 's'} ` +
      `(White wins ${leadWhite}%, draws ${leadDraw}%, Black wins ${leadBlack}%).`,
  ];
  const others = top.slice(1);
  if (others.length > 0) {
    parts.push(`Masters also play ${others.map((m) => `${m.san} (${fmt(m.games)} games)`).join(' and ')}.`);
  }

  let fromTo: { from: string; to: string } | null = null;
  if (lead.uci && lead.uci.length >= 4) {
    fromTo = { from: lead.uci.slice(0, 2), to: lead.uci.slice(2, 4) };
  }

  return {
    facts: parts.join(' '),
    bestMoveSan: lead.san,
    bestMoveFromTo: fromTo,
    sources: ['master-games:lichess'],
  };
}

/** Did the pro (playing `studentSide`) WIN this game? Lenient on the result
 *  string shape ("1-0" / "0-1" / "win" / "1/2-1/2"). */
function proWonGame(result: string, studentSide: 'white' | 'black'): boolean {
  const r = result.trim().toLowerCase();
  if (r.includes('1/2') || r === 'draw' || r === '=') return false;
  if (studentSide === 'white') return r.startsWith('1-0') || r === 'win' || r === '1';
  return r.startsWith('0-1') || r === 'win' || r === '0';
}

/**
 * assemblePlayerGamesAnswer — Phase 4 (pro-game references): "how does <pro>
 * play this?" / "show me <pro>'s games here". The fact source is the player's
 * REAL game corpus (`pro-game-references.json` → `LivePlayerGamesContext`,
 * already loaded into liveState by coachService), NOT the LLM. This voices the
 * real count + a standout game (highest-rated-opponent win, else the
 * highest-rated game) — opponent, rating, result, the named variation — all
 * board-true from the reference. Returns null when there are no games (caller
 * falls through). The LLM never invents a "<pro> plays X" game.
 */
export function assemblePlayerGamesAnswer(ctx: LivePlayerGamesContext): GroundedAnswer | null {
  if (!ctx.games || ctx.games.length === 0) return null;
  const player = ctx.games[0].player;
  // Prefer a win over the strongest opponent; else just the strongest opponent.
  const ranked = [...ctx.games].sort((a, b) => (b.opponentRating ?? 0) - (a.opponentRating ?? 0));
  const standout = ranked.find((g) => proWonGame(g.result, g.studentSide)) ?? ranked[0];

  const total = ctx.totalAvailable || ctx.games.length;
  const parts: string[] = [
    `${player} has ${total} reference game${total === 1 ? '' : 's'} in the ${ctx.openingName}.`,
  ];
  const won = proWonGame(standout.result, standout.studentSide);
  const oppRating = standout.opponentRating ? ` (${standout.opponentRating})` : '';
  const variation = standout.variationLabel ? ` in the ${standout.variationLabel}` : '';
  if (won) {
    parts.push(`In a standout, ${player} beat ${standout.opponent}${oppRating}${variation}.`);
  } else {
    parts.push(`One notable game was against ${standout.opponent}${oppRating}${variation}.`);
  }

  return {
    facts: parts.join(' '),
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: [`player-games:${ctx.playerId ?? 'pro'}`],
  };
}

/**
 * assembleEndgameAnswer — Phase 5 (endgame): "can I win this?" / "is this a
 * draw?" / "how do I hold this ending?". The fact source is the SYZYGY
 * TABLEBASE (`lookupTablebase` via the `/api/lichess-tablebase` proxy) — literal
 * mathematical truth for ≤7-piece endings, the strongest grounding there is.
 * The caller does the (async) lookup; this packages the verdict from the
 * STUDENT's perspective for the voiceFacts chokepoint. Returns null on an
 * uncertain category (`maybe-*` / `unknown`) so the coach never voices a guess.
 */
export function assembleEndgameAnswer(opts: {
  result: TablebaseLookupResult;
  studentColor: 'white' | 'black';
}): GroundedAnswer | null {
  const { result, studentColor } = opts;
  if (result.checkmate) {
    return { facts: 'This position is already checkmate.', bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  if (result.stalemate || result.insufficientMaterial || result.whiteRelativeResult === 'draw' ||
      result.category === 'cursed-win' || result.category === 'blessed-loss') {
    const why =
      result.stalemate ? ' (stalemate)' :
      result.insufficientMaterial ? ' (insufficient material)' :
      (result.category === 'cursed-win' || result.category === 'blessed-loss') ? ' under the fifty-move rule' : '';
    return { facts: `By the tablebase, this endgame is a theoretical draw${why} with best play.`, bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  if (result.whiteRelativeResult === 'white-wins' || result.whiteRelativeResult === 'black-wins') {
    const studentWins =
      (result.whiteRelativeResult === 'white-wins' && studentColor === 'white') ||
      (result.whiteRelativeResult === 'black-wins' && studentColor === 'black');
    const mate = typeof result.dtm === 'number' ? ` — mate in ${Math.abs(result.dtm)}` : '';
    const facts = studentWins
      ? `By the tablebase, this endgame is a win for you with best play${mate}.`
      : `By the tablebase, this endgame is lost for you with best play${mate} — your goal is to make it as hard as possible.`;
    return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  return null; // maybe-win / maybe-loss / unknown → don't voice a guess.
}

/**
 * assembleConceptAnswer — Phase 5 (concepts): "what's a fork?", "explain
 * zwischenzug", "what does zugzwang mean?". The fact source is the injected
 * book corpus (`chess-concepts.json` — Capablanca / Lasker / Staunton / …),
 * NEVER the LLM's training memory. The caller detects the concept + looks it
 * up (chessConceptService); this packages the real book passage (or the
 * curated fallback definition) for the voiceFacts chokepoint, with the source
 * recorded. Returns null when the concept carries neither a passage nor a
 * fallback (caller falls through). Takes the first 2 sentences of the passage
 * so the voiced answer stays concise + grounded in the actual text.
 */
export function assembleConceptAnswer(concept: ConceptEntry): GroundedAnswer | null {
  const passage = concept.passages?.[0];
  let definition: string | null = null;
  let source: string | null = null;
  if (passage?.text?.trim()) {
    definition = passage.text.trim().split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim();
    source = `book:${passage.bookSlug}`;
  } else if (concept.fallbackDefinition?.trim()) {
    definition = concept.fallbackDefinition.trim();
    source = `concept:${concept.id}`;
  }
  if (!definition || !source) return null;

  return {
    facts: `${cap(concept.name)}: ${definition}`,
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: [source],
  };
}

/**
 * assembleProgressAnswer — Phase 6: "am I improving?" / "what should I work
 * on?". The answer is the student's OWN computed history — `detectBadHabits`
 * already analyzed their games and produced human-readable habit descriptions
 * with occurrence counts. This selects the top unresolved ones and packages
 * them for the voiceFacts chokepoint. The LLM voices the student's real data;
 * it never invents a weakness. Returns null when there's no habit data yet
 * (caller takes the one fallback — e.g. "play a few games and I'll spot
 * patterns").
 */
export function assembleProgressAnswer(badHabits: ReadonlyArray<BadHabit>): GroundedAnswer | null {
  const open = badHabits
    .filter((h) => !h.isResolved && h.description)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);
  if (open.length === 0) return null;

  const phrase = (h: BadHabit): string =>
    `${h.description} (${h.occurrences} time${h.occurrences === 1 ? '' : 's'})`;
  const facts =
    open.length === 1
      ? `The pattern to work on: ${phrase(open[0])}.`
      : `The patterns to work on, most frequent first: ${open.map(phrase).join('; ')}.`;

  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Topic a student scoped a weakness/training question to, so the
 *  recommendation filters the ranked profile to that family. Maps to the
 *  `MisconceptionBucket` an aggregated weakness carries. Returns null when the
 *  question is unscoped ("what should I train?" → the whole profile). */
export type WeaknessTopic = 'tactical' | 'opening' | 'endgame' | 'positional';

export function weaknessTopicFromText(text: string | undefined | null): WeaknessTopic | null {
  if (!text) return null;
  const t = text.toLowerCase();
  // Tactics first — the most-asked scope, and its motifs (fork/pin/…) are
  // unambiguous even when the word "tactic" is absent.
  if (/\btactic(?:s|al)?\b|\bcombination|\bfork|\bpins?\b|\bskewer|\bdiscover|\bdouble\s+attack|\bback[\s-]?rank\b/.test(t)) return 'tactical';
  if (/\bend[\s-]?games?\b|\bendings?\b|\brook\s+ending|\bpawn\s+ending|\bconvert(?:ing)?\b/.test(t)) return 'endgame';
  if (/\bopening|\brepertoire\b|\bopening\s+prep/.test(t)) return 'opening';
  if (/\bpositional|\bstrateg|\bplan(?:ning|s)?\b|\bstructure/.test(t)) return 'positional';
  return null;
}

/** The minimal shape `assembleWeaknessRecommendation` reads — a structural
 *  subset of `UnifiedWeakness` (weaknessSpine) so the assembler stays a pure
 *  leaf that imports no service. The caller computes the ranked profile
 *  (`getUnifiedWeaknessProfile`) and hands the rows in. */
export interface WeaknessLike {
  /** Plain-English label, no SAN/jargon (e.g. "Forks", "Rook endgames"). */
  label: string;
  /** Instances due/open right now — the ranking + selection key. */
  openCount: number;
  /** MisconceptionBucket family, for topic filtering. */
  bucket?: string;
}

/**
 * assembleWeaknessRecommendation — the grounded "what should I train / what am
 * I weak in" answer. The student's OWN ranked weakness profile (computed by
 * `getUnifiedWeaknessProfile` across every capture pipeline — tactics, openings,
 * phase-of-loss, conversion, board-vision) is handed in; this SELECTS the top
 * few (most-frequent first), optionally scoped to a named topic, and packages
 * them for `voiceFacts`. The LLM voices the student's real numbers + a true
 * next-step fact; it never invents a weakness. Returns null when there's
 * nothing open (caller falls back to the bad-habit profile, then a no-data
 * line). G0: no chess content decided here — only phrasing downstream.
 */
export function assembleWeaknessRecommendation(
  weaknesses: ReadonlyArray<WeaknessLike>,
  opts: { topic?: WeaknessTopic | null } = {},
): GroundedAnswer | null {
  const topic = opts.topic ?? null;
  const pool = topic ? weaknesses.filter((w) => w.bucket === topic) : weaknesses;
  const open = pool
    .filter((w) => w.openCount > 0 && !!w.label)
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, 3);
  if (open.length === 0) return null;

  const phrase = (w: WeaknessLike): string =>
    `${w.label} (${w.openCount} time${w.openCount === 1 ? '' : 's'})`;
  const topicNoun =
    topic === 'tactical' ? 'tactical area'
      : topic === 'opening' ? 'opening'
        : topic === 'endgame' ? 'endgame area'
          : topic === 'positional' ? 'positional area'
            : 'area';
  const lead =
    open.length === 1
      ? `The ${topicNoun} to train, from your own games: ${phrase(open[0])}.`
      : `The ${topicNoun}s to train, most frequent first, from your own games: ${open.map(phrase).join('; ')}.`;
  // A TRUE capability fact (not invented chess content) so the coach can offer
  // the concrete next step — drilling routes to the real mistake queue.
  const facts = `${lead} You can practice these on the board anytime by asking to drill your mistakes.`;

  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** One opening's computed stats — a structural subset of OpeningRecord (+ a
 *  game tally) so the assembler stays a pure leaf. The caller computes these
 *  from openingService (getStrongestOpenings / getMostPlayedOpenings /
 *  getWeakestOpenings) and hands them in. */
export interface OpeningStat {
  name: string;
  color: 'white' | 'black';
  /** 0-1 drill accuracy (strongest/weakest). */
  drillAccuracy?: number;
  drillAttempts?: number;
  /** real games played in this opening (most-played); 0 = drill-count fallback. */
  games?: number;
}

/**
 * assembleOpeningProfileAnswer — the grounded "what's my strongest / favorite /
 * most-played opening?" answer. The student's OWN repertoire stats (drill
 * accuracy, drill attempts, real game counts) are computed in code and handed
 * in; this SELECTS + phrases them, grouped by color so "for both white and
 * black" reads naturally. The LLM voices the real numbers; it never invents an
 * opening or a stat. Returns null when there's no data (caller falls back to a
 * "play/drill a few and I'll tell you" line). G0: no chess content decided
 * here — only phrasing downstream.
 */
export function assembleOpeningProfileAnswer(opts: {
  kind: 'strongest' | 'favorite' | 'weakest';
  openings: ReadonlyArray<OpeningStat>;
}): GroundedAnswer | null {
  const { kind, openings } = opts;
  const rows = openings.filter((o) => o.name);
  if (rows.length === 0) return null;

  const pct = (a: number | undefined): string =>
    typeof a === 'number' ? `${Math.round(a * 100)}%` : '';
  const stat = (o: OpeningStat): string => {
    if (kind === 'favorite') {
      return o.games && o.games > 0
        ? `${o.name} (${o.games} game${o.games === 1 ? '' : 's'})`
        : `${o.name} (your most-drilled)`;
    }
    // strongest / weakest → accuracy over attempts
    const acc = pct(o.drillAccuracy);
    if (acc && o.drillAttempts) return `${o.name} (${acc} over ${o.drillAttempts} drill${o.drillAttempts === 1 ? '' : 's'})`;
    if (acc) return `${o.name} (${acc})`;
    return o.name;
  };

  const white = rows.filter((o) => o.color === 'white');
  const black = rows.filter((o) => o.color === 'black');
  const label = kind === 'strongest' ? 'strongest' : kind === 'weakest' ? 'weakest' : 'most-played';

  let facts: string;
  if (white.length > 0 && black.length > 0) {
    // both colors requested — one per side
    facts = `Your ${label} opening as White is ${stat(white[0])}; as Black it's ${stat(black[0])}.`;
  } else {
    const list = rows.slice(0, 3);
    facts =
      list.length === 1
        ? `Your ${label} opening is ${stat(list[0])}.`
        : `Your ${label} openings, ${kind === 'weakest' ? 'weakest' : 'best'} first: ${list.map(stat).join('; ')}.`;
  }
  // True next-step capability facts (no invented chess content).
  const next =
    kind === 'weakest'
      ? ' Ask me to drill it and I\'ll set the line up on the board.'
      : ' Ask me to teach it or drill its traps to go deeper.';
  return { facts: facts + next, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's computed game-record stats (a structural subset of
 *  OverviewInsights + the profile rating) — handed to `assembleStatsAnswer`
 *  so the assembler stays a pure leaf. */
export interface StatsLike {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;        // 0-100
  winRateWhite: number;   // 0-100
  winRateBlack: number;   // 0-100
  currentRating?: number | null;
  highestBeaten?: { name: string; rating: number } | null;
}

/**
 * assembleStatsAnswer — the grounded "what's my rating / record / win rate?"
 * answer. The student's OWN game history (wins/losses/draws + per-color win
 * rate, computed by getOverviewInsights) + their rating is handed in; this
 * phrases it. The LLM voices real numbers; it invents no stat. Returns null
 * when there are no games yet (caller takes the no-data line). G0.
 */
export function assembleStatsAnswer(s: StatsLike): GroundedAnswer | null {
  if (s.totalGames <= 0) return null;
  const rating = typeof s.currentRating === 'number' && s.currentRating > 0
    ? ` Your rating is about ${Math.round(s.currentRating)}.`
    : '';
  const perColor = (s.winRateWhite || s.winRateBlack)
    ? ` As White you win ${s.winRateWhite}%, as Black ${s.winRateBlack}%.`
    : '';
  const beat = s.highestBeaten && s.highestBeaten.name
    ? ` Your best scalp: ${s.highestBeaten.name} (${s.highestBeaten.rating}).`
    : '';
  const facts =
    `Across ${s.totalGames} game${s.totalGames === 1 ? '' : 's'} your record is ` +
    `${s.wins}-${s.losses}-${s.draws} (wins-losses-draws), a ${s.winRate}% win rate.` +
    perColor + rating + beat;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/**
 * assembleStrengthsAnswer — the grounded "what am I good at?" answer. The
 * strengths are COMPUTED (getOverviewInsights.strengths — "62% win rate as
 * White", "N brilliant moves", zero-blunder games, etc.); this selects the top
 * few and phrases them. Distinct from the weakness path so "what am I good at?"
 * stops getting a weakness-dump. Returns null when no strengths computed. G0.
 */
export function assembleStrengthsAnswer(strengths: ReadonlyArray<string>): GroundedAnswer | null {
  const open = strengths.filter((s) => !!s && s.trim().length > 0).slice(0, 3);
  if (open.length === 0) return null;
  const facts =
    open.length === 1
      ? `What you do well, from your own games: ${open[0]}.`
      : `What you do well, from your own games: ${open.join('; ')}.`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's drill accuracy within ONE opening (opening-level aggregate +
 *  the weakest sub-line + the single position they miss most) — a structural
 *  subset of the OpeningRecord + its weak-spot store, handed to
 *  `assembleOpeningAccuracyAnswer` so the assembler stays a pure leaf.
 *  `accuracy`/`variationAccuracy` are 0-1; `failCount` is a raw miss tally. */
export interface OpeningAccuracyLike {
  openingName: string;
  color?: 'white' | 'black' | null;
  drillAccuracy: number;   // 0-1
  drillAttempts: number;
  /** The lowest-accuracy variation (name + its 0-1 accuracy), if any drilled. */
  weakestVariation?: { name: string; accuracy: number } | null;
  /** The single position missed most (the correct move + how often missed). */
  topWeakSpot?: { san: string; failCount: number } | null;
}

/**
 * assembleOpeningAccuracyAnswer — the grounded "how accurate am I in my
 * favorite opening / what's the weakest part of my opening theory I need to
 * work on?" answer (David 2026-07-04: "check accuracy throughout the opening,
 * identify what is weakest and what I need to work on the most"). All computed:
 * opening-level drill accuracy (OpeningRecord.drillAccuracy/Attempts), the
 * weakest variation (variationAccuracy zipped with variations[].name), and the
 * single most-missed position (openingWeakSpots ranked by failCount). The LLM
 * voices these numbers; it picks no move and invents no line. Returns null when
 * there's nothing drilled AND no weak spot recorded (caller takes the no-data
 * line). G0.
 */
export function assembleOpeningAccuracyAnswer(o: OpeningAccuracyLike): GroundedAnswer | null {
  const drilled = o.drillAttempts > 0;
  const weakVar = o.weakestVariation && o.weakestVariation.name ? o.weakestVariation : null;
  const spot = o.topWeakSpot && o.topWeakSpot.san && o.topWeakSpot.failCount > 0 ? o.topWeakSpot : null;
  if (!drilled && !spot && !weakVar) return null;

  const where = o.color ? ` as ${o.color === 'white' ? 'White' : 'Black'}` : '';
  const lead = drilled
    ? `In your ${o.openingName}${where}, you're drilling at ${Math.round(o.drillAccuracy * 100)}% over ${o.drillAttempts} attempt${o.drillAttempts === 1 ? '' : 's'}.`
    : `You haven't drilled the ${o.openingName}${where} main line yet.`;

  const varLine = weakVar
    ? ` Your weakest line is the ${weakVar.name} at ${Math.round(weakVar.accuracy * 100)}% — that's the part of your theory to shore up first.`
    : '';

  const spotLine = spot
    ? ` The position you miss most: the right move is ${spot.san}, and you've slipped there ${spot.failCount} time${spot.failCount === 1 ? '' : 's'}.`
    : '';

  // When nothing finer than the aggregate is known, still point them at drilling.
  const next = (weakVar || spot)
    ? ' Want me to drill that with you?'
    : ' Drill it a few times and I can pinpoint the exact line and move to work on.';

  return { facts: lead + varLine + spotLine + next, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** One side's opening + its real trap weapons and "watch out for" warnings —
 *  drawn from the OpeningRecord (named trapLines / traps prose = weapons; named
 *  warningLines / warnings prose = anti-traps). Handed to
 *  `assembleOpeningTrapsAnswer` so the assembler stays a pure leaf. */
export interface OpeningTrapsSideLike {
  name: string;
  color: 'white' | 'black';
  /** Trap WEAPONS — named traps the student can spring (opponent slips). */
  traps: ReadonlyArray<string>;
  /** "WATCH OUT FOR" — anti-traps where the STUDENT is the one who slips. */
  warnings: ReadonlyArray<string>;
}

/**
 * assembleOpeningTrapsAnswer — the grounded "what traps can I use in my
 * strongest opening (for both colors), and what should I watch out for?" answer
 * (David 2026-07-04: "drill me on opening traps in your strongest opening for
 * both white and black … teach me what to look out for … and what system it
 * uses to teach these"). The traps + warnings are REAL, hand-authored data on
 * the OpeningRecord (G3 — never invented); this names them per side, optionally
 * explains the WLPP teaching system, and points the student at the drill. The
 * LLM voices these names; it invents no trap. Returns null when no side carries
 * any trap or warning. G0.
 */
export function assembleOpeningTrapsAnswer(opts: {
  sides: ReadonlyArray<OpeningTrapsSideLike>;
  explainSystem?: boolean;
}): GroundedAnswer | null {
  const clean = (xs: ReadonlyArray<string>): string[] =>
    xs.filter((s) => !!s && s.trim().length > 0).map((s) => s.trim());
  const sides = opts.sides.filter((s) => s.name && (clean(s.traps).length > 0 || clean(s.warnings).length > 0));
  // The teaching-system explanation — grounded in the app's REAL WLPP grammar +
  // trap taxonomy (not invented). Fires whenever the student asked "how do you
  // teach these / what system"; it does NOT depend on having named traps.
  const system = opts.explainSystem
    ? 'I teach every trap the same four-rung way — Watch, Learn, Practice, Play: you watch the trap spring with the key squares lit up, then I guide you through the punish move by move, then you play it silently, then you drill it live. Each trap is tagged too — a forced tactic, a positional mistake to punish, or a longer maneuvering idea.'
    : '';

  // No named traps to voice. If the student asked about the SYSTEM, still answer
  // that (it's the same regardless of which traps exist); otherwise null so the
  // caller takes the no-data line. G0 — the "how do you teach traps" answer is a
  // computed fact, not something the LLM should freestyle into a drill setup.
  if (sides.length === 0) {
    if (!system) return null;
    return {
      facts: system + ' Ask me for the traps in your strongest opening and I\'ll name them.',
      bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
    };
  }

  const parts: string[] = [];
  let firstDrillName = '';
  for (const s of sides) {
    if (!firstDrillName) firstDrillName = s.name;
    const traps = clean(s.traps).slice(0, 3);
    const warns = clean(s.warnings).slice(0, 2);
    const side = s.color === 'white' ? 'White' : 'Black';
    let line = `Your strongest ${side} opening is the ${s.name}.`;
    if (traps.length) line += ` Trap weapons you can spring: ${traps.join('; ')}.`;
    if (warns.length) line += ` Watch out for: ${warns.join('; ')}.`;
    parts.push(line);
  }

  const next = firstDrillName
    ? ` Say "punish lines for the ${firstDrillName}" and I'll run the drill.`
    : '';

  const systemTail = system ? ' ' + system : '';
  return { facts: parts.join(' ') + systemTail + next, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's spaced-repetition review state — a structural subset of the
 *  live `srsOpeningCards` store (getDueCount + getEnrolledOpenings +
 *  getSrsDueOpenings), handed to `assembleReviewDueAnswer` so the assembler
 *  stays a pure leaf. */
export interface ReviewDueLike {
  /** Total cards due for review right now (nextReviewAt <= now). */
  dueCount: number;
  /** Total opening cards enrolled in the SRS (0 → nothing to review yet). */
  totalEnrolled: number;
  /** Openings that currently have due cards, name + count, richest first. */
  dueOpenings: ReadonlyArray<{ name: string; dueCards: number }>;
}

/**
 * assembleReviewDueAnswer — the grounded "what's due for review today / how many
 * cards do I have to review?" answer (David 2026-07-04: "keep working these
 * types of questions"). The counts + per-opening grouping are COMPUTED from the
 * live SRS store (`srsOpeningCards`); this phrases them and points the student
 * at the `/openings/srs` trainer. The LLM voices real numbers; it invents no
 * count. Returns null when nothing is enrolled yet (caller takes the
 * not-enrolled onboarding line). G0.
 */
export function assembleReviewDueAnswer(s: ReviewDueLike): GroundedAnswer | null {
  if (s.totalEnrolled <= 0) return null;

  // All caught up — nothing due, but cards are in rotation.
  if (s.dueCount <= 0) {
    return {
      facts: `You're all caught up — nothing due for review right now. You've got ${s.totalEnrolled} opening card${s.totalEnrolled === 1 ? '' : 's'} in rotation, and I'll resurface them as they come due.`,
      bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
    };
  }

  const openings = s.dueOpenings.filter((o) => o.name && o.dueCards > 0).slice(0, 3);
  const acrossN = s.dueOpenings.filter((o) => o.dueCards > 0).length;
  const across = acrossN > 1 ? ` across ${acrossN} openings` : '';
  const breakdown = openings.length
    ? ` Mostly ${openings.map((o) => `the ${o.name} (${o.dueCards})`).join(', ')}.`
    : '';
  const facts =
    `You've got ${s.dueCount} card${s.dueCount === 1 ? '' : 's'} due for review right now${across}.` +
    breakdown + ` Say "review my openings" and I'll run today's reps.`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Readable phase word for narration. */
function phaseWord(p: string): string {
  return p === 'middlegame' ? 'middlegame' : p === 'endgame' ? 'endgame' : 'opening';
}
/** Pawns, one decimal, from centipawns. */
function pawns(cp: number): string { return (Math.abs(cp) / 100).toFixed(1); }

// ═══ WAVE 1 — the "where do I go wrong" cluster (David 2026-07-04): voice the
// weakness-tab numbers the coach never spoke, each ending in a suggestion. ═══

/** The student's mistake profile — a structural subset of getMistakeInsights +
 *  getOverviewInsights, handed to `assembleMistakesAnswer`. */
export interface MistakesLike {
  totalGames: number;
  blundersPerGame: number;
  mistakesPerGame: number;
  avgCpLoss: number;                 // centipawns lost per game
  worstPhase: { phase: string; errors: number } | null;
  thrownWins: number;
  costliest: { san: string; cpLoss: number; opponentName: string; openingName: string | null } | null;
}

/**
 * assembleMistakesAnswer — "what mistakes do I make / how often do I blunder /
 * where do I go wrong?" Voices the real error numbers (blunder/mistake rate, avg
 * centipawn loss, worst phase, thrown-away wins, the single costliest slip) and
 * ends with a concrete thing to work on. All computed (getMistakeInsights); the
 * LLM invents no number. Returns null with no analyzed games. G0.
 */
export function assembleMistakesAnswer(m: MistakesLike): GroundedAnswer | null {
  if (m.totalGames <= 0) return null;
  const rate = `Across ${m.totalGames} game${m.totalGames === 1 ? '' : 's'} you average ${m.blundersPerGame} blunder${m.blundersPerGame === 1 ? '' : 's'} and ${m.mistakesPerGame} mistake${m.mistakesPerGame === 1 ? '' : 's'} a game, losing about ${Math.round(m.avgCpLoss)} centipawns per game.`;
  const phase = m.worstPhase && m.worstPhase.errors > 0
    ? ` Most of your errors land in the ${phaseWord(m.worstPhase.phase)} (${m.worstPhase.errors} there).`
    : '';
  const thrown = m.thrownWins > 0
    ? ` You've let ${m.thrownWins} winning position${m.thrownWins === 1 ? '' : 's'} slip.`
    : '';
  const costly = m.costliest && m.costliest.san
    ? ` Your costliest slip was ${m.costliest.san} against ${m.costliest.opponentName || 'an opponent'}, dropping ${pawns(m.costliest.cpLoss)} pawns${m.costliest.openingName ? ` in the ${m.costliest.openingName}` : ''}.`
    : '';
  // Suggestion — pick the dominant lever.
  const suggest = m.thrownWins >= 2
    ? ' Work on converting winning positions — that\'s costing you the most.'
    : m.worstPhase && m.worstPhase.errors > 0
      ? ` Focus your training on the ${phaseWord(m.worstPhase.phase)}, and drill your saved mistake puzzles from there.`
      : ' Drill your saved mistake puzzles to turn these into second nature.';
  return { facts: rate + phase + thrown + costly + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's tactical profile — a subset of getTacticInsights. */
export interface TacticsProfileLike {
  totalGames: number;
  awarenessRate: number;               // %
  found: number;
  missed: number;
  missedByType: ReadonlyArray<{ type: string; count: number }>;   // desc by count
  worstPhase: { phase: string; count: number } | null;
}

/**
 * assembleTacticsProfileAnswer — "how are my tactics / what tactics do I miss?"
 * Voices tactical awareness rate, found-vs-missed, the motif missed most, and
 * the phase where misses cluster, then suggests drilling that motif. Computed
 * (getTacticInsights). Distinct from the live-board "is there a tactic here"
 * (isTacticsQuestion). Returns null with no tactic data. G0.
 */
export function assembleTacticsProfileAnswer(t: TacticsProfileLike): GroundedAnswer | null {
  if (t.totalGames <= 0 || (t.found + t.missed) <= 0) return null;
  const top = t.missedByType.find((x) => x.type && x.count > 0) ?? null;
  const lead = `Your tactical awareness is ${t.awarenessRate}% — you spot ${t.found} tactic${t.found === 1 ? '' : 's'} and miss ${t.missed}.`;
  const byType = top
    ? ` The motif you miss most is the ${top.type} (${top.count} time${top.count === 1 ? '' : 's'}).`
    : '';
  const phase = t.worstPhase && t.worstPhase.count > 0
    ? ` Most of those misses come in the ${phaseWord(t.worstPhase.phase)}.`
    : '';
  const suggest = top
    ? ` Drill ${top.type} puzzles to close that gap.`
    : ' Keep drilling mixed tactics to lift your awareness rate.';
  return { facts: lead + byType + phase + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's per-phase profile — phaseAccuracy + critical-moment accuracy. */
export interface PhaseProfileLike {
  phaseAccuracy: ReadonlyArray<{ phase: string; accuracy: number; mistakes: number; moveCount: number }>;
  criticalByPhase: ReadonlyArray<{ phase: string; accuracyPct: number; total: number }>;
}

/**
 * assemblePhaseProfileAnswer — "which phase am I weakest in / where do I lose?"
 * Voices accuracy per phase (opening/middlegame/endgame), names the weakest, and
 * folds in critical-moment decision quality, then suggests focusing there.
 * Computed (getOverviewInsights.phaseAccuracy + criticalMomentsAccuracy).
 * Returns null with no analyzed moves. G0.
 */
export function assemblePhaseProfileAnswer(p: PhaseProfileLike): GroundedAnswer | null {
  const played = p.phaseAccuracy.filter((x) => x.moveCount > 0 && x.accuracy > 0);
  if (played.length === 0) return null;
  const order: Record<string, number> = { opening: 0, middlegame: 1, endgame: 2 };
  const sorted = [...played].sort((a, b) => (order[a.phase] ?? 9) - (order[b.phase] ?? 9));
  const readout = sorted.map((x) => `${phaseWord(x.phase)} ${x.accuracy}%`).join(', ');
  const worst = [...played].sort((a, b) => a.accuracy - b.accuracy)[0];
  const worstLine = ` Your weakest is the ${phaseWord(worst.phase)} at ${worst.accuracy}%${worst.mistakes > 0 ? `, where you also make the most mistakes` : ''}.`;
  const crit = p.criticalByPhase.filter((x) => x.total > 0);
  const critWorst = crit.length ? [...crit].sort((a, b) => a.accuracyPct - b.accuracyPct)[0] : null;
  const critLine = critWorst
    ? ` On the game's critical moments, the ${phaseWord(critWorst.phase)} is softest — you find the best move ${critWorst.accuracyPct}% of the time there.`
    : '';
  const suggest = ` Put your training into the ${phaseWord(worst.phase)}.`;
  return { facts: `Your accuracy by phase: ${readout}.` + worstLine + critLine + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ═══ WAVE 2 — the REPERTOIRE-GAP cluster (David 2026-07-04: "I LOVE THIS STYLE
// OF QUESTION!"): where you leave book, the holes you're least prepared for, and
// what to learn next. Grounded in getOpeningInsights (repertoireCoverage +
// worstResults). ═══

/** The student's repertoire-gap picture — off-book rate + the openings they
 *  score worst against (their softest matchups) — a subset of getOpeningInsights,
 *  handed to `assembleRepertoireGapAnswer`. */
export interface RepertoireGapLike {
  kind: 'out-of-book' | 'hole' | 'learn-next';
  offBookPct: number | null;         // 0-100, % of games leaving prep (or null)
  totalGames: number;
  /** Openings the student scores worst against, richest signal first. */
  worstAgainst: ReadonlyArray<{ name: string; winRate: number; games: number }>;
}

/**
 * assembleRepertoireGapAnswer — the grounded "where do I leave theory / what's a
 * hole in my repertoire / what should I learn next?" answer (David 2026-07-04).
 * Voiced from the off-book rate + the openings the student scores worst against
 * (getOpeningInsights). Honest: it names the softest matchup by the real score,
 * never claims a coverage number it didn't compute. Ends by pointing at the fix.
 * Returns null with no opening/game data. G0.
 */
export function assembleRepertoireGapAnswer(g: RepertoireGapLike): GroundedAnswer | null {
  const worst = g.worstAgainst.filter((w) => w.name && w.games > 0);
  const top = worst[0] ?? null;
  const offBook = typeof g.offBookPct === 'number' && g.offBookPct >= 0;
  if (g.totalGames <= 0 || (!top && !offBook)) return null;

  if (g.kind === 'out-of-book') {
    const lead = offBook
      ? `About ${Math.round(g.offBookPct as number)}% of your games leave your prepared repertoire.`
      : `You drift out of your prep more than you'd like.`;
    const where = top
      ? ` Where it costs you most: you score only ${top.winRate}% against ${top.name} over ${top.games} games.`
      : '';
    const suggest = top
      ? ` Extend your prep against ${top.name} first — that's where leaving book hurts most.`
      : ` Pin down your lines a few moves deeper so you're not improvising early.`;
    return { facts: lead + where + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
  }

  if (g.kind === 'learn-next') {
    if (!top) return null;
    const facts =
      `The opening to learn next is a real answer to ${top.name} — it's your worst matchup at ${top.winRate}% over ${top.games} games` +
      (worst[1] ? `, with ${worst[1].name} (${worst[1].winRate}%) close behind` : '') +
      `. Want me to teach you a line against it?`;
    return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
  }

  // 'hole'
  if (!top) {
    // No worst-matchup signal but we know the off-book rate.
    return {
      facts: `The clearest gap is your prep depth — about ${Math.round(g.offBookPct as number)}% of your games leave book. Drill your repertoire lines deeper so you're not improvising.`,
      bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
    };
  }
  const runnerUp = worst[1] ? `, then ${worst[1].name} (${worst[1].winRate}%)` : '';
  const facts =
    `Your softest spot is ${top.name} — you score just ${top.winRate}% against it over ${top.games} games, your worst matchup${runnerUp}. That's the gap to plug. Want a solid line against ${top.name}?`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ═══ WAVE 3 — accuracy/move-quality, consistency/activity, converting/winning.
// The rest of the weakness-tab numbers, each ending in a suggestion. ═══

/** Accuracy + move-quality profile — a subset of getOverviewInsights. */
export interface AccuracyLike {
  totalGames: number;
  avgAccuracy: number;
  accuracyWhite: number;
  accuracyBlack: number;
  bestMoveAgreement: number;      // % of moves matching the engine's top choice
  brilliant: number;
  great: number;
  blunders: number;
}

/**
 * assembleAccuracyAnswer — "how accurate am I / how engine-like is my play?"
 * Voices average accuracy, per-colour accuracy, best-move agreement, and the
 * move-quality highlights, then suggests where to tighten up. Computed
 * (getOverviewInsights). Returns null with no analyzed games. G0.
 */
export function assembleAccuracyAnswer(a: AccuracyLike): GroundedAnswer | null {
  if (a.totalGames <= 0 || a.avgAccuracy <= 0) return null;
  const perColor = (a.accuracyWhite > 0 || a.accuracyBlack > 0)
    ? ` As White you play at ${a.accuracyWhite}%, as Black ${a.accuracyBlack}%.`
    : '';
  const agree = a.bestMoveAgreement > 0
    ? ` You match the engine's top move ${a.bestMoveAgreement}% of the time.`
    : '';
  const quality = (a.brilliant > 0 || a.great > 0 || a.blunders > 0)
    ? ` Across your games: ${a.brilliant} brilliant and ${a.great} great moves, against ${a.blunders} blunders.`
    : '';
  // Suggestion — the biggest lever.
  const colorGap = Math.abs(a.accuracyWhite - a.accuracyBlack);
  const suggest = colorGap >= 8 && (a.accuracyWhite > 0 && a.accuracyBlack > 0)
    ? ` Your ${a.accuracyWhite < a.accuracyBlack ? 'White' : 'Black'} games are the weaker side — put your reps there.`
    : a.bestMoveAgreement > 0 && a.bestMoveAgreement < 45
      ? ' Work on calculation — you\'re leaving the best move on the table too often.'
      : ' Cutting blunders is the fastest way to lift this — drill your saved mistake puzzles.';
  return { facts: `Your average accuracy is ${a.avgAccuracy}%.` + perColor + agree + quality + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Consistency + activity + time-control profile. */
export interface ConsistencyLike {
  currentWinStreak: number;
  longestWinStreak: number;
  timeControls: ReadonlyArray<{ bucket: string; winRatePct: number; games: number; avgAccuracyPct: number | null }>;
}

/**
 * assembleConsistencyAnswer — "how consistent am I / what time control am I best
 * at / am I on a streak?" Voices the win streak + the best/worst time control,
 * then suggests where to focus. Computed (streaks + timeControlPerformance).
 * Returns null with no games. G0.
 */
export function assembleConsistencyAnswer(c: ConsistencyLike): GroundedAnswer | null {
  const tc = c.timeControls.filter((t) => t.games > 0).sort((a, b) => b.winRatePct - a.winRatePct);
  if (tc.length === 0 && c.longestWinStreak <= 0) return null;
  const streak = c.longestWinStreak > 0
    ? c.currentWinStreak > 0
      ? `You're on a ${c.currentWinStreak}-game win streak (your best is ${c.longestWinStreak}).`
      : `Your longest win streak is ${c.longestWinStreak} games.`
    : `You're building your first win streak.`;
  const best = tc[0] ?? null;
  const worst = tc.length > 1 ? tc[tc.length - 1] : null;
  const tcLine = best
    ? ` You play best at ${best.bucket} (${best.winRatePct}% over ${best.games} games)${worst ? `, and weakest at ${worst.bucket} (${worst.winRatePct}%)` : ''}.`
    : '';
  const suggest = worst
    ? ` If you want a steadier rating, slow down in your ${worst.bucket} games — that's where results dip.`
    : ' Keep a regular cadence and I\'ll track your consistency over time.';
  return { facts: streak + tcLine + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Converting / winning-shape profile. */
export interface ConvertingLike {
  totalWins: number;
  thrownWins: number;
  comebackWins: number;
  quickWins: number;
  grindWins: number;
  midLengthWins: number;
}

/**
 * assembleConvertingAnswer — "do I convert winning positions / do I throw away
 * wins / how do I win?" Voices thrown wins vs comebacks + the win-shape mix, then
 * suggests the lever. Computed (getMistakeInsights.thrownWins + comebackWins +
 * winShapeStats). Returns null with no wins/data. G0.
 */
export function assembleConvertingAnswer(c: ConvertingLike): GroundedAnswer | null {
  if (c.totalWins <= 0 && c.thrownWins <= 0) return null;
  const thrown = c.thrownWins > 0
    ? `You've thrown away ${c.thrownWins} winning position${c.thrownWins === 1 ? '' : 's'}.`
    : `You rarely let a winning position slip — nice.`;
  const comeback = c.comebackWins > 0
    ? ` On the flip side, you've pulled off ${c.comebackWins} comeback win${c.comebackWins === 1 ? '' : 's'} from a losing spot.`
    : '';
  const shapeParts: string[] = [];
  if (c.quickWins > 0) shapeParts.push(`${c.quickWins} quick`);
  if (c.midLengthWins > 0) shapeParts.push(`${c.midLengthWins} mid-length`);
  if (c.grindWins > 0) shapeParts.push(`${c.grindWins} grind`);
  const shape = shapeParts.length && c.totalWins > 0
    ? ` Of your ${c.totalWins} wins: ${shapeParts.join(', ')}.`
    : '';
  const suggest = c.thrownWins >= 2
    ? ' Converting winning positions is your biggest leak — practice technique from a winning position, not just tactics.'
    : c.grindWins > c.quickWins
      ? ' You win by grinding — sharpening your attacking play could turn some of those long games into quick ones.'
      : ' Keep converting cleanly; add endgame technique to close out the tight ones.';
  return { facts: thrown + comeback + shape + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ═══ WAVE 4 — colour, records/bests, puzzle stats, tactic transfer gap. ═══

/** Better-as-White-or-Black profile. */
export interface ColorLike {
  totalGames: number;
  winRateWhite: number; winRateBlack: number;
  accuracyWhite: number; accuracyBlack: number;
  /** From colorProficiencyMismatch — the inversion (better at the colour you
   *  play less), when it exists; null otherwise. */
  inversion: { preferredColor: string; otherColor: string; inversionPoints: number } | null;
}
/** assembleColorAnswer — "am I better as White or Black?" G0. */
export function assembleColorAnswer(c: ColorLike): GroundedAnswer | null {
  if (c.totalGames <= 0 || (c.winRateWhite <= 0 && c.winRateBlack <= 0)) return null;
  const better = c.winRateWhite >= c.winRateBlack ? 'White' : 'Black';
  const acc = (c.accuracyWhite > 0 || c.accuracyBlack > 0)
    ? ` Your accuracy is ${c.accuracyWhite}% as White, ${c.accuracyBlack}% as Black.`
    : '';
  const inversion = c.inversion && c.inversion.inversionPoints >= 5 ? c.inversion : null;
  const inv = inversion
    ? ` Interesting — you play ${inversion.preferredColor} more, but you actually score better as ${inversion.otherColor}.`
    : '';
  const suggest = inversion
    ? ` Lean into your ${inversion.otherColor} games — that's your stronger side.`
    : ` You're stronger as ${better} — your ${better === 'White' ? 'Black' : 'White'} games are where the points are hiding.`;
  return { facts: `As White you win ${c.winRateWhite}%, as Black ${c.winRateBlack}%.` + acc + inv + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Personal records / bests. */
export interface RecordsLike {
  totalGames: number;
  highestBeaten: { name: string; elo: number } | null;
  fastestWin: { moves: number } | null;
  longestGame: { moves: number } | null;
  bestAccuracyGame: { accuracyPct: number } | null;
}
/** assembleRecordsAnswer — "my best game / fastest win / records". G0. */
export function assembleRecordsAnswer(r: RecordsLike): GroundedAnswer | null {
  if (r.totalGames <= 0) return null;
  const parts: string[] = [];
  if (r.highestBeaten) parts.push(`your best scalp is ${r.highestBeaten.name} (${r.highestBeaten.elo})`);
  if (r.bestAccuracyGame) parts.push(`your most accurate game hit ${r.bestAccuracyGame.accuracyPct}%`);
  if (r.fastestWin) parts.push(`your fastest win took ${r.fastestWin.moves} moves`);
  if (r.longestGame) parts.push(`your longest game ran ${r.longestGame.moves} moves`);
  if (parts.length === 0) return null;
  return { facts: `Your records: ${parts.join('; ')}. Want to replay your best game?`, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Puzzle rating + solve stats. */
export interface PuzzleStatsLike {
  puzzleRating: number | null;
  totalAttempted: number;
  totalCorrect: number;
  overallAccuracy: number;
  duePuzzles: number;
}
/** assemblePuzzleStatsAnswer — "my puzzle rating / how many solved". G0. */
export function assemblePuzzleStatsAnswer(p: PuzzleStatsLike): GroundedAnswer | null {
  if (p.totalAttempted <= 0 && !(p.puzzleRating && p.puzzleRating > 0)) return null;
  const rating = p.puzzleRating && p.puzzleRating > 0 ? `Your puzzle rating is ${Math.round(p.puzzleRating)}.` : '';
  const solved = p.totalAttempted > 0 ? ` You've solved ${p.totalCorrect} of ${p.totalAttempted} (${p.overallAccuracy}%).` : '';
  const due = p.duePuzzles > 0 ? ` ${p.duePuzzles} are due to retry.` : '';
  const suggest = p.duePuzzles > 0 ? ' Clear your due puzzles to lock the patterns in.' : ' Keep the daily streak going to push your rating up.';
  return { facts: (rating + solved + due).trim() + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Tactic transfer gap (puzzle-strong / game-weak per motif). */
export interface TransferGapLike {
  /** The motif with the biggest positive transfer gap (good at puzzles, weak
   *  in games), or null if none is clearly worse in games. */
  worst: { tacticType: string; puzzleAccuracyPct: number; gameRecognitionPct: number; gapPoints: number } | null;
}
/** assembleTransferGapAnswer — "do I spot tactics in games as well as puzzles?". G0. */
export function assembleTransferGapAnswer(t: TransferGapLike): GroundedAnswer | null {
  const w = t.worst;
  if (!w || w.gapPoints < 10) return null;
  return {
    facts: `Your pattern knowledge is ahead of your board vision: you solve ${w.tacticType} puzzles at ${w.puzzleAccuracyPct}% but only spot them in your own games ${w.gameRecognitionPct}% of the time — a ${w.gapPoints}-point gap. Slow down and scan for ${w.tacticType}s in real games; the knowledge is there, the recognition isn't yet.`,
    bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
  };
}

/** The student's 5-axis skill radar (0-100 each) — from profile.skillRadar. */
export interface SkillRadarLike {
  opening: number; tactics: number; endgame: number; memory: number; calculation: number;
}
/**
 * assembleSkillRadarAnswer — "what's my skill breakdown / assess my chess?"
 * Voices the 5-axis skill radar, names the strongest + weakest axis, and points
 * the student at the weakest. Computed (weaknessAnalyzer.computeSkillRadar,
 * persisted on profile.skillRadar). Returns null when nothing's computed. G0.
 */
export function assembleSkillRadarAnswer(s: SkillRadarLike): GroundedAnswer | null {
  const axes: Array<{ name: string; v: number }> = [
    { name: 'opening', v: s.opening }, { name: 'tactics', v: s.tactics },
    { name: 'endgame', v: s.endgame }, { name: 'memory', v: s.memory },
    { name: 'calculation', v: s.calculation },
  ];
  if (axes.every((a) => !a.v || a.v <= 0)) return null;
  const readout = axes.map((a) => `${a.name} ${Math.round(a.v)}`).join(', ');
  const rated = axes.filter((a) => a.v > 0);
  const best = [...rated].sort((a, b) => b.v - a.v)[0];
  const worst = [...rated].sort((a, b) => a.v - b.v)[0];
  const facts =
    `Your skill breakdown (out of 100): ${readout}.` +
    (best && worst && best.name !== worst.name
      ? ` Your strongest is ${best.name} (${Math.round(best.v)}) and your weakest is ${worst.name} (${Math.round(worst.v)}) — that's where the fastest gains are.`
      : '') +
    (worst ? ` Put your training into ${worst.name}.` : '');
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}
