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
import { evalBand } from './evalBand';
import { openSentence, continueSentence } from '../utils/openSentence';
import { settledLineEnd } from './material';
import { boardEdgeWords } from '../utils/countWords';
import { rotateStem } from '../utils/rotateStem';
import { Chess } from 'chess.js';
import { computePlyFacts, afterCapture, NO_PREV_CAPTURE, type PvPly, type PrevCaptureContext } from './pvPlayback';
import { detectTactics } from './tacticsDetector';
import { sayMoveClause, sayMoveNoun } from './spokenMove';
import type { TacticPattern } from '../types/tacticTypes';

type VerdictKind = 'mate' | 'winning' | 'edge' | 'equal';

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

/** Board-true material descriptor for a verdict, or null. A piece is named
 *  only from the pieces on the line's end board (G3): a +2.8 positional edge
 *  with even material says nothing, the exchange and a pawn is not "a piece". */
function materialLabel(m: MaterialAtEnd | null | undefined): string | null {
  if (m == null || m.pawns < 1) return null;
  return `up ${boardEdgeWords(m.fen, m.side, m.pawns)}`;
}

/** Spoken verdict from the line. `mateForStudent` > 0 means the student mates.
 *  `material` (student POV, + = student ahead) is the material the line's
 *  TERMINAL position actually shows — it is the
 *  ONLY thing that licenses a material claim. When it is null/undefined (no line
 *  in hand, e.g. an eval-only caller) the verdict frames by eval MAGNITUDE and
 *  never invents material (G3: `voiceFacts` can only subtract, so a false "up a
 *  piece" here would be spoken uncorrected). */
export function summarizeVerdict(
  studentCp: number,
  mateForStudent: number | null,
  material?: MaterialAtEnd | null,
): ReadVerdict {
  const materialDeltaPawns = material?.pawns ?? null;
  if (mateForStudent != null && mateForStudent > 0) {
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    const n = mateForStudent <= 8 ? words[mateForStudent] : String(mateForStudent);
    return { kind: 'mate', mateIn: mateForStudent, studentCp, text: `a forced mate in ${n}` };
  }
  const mat = materialLabel(material);
  // The one ladder (evalBand, census 2026-10-10). This kept its own
  // 60/150/280/500 steps and called anything down to −2.8 "slightly worse".
  const band = evalBand(studentCp);
  if (band === 'level') return { kind: 'equal', mateIn: null, studentCp, text: 'roughly balanced' };
  if (studentCp < 0) {
    if (band === 'decisive') return { kind: 'equal', mateIn: null, studentCp, text: 'lost — there is no read to give here' };
    return { kind: 'edge', mateIn: null, studentCp, text: band === 'clearly' ? 'clearly worse' : 'slightly worse' };
  }
  if (band === 'slightly') return { kind: 'edge', mateIn: null, studentCp, text: 'a pleasant edge' };
  if (band === 'clearly') return { kind: 'winning', mateIn: null, studentCp, text: mat ? `clearly better — ${mat}` : 'clearly better' };
  // Winning: material framing ONLY when the board backs the count.
  if (materialDeltaPawns != null && materialDeltaPawns >= 5) {
    return { kind: 'winning', mateIn: null, studentCp, text: 'a winning material advantage' };
  }
  return { kind: 'winning', mateIn: null, studentCp, text: mat ? `winning — ${mat}` : 'a winning advantage' };
}

/** The student's settled material at a line's end (points, + = ahead), with
 *  the board that names it — the board-fact that licenses a material claim in
 *  the verdict. Null when no ply carries a resolvable fenAfter. */
interface MaterialAtEnd { pawns: number; fen: string; side: 'w' | 'b' }

function terminalMaterialDelta(line: PvPly[], studentColor: 'white' | 'black'): MaterialAtEnd | null {
  // SETTLED (WO-MATERIAL-01): a line cut mid-recapture is not a material win.
  const plies = line.filter((p) => p.fenAfter && p.fenAfter.length > 0);
  const whitePov = settledLineEnd(plies);
  if (whitePov === null) return null;
  return {
    pawns: studentColor === 'white' ? whitePov : -whitePov,
    fen: plies[plies.length - 1].fenAfter,
    side: studentColor === 'white' ? 'w' : 'b',
  };
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
      ? rawDesc.replace(/\bhas mate in one with\b/i, 'threatens mate with')
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
  /** Where the piece stands now — "develop" is said only when it leaves home
   *  (walk 2065, 12…h6: "develop right into the middle with Bc4" about a
   *  bishop that had moved four times). */
  from: string;
}): { score: number; appeal: string } {
  let score = 0; let appeal = 'natural';
  if (mv.san.includes('#')) return { score: 100, appeal: 'mate' };
  if (mv.isCapture) { score += 5; appeal = 'capture'; }
  if (mv.san.includes('+')) { score += 4; appeal = mv.isCapture ? 'capture' : 'check'; }
  if (mv.isPromotion) { score += 6; appeal = 'promotion'; }
  // central knight/bishop development is visually "the natural move"
  if ((mv.piece === 'n' || mv.piece === 'b') && /^[cdef][3456]$/.test(mv.to)) {
    score += 2;
    if (appeal === 'natural' && /^[bcfg][18]$/.test(mv.from)) appeal = 'central-develop';
  }
  return { score, appeal };
}

/** How eye-catching the engine's BEST move is. A tempting move has to pull the
 *  eye AWAY from it, so it must out-appeal it: with a free recapture on the
 *  board the natural move IS the recapture, and "you'd love to play the knight
 *  to e4" beside it (question walk 2026-09-27, 13.Nxe5 and 27.Rxc5) described
 *  a temptation no student feels. */
function bestMoveAppeal(fen: string, bestUci: string | undefined): number {
  if (!bestUci || bestUci.length < 4) return 0;
  try {
    const mv = new Chess(fen).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci.length > 4 ? bestUci.slice(4) : undefined });
    return appealScore({ isCapture: mv.captured != null, isPromotion: mv.promotion != null, san: mv.san, piece: mv.piece, to: mv.to, from: mv.from }).score;
  } catch { return 0; }
}

/** From scored candidates, the seductive-but-wrong one: the highest-appeal move
 *  that is clearly inferior to best (≥ `dropThresholdCp` worse, student POV). */
/** A tempting move that still leaves the student this far ahead has not
 *  fallen apart, however much better the engine's best move was. */
const STILL_WINNING_CP = 200;

export function pickTempting(
  candidates: Array<{ san: string; uci: string; appeal: string; appealScore: number; studentCp: number }>,
  bestStudentCp: number,
  dropThresholdCp = 120,
): { san: string; uci: string; appeal: string; evalDropCp: number } | null {
  const inferior = candidates
    .filter((c) => bestStudentCp - c.studentCp >= dropThresholdCp)
    // "…AND IT FALLS APART" MUST BE TRUE. A move that is merely worse than a
    // forced mate but still leaves the student clearly winning is not a trap
    // (hand walk 2026-09-24: Rxb6 won a queen for a rook, ~+4, and was called
    // "falls apart" because the engine had a mate).
    .filter((c) => c.studentCp < STILL_WINNING_CP)
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
    ? continueSentence(kt.description)
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

/** Replay a known UCI move list from `fen` into PvPly[] with the SAME per-ply
 *  facts the engine path computes — no engine needed, because the moves are
 *  already in hand. The pure twin of computePvLine's ply loop. */
function replayUci(fen: string, uciMoves: readonly string[]): PvPly[] {
  const chess = new Chess(fen);
  const plies: PvPly[] = [];
  let prevCap: PrevCaptureContext = NO_PREV_CAPTURE;
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
    prevCap = afterCapture(prevCap, mv);
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
  const verdict = summarizeVerdict(bestStudentCp, mateIn, terminalMaterialDelta(plies, studentColor));
  const keyTactic = pickKeyTactic(plies);
  const checkPlies = plies.map((p, i) => (p.facts.isCheck ? i : -1)).filter((i) => i >= 0);

  // Uncertainty: runner-up within 40cp, its SAN resolved on THIS board.
  let closeAlternative: { san: string; gapCp: number } | null = null;
  // Two-horse race only — same gate as `pvPlayback` (a flat opening field is
  // not a close call, it is a quiet position; walk 2026-09-23).
  const third = topLines[2];
  const thirdClearlyWorse = !third || bestStudentCp - toStudentCp(third.evaluation, studentColor) >= 80;
  if (topLines.length > 1 && thirdClearlyWorse) {
    const runner = topLines[1];
    const gap = bestStudentCp - toStudentCp(runner.evaluation, studentColor);
    const rUci = runner?.moves?.[0];
    // A LOST POSITION HAS NO COIN-FLIP (g9 walk 2026-09-27: "nothing to lose
    // sleep over — Ke7 does the same job as Kxc8", with mate in one after
    // either). Two moves that lose equally are not a reassuring choice: the
    // hedge speaks only in a live position. A forced mate against the student
    // arrives here as a huge negative score, so the one bound covers it.
    const live = bestStudentCp > -300;
    // TWO RECAPTURES ON ONE SQUARE ARE NOT A COIN-FLIP when one is a pawn:
    // they leave different structures (run I, manual check: "gxf3 does the
    // same job as Nxf3" — 70cp apart at depth). The recapture lane owns that.
    // Nor are two PAWN recaptures (walk 2026-09-30: "dxc3 works just as well as
    // bxc3", 44cp apart at depth, and each leaves its own structure).
    const sameSquareDifferentKind = ((): boolean => {
      try {
        const a = new Chess(fen).move({ from: first.uci.slice(0, 2), to: first.uci.slice(2, 4), promotion: first.uci[4] });
        const b = rUci ? new Chess(fen).move({ from: rUci.slice(0, 2), to: rUci.slice(2, 4), promotion: rUci[4] }) : null;
        return !!a && !!b && a.to === b.to && !!a.captured && !!b.captured;
      } catch { return false; }
    })();
    if (live && rUci && rUci.length >= 4 && rUci !== first.uci && gap >= 0 && gap <= 40 && !sameSquareDifferentKind) {
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

/** A move renderer: the SAN and the position it is played from (null = none). */
type SayAt = (san: string, fen: string | null) => string;

/** The position after `san` from `fen`, or null when either is missing or illegal. */
function fenAfter(fen: string | null, san: string): string | null {
  if (!fen) return null;
  try { const c = new Chess(fen); c.move(san); return c.fen(); } catch { return null; }
}

/** The destination square written in a SAN, or null. */
function sanTo(san: string): string | null {
  const m = san.replace(/[+#!?]+$/, '').replace(/=[QRBN]$/, '').match(/([a-h][1-8])$/);
  return m ? m[1] : null;
}

/** The affirm→but→refute turn, one wording for every caller. The capture names
 *  its square and the reply names its mover: "You'd love to grab it with the
 *  knight taking on e4 — but the knight takes e4" (hand walk 2000) left the
 *  student asking whose knight took what. */
function temptingTurn(fen: string | null, san: string, appeal: string, replySan: string | null, say: SayAt, sayN: SayAt): string {
  const to = sanTo(san);
  // The reply is played from the position AFTER the tempting move.
  const replyFen = fenAfter(fen, san);
  // A capture already says its square ("the knight taking on e4") — the old
  // "grab it" named nothing.
  const lead = appeal === 'capture' ? `You’d love to play ${sayN(san, fen)}` : `You’d love to ${APPEAL_AFFIRM[appeal] ?? 'play it'} with ${sayN(san, fen)}`;
  const takesBack = replySan !== null && to !== null && replySan.includes('x') && sanTo(replySan) === to;
  const refutation = replySan === null
    ? ' — but it doesn’t hold'
    : takesBack
      ? ' — but they take back and it falls apart'
      : ` — but they answer ${say(replySan, replyFen)} and it falls apart`;
  return `${lead}${refutation}.`;
}

/**
 * THE BUT-TURN as a standalone clause — Naroditsky's #1 device (measured ~33%):
 * affirm the seductive move, then refute it. Reuses the exact phrasing of
 * `narrateTacticalRead`'s first sentence so the register is consistent wherever
 * it is spliced. Null when there is no clearly-inferior tempting move to warn
 * against. `spoken` spells the move for TTS.
 */
export function temptingTurnClause(read: TacticalRead, opts: { spoken?: boolean } = {}): string | null {
  if (!read.tempting) return null;
  const say: SayAt = (san, fen) => (opts.spoken ? sayMoveClause(san, fen) : san);
  // NOUN slot — subject, or object of a preposition. See `sayMoveNoun`.
  const sayN: SayAt = (san, fen) => (opts.spoken ? sayMoveNoun(san, fen) : san);
  const ref = read.tempting.refutation;
  const reply = ref.length > 1 ? ref[1] : (ref.length > 0 ? ref[0] : undefined);
  return temptingTurn(read.fen, read.tempting.san, read.tempting.appeal, reply?.san ?? null, say, sayN);
}

/**
 * THE UNCERTAINTY clause — his honest hedge (measured ~21%): when a runner-up is
 * within a whisker of best, say so rather than feign certainty. Null when the
 * best move is clear. `gapCp` is the student-POV centipawn gap to the runner-up.
 */
export function uncertaintyClause(read: TacticalRead, opts: {
  spoken?: boolean;
  rotation?: number;
  /** May the clause name the two moves? Required: before the student moves in
   *  Learn it may not (prod walk 2026-10-19: "As for your next move: the bishop
   *  to g6 is a fine alternative to the pawn to e6" handed over the answer to
   *  the threat it had just raised). Held, it says the decision is close. */
  namesMoves: boolean;
}): string | null {
  if (!read.closeAlternative) return null;
  if (!opts.namesMoves) {
    return [
      'It’s genuinely close here — two moves are about as good as each other, so don’t agonise.',
      'Two moves do the same job here; either one is fine.',
      'Nothing to lose sleep over — there are two moves of the same worth here.',
    ][Math.abs(opts.rotation ?? 0) % 3];
  }
  // Every move slot in this clause is a NOUN slot, so the clause renderer is
  // genuinely unused here — which is the whole finding.
  const sayN: SayAt = (san, fen) => (opts.spoken ? sayMoveNoun(san, fen) : san);
  // STEMS ROTATE ON A STABLE KEY (WO-STANDARD-01 D-8: "It's genuinely close —
  // X is about as good, so don't agonise" fired four times in seven moves).
  // The caller passes the ply; the same ply always gets the same stem
  // (resume-safe, testable — never Math.random).
  const alt = sayN(read.closeAlternative.san, read.fen);
  // EVERY STEM NAMES BOTH MOVES (fresh-game walk 2026-09-27: "nothing to lose
  // sleep over — the king to c7 does the same job" — the same job as what? The
  // best move was never said beside it). The register only speaks where naming
  // the move is earned, so naming it here leaks nothing.
  const best = sayN(read.bestMoveSan, read.fen);
  const stems = [
    `It’s genuinely close — ${alt} is about as good as ${best}, so don’t agonise.`,
    `${openSentence(alt)} is a fine alternative to ${best} here; the two are within a whisker.`,
    `Nothing to lose sleep over — ${alt} does the same job as ${best}.`,
    // No COUNT stem ("there are two good moves here…"): the critical-moment
    // read already counts the moves that hold, and the two spoke back to back
    // as one fact said twice (hand walk 2026-09-24).
    `${openSentence(alt)} works just as well as ${best} here.`,
  ];
  return stems[Math.abs(opts.rotation ?? 0) % stems.length];
}

const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The compare clause WITH the two moves it names, so the board can draw them
 *  (`VoiceFact.lines`) — the preferred move and the one it is preferred to. */
export function candidateCompareRead(
  fen: string,
  topLines: ReadonlyArray<{ moves: string[]; evaluation: number }>,
  studentColor: 'white' | 'black',
  opts: {
    spoken?: boolean;
    recaptureOn?: string | null;
    /** May the read name the two moves? Required (see `uncertaintyClause`).
     *  Held, it says the habit that finds the better one, not the move. */
    namesMoves: boolean;
  },
): { text: string; bestSan: string; altSan: string } | null {
  if (topLines.length < 2) return null;
  // Comparison clauses put BOTH moves in noun slots ("X over Y", "X reads
  // better than Y"), so there is no clause slot in this function at all.
  const sayN: SayAt = (san, fen) => (opts.spoken ? sayMoveNoun(san, fen) : san);
  const bestUci = topLines[0]?.moves?.[0];
  if (!bestUci || bestUci.length < 4) return null;
  const bestCp = toStudentCp(topLines[0].evaluation, studentColor);
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const enemy: 'w' | 'b' = studentColor === 'white' ? 'b' : 'w';
  const parse = (uci: string): ReturnType<Chess['move']> | null => {
    const probe = new Chess(fen);
    try { return probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined }); }
    catch { return null; }
  };
  const bestMv = parse(bestUci);
  if (!bestMv) return null;
  for (let i = 1; i < topLines.length; i += 1) {
    const altUci = topLines[i]?.moves?.[0];
    if (!altUci || altUci.length < 4 || altUci === bestUci) continue;
    const gap = bestCp - toStudentCp(topLines[i].evaluation, studentColor);
    if (gap < 30 || gap > 120) continue; // hedge below, but-turn above
    const altMv = parse(altUci);
    if (!altMv) continue;
    // Case 1 — SAME piece to two squares: the "which square" decision. Prefer
    // the destination the enemy attacks less (safer), his Qc7-vs-Qb6 read.
    if (altMv.piece === bestMv.piece && altMv.from === bestMv.from && altMv.to !== bestMv.to) {
      const atkBest = board.attackers(bestMv.to, enemy).length;
      const atkAlt = board.attackers(altMv.to, enemy).length;
      if (atkAlt > atkBest) {
        const text = opts.namesMoves
          ? `Prefer ${sayN(bestMv.san, fen)} to ${sayN(altMv.san, fen)} — the square is safer, less exposed to attack.`
          : `Your ${PIECE_NOUN[bestMv.piece] ?? 'piece'} has two good squares here — pick the one they attack less.`;
        return { text, bestSan: bestMv.san, altSan: altMv.san };
      }
      // No grounded reason for the square → say nothing (Learn walk 2026-09-23:
      // "keeps more of the edge" fired on three consecutive plies as filler).
      return null;
    }
    // Case 2 — best is the forcing one, the alt is quiet.
    if ((bestMv.captured || bestMv.san.includes('+')) && !altMv.captured && !altMv.san.includes('+')) {
      // Taking back what they just took is not "forcing the issue" — it only
      // restores the material (hand walk 2026-09-24: 3.d4 exd4 heard "the knight
      // taking on d4 before the bishop to d3: the forcing move first").
      if (bestMv.captured && opts.recaptureOn && bestMv.to === opts.recaptureOn) return null;
      // ROTATED on the move number (hand walk 2026-09-24: the same stem three
      // moves running). Stable per ply, so resume-safe — never Math.random.
      const b = sayN(bestMv.san, fen);
      const q = sayN(altMv.san, fen);
      // No "while the edge is there" / "while it still works": neither an edge
      // nor a closing window is computed here — only that the forcing move
      // reads 30–120cp better (clean-pass walk 2026-10-03, G2 ply 10: "while
      // the edge is there" at a level position).
      const text = !opts.namesMoves
        ? rotateStem([
          'There is a forcing move here, and it comes before the quiet one.',
          'Look for the forcing move first — it beats the quiet one here.',
        ], Number(fen.split(' ')[5] ?? '0') || 0)
        : rotateStem([
        `Prefer ${b} to ${q} — the forcing move comes first.`,
        `${b} before ${q}: the forcing move first.`,
        `${q} can wait — first ${b}, which forces the issue.`,
      ], Number(fen.split(' ')[5] ?? '0') || 0);
      return { text, bestSan: bestMv.san, altSan: altMv.san };
    }
    // Case 3 — two different plans and no board-read reason: SILENT. "It keeps
    // more of the edge" is the eval bar read aloud, not a reason (G0, the
    // Narration Voice Rules' filler test).
    return null;
  }
  return null;
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
  const bestAppeal = bestMoveAppeal(fen, bestUci);
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
    if (mv.promotion && mv.promotion !== 'q') continue; // no one is tempted by an underpromotion
    const { score, appeal } = appealScore({ isCapture: mv.captured != null, isPromotion: mv.promotion != null, san: mv.san, piece: mv.piece, to: mv.to, from: mv.from });
    if (score <= 0 || score <= bestAppeal) continue;
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

// ── THE FACT PACKAGE FOR THE VOICE MODEL ─────────────────────────────────────

