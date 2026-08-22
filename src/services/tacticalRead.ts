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
import { computePvLine, computePlyFacts, type PvEngine, type PvLine, type PvPly } from './pvPlayback';
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
    // A mate_threat is a THREAT, not a forced mate — the engine's verdict, not
    // the static scanner, decides whether mate is actually available. "has a
    // checkmate available" overstates a threat the opponent can parry (giving
    // up material). Downgrade the wording so the read never claims a mate it
    // cannot force. (David 2026-08-21 false-claim audit.)
    const rawDesc = named ? named.description : `${t} on ${line[i].san}`;
    const description = t === 'mate_threat'
      ? rawDesc.replace(/\bhas a checkmate available from\b/i, 'threatens mate from')
      : rawDesc;
    return {
      type: t,
      squares: named ? named.involvedSquares : [],
      description,
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
  opts: { engine?: PvEngine; depth?: number; findTempting?: boolean; maxTemptingProbe?: number } = {},
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
    // Rank eye-catching legal moves by appeal FIRST, then engine-eval only the
    // top few — the tempting move is always a high-appeal one, so evaluating
    // every capture on the board is wasted engine time on a runtime surface.
    const maxProbe = opts.maxTemptingProbe ?? 6;
    const candidates = board.moves({ verbose: true })
      .map((mv) => {
        const { score, appeal } = appealScore({ isCapture: mv.captured != null, isPromotion: mv.promotion != null, san: mv.san, piece: mv.piece, to: mv.to });
        return { mv, score, appeal, uci: mv.from + mv.to + (mv.promotion ?? '') };
      })
      .filter((c) => c.score > 0 && c.uci !== first.uci)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxProbe);
    const scored: Array<{ san: string; uci: string; appeal: string; appealScore: number; studentCp: number }> = [];
    for (const c of candidates) {
      const child = new Chess(fen);
      child.move({ from: c.mv.from, to: c.mv.to, promotion: c.mv.promotion });
      const a = await opts.engine.analyzePosition(child.fen(), Math.max(10, depth - 4));
      // eval is now from the OPPONENT's POV (they're to move) → student POV = -that
      const studentCp = -toStudentCp(a.evaluation, studentColor === 'white' ? 'black' : 'white');
      scored.push({ san: c.mv.san, uci: c.uci, appeal: c.appeal, appealScore: c.score, studentCp });
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

/** Piece values for the recapture carry — mirrors pvPlayback's PIECE_POINTS. */
const READ_PT: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Replay a known UCI move list from `fen` into PvPly[] with the SAME per-ply
 *  facts the engine path computes — no engine needed, because the moves are
 *  already in hand. The pure twin of computePvLine's ply loop. */
function replayUci(fen: string, uciMoves: readonly string[]): PvPly[] {
  const chess = new Chess(fen);
  const plies: PvPly[] = [];
  let prevCap: { square: string | null; capturedValue: number } = { square: null, capturedValue: 0 };
  for (const uci of uciMoves) {
    if (!uci || uci.length < 4) break;
    const fenBefore = chess.fen();
    let mv: ReturnType<Chess['move']> | undefined;
    try {
      mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined });
    } catch { break; }
    if (!mv) break;
    const fenAfter = chess.fen();
    plies.push({
      san: mv.san,
      uci,
      moverColor: mv.color === 'w' ? 'white' : 'black',
      fenBefore,
      fenAfter,
      facts: computePlyFacts(fenBefore, fenAfter, mv, prevCap),
    });
    prevCap = { square: mv.to, capturedValue: mv.captured ? (READ_PT[mv.captured] ?? 0) : 0 };
  }
  return plies;
}

/**
 * THE LATENCY-SAFE TACTICAL READ — the full read (forcing line, named tactic,
 * verdict, but-turn, uncertainty) assembled from MultiPV lines the caller ALREADY
 * has, with NO engine search. This is the seam that lets any surface holding a
 * cached analysis (free-play, read-position, the best-move answer) speak the SAME
 * read as the tactics post-solve path — one position-read engine, surface-tuned
 * by `opts`. Mirrors `computeTacticalRead`'s assembly exactly; only the source of
 * the lines differs. Returns null when there is nothing to read.
 */
export function tacticalReadFromLines(
  fen: string,
  topLines: ReadonlyArray<{ moves: string[]; evaluation: number }>,
  studentColor: 'white' | 'black',
  opts: { dropThresholdCp?: number; requireForcing?: boolean; maxPlies?: number } = {},
): TacticalRead | null {
  const best = topLines.length > 0 ? topLines[0] : undefined;
  if (!best || !best.moves || best.moves.length === 0) return null;
  const plies = replayUci(fen, best.moves.slice(0, opts.maxPlies ?? 8));
  if (plies.length === 0) return null;
  const first = plies[0];
  const rootEvalCp = best.evaluation; // WHITE POV, like computePvLine.rootEvalCp
  const bestStudentCp = toStudentCp(rootEvalCp, studentColor);
  const mateIn = studentMateIn(plies, studentColor);
  const verdict = summarizeVerdict(bestStudentCp, mateIn);
  const keyTactic = pickKeyTactic(plies);
  const checkPlies = plies.map((p, i) => (p.facts.isCheck ? i : -1)).filter((i) => i >= 0);

  // Uncertainty: runner-up within 40cp, its SAN resolved on THIS board.
  let closeAlternative: { san: string; gapCp: number } | null = null;
  if (topLines.length > 1) {
    const runner = topLines[1];
    const gap = bestStudentCp - toStudentCp(runner.evaluation, studentColor);
    const rUci = runner?.moves?.[0];
    if (rUci && rUci.length >= 4 && rUci !== first.uci && gap >= 0 && gap <= 40) {
      const rp = replayUci(fen, [rUci]);
      if (rp.length) closeAlternative = { san: rp[0].san, gapCp: gap };
    }
  }

  let tempting: TemptingMove | null = null;
  const t = temptingFromAnalysis(fen, topLines, studentColor, {
    dropThresholdCp: opts.dropThresholdCp,
    requireForcing: opts.requireForcing,
  });
  if (t) {
    const refLine = topLines.find((l) => l.moves?.[0] === t.uci);
    const refutation = refLine ? replayUci(fen, refLine.moves.slice(0, 4)) : [];
    tempting = { san: t.san, uci: t.uci, appeal: t.appeal, evalDropCp: t.evalDropCp, refutation };
  }

  return {
    fen,
    studentColor,
    bestMoveSan: first.san,
    bestMoveUci: first.uci,
    line: plies,
    verdict,
    keyTactic,
    checkPlies,
    tempting,
    closeAlternative,
  };
}

// ── THE COMPUTED VOICE ───────────────────────────────────────────────────────

const APPEAL_AFFIRM: Record<string, string> = {
  capture: 'grab it',
  check: 'give the check',
  promotion: 'push it and queen',
  'central-develop': 'develop right into the middle',
  recapture: 'take it back',
  natural: 'play the natural move',
};

/** SAN spelled for the voice: "Nd5" → "knight to d5", "Nxe3" → "knight takes e3",
 *  "O-O" → "castle". Deterministic; the read's moves are the engine's. */
function sayMove(san: string): string {
  const clean = san.replace(/[+#]/g, '');
  if (clean === 'O-O') return 'castle short';
  if (clean === 'O-O-O') return 'castle long';
  const P: Record<string, string> = { N: 'the knight', B: 'the bishop', R: 'the rook', Q: 'the queen', K: 'the king' };
  const m = clean.match(/^([NBRQK])?([a-h]?[1-8]?)?(x)?([a-h][1-8])(=([NBRQ]))?$/);
  if (!m) return clean;
  const piece = m[1] ? P[m[1]] : 'the pawn';
  const takes = m[3] ? ' takes ' : ' to ';
  const dest = m[4];
  const promo = m[6] ? `, promoting to ${({ N: 'a knight', B: 'a bishop', R: 'a rook', Q: 'a queen' } as Record<string, string>)[m[6]]}` : '';
  return `${piece}${takes}${dest}${promo}`;
}

/**
 * THE COMPUTED VOICE — turn a TacticalRead fact package into a coach line in the
 * Danya register, composed ENTIRELY from the computed facts (G0: nothing here
 * decides chess, it only phrases what the engine + chess.js already found).
 *
 * Shape mirrors his measured rhythm: the affirm→BUT→refute turn on the tempting
 * move (his #1 device), then the real move and the line to the tactic, the named
 * point, and the verdict last. `spoken` spells moves for TTS; the caller picks.
 */
export function narrateTacticalRead(read: TacticalRead, opts: { spoken?: boolean } = {}): string {
  const say = (san: string): string => (opts.spoken ? sayMove(san) : san);
  const parts: string[] = [];

  // BUT-TURN — affirm the seductive move, then refute it with the computed line.
  if (read.tempting) {
    const affirm = APPEAL_AFFIRM[read.tempting.appeal] ?? 'play it';
    const ref = read.tempting.refutation;
    const reply = ref.length > 1 ? ref[1] : (ref.length > 0 ? ref[0] : undefined);
    const refutation = reply ? ` — but ${say(reply.san)} and it falls apart` : ' — but it doesn’t hold';
    parts.push(`You’d love to ${affirm} with ${say(read.tempting.san)}${refutation}.`);
  }

  // THE MOVE + the forcing line to the tactic.
  const toTactic = read.keyTactic ? read.keyTactic.atPly : Math.min(read.line.length - 1, 2);
  const lineSans = read.line.slice(0, toTactic + 1).map((p) => say(p.san));
  if (lineSans.length > 0) {
    parts.push(read.tempting
      ? `Instead, ${lineSans.join(', ')}.`
      : `The move is ${lineSans.join(', ')}.`);
  }

  // NAME the point (from the static scanner, pieces and all).
  const clause = namedTacticClause(read.line);
  if (clause) parts.push(clause);

  // VERDICT last — the payoff.
  parts.push(read.verdict.kind === 'mate'
    ? `And that’s ${read.verdict.text}.`
    : `You come out with ${read.verdict.text}.`);

  return parts.join(' ');
}

// ── LATENCY-SAFE TEMPTING (no extra engine read) ─────────────────────────────

/** The seductive-but-wrong move derived from an ALREADY-COMPUTED MultiPV
 *  analysis — for latency-sensitive surfaces (tap-time "Read this position")
 *  that must not spend a fresh engine sweep. Weaker than `computeTacticalRead`'s
 *  probe: it can only see moves the engine already ranked in its top lines, so a
 *  blunder outside the MultiPV is invisible here. Returns null when no top line
 *  below best is both eye-catching and clearly worse. `replySan` is the engine's
 *  own refutation reply from that same PV line. */
export function temptingFromAnalysis(
  fen: string,
  topLines: ReadonlyArray<{ moves: string[]; evaluation: number }>,
  studentColor: 'white' | 'black',
  opts: { dropThresholdCp?: number; requireForcing?: boolean } = {},
): { san: string; uci: string; appeal: string; evalDropCp: number; replySan: string | null } | null {
  if (topLines.length < 2) return null;
  const dropThresholdCp = opts.dropThresholdCp ?? 120;
  const best = topLines.length > 0 ? topLines[0] : undefined;
  if (!best || best.moves.length === 0) return null;
  const bestUci = best.moves.at(0);
  const bestStudentCp = toStudentCp(best.evaluation, studentColor);
  const scored: Array<{ san: string; uci: string; appeal: string; appealScore: number; studentCp: number; replySan: string | null }> = [];
  for (let i = 1; i < topLines.length; i += 1) {
    const line = topLines.at(i);
    if (!line) continue;
    const uci = line.moves.at(0);
    if (!uci || uci.length < 4 || uci === bestUci) continue;
    const probe = new Chess(fen);
    let mv: ReturnType<Chess['move']> | undefined;
    try {
      mv = probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined });
    } catch { continue; }
    // requireForcing: only a capture or a check may be flagged tempting — the
    // conservative free-play contract (matches the retired buildRejectedTempting).
    if (opts.requireForcing && !(mv.captured != null || probe.inCheck())) continue;
    const { score, appeal } = appealScore({ isCapture: mv.captured != null, isPromotion: mv.promotion != null, san: mv.san, piece: mv.piece, to: mv.to });
    if (score <= 0) continue;
    let replySan: string | null = null;
    const replyUci = line.moves.at(1);
    if (replyUci && replyUci.length >= 4) {
      try {
        const r = probe.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci.length > 4 ? replyUci.slice(4) : undefined });
        replySan = r.san;
      } catch { replySan = null; }
    }
    scored.push({ san: mv.san, uci, appeal, appealScore: score, studentCp: toStudentCp(line.evaluation, studentColor), replySan });
  }
  const pick = pickTempting(scored, bestStudentCp, dropThresholdCp);
  if (!pick) return null;
  const chosen = scored.find((c) => c.uci === pick.uci);
  return { san: pick.san, uci: pick.uci, appeal: pick.appeal, evalDropCp: pick.evalDropCp, replySan: chosen?.replySan ?? null };
}

/** The affirm→but→refute sentence for a tempting move, in the Danya register. */
export function speakTemptingTurn(
  t: { san: string; appeal: string; replySan: string | null },
  opts: { spoken?: boolean } = {},
): string {
  const say = (san: string): string => (opts.spoken ? sayMove(san) : san);
  const affirm = APPEAL_AFFIRM[t.appeal] ?? 'play it';
  const refutation = t.replySan ? ` — but ${say(t.replySan)} and it falls apart` : ' — but it doesn’t hold';
  return `You’d love to ${affirm} with ${say(t.san)}${refutation}.`;
}

// ── THE FACT PACKAGE FOR THE VOICE MODEL ─────────────────────────────────────

/**
 * The tactical read as a labeled FACTS string for `voiceFacts` to phrase in the
 * Danya register — NOT finished prose. This is the correct G0 seam: code states
 * the board-true facts, the phrasing model gives them his voice (varied every
 * time). `narrateTacticalRead` above is the deterministic FALLBACK floor only,
 * for when no phrasing model is available; it is never the final voice on a
 * surface that has the model.
 */
export function tacticalReadFacts(read: TacticalRead, opts: { inGame?: boolean } = {}): string {
  // `inGame` phrases the facts in the LIVE, second-person, present-tense register
  // (the two-registers rule): "you'd love to play X, but…" / "you end up with…".
  // Third person ("the student…") is the post-solve/review register and must
  // never reach a live free-play surface — on a voiceFacts fallback the facts are
  // spoken verbatim, and David has heard "the student played f4" read at him.
  const ig = opts.inGame === true;
  const parts: string[] = [];
  if (read.tempting) {
    const reply = read.tempting.refutation.length > 1
      ? read.tempting.refutation[1]
      : (read.tempting.refutation.length > 0 ? read.tempting.refutation[0] : undefined);
    if (ig) {
      parts.push(reply
        ? `You'd love to play ${read.tempting.san} here (${read.tempting.appeal}), but it runs into ${reply.san}.`
        : `You'd love to play ${read.tempting.san} here (${read.tempting.appeal}), but it doesn't hold.`);
    } else {
      parts.push(reply
        ? `The move the student is tempted to play is ${read.tempting.san} (${read.tempting.appeal}), but it fails to ${reply.san}.`
        : `The move the student is tempted to play is ${read.tempting.san} (${read.tempting.appeal}), but it does not hold.`);
    }
  }
  const toTactic = read.keyTactic ? read.keyTactic.atPly : Math.min(read.line.length - 1, 2);
  const lineSans = read.line.slice(0, toTactic + 1).map((p) => p.san);
  if (lineSans.length > 0) parts.push(`${ig ? 'The line goes' : 'The correct line is'} ${lineSans.join(' ')}.`);
  const kt = read.keyTactic;
  if (kt && kt.squares.length > 0) {
    parts.push(kt.description.endsWith('.') ? kt.description : `${kt.description}.`);
  }
  if (read.verdict.kind === 'mate') {
    // Name the mating MOVE (the fact), so the model never guesses a mate PATTERN
    // ("back-rank mate", "smothered mate") the board does not support.
    const mateMove = read.line.find((p) => p.facts.isMate);
    parts.push(mateMove
      ? `The line ends in ${read.verdict.text}, delivered by ${mateMove.san}.`
      : `The result is ${read.verdict.text}.`);
  } else {
    parts.push(`${ig ? 'You end up with' : 'The student ends up with'} ${read.verdict.text}.`);
  }
  return parts.join(' ');
}

/** Model-only directives for voicing a tactical read — shape, not script. Never
 *  spoken; passed to voiceFacts.directives so the phrasing stays varied. */
export const TACTICAL_READ_DIRECTIVES =
  'Read this like a coach talking a student through the position out loud. If a '
  + 'tempting move is given, affirm the pull of it first, then turn against it with '
  + 'the refutation ("you’d love to … but …"). Then give the real move and '
  + 'why, and land the verdict last. Vary your phrasing move to move — never a '
  + 'fixed template. Spell moves as words, no notation. Warm but rigorous; no '
  + 'praise words, no filler. STRICT GROUNDING: state ONLY facts given above — '
  + 'do NOT name a tactic or mate pattern (e.g. "back-rank mate", "smothered '
  + 'mate", "fork") unless it appears in the facts, and do NOT assert where any '
  + 'piece sits unless its square is given. When unsure, describe the move’s '
  + 'effect, not a named pattern. The best/correct move given in the facts is '
  + 'engine-verified and IS the answer — voice it as correct; NEVER suggest '
  + 'avoiding it, call it an illusion or a mistake, or propose a different plan '
  + 'instead. Only the TEMPTING move is the one to turn against.';

/** True when the voiced text argues AGAINST the engine's best move — the model
 *  second-guessing the grounded recommendation (e.g. "avoid Be2", "the fork is
 *  an illusion"). The board grader catches false SQUARES, not a rejected
 *  RECOMMENDATION; this does. Callers fall back to the deterministic template
 *  when it trips. */
export function voiceRejectsBestMove(text: string, bestMoveSan: string | null): boolean {
  if (!bestMoveSan) return false;
  const t = text.toLowerCase();
  const san = bestMoveSan.replace(/[+#]/g, '').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // "avoid / don't play / steer clear of <best>" — a direct steer away from it.
  if (new RegExp(`\\b(avoid|don.?t play|do not play|steer clear of|resist|skip)\\b[^.]*\\b${san}\\b`).test(t)) return true;
  // "<best> is an illusion / a mistake / wrong / dubious …"
  if (new RegExp(`\\b${san}\\b[^.]*\\b(is|would be|seems|looks)\\b[^.]*\\b(an? )?(illusion|mistake|blunder|wrong|bad|dubious|premature|trap)\\b`).test(t)) return true;
  // generic "the tactic is an illusion / doesn't work … instead / solidify".
  if (/\b(illusion|does not work|doesn.?t work|falls short|not the answer)\b/.test(t)
      && /\b(instead|stronger idea|better idea|solidify)\b/.test(t)) return true;
  return false;
}

/** Review-register OUTCOME clause: where a projected line LANDS, from the
 *  student's seat — the verdict `render()` never states (it narrates the moves,
 *  not the result). "…and that leaves you a full piece up." Retrospective voice.
 *  Null on a roughly-level or unclear terminus (nothing decisive to claim). */
export function lineOutcomeClause(rootEvalCpWhite: number, studentColor: 'white' | 'black'): string | null {
  const studentCp = toStudentCp(rootEvalCpWhite, studentColor);
  const v = summarizeVerdict(studentCp, null);
  if (v.kind === 'equal' || v.kind === 'edge') return null; // no decisive outcome to name
  // v.text reads "a decisive edge — up a piece" / "a winning material advantage".
  const with_ = v.text.startsWith('a ') ? `with ${v.text}` : v.text;
  return `And that leaves you ${with_}.`;
}

/** The squares a read's moves actually visit — "piece:dest" keys for the line,
 *  the tempting move, and its refutation. The allowed vocabulary of MOVES a
 *  voiced read may name. */
export function groundedMoveKeys(read: TacticalRead): Set<string> {
  const keys = new Set<string>();
  const PW: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king', p: 'pawn' };
  const add = (uci: string, san: string): void => {
    if (!uci || uci.length < 4) return;
    const dest = uci.slice(2, 4);
    // piece letter from SAN (uppercase) or 'pawn'
    const pl = /^[NBRQK]/.test(san) ? san[0].toLowerCase() : 'p';
    keys.add(`${PW[pl]}:${dest}`);
    keys.add(`castle:${dest}`); // O-O/O-O-O tolerance
  };
  for (const p of read.line) add(p.uci, p.san);
  if (read.tempting) {
    add(read.tempting.uci, read.tempting.san);
    for (const p of read.tempting.refutation) add(p.uci, p.san);
  }
  return keys;
}

const MOVE_VERB = '(?:takes on|captures on|recaptures on|takes|captures|recaptures|goes to|lands on|jumps to|swings to|drops to|retreats to|lifts to|slides to|delivers|to)';
const PIECE_WORD = '(knight|bishop|rook|queen|king|pawn)';

/** True when the voiced text NAMES A MOVE the computed read does not contain —
 *  a fabricated continuation or a mis-transcribed move. The board grader checks
 *  piece-on-SQUARE claims; this checks the MOVES narrated. Callers fall back to
 *  the deterministic template (built only from the real line) when it trips. */
export function voiceNamesUngroundedMove(text: string, read: TacticalRead): boolean {
  const allowed = groundedMoveKeys(read);
  const re = new RegExp(`${PIECE_WORD}\\s+${MOVE_VERB}\\s+([a-h][1-8])`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text.toLowerCase())) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (!allowed.has(key)) return true; // a move the real line never makes
  }
  return false;
}
