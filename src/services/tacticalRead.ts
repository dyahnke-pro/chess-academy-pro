/**
 * TACTICAL-READ ASSEMBLER — the fact package a Danya-voice narrator needs to
 * READ a tactical position, computed in code so the model only phrases it (G0).
 *
 * The static `detectTactics` scanner answers "what pattern is on the board RIGHT
 * NOW"; it cannot answer "what do I PLAY and what happens after" — a mate-in-3
 * reads as nothing there. The forcing line is `computePvLine`'s job. This module
 * ASSEMBLES the two into one read: the engine's best line (checks / captures /
 * tactic-landed / material / mate per ply), a spoken VERDICT, the DECISIVE
 * tactic named down to its pieces (merged from the static scanner on the ply the
 * line reaches it), and — closing the biggest Danya gap — the TEMPTING-BUT-WRONG
 * move a student would reach for, with its refutation, so the affirm→but→refute
 * rhythm can be generated without the model inventing anything.
 *
 * Every fact is the engine's or chess.js's; nothing here decides chess. The
 * PURE assemblers (verdict, key-tactic pick, tempting pick) are exported and
 * unit-tested with hand-fed data — the engine wiring is a thin shell over them.
 */
import { Chess } from 'chess.js';
import { computePvLine, type PvEngine, type PvLine, type PvPly } from './pvPlayback';
import { detectTactics } from './tacticsDetector';
import type { TacticPattern } from '../types/tacticTypes';

export type VerdictKind = 'mate' | 'winning' | 'edge' | 'equal';

export interface ReadVerdict {
  kind: VerdictKind;
  /** Plies to mate for the side to move, positive; null when not mate. */
  mateIn: number | null;
  /** Eval in centipawns from the STUDENT's (side-to-move's) perspective. */
  studentCp: number;
  /** Spoken form: "a forced mate in three", "wins a piece", "a clear edge". */
  text: string;
}

export interface KeyTactic {
  type: string;
  squares: string[];
  /** Named down to the pieces: "knight on e3 forks the rook on d1 and the bishop on c2". */
  description: string;
  /** Index into `line` where the tactic lands. */
  atPly: number;
}

export interface TemptingMove {
  san: string;
  uci: string;
  /** Why the eye is drawn to it: 'capture' | 'check' | 'central-develop' | 'promotion' | 'recapture'. */
  appeal: string;
  /** How much worse than best, centipawns (student POV, always > 0). */
  evalDropCp: number;
  /** The engine's refutation after the tempting move is played. */
  refutation: PvPly[];
}

export interface TacticalRead {
  fen: string;
  studentColor: 'white' | 'black';
  bestMoveSan: string;
  bestMoveUci: string;
  line: PvPly[];
  verdict: ReadVerdict;
  keyTactic: KeyTactic | null;
  /** Ply indices in `line` that give check. */
  checkPlies: number[];
  /** The seductive-but-wrong move + refutation. Null when no clearly-inferior
   *  natural move exists (nothing to warn against). */
  tempting: TemptingMove | null;
  /** Uncertainty signal: a runner-up within 40cp — "genuinely hard to decide". */
  closeAlternative: { san: string; gapCp: number } | null;
}

// ── PURE ASSEMBLERS (unit-tested directly) ──────────────────────────────────

/** WHITE-POV cp → the student's POV. */
export function toStudentCp(whiteCp: number, studentColor: 'white' | 'black'): number {
  return studentColor === 'white' ? whiteCp : -whiteCp;
}

/** Spoken verdict from the line. `mateForStudent` > 0 means the student mates. */
export function summarizeVerdict(
  studentCp: number,
  mateForStudent: number | null,
): ReadVerdict {
  if (mateForStudent != null && mateForStudent > 0) {
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    const n = mateForStudent <= 8 ? words[mateForStudent] : String(mateForStudent);
    return { kind: 'mate', mateIn: mateForStudent, studentCp, text: `a forced mate in ${n}` };
  }
  const a = Math.abs(studentCp);
  // Material framing when the swing is a clean piece/exchange or more.
  if (studentCp >= 500) return { kind: 'winning', mateIn: null, studentCp, text: 'a winning material advantage' };
  if (studentCp >= 280) return { kind: 'winning', mateIn: null, studentCp, text: 'a decisive edge — up a piece' };
  if (studentCp >= 150) return { kind: 'winning', mateIn: null, studentCp, text: 'clearly better — up the exchange or a pawn with pressure' };
  if (studentCp >= 60) return { kind: 'edge', mateIn: null, studentCp, text: 'a pleasant edge' };
  if (a < 60) return { kind: 'equal', mateIn: null, studentCp, text: 'roughly balanced' };
  if (studentCp <= -280) return { kind: 'equal', mateIn: null, studentCp, text: 'lost — there is no read to give here' };
  return { kind: 'edge', mateIn: null, studentCp, text: 'slightly worse' };
}

/** The decisive tactic in the line: the first ply whose move LANDS a tactic,
 *  named down to its pieces via the static scanner on that resulting board. */
export function pickKeyTactic(line: PvPly[]): KeyTactic | null {
  for (let i = 0; i < line.length; i += 1) {
    const t = line[i].facts.tacticLanded;
    if (!t) continue;
    const scan = detectTactics(line[i].fenAfter);
    // Prefer the scanner pattern of the same type that names the pieces.
    const named: TacticPattern | undefined =
      scan.tactics.find((p) => p.type === t) ?? (scan.tactics.length > 0 ? scan.tactics[0] : undefined);
    return {
      type: t,
      squares: named ? named.involvedSquares : [],
      description: named ? named.description : `${t} on ${line[i].san}`,
      atPly: i,
    };
  }
  return null;
}

/** Rank a candidate move's "human appeal" — what a club player's eye is drawn to.
 *  Higher = more tempting. Pure heuristic over chess.js move flags. */
export function appealScore(mv: {
  isCapture: boolean; isPromotion: boolean; san: string; piece: string; to: string;
}): { score: number; appeal: string } {
  let score = 0; let appeal = 'natural';
  if (mv.san.includes('#')) return { score: 100, appeal: 'mate' };
  if (mv.isCapture) { score += 5; appeal = 'capture'; }
  if (mv.san.includes('+')) { score += 4; appeal = mv.isCapture ? 'capture' : 'check'; }
  if (mv.isPromotion) { score += 6; appeal = 'promotion'; }
  // central knight/bishop development is visually "the natural move"
  if ((mv.piece === 'n' || mv.piece === 'b') && /^[cdef][3456]$/.test(mv.to)) { score += 2; if (appeal === 'natural') appeal = 'central-develop'; }
  return { score, appeal };
}

/** From scored candidates, the seductive-but-wrong one: the highest-appeal move
 *  that is clearly inferior to best (≥ `dropThresholdCp` worse, student POV). */
export function pickTempting(
  candidates: Array<{ san: string; uci: string; appeal: string; appealScore: number; studentCp: number }>,
  bestStudentCp: number,
  dropThresholdCp = 120,
): { san: string; uci: string; appeal: string; evalDropCp: number } | null {
  const inferior = candidates
    .filter((c) => bestStudentCp - c.studentCp >= dropThresholdCp)
    .sort((a, b) => b.appealScore - a.appealScore || (bestStudentCp - a.studentCp) - (bestStudentCp - b.studentCp));
  const top = inferior.length > 0 ? inferior[0] : undefined;
  if (!top || top.appealScore <= 0) return null;
  return { san: top.san, uci: top.uci, appeal: top.appeal, evalDropCp: Math.round(bestStudentCp - top.studentCp) };
}

/** Review/Learn enrichment: name the decisive tactic in an already-computed line
 *  down to its PIECES — "The point — knight on e3 forks the rook on d1 and the
 *  bishop on c2." `render`/`plyFactsClause` only say "lands a fork"; this names
 *  WHAT it forks. Null when the line lands no named tactic. Pure — reuses the
 *  caller's line, no extra engine time. */
export function namedTacticClause(plies: PvPly[]): string | null {
  const kt = pickKeyTactic(plies);
  if (!kt || kt.squares.length === 0) return null;
  const desc = kt.description.length > 0
    ? kt.description[0].toLowerCase() + kt.description.slice(1)
    : kt.type;
  return `The point — ${desc}.`;
}

// ── ENGINE-WIRED ASSEMBLER ──────────────────────────────────────────────────

/** Mate-plies for the student, if the line ends in mate they deliver. */
function studentMateIn(line: PvPly[], studentColor: 'white' | 'black'): number | null {
  const idx = line.findIndex((p) => p.facts.isMate);
  if (idx < 0) return null;
  const mover = line[idx].moverColor;
  if (mover !== studentColor) return null; // the student is being mated — not our read
  // plies from the student's side to deliver = number of student moves up to & incl. mate
  return line.slice(0, idx + 1).filter((p) => p.moverColor === studentColor).length;
}

export async function computeTacticalRead(
  fen: string,
  opts: { engine?: PvEngine; depth?: number; findTempting?: boolean } = {},
): Promise<TacticalRead | null> {
  const depth = opts.depth ?? 16;
  const pv: PvLine | null = await computePvLine(fen, { engine: opts.engine, maxPlies: 8, depth });
  if (!pv || pv.plies.length === 0) return null;
  const board = new Chess(fen);
  const studentColor: 'white' | 'black' = board.turn() === 'w' ? 'white' : 'black';

  const first = pv.plies[0];
  const bestStudentCp = toStudentCp(pv.rootEvalCp, studentColor);
  const mateIn = studentMateIn(pv.plies, studentColor);
  const verdict = summarizeVerdict(bestStudentCp, mateIn);
  const keyTactic = pickKeyTactic(pv.plies);
  const checkPlies = pv.plies.map((p, i) => (p.facts.isCheck ? i : -1)).filter((i) => i >= 0);

  let tempting: TemptingMove | null = null;
  if (opts.findTempting !== false && opts.engine) {
    const legal = board.moves({ verbose: true });
    const scored: Array<{ san: string; uci: string; appeal: string; appealScore: number; studentCp: number }> = [];
    for (const mv of legal) {
      const { score, appeal } = appealScore({ isCapture: mv.captured != null, isPromotion: mv.promotion != null, san: mv.san, piece: mv.piece, to: mv.to });
      if (score <= 0) continue; // only genuinely eye-catching moves are "tempting"
      const uci = mv.from + mv.to + (mv.promotion ?? '');
      if (uci === first.uci) continue; // the best move is never the tempting-wrong one
      const child = new Chess(fen);
      child.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
      const a = await opts.engine.analyzePosition(child.fen(), Math.max(10, depth - 4));
      // eval is now from the OPPONENT's POV (they're to move) → student POV = -that
      const studentCp = -toStudentCp(a.evaluation, studentColor === 'white' ? 'black' : 'white');
      scored.push({ san: mv.san, uci, appeal, appealScore: score, studentCp });
    }
    const pick = pickTempting(scored, bestStudentCp);
    if (pick) {
      const refPv = await computePvLine(fen, { engine: opts.engine, firstUci: pick.uci, maxPlies: 6, depth });
      tempting = { san: pick.san, uci: pick.uci, appeal: pick.appeal, evalDropCp: pick.evalDropCp, refutation: refPv?.plies ?? [] };
    }
  }

  return {
    fen,
    studentColor,
    bestMoveSan: first.san,
    bestMoveUci: first.uci,
    line: pv.plies,
    verdict,
    keyTactic,
    checkPlies,
    tempting,
    closeAlternative: pv.closeAlternative,
  };
}
