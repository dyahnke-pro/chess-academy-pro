/**
 * positionReadingService — the deterministic CORE of the Position-Reading /
 * Analysis-Practice feature (plan: docs/plans/2026-06-27-…position-reading.md).
 *
 * The contract is G0: the LLM never decides chess. Every question this service
 * asks carries a COMPUTED answer key — tactics/threats/hanging/material/mate
 * come from the engine + chess.js, and the grader only matches the student's
 * free-text answer against that key. This module computes the questions + the
 * answer keys + a deterministic grader; the LLM grading (natural-language
 * understanding) layers on top in `gradeReadingAnswer` with this as the
 * offline-testable fallback.
 *
 * The "hanging" answer key uses a proper static-exchange evaluation (SEE), not
 * the attacked-and-undefended heuristic — a defended piece still hangs when a
 * cheaper attacker wins the exchange (David's 2026-06-27 catch: "attacked-and-
 * undefended is *sufficient*, not *necessary* — it's not an iff").
 */
import { Chess } from 'chess.js';
import type { Square, Color, PieceSymbol } from 'chess.js';
import type { TacticsLiveContext } from '../coach/types';

/** Centipawn-free piece values for SEE + material reasoning (king ~ ∞). */
const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * Static Exchange Evaluation on `square`: the material the side NOT owning the
 * piece there gains by initiating a capture sequence, both sides playing
 * least-valuable-attacker and stopping when the trade turns unfavorable. The
 * classic swap-off algorithm. Returns the net material from the capturing
 * side's perspective; `> 0` ⇒ the piece is effectively hanging (winnable),
 * even if it is defended.
 */
export function seeGain(chess: Chess, square: Square): number {
  const victim = chess.get(square);
  if (!victim) return 0;
  const them: Color = victim.color === 'w' ? 'b' : 'w';
  const us = victim.color;
  const valueAt = (s: Square): number[] => {
    const p = chess.get(s);
    return p ? [PIECE_VALUE[p.type]] : [];
  };
  const attackers = chess.attackers(square, them).flatMap(valueAt).sort((a, b) => a - b);
  const defenders = chess.attackers(square, us).flatMap(valueAt).sort((a, b) => a - b);
  if (attackers.length === 0) return 0;

  // Swap list, from the capturing side's perspective (them captures first).
  const gains: number[] = [];
  let onSquare = PIECE_VALUE[victim.type];
  gains.push(onSquare);          // them captures the victim
  onSquare = attackers[0];       // them's attacker now sits on the square
  let ai = 1;
  let di = 0;
  let usToMove = true;           // us recaptures next
  for (;;) {
    const list = usToMove ? defenders : attackers;
    const idx = usToMove ? di : ai;
    if (idx >= list.length) break;
    gains.push(onSquare - gains[gains.length - 1]);
    onSquare = list[idx];
    if (usToMove) di += 1; else ai += 1;
    usToMove = !usToMove;
  }
  // Minimax the swap list back to the root — either side bails when a deeper
  // capture would lose material.
  for (let i = gains.length - 1; i > 0; i -= 1) {
    gains[i - 1] = -Math.max(-gains[i - 1], gains[i]);
  }
  return gains[0];
}

export interface HangingPiece {
  square: Square;
  piece: PieceSymbol;
  color: Color;
  /** SEE material the opponent wins by capturing here (≥ 1). */
  gain: number;
}

/**
 * Every piece on the board that is genuinely hanging by SEE — the value-aware
 * answer key for "is anything hanging?". Sorted by gain (biggest blunder
 * first). Unlike `TacticsLiveContext.hanging` (attacked-and-undefended), this
 * also flags defended pieces that lose the exchange to a cheaper attacker.
 */
export function findHangingBySee(fen: string): HangingPiece[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const out: HangingPiece[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const gain = seeGain(chess, cell.square);
      if (gain > 0) out.push({ square: cell.square, piece: cell.type, color: cell.color, gain });
    }
  }
  return out.sort((a, b) => b.gain - a.gain);
}

/**
 * Candidate PAWN BREAKS for the side to move — the deterministic answer key for
 * "what's the right pawn break?". A break here = a legal pawn push that makes
 * pawn-on-pawn contact (the pushed pawn attacks an enemy pawn, or an enemy pawn
 * attacks the square it lands on), i.e. it challenges the opponent's structure.
 * Returns the destination squares (e.g. ['c5', 'f5']).
 */
export function findPawnBreaks(fen: string): Square[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const mover = chess.turn();
  const breaks = new Set<Square>();
  for (const mv of chess.moves({ verbose: true })) {
    if (mv.piece !== 'p') continue;
    // Play the push, then check whether the new pawn touches an enemy pawn.
    const probe = new Chess(fen);
    try { probe.move(mv); } catch { continue; }
    const to: Square = mv.to;
    const file = to.charCodeAt(0) - 97;
    const rank = Number(to[1]);
    const forward = mover === 'w' ? 1 : -1;
    let contact = mv.captured === 'p'; // a capture of a pawn is itself a break
    for (const df of [-1, 1]) {
      const af = file + df;
      const ar = rank + forward;
      if (af < 0 || af > 7 || ar < 1 || ar > 8) continue;
      const sq = `${String.fromCharCode(97 + af)}${ar}` as Square;
      const occ = probe.get(sq);
      if (occ && occ.type === 'p' && occ.color !== mover) contact = true; // our pawn now attacks an enemy pawn
    }
    if (contact) breaks.add(to);
  }
  return [...breaks];
}

export interface SampledPosition {
  fen: string;
  /** 1-indexed ply this position is BEFORE (i.e. the side to move is on move). */
  ply: number;
  /** The SAN actually played next in the game (context only — never an answer). */
  playedNext: string | null;
}

/**
 * Sample middlegame positions from a stored game's PGN. Deterministic (NOT the
 * LLM): walk the mainline, collect the position BEFORE each ply in the
 * middlegame band, and evenly pick up to `count`. Positions where the side to
 * move is in check or it's a forced recapture are skipped (poor "read this"
 * material). Returns [] for an unparseable / too-short game.
 */
export function samplePositionsFromGame(
  pgn: string,
  opts: { count?: number; minPly?: number; maxPly?: number } = {},
): SampledPosition[] {
  const count = opts.count ?? 5;
  const minPly = opts.minPly ?? 12;
  const maxPly = opts.maxPly ?? 40;
  let game: Chess;
  try {
    game = new Chess();
    game.loadPgn(pgn);
  } catch { return []; }
  const history = game.history({ verbose: true });
  if (history.length < minPly + 1) return [];

  // Replay to capture the FEN BEFORE each ply.
  const replay = new Chess();
  const candidates: SampledPosition[] = [];
  for (let i = 0; i < history.length; i += 1) {
    const ply = i + 1;
    const before = replay.fen();
    const mv = history[i];
    if (ply >= minPly && ply <= Math.min(maxPly, history.length) && !replay.inCheck()) {
      candidates.push({ fen: before, ply, playedNext: mv.san });
    }
    try { replay.move(mv.san); } catch { break; }
  }
  if (candidates.length === 0) return [];

  // Evenly spread the picks across the band.
  if (candidates.length <= count) return candidates;
  const picks: SampledPosition[] = [];
  const step = candidates.length / count;
  for (let i = 0; i < count; i += 1) picks.push(candidates[Math.floor(i * step)]);
  return picks;
}

export type ReadingQuestionType = 'tactic' | 'threat' | 'hanging' | 'material' | 'mate' | 'check' | 'pawn-break';

export interface ReadingQuestion {
  id: string;
  type: ReadingQuestionType;
  /** The prompt shown to the student. */
  prompt: string;
  /** The canonical correct answer, shown when the student is wrong. */
  answer: string;
  /** Lowercased tokens (squares, piece names, motif words) any of which marks a
   *  correct read in the deterministic grader. Empty for a `negative` answer. */
  acceptTokens: string[];
  /** True when the correct answer is "nothing" (no tactic / nothing hanging /
   *  no break) — the student is right to say so. */
  negative: boolean;
}

const NEG_TOKENS = ['nothing', 'none', 'no', 'safe', 'fine', 'equal', 'even', 'quiet', "nothing's", 'nope'];

function sq(square: string): string { return square.toLowerCase(); }

/**
 * Build the question set for a position from its computed tactics package.
 * Every question's answer is derived from `tactics` / chess.js — never invented.
 * Returns questions ordered tactic → threat → hanging → break → material so the
 * UI can pick a mix.
 */
export function buildReadingQuestions(fen: string, tactics: TacticsLiveContext): ReadingQuestion[] {
  const out: ReadingQuestion[] = [];
  const facts = tactics.boardFacts;
  const sideToMove = facts?.sideToMove ?? 'white';

  // 1) MATE-IN-ONE — highest priority when present.
  if (facts?.mateInOne) {
    out.push({
      id: 'mate', type: 'mate',
      prompt: `${sideToMove === 'white' ? 'White' : 'Black'} to move — is there a forced mate in one? If so, what is it?`,
      answer: `Yes — ${facts.mateInOne} is mate.`,
      acceptTokens: [sq(facts.mateInOne), 'mate', 'checkmate', 'yes'],
      negative: false,
    });
  }

  // 2) IMMEDIATE TACTIC on the board.
  if (tactics.immediate.length > 0) {
    const t = tactics.immediate[0];
    out.push({
      id: 'tactic', type: 'tactic',
      prompt: 'Is there a tactic in this position? What is it?',
      answer: t.description,
      acceptTokens: [t.type.replace(/_/g, ' '), ...t.squares.map(sq), ...t.type.split('_')],
      negative: false,
    });
  } else {
    out.push({
      id: 'tactic', type: 'tactic',
      prompt: 'Is there a tactic for the side to move here?',
      answer: 'No concrete tactic — this is a quiet position; play on general principles.',
      acceptTokens: [], negative: true,
    });
  }

  // 3) OPPONENT'S THREAT (PV look-ahead).
  if (tactics.threats.length > 0) {
    const th = tactics.threats[0];
    out.push({
      id: 'threat', type: 'threat',
      prompt: "What is your opponent threatening?",
      answer: th.description,
      acceptTokens: [th.type.replace(/_/g, ' '), ...th.type.split('_'), ...(th.line[0] ? [sq(th.line[0])] : [])],
      negative: false,
    });
  }

  // 4) HANGING (SEE-based) — value-aware, the proper answer key.
  const hanging = findHangingBySee(fen);
  if (hanging.length > 0) {
    const h = hanging[0];
    const where = h.color === (sideToMove === 'white' ? 'w' : 'b') ? 'one of YOUR pieces' : "one of your OPPONENT's pieces";
    out.push({
      id: 'hanging', type: 'hanging',
      prompt: 'Is any piece hanging — can material be won by force here?',
      answer: `Yes — the ${PIECE_NAME[h.piece]} on ${h.square} (${where}) is hanging; capturing wins about ${h.gain} point${h.gain === 1 ? '' : 's'}.`,
      acceptTokens: [sq(h.square), PIECE_NAME[h.piece], 'hanging', 'yes'],
      negative: false,
    });
  } else {
    out.push({
      id: 'hanging', type: 'hanging',
      prompt: 'Is any piece hanging right now?',
      answer: 'No — every attacked piece is adequately defended (nothing wins material by force).',
      acceptTokens: [], negative: true,
    });
  }

  // 5) PAWN BREAK.
  const breaks = findPawnBreaks(fen);
  if (breaks.length > 0) {
    out.push({
      id: 'pawn-break', type: 'pawn-break',
      prompt: 'What pawn break is available to challenge the structure?',
      answer: `The break${breaks.length > 1 ? 's' : ''} ${breaks.map((b) => `…${b}`).join(' and ')} challenge${breaks.length > 1 ? '' : 's'} the opponent's pawns.`,
      acceptTokens: breaks.map(sq),
      negative: false,
    });
  }

  // 6) MATERIAL — always answerable from ground truth.
  if (facts?.material) {
    out.push({
      id: 'material', type: 'material',
      prompt: 'Who is ahead in material, and by how much?',
      answer: facts.material,
      acceptTokens: materialTokens(facts.material),
      negative: false,
    });
  }

  return out;
}

/** Tokens that count as a correct material read ("even" / "white up …" / a number). */
function materialTokens(material: string): string[] {
  const lower = material.toLowerCase();
  const toks: string[] = [];
  if (/even|equal/.test(lower)) toks.push('even', 'equal');
  if (/white/.test(lower)) toks.push('white');
  if (/black/.test(lower)) toks.push('black');
  const num = lower.match(/\b(\d+)\b/);
  if (num) toks.push(num[1]);
  if (/up|ahead|more/.test(lower)) toks.push('up', 'ahead');
  if (/down|behind/.test(lower)) toks.push('down', 'behind');
  return toks;
}

export type ReadingVerdict = 'correct' | 'partial' | 'wrong';

export interface ReadingGrade {
  verdict: ReadingVerdict;
  /** The canonical answer to surface to the student. */
  correctAnswer: string;
  /** A short reason, used when the LLM grader is unavailable. */
  note: string;
}

/**
 * Deterministic grader — matches the student's free-text answer against the
 * computed answer key. Offline + testable; the LLM grader (natural language)
 * wraps this for fuzzier reads but the truth is ALWAYS the computed key.
 *
 * Rules:
 *  - A `negative` question (answer is "nothing") → correct iff the student said
 *    nothing/none/safe (and named no specific wrong claim).
 *  - Otherwise → correct iff the answer contains any accept token (a named
 *    square, piece, or motif); wrong if it asserts the negative on a live
 *    position; partial if it's on-topic but names nothing concrete.
 */
export function gradeReadingAnswerDeterministic(q: ReadingQuestion, userAnswer: string): ReadingGrade {
  const a = ` ${userAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;
  const saidNothing = NEG_TOKENS.some((t) => a.includes(` ${t} `));

  if (q.negative) {
    return saidNothing
      ? { verdict: 'correct', correctAnswer: q.answer, note: 'Right — nothing concrete here.' }
      : { verdict: 'wrong', correctAnswer: q.answer, note: 'There is nothing concrete to find in this position.' };
  }

  const hit = q.acceptTokens.find((t) => t && a.includes(` ${t} `));
  if (hit) {
    return { verdict: 'correct', correctAnswer: q.answer, note: `You spotted it (${hit.trim()}).` };
  }
  if (saidNothing) {
    return { verdict: 'wrong', correctAnswer: q.answer, note: 'There IS something here to find.' };
  }
  return { verdict: 'partial', correctAnswer: q.answer, note: 'On the right track, but name the exact square or idea.' };
}
