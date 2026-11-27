// THE ONE RECIPE TABLE FOR A MISTAKE (WO-LEARN-MISTAKES-ONLY, Phase 2 step 2).
//
// errorWhy hands over the CAUSE of a costly move as data (`mistakeCause`);
// this table turns a cause into the turn Learn says, in the order David set
// (docs/plans/2026-11-23-learn-mistakes-only.md):
//
//   LESSON (the principle broken, this board's piece/square inside it)
//   → CONSEQUENCE → BETTER (the better move's JOB, said as a principle, never
//   the move) → REPAIR (keyed on the STATE the mistake leaves, with its own
//   board check) → HABIT (the record decides: RED/GREY full, AMBER one clause,
//   GREEN silent).
//
// The approved reference turn (David 2026-11-24), 9.Bxf6 Bxf6:
//   "Your dark-squared bishop is gone, so d4 has no guard. Their bishop on f6
//    will feel at home now. Put your pawns on dark squares to help regain
//    control of the dark squares."
//
// THE RULES THE TABLE HOLDS (gate: mistakeLesson.test.ts):
//  - 5 phrasings per slot, ≤14 words, rotated with `rotateStem` on the board,
//    never Math.random; no two the same once pieces and squares are blanked.
//  - NO MOVE IS NAMED. A fill comes only from a computed field (ErrorWhy, the
//    cause's detail, the board through chess.js) — pieces and squares, never
//    SAN. On the opponent's mistake their reply line is the STUDENT's next
//    move, so no fill is ever read from it there.
//  - A slot whose fields are missing is silent; a turn with no LESSON, or with
//    no REPAIR that applies ("No point naming an error if we don't say how to
//    fix it"), is silent — and every turn writes one `mistake-lesson` row.
//
// Principles respect principles/INDEX.md "Disputed": the mate lesson says a
// check that cannot be blocked or met (not "one check"), the guarded-piece
// lessons carry the value condition, the fork lesson is two pieces a knight's
// jump from ONE square, and no slot talks about the evaluation.
//
// Stems are written in the MOVER's voice ("your", "you", "their", "they");
// on the opponent's mistake the words are swapped (`seatWords`), so one stem
// serves both seats. The REPAIR is always the STUDENT's (on their mistake it
// is the conversion), so it is never swapped.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { causeReaderKey, type MistakeCause, type MistakeCauseKind } from './mistakeCause';
import { queenNet } from './queenNet';
import { planOf } from './planOf';
import type { ErrorWhy } from './inaccuracyCall';
import { MOTIFS, MOTIF_OF_TACTIC } from '../data/tacticMotifs';
import { holdState, type HeatState, type HoldRecord } from './holdRate';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { phaseOfFen, type Phase } from './boardConcepts';
import { MATERIAL_VALUE, materialBalance } from './pieceValues';
import { capturesWinMaterial, kingSafetyRead } from './positionReadingService';
import { trappedAt } from './trappedPiece';
import { withArticle } from '../utils/andList';
import { minorsAtHome } from './development';
import { onlyMove } from './thoughtReads';
import { findProphylaxis } from './prophylaxis';
import { detectTacticLine } from './missedTacticService';
import { initiativeRead } from './initiativeRead';
import { bestJobReason, positionalReason } from './positionalReason';
import { DECIDED_EVAL_CP, INACCURACY_CP, MISTAKE_CP } from './engineConstants';
import { logAppAudit } from './appAuditor';
import {
  BETTER_JOBS, CAUSE_READER_LESSONS, COLOUR_NAME, EMPTY_CHECK_LESSON, FORK_LESSON, GOOD_DECISION, MISSED_MOTIF, THEIR_MOVE_CONSEQUENCE, HABIT_SHORT, LESSON_SLOTS, MISTAKE_NUMBER_WORDS, POSITIONAL, POSITIONAL_THEM, RECIPES, REPAIRS, TECHNIQUE_RULE, THEIR_SEAT, TRAPPED_LESSON,
  materialWords, renderMistakeSlot, tradeWords,
  type BetterJob, type GoodDecision, type Fills, type LessonSlot, type RepairState, type SlotRecipe,
} from './teachingSentence';

export {
  BETTER_JOBS, HABIT_SHORT, LESSON_SLOTS, POSITIONAL, POSITIONAL_THEM, RECIPES, REPAIRS, THEIR_SEAT, FORK_LESSON,
  type FillKey, type Fills, type HabitFamily, type LessonRecipe, type LessonSlot, type RepairRecipe, type RepairState, type SlotRecipe,
} from './teachingSentence';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };


/** Causes whose piece comes from their line when no mechanism named one. */
const REPLY_TARGET: ReadonlySet<MistakeCauseKind> = new Set(['allowed-threat', 'ignored-threat', 'allowed-capture', 'allowed-tactic']);

function play(c: Chess, u: string): ReturnType<Chess['move']> | null {
  try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
}

/** The board at the QUIET END of the reply line (recovery INDEX "Ledger"):
 *  their reply, then on while captures or checks last (up to eight plies). */
export function quietEnd(fenAfter: string, reply: readonly string[]): string {
  const c = new Chess(fenAfter);
  for (let i = 0; i < Math.min(reply.length, 8); i += 1) {
    const m = play(c, reply[i]);
    if (!m) break;
    const next = reply[i + 1];
    if (i >= 1 && !m.captured && !/[+#]/.test(m.san)) break;
    if (!next) break;
  }
  return c.fen();
}

export interface MistakeLessonInput {
  ew: Pick<ErrorWhy, 'cause' | 'lostSquare' | 'failedSquares' | 'allowedReasonLine' | 'missedReasonLine' | 'allowedAct'>;
  fenBefore: string;
  playedSan: string;
  /** The line after the move (their reply first); [] when unknown. */
  replyLineUci: readonly string[];
  bestSan: string | null;
  /** The better move's line, the better move first (the missed win's target). */
  bestLineUci?: readonly string[] | null;
  /** Whose mistake: the student's own, or the opponent's. */
  seat: 'you' | 'them';
  costCp: number | null;
  /** The eval before the move from the mover's seat, when known (the
   *  decided-game gate). */
  evalBeforeCp?: number | null;
  surface: string;
  /** The student's record on a skill tag (the record door's `holdRecords`). */
  holdOf: (tag: string) => HoldRecord | undefined;
  /** Log the `mistake-lesson` row (default true). */
  log?: boolean;
  /** The game's ply of the move (the rotation key, with the board). */
  ply?: number;
  /** REQUIRED — this game's memory, owned by the caller (`nextGameMemory`). */
  memory: MistakeGameMemory;
  /** Their reply as played, once it is on the board (refinement 4); null
   *  before it. Read on the student's own mistake only. */
  theirReplySan?: string | null;
  /** Their lesson is said first this turn: the student's opens on "Your…"
   *  or "You…", so the two seats never blur. */
  seatLed?: boolean;
  /** On THEIR mistake: the student's reply as played (their lesson is said
   *  after it). The one student move a lesson may name the piece of — it is
   *  past — and only when it took what their mistake left. */
  studentReplySan?: string | null;
}

/** WHAT THIS GAME HAS SAID (refinements 2 and 3), owned by the caller and
 *  folded with `nextGameMemory` after every turn. */
export interface MistakeGameMemory {
  /** Skill tags taught by a spoken lesson this game. */
  taught: ReadonlySet<string>;
  /** Repair states said this game and still holding on the board. */
  repairs: ReadonlySet<RepairState>;
  /** The stems of the last four spoken turns: none is said again so soon. */
  recentStems: ReadonlyArray<ReadonlySet<string>>;
  /** Habits said this game (by skill tag, else cause). */
  habits: ReadonlySet<string>;
  /** The previous spoken turn closed on a habit. */
  lastHadHabit: boolean;
}
export const NEW_GAME_MEMORY: MistakeGameMemory = { taught: new Set(), repairs: new Set(), recentStems: [], habits: new Set(), lastHadHabit: false };
/** How many spoken turns a stem waits before it may be said again. */
const STEM_MEMORY_TURNS = 4;
/** Every stem the recent turns said (the rotation skips them). */
export function recentStemsOf(memory: MistakeGameMemory): ReadonlySet<string> {
  return new Set(memory.recentStems.flatMap((x) => [...x]));
}
/** Fold one more turn's stems into the memory (a line said outside the
 *  lesson, e.g. the good decision). */
export function withStems(memory: MistakeGameMemory, stems: readonly string[]): MistakeGameMemory {
  return { ...memory, recentStems: [...memory.recentStems, new Set(stems)].slice(-STEM_MEMORY_TURNS) };
}

/** The computed fields one turn may name. Reply-line fields only on the
 *  student's own mistake: on theirs the reply is the student's next move. */
export function fillsFor(input: MistakeLessonInput): Fills {
  const f: Fills = {};
  let before: Chess; let after: Chess; let mv;
  try { before = new Chess(input.fenBefore); after = new Chess(input.fenBefore); mv = after.move(input.playedSan); } catch { return f; }
  if (!mv) return f;
  const mover = mv.color;
  f.piece = NAME[mv.piece]; f.sq = mv.to;
  const kingSq = after.findPiece({ type: 'k', color: mover })[0];
  const nameAt = (sq: string | undefined): string | undefined => { if (!sq) return undefined; const p = after.get(sq as Square); return p ? NAME[p.type] : undefined; };
  const sqs = input.ew.failedSquares;
  const cause = input.ew.cause;
  if (sqs.length) { f.target = sqs[0]; f.tPiece = nameAt(sqs[0]); if (sqs[1]) { f.opSq = sqs[1]; f.opPiece = nameAt(sqs[1]) ?? (() => { const p = before.get(sqs[1] as Square); return p ? NAME[p.type] : undefined; })(); } }
  if (!f.target && input.ew.lostSquare) { f.target = input.ew.lostSquare; f.tPiece = nameAt(input.ew.lostSquare); }
  // The abandoned fork square and the fork walked into name the SQUARE.
  if (cause.kind === 'abandoned-fork-square' || cause.kind === 'walks-into-fork') { f.target = sqs[0]; delete f.tPiece; }
  if (cause.kind === 'missed-mate' || cause.kind === 'stalemate') {
    const k = after.findPiece({ type: 'k', color: mover === 'w' ? 'b' : 'w' })[0];
    if (k) f.king = k;
  } else if (kingSq) f.king = kingSq;
  const ownSeat = input.seat === 'you';
  /** The student's piece that took on `sq` with the reply they PLAYED — the
   *  piece, never the move, and never a capture still to be played. */
  const takerOn = (sq: string): string | undefined => {
    if (!input.studentReplySan) return undefined;
    try { const m = new Chess(after.fen()).move(input.studentReplySan); return m && m.to === sq && m.captured ? NAME[m.piece] : undefined; } catch { return undefined; }
  };
  if (ownSeat && input.replyLineUci.length) {
    const c = new Chess(after.fen());
    for (const u of input.replyLineUci.slice(0, 6)) {
      const m = play(c, u);
      if (!m) break;
      if (m.color !== mover && /[+#]/.test(m.san)) { f.checkPiece = NAME[m.piece]; f.checkSq = m.to; break; }
    }
    // The taker of a lost piece: their first capture on its square.
    if (f.target && !f.opPiece) {
      const d = new Chess(after.fen());
      for (const u of input.replyLineUci.slice(0, 4)) { const m = play(d, u); if (!m) break; if (m.color !== mover && m.to === f.target && m.captured) { f.opPiece = NAME[m.piece]; break; } }
    }
  }
  // THE PIECE THE LINE ACTUALLY WINS (the one reason walker's own line,
  // `ErrorWhy.allowedReasonLine` / `missedReasonLine`): the most valuable piece
  // the winning side takes in it. Allowed → the mover's piece their line wins;
  // missed → their piece the better line wins, and a fork's two targets.
  const wonIn = (line: { fen: string; uci: readonly string[] } | undefined, taker: Color): { sq: string; piece: string } | null => {
    if (!line) return null;
    // NET of what comes back: a queen taken and a queen given are no gain
    // (18.Bxf8's line traded queens and won a rook).
    const c = new Chess(line.fen);
    const won: Array<{ sq: string; t: string }> = []; const back: string[] = [];
    for (const u of line.uci) { const m = play(c, u); if (!m) break; if (!m.captured) continue; if (m.color === taker) won.push({ sq: m.to, t: m.captured }); else back.push(m.captured); }
    for (let i = won.length - 1; i >= 0; i -= 1) { const j = back.indexOf(won[i].t); if (j >= 0) { won.splice(i, 1); back.splice(j, 1); } }
    const best = won.sort((x, y) => MATERIAL_VALUE[y.t] - MATERIAL_VALUE[x.t])[0];
    return best ? { sq: best.sq, piece: NAME[best.t] } : null;
  };
  const them: Color = mover === 'w' ? 'b' : 'w';
  // The reply's target, typed (`ErrorWhy.allowedAct`): the mover's own piece
  // their reply attacks or takes — never the replying piece's square.
  if (!f.target && REPLY_TARGET.has(cause.kind)) {
    const act = input.ew.allowedAct;
    if (act && act.target.color === mover && act.target.piece !== 'k') { f.target = act.target.square; f.tPiece = NAME[act.target.piece]; }
    else {
      const w = wonIn(input.ew.allowedReasonLine, them);
      if (w && after.get(w.sq as Square)?.color === mover) { f.target = w.sq; f.tPiece = w.piece; }
    }
  }
  // THEIR IGNORED THREAT names the student's piece that took (vague-line fix:
  // "They ignored the threat: your knight takes their pawn on b5"), only once
  // that capture is played; otherwise the lesson has no form and is silent.
  if (!ownSeat && cause.kind === 'ignored-threat') {
    const t = f.target ? takerOn(f.target) : undefined;
    if (t) f.opPiece = t; else delete f.opPiece;
  }
  if (cause.kind === 'missed-win') {
    delete f.target; delete f.tPiece;
    // A queen the better move traps (`queenNet`: no safe square left).
    const net = input.bestSan ? (() => { try { return queenNet(input.fenBefore, input.bestSan); } catch { return null; } })() : null;
    const trapped = !!net && net.left.length === 0;
    if (net && trapped) { f.target = net.queen; f.tPiece = 'queen'; f.trapped = 'yes'; }
    const w = trapped ? null : wonIn(input.ew.missedReasonLine, mover);
    // A capture the played move already made is no missed win.
    if (w && !(mv.captured && w.sq === mv.to)) { f.target = w.sq; f.tPiece = w.piece; }
    if (!trapped && cause.motif === 'fork' && input.ew.missedReasonLine) {
      const c = new Chess(input.ew.missedReasonLine.fen);
      for (const u of input.ew.missedReasonLine.uci) {
        const m = play(c, u); if (!m) break;
        if (m.color !== mover) continue;
        const worth = (t: string): number => (t === 'k' ? 99 : MATERIAL_VALUE[t]);
        const hit = c.board().flat().flatMap((p) => (p && p.color === them && worth(p.type) >= 3 && c.attackers(p.square, mover).includes(m.to) ? [p.type] : []))
          .sort((x, y) => worth(y) - worth(x));
        if (hit.length >= 2) { f.a = NAME[hit[0]]; f.b = NAME[hit[1]]; break; }
      }
    }
  }
  // What the line wins: the ledger at the quiet end of the reply line, against
  // the board before the move (mover's seat). Read only on the mover's own seat
  // (the line is theirs), and on missed causes from the better line's gain the
  // ledger cannot see — so `what` stays unread there.
  if (input.replyLineUci.length && cause.kind !== 'missed-win' && cause.kind !== 'compensation-lost') {
    const end = quietEnd(after.fen(), input.replyLineUci);
    const gone = (side: Color): string[] => {
      const out: string[] = [];
      for (const t of ['q', 'r', 'b', 'n', 'p'] as const) {
        const n = before.findPiece({ type: t, color: side }).length - new Chess(end).findPiece({ type: t, color: side }).length;
        for (let k = 0; k < n; k += 1) out.push(t);
      }
      return out;
    };
    const sign = mover === 'w' ? 1 : -1;
    const net = sign * (materialBalance(input.fenBefore) - materialBalance(end));
    // Said only when the mover comes out behind: a loss, named by its pieces.
    const w = net >= 1 ? tradeWords(gone(mover), gone(them)) : null;
    if (w) f.what = w;
  }
  // A motif with no row of its own (a tactical sequence) is a combination.
  // THE MOTIF BY ITS LANDING (`detectTacticLine` over the full line): a
  // sequence with no motif of its own is named by what it lands, or not at all.
  if (cause.motif) {
    let id = MOTIF_OF_TACTIC[cause.motif];
    if (!id) {
      const line = cause.kind === 'missed-win' ? input.ew.missedReasonLine : input.ew.allowedReasonLine;
      if (line?.uci.length) {
        try {
          const tl = detectTacticLine(line.fen, line.uci[0], line.uci);
          id = MOTIF_OF_TACTIC[tl.tacticType] ?? (tl.setup ? MOTIF_OF_TACTIC[tl.setup] : null);
        } catch { id = null; }
      }
    }
    if (id && id !== 'free-piece') f.motif = withArticle(MOTIFS[id].word);
  }
  const d = cause.detail;
  if (d) {
    if (d.kind === 'colour-conceded') { f.colour = COLOUR_NAME[d.colour]; f.target = d.target; f.opSq = d.enemyBishop; }
    if (d.kind === 'traded-into-target') f.pawn = d.pawn;
    if (d.kind === 'passer-handed') { f.pawn = d.pawn; f.n = MISTAKE_NUMBER_WORDS[d.toQueen] ?? String(d.toQueen); }
    if (d.kind === 'stalemate') f.king = d.king;
    if (d.kind === 'technique-broken') f.n = TECHNIQUE_RULE[d.rule];
    if (d.kind === 'tempo-wasted' && d.answer) f.answer = d.answer === 'king' ? 'king step' : 'block';
    if (d.kind === 'compensation-lost') { const w = materialWords(d.down); if (w) f.down = w; }
  }
  if (cause.kind === 'positional') {
    // The positional reading names its own piece and square (typed on
    // `PositionalReason`); nothing else is read for it.
    delete f.target; delete f.tPiece; delete f.king;
    const pr = (() => { try { return positionalReason({ fen: input.fenBefore, playedSan: input.playedSan, bestSan: input.bestSan, namesBetterMove: false, student: mover }); } catch { return null; } })();
    if (pr && pr.tag === cause.tag) {
      if (pr.at && pr.piece === 'king') f.king = pr.at;
      else if (pr.at && pr.piece) { f.target = pr.at; f.tPiece = pr.piece; }
      if (pr.file) f.file = pr.file;
    }
  }
  // The cause readers' facts (`causeReaders`): the pieces and squares their
  // lessons name, read off the board before the move.
  if (d?.kind === 'allowed-capture') f.pawn = d.pawn;
  if (d?.kind === 'positional') { f.target = d.square; f.tPiece = NAME[d.piece]; f.pawn = d.by; f.file = d.by; }
  const pieceBefore = (sq: string | undefined): string | undefined => { try { const p = sq ? before.get(sq as Square) : null; return p ? NAME[p.type] : undefined; } catch { return undefined; } };
  if (d?.kind === 'tempo-wasted' && d.how === 'missed-tempo' && d.squares[0]) { f.target = d.squares[0]; f.tPiece = pieceBefore(d.squares[0]); }
  if (d?.kind === 'tempo-wasted' && d.how === 'wrong-order') { f.tPiece = pieceBefore(d.squares[0]); f.target = d.squares[1]; }
  if (d?.kind === 'tempo-wasted' && d.how === 'freed-square') { f.target = d.squares[0]; f.opSq = d.squares[1]; f.tPiece = pieceBefore(d.squares[1]); }
  if (d?.kind === 'defender-hit') { f.target = d.target; f.tPiece = pieceBefore(d.target); f.opSq = d.defender; f.opPiece = pieceBefore(d.defender); }
  // Their reply, once played: in words, never as a move (refinement 4).
  if (ownSeat && input.theirReplySan) {
    try {
      const r = new Chess(after.fen()).move(input.theirReplySan);
      if (r) f.theirMove = `their ${NAME[r.piece]} ${r.captured ? (r.to === mv.to && mv.captured ? 'took back on' : 'took on') : 'went to'} ${r.to}`;
    } catch { /* not their move on this board */ }
  }
  return f;
}

// ── repair: which state, and its board check ───────────────────────────────
interface RepairContext { student: Color; fenBefore: string; fenAfter: string; quiet: string; cause: MistakeCause; seat: 'you' | 'them'; replyLineUci: readonly string[]; phase: Phase | null }

function queensOn(fen: string): boolean { return /q/i.test(fen.split(' ')[0]); }
function countOf(fen: string, side: Color, type: PieceSymbol): number { try { return new Chess(fen).findPiece({ type, color: side }).length; } catch { return 0; } }

/** The repair's own check: does this plan apply on this board? Fills it needs. */
function repairApplies(state: RepairState, x: RepairContext): Fills | null {
  const them: Color = x.student === 'w' ? 'b' : 'w';
  const d = x.cause.detail;
  // The state read at the quiet end, checked against the board itself: when
  // the line's end and the board on screen disagree on who is ahead, the
  // board's material is the state (a line read mid-trade flipped "ahead" and
  // "down" between neighbouring moves).
  const quietL = (x.student === 'w' ? 1 : -1) * materialBalance(x.quiet);
  const boardL = (x.student === 'w' ? 1 : -1) * materialBalance(x.fenBefore);
  const ledger = quietL !== 0 && boardL !== 0 && Math.sign(quietL) !== Math.sign(boardL) ? boardL : quietL;
  const before = (fen: string): Chess => new Chess(fen);
  switch (state) {
    case 'colour-conceded':
    case 'colour-won': {
      if (d?.kind !== 'colour-conceded') return null;
      const owner = state === 'colour-conceded' ? x.student : them;
      // A pawn of the side that lost the colour can still step onto it.
      const b = before(x.quiet);
      const shadeOf = (sq: string): 'light' | 'dark' => ((sq.charCodeAt(0) - 97 + Number(sq[1]) - 1) % 2 === 0 ? 'dark' : 'light');
      const step = owner === 'w' ? 1 : -1;
      const can = b.findPiece({ type: 'p', color: owner }).some((p) => {
        const r = Number(p[1]) + step; if (r < 1 || r > 8) return false;
        const to = `${p[0]}${r}`;
        return shadeOf(to) === d.colour && !b.get(to as Square);
      });
      if (state === 'colour-conceded' && !can) return null;
      return { colour: d.colour };
    }
    case 'weak-pawn':
    case 'weak-pawn-theirs':
      if (d?.kind !== 'traded-into-target') return null;
      return before(x.quiet).get(d.pawn as Square)?.type === 'p' ? { pawn: d.pawn } : null;
    case 'passer-against':
    case 'passer-mine': {
      if (d?.kind !== 'passer-handed') return null;
      const b = before(x.quiet);
      const pawn = b.get(d.pawn as Square);
      if (!pawn || pawn.type !== 'p') return null;
      // Its stop square is still open to blockade (or to push).
      const stop = `${d.pawn[0]}${Number(d.pawn[1]) + (pawn.color === 'w' ? 1 : -1)}`;
      const onStop = b.get(stop as Square);
      if (state === 'passer-mine' && onStop) return null;
      if (state === 'passer-against' && onStop && onStop.color !== x.student) return null;
      return { pawn: d.pawn };
    }
    case 'technique-key-square':
    case 'technique-opposition':
    case 'technique-rook': {
      if (d?.kind !== 'technique-broken') return null;
      const rule = state === 'technique-key-square' ? 'key-square' : state === 'technique-opposition' ? 'opposition' : 'rook-behind-passer';
      if (d.rule !== rule) return null;
      if (state === 'technique-opposition') return {};
      const pawns = before(x.fenAfter).findPiece({ type: 'p', color: x.student });
      const pawn = state === 'technique-rook' ? (() => {
        const r = d.square;
        const b = before(x.fenAfter);
        return [...pawns, ...b.findPiece({ type: 'p', color: them })].find((p) => p[0] === r[0]) ?? null;
      })() : pawns[0] ?? null;
      return pawn ? { pawn } : null;
    }
    case 'leave-a-square': {
      const b = before(x.fenAfter);
      return !b.isGameOver() ? {} : null;
    }
    case 'down-queen':
      return ledger <= -5 && countOf(x.quiet, x.student, 'q') < countOf(x.quiet, them, 'q') ? {} : null;
    case 'down-exchange': {
      const rooks = countOf(x.quiet, x.student, 'r') - countOf(x.quiet, them, 'r');
      const minors = (countOf(x.quiet, x.student, 'n') + countOf(x.quiet, x.student, 'b')) - (countOf(x.quiet, them, 'n') + countOf(x.quiet, them, 'b'));
      return ledger <= -1 && ledger > -3 && rooks === -1 && minors === 1 ? {} : null;
    }
    // The ledger's bands (recovery INDEX): a pawn is −1 exactly; two pawns or
    // more is material down, said without a count it cannot back.
    case 'down-piece-middlegame':
      return ledger <= -2 && queensOn(x.quiet) && x.phase !== 'endgame' ? {} : null;
    case 'down-material-queens-off':
      return ledger <= -2 && !queensOn(x.quiet) && x.phase !== 'endgame' ? {} : null;
    case 'down-piece-endgame':
      return ledger <= -2 && x.phase === 'endgame' && countOf(x.quiet, them, 'p') > 0 ? {} : null;
    case 'down-pawn-middlegame':
      return ledger === -1 && x.phase !== 'endgame' ? {} : null;
    case 'down-pawn-endgame':
      return ledger === -1 && x.phase === 'endgame' ? {} : null;
    case 'attack-their-king': {
      // The student is to move against an open king with a check to give.
      if (x.seat !== 'them') return null;
      const b = before(x.fenAfter);
      return b.turn() === x.student && b.moves().some((m) => /[+#]/.test(m)) ? {} : null;
    }
    case 'up-material': {
      // An even trade has to exist: they still have a piece to swap.
      const theirs = ['n', 'b', 'r', 'q'].some((t) => countOf(x.quiet, them, t as PieceSymbol) > 0);
      return ledger >= 1 && theirs ? {} : null;
    }
    case 'king-exposed': {
      const k = kingSafetyRead(x.quiet, x.student);
      return k && k.shieldPawns <= 1 && queensOn(x.quiet) ? {} : null;
    }
    // The plan is read by `planRepair`, never through this switch.
    case 'plan':
      return null;
    case 'king-in-centre': {
      // A king still on its home square in the d- or e-file, with a right to
      // castle left, queens on and a middlegame's pieces on the board.
      const b = before(x.quiet);
      const k = b.findPiece({ type: 'k', color: x.student })[0];
      const home = x.student === 'w' ? '1' : '8';
      const rights = (x.quiet.split(' ')[2] ?? '-').split('').filter((ch) => (x.student === 'w' ? /[KQ]/ : /[kq]/).test(ch));
      // Only once it matters: past the first moves, or with the centre open in
      // front of it (no pawn of its own on its file).
      const moveNo = Number(x.quiet.split(' ')[5] ?? '1');
      const fileOpen = k ? !b.findPiece({ type: 'p', color: x.student }).some((p) => p[0] === k[0]) : false;
      return k && 'de'.includes(k[0]) && k[1] === home && rights.length > 0 && queensOn(x.quiet) && x.phase !== 'endgame' && officersOn(b) >= 8
        && (moveNo >= 10 || fileOpen) ? { target: k } : null;
    }
    case 'behind-in-development': {
      // Two minor pieces or more still at home, and more than they have.
      const b = before(x.quiet);
      const mine = minorsAtHome(b, x.student);
      const moveNo = Number(x.quiet.split(' ')[5] ?? '1');
      if (moveNo < 6 || mine.length < 2 || mine.length - minorsAtHome(b, them).length < 2 || x.phase === 'endgame') return null;
      return { tPiece: NAME[mine[0].type], target: mine[0].square };
    }
    case 'piece-trapped': {
      const b = before(x.quiet);
      for (const cell of b.board().flat()) {
        if (!cell || cell.color !== x.student || cell.type === 'p' || cell.type === 'k') continue;
        if (b.attackers(cell.square, them).length && trappedAt(x.quiet, cell.square)) return { tPiece: NAME[cell.type], target: cell.square };
      }
      return null;
    }
    case 'pinned-piece': {
      const pin = pinOn(before(x.quiet), x.student);
      return pin ? { tPiece: NAME[pin.piece], target: pin.square, opPiece: NAME[pin.byPiece], opSq: pin.by } : null;
    }
    case 'pawn-lever': {
      // Their centre pawn deep in the student's half, that a pawn of the
      // student's can hit in one push.
      const b = before(x.quiet);
      const deep = them === 'w' ? '5' : '4';
      const dir = x.student === 'w' ? 1 : -1;
      for (const sq of b.findPiece({ type: 'p', color: them })) {
        if (!'cdef'.includes(sq[0]) || sq[1] !== deep) continue;
        const f = sq.charCodeAt(0) - 97;
        const hitFrom = Number(sq[1]) - dir; // the square a lever lands on
        const lever = [f - 1, f + 1].filter((g) => g >= 0 && g <= 7).some((g) => {
          const land = `${String.fromCharCode(97 + g)}${hitFrom}` as Square;
          const one = `${String.fromCharCode(97 + g)}${hitFrom - dir}` as Square;
          const two = `${String.fromCharCode(97 + g)}${hitFrom - 2 * dir}` as Square;
          if (b.get(land)) return false;
          const p1 = b.get(one); const p2 = b.get(two);
          const startRank = x.student === 'w' ? '2' : '7';
          return (p1?.type === 'p' && p1.color === x.student) || (!p1 && p2?.type === 'p' && p2.color === x.student && two[1] === startRank);
        });
        if (lever) return { pawn: sq };
      }
      return null;
    }
    case 'loose-pieces': {
      const b = before(x.quiet);
      if (x.phase === 'endgame') return null;
      // Pieces out in play (off their first rank), past the opening's first
      // moves: a rook at home is not loose.
      const firstRank = x.student === 'w' ? '1' : '8';
      if (Number(x.quiet.split(' ')[5] ?? '1') < 8) return null;
      const loose = b.board().flat().flatMap((p) => (p && p.color === x.student && p.type !== 'p' && p.type !== 'k'
        && p.square[1] !== firstRank && b.attackers(p.square, x.student).length === 0 ? [p] : []));
      return loose.length >= 2 ? { a: `${NAME[loose[0].type]} on ${loose[0].square}`, b: `${NAME[loose[1].type]} on ${loose[1].square}` } : null;
    }
    case 'initiative-lost':
    case 'initiative-won': {
      if (!x.replyLineUci.length) return null;
      const ini = initiativeRead(x.fenAfter, [{ moves: [...x.replyLineUci] }]);
      const side = state === 'initiative-lost' ? them : x.student;
      return ini?.side === side ? {} : null;
    }
  }
}

/** The cause's structural states, from the STUDENT's seat (their mistake is
 *  the mirror), then the ledger's. */
const MIRROR: Partial<Record<RepairState, RepairState>> = {
  'colour-conceded': 'colour-won', 'weak-pawn': 'weak-pawn-theirs', 'passer-against': 'passer-mine', 'initiative-lost': 'initiative-won',
  'king-exposed': 'attack-their-king',
};
const CAUSE_STATE: Partial<Record<MistakeCauseKind, RepairState>> = {
  'colour-conceded': 'colour-conceded', 'traded-into-target': 'weak-pawn', 'passer-handed': 'passer-against',
};
const LEDGER_STATES: readonly RepairState[] = ['down-queen', 'down-exchange', 'down-piece-middlegame', 'down-material-queens-off', 'down-piece-endgame', 'down-pawn-middlegame', 'down-pawn-endgame', 'up-material'];
/** THE BOARD STATES, after the ledger's: on the student's own mistake, what
 *  the board asks of them when the material is not the problem — the trapped
 *  piece first (it is lost otherwise), then the pin, the loose pieces, the
 *  king in the middle, the development, the cramping pawn. */
const BOARD_STATES: readonly RepairState[] = ['piece-trapped', 'pinned-piece', 'loose-pieces', 'king-in-centre', 'behind-in-development', 'pawn-lever'];

/** A board state's own check, on one board (`student`'s seat): the fills its
 *  repair names, or null when the board does not show it. */
export function boardStateFills(state: RepairState, fen: string, student: Color): Fills | null {
  try {
    return repairApplies(state, { student, fenBefore: fen, fenAfter: fen, quiet: fen, cause: { kind: 'unexplained', motif: null, tag: null } as unknown as MistakeCause, seat: 'you', replyLineUci: [], phase: phaseOfFen(fen) });
  } catch { return null; }
}

function officersOn(b: Chess): number {
  return b.board().flat().filter((p) => !!p && p.type !== 'p' && p.type !== 'k').length;
}

/** A piece of `side` (knight, bishop or rook) pinned by a slider of the
 *  other side to its king or queen standing behind it on the same line. */
export function pinOn(b: Chess, side: Color): { square: Square; piece: PieceSymbol; by: Square; byPiece: PieceSymbol } | null {
  const foe: Color = side === 'w' ? 'b' : 'w';
  const DIRS: Array<[number, number, 'diag' | 'line']> = [[1, 0, 'line'], [-1, 0, 'line'], [0, 1, 'line'], [0, -1, 'line'], [1, 1, 'diag'], [1, -1, 'diag'], [-1, 1, 'diag'], [-1, -1, 'diag']];
  for (const cell of b.board().flat()) {
    if (!cell || cell.color !== foe || !['b', 'r', 'q'].includes(cell.type)) continue;
    for (const [df, dr, kind] of DIRS) {
      if (cell.type === 'b' && kind === 'line') continue;
      if (cell.type === 'r' && kind === 'diag') continue;
      let f = cell.square.charCodeAt(0) - 97 + df; let r = Number(cell.square[1]) + dr;
      let front: { sq: Square; type: PieceSymbol } | null = null;
      while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
        const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
        const p = b.get(sq);
        if (p) {
          if (p.color !== side) break;
          if (!front) {
            if (!['n', 'b', 'r'].includes(p.type)) break;
            front = { sq, type: p.type };
          } else {
            // A pinned piece that can take the pinner is not held.
            const takes = b.attackers(cell.square, side).includes(front.sq);
            if (!takes && (p.type === 'k' || (p.type === 'q' && cell.type !== 'q'))) return { square: front.sq, piece: front.type, by: cell.square, byPiece: cell.type };
            break;
          }
        }
        f += df; r += dr;
      }
    }
  }
  return null;
}

function repairFor(input: MistakeLessonInput, recipeRepairs: readonly RepairState[], key: number): { text: string; stem: string; state: RepairState } | null {
  let after: Chess; let mover: Color;
  try { after = new Chess(input.fenBefore); mover = after.turn(); if (!after.move(input.playedSan)) return null; } catch { return null; }
  const student: Color = input.seat === 'you' ? mover : (mover === 'w' ? 'b' : 'w');
  const quiet = input.replyLineUci.length ? quietEnd(after.fen(), input.replyLineUci) : after.fen();
  const ctx: RepairContext = { student, fenBefore: input.fenBefore, fenAfter: after.fen(), quiet, cause: input.ew.cause, seat: input.seat, replyLineUci: input.replyLineUci, phase: phaseOfFen(quiet) };
  const own: RepairState[] = [];
  const cs = CAUSE_STATE[input.ew.cause.kind];
  if (cs) own.push(cs);
  const d = input.ew.cause.detail;
  if (d?.kind === 'technique-broken') own.push(d.rule === 'key-square' ? 'technique-key-square' : d.rule === 'opposition' ? 'technique-opposition' : 'technique-rook');
  own.push(...recipeRepairs);
  const seated = input.seat === 'you' ? own : own.map((s) => MIRROR[s] ?? s);
  // On their mistake the ledger's only repair is the conversion: the
  // student's own deficit is not what their mistake changed.
  const ledgerStates = input.seat === 'you' ? [...LEDGER_STATES, ...BOARD_STATES] : (['up-material'] as const);
  for (const state of [...seated, ...ledgerStates]) {
    const fills = repairApplies(state, ctx);
    if (!fills) continue;
    const said = renderMistakeSlot(REPAIRS[state], fills, key, recentStemsOf(input.memory));
    if (said) return { ...said, state };
  }
  return null;
}

// ── the record ─────────────────────────────────────────────────────────────
/** The skill tag a cause's habit is read on: the cause's own tag, else the
 *  record tag of the skill that finds it (the motif's, for a tactic). */
export function habitTag(cause: MistakeCause): string | null {
  if (cause.tag) return cause.tag;
  const motif = cause.motif ? MOTIF_OF_TACTIC[cause.motif] : null;
  const KIND_TAG: Record<MistakeCauseKind, string | null> = {
    'allowed-mate': 'missed-their-mate', 'missed-mate': 'missed-your-mate',
    'took-guarded': 'bad-trade-material', 'eyed-guarded': 'overvalued-attack', 'answered-by-check': 'missed-opponents-threat',
    'left-hanging': 'hung-material', 'abandoned-defender': 'hung-material', 'abandoned-fork-square': 'missed-their-fork', 'walks-into-fork': 'missed-their-fork',
    'allowed-tactic': motif ? MOTIFS[motif].theirs ?? 'missed-opponents-threat' : 'missed-opponents-threat',
    'allowed-capture': 'hung-material', 'allowed-threat': 'missed-opponents-threat', 'king-hunt': 'weakened-king-safety', 'ignored-threat': 'missed-opponents-threat',
    'missed-win': motif ? MOTIFS[motif].yours ?? 'missed-tactic' : 'missed-tactic',
    stalemate: 'botched-conversion', 'technique-broken': 'botched-conversion', 'passer-handed': 'allowed-counterplay',
    'compensation-lost': 'overvalued-attack', 'traded-into-target': 'created-pawn-weakness', 'colour-conceded': 'bad-trade',
    'tempo-wasted': 'tempo-handed', positional: null, unexplained: null,
  };
  return KIND_TAG[cause.kind];
}

// ── the composer ───────────────────────────────────────────────────────────
export type SilentWhy = 'no-cause' | 'no-recovery' | 'missing-slot' | 'record-green' | 'below-floor' | 'decided-game';

export interface MistakeLesson {
  text: string | null;
  slots: Partial<Record<LessonSlot, string>>;
  silentWhy: SilentWhy | null;
  repairState: RepairState | null;
  heat: HeatState | null;
  /** The stems this turn used (the next turn's `lastStems`). */
  stems: string[];
  /** The skill a spoken lesson taught (the next turn's `taught`). */
  taughtTag: string | null;
  /** The habit this turn said, by its key (the next turn's `habits`). */
  habitKey?: string | null;
  /** Slots the board-truth gate dropped (a fill false on the board). */
  dropped?: number;
}

/** FOLD A TURN INTO THE GAME'S MEMORY. `fenNow` is the board after the turn's
 *  move (and their reply, if played): a repair state said before that no longer
 *  holds there is cleared (refinement 3), so it is said again if it returns. */
export function nextGameMemory(memory: MistakeGameMemory, out: MistakeLesson | null, fenNow: string, student: Color): MistakeGameMemory {
  const taught = new Set(memory.taught);
  const repairs = new Set<RepairState>();
  for (const r of memory.repairs) if (repairStillHolds(r, fenNow, student)) repairs.add(r);
  if (out?.text) {
    if (out.taughtTag) taught.add(out.taughtTag);
    if (out.repairState) repairs.add(out.repairState);
  }
  const habits = new Set(memory.habits);
  if (out?.text && out.habitKey) habits.add(out.habitKey);
  return {
    taught, repairs, habits,
    recentStems: out?.text ? [...memory.recentStems, new Set(out.stems)].slice(-STEM_MEMORY_TURNS) : memory.recentStems,
    lastHadHabit: out?.text ? !!out.habitKey : memory.lastHadHabit,
  };
}

/** Does a said repair state still hold on this board? The material states by
 *  the ledger; the structural ones while the board still shows the cause. */
function repairStillHolds(state: RepairState, fen: string, student: Color): boolean {
  const l = (student === 'w' ? 1 : -1) * materialBalance(fen);
  const them: Color = student === 'w' ? 'b' : 'w';
  switch (state) {
    case 'down-queen': return l <= -5;
    case 'down-exchange': case 'down-piece-middlegame': case 'down-piece-endgame': case 'down-material-queens-off': return l <= -2;
    case 'down-pawn-middlegame': case 'down-pawn-endgame': return l <= -1;
    case 'up-material': return l >= 1;
    case 'king-exposed': { const k = kingSafetyRead(fen, student); return !!k && k.shieldPawns <= 1; }
    case 'attack-their-king': { const k = kingSafetyRead(fen, them); return !!k && k.shieldPawns <= 1; }
    // A plan is no state to hold: the next mistake reads the board afresh.
    case 'plan': return false;
    // The board states: while the board still shows them (their own check,
    // on this board), so a pin broken and set again is said again.
    case 'king-in-centre': case 'behind-in-development': case 'piece-trapped': case 'pinned-piece': case 'pawn-lever': case 'loose-pieces':
      return boardStateFills(state, fen, student) !== null;
    default: return true;
  }
}

export function composeMistakeLesson(input: MistakeLessonInput): MistakeLesson {
  const out = composeInner(input);
  if (input.log !== false) logMistakeLesson(input, out);
  return out;
}

const KING_ZONE = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
/** The squares the side's king could step to (empty or theirs, not attacked). */
function flights(c: Chess, side: Color): number {
  const k = c.findPiece({ type: 'k', color: side })[0];
  if (!k) return 0;
  const them: Color = side === 'w' ? 'b' : 'w';
  let n = 0;
  for (const [df, dr] of KING_ZONE) {
    const f = k.charCodeAt(0) - 97 + df; const r = Number(k[1]) + dr;
    if (f < 0 || f > 7 || r < 1 || r > 8) continue;
    const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
    const p = c.get(sq);
    if (p && p.color === side) continue;
    if (c.attackers(sq, them).length === 0) n += 1;
  }
  return n;
}

/** WHAT THE BETTER MOVE DID, as a job a principle can name — read off the
 *  board, never its prose (which names the move). No job → null: the BETTER
 *  slot is silent rather than a line that restates the mistake. */
export function betterJob(input: MistakeLessonInput, fills: Fills): { job: BetterJob; fills: Fills } | null {
  if (!input.bestSan) return null;
  let start: Chess; let best: Chess; let played: Chess; let bm; let mover: Color;
  try {
    start = new Chess(input.fenBefore); mover = start.turn();
    best = new Chess(input.fenBefore); bm = best.move(input.bestSan);
    played = new Chess(input.fenBefore); if (!played.move(input.playedSan)) return null;
  } catch { return null; }
  if (!bm) return null;
  const kind = input.ew.cause.kind;
  if ((kind === 'allowed-mate' || kind === 'king-hunt') && flights(best, mover) > flights(played, mover)) return { job: 'cover-king', fills };
  if (kind === 'missed-mate' && /[+#]/.test(bm.san)) return { job: 'force-mate', fills };
  if (bm.captured && capturesWinMaterial(input.fenBefore, bm.to, mover)) return { job: 'take-loose', fills: { ...fills, cap: NAME[bm.captured] } };
  if (fills.target && bm.from === fills.target && fills.tPiece) return { job: 'save-piece', fills };
  if (fills.opSq && bm.to === fills.opSq && bm.captured && fills.opPiece) return { job: 'take-attacker', fills };
  if (fills.target && fills.tPiece && start.get(fills.target as Square)?.color === mover
    && best.attackers(fills.target as Square, mover).length > start.attackers(fills.target as Square, mover).length) return { job: 'guard-piece', fills };
  if (/^O-O/.test(bm.san)) return { job: 'castle', fills };
  const home = mover === 'w' ? '1' : '8';
  if ((bm.piece === 'n' || bm.piece === 'b') && bm.from[1] === home) {
    const threat = best.board().flat().some((p) => !!p && p.color !== mover && p.type !== 'p' && best.attackers(p.square, mover).includes(bm.to));
    return { job: threat ? 'develop-threat' : 'develop', fills };
  }
  const tag = (() => { try { return bestJobReason(input.fenBefore, input.bestSan)?.tag ?? null; } catch { return null; } })();
  if (tag === 'mistimed-pawn-break') return { job: 'pawn-break', fills };
  if (tag === 'passed-pawn-neglected') return { job: 'push-passer', fills };
  if (tag === 'passive-king-endgame') return { job: 'king-up', fills };
  return null;
}

function composeInner(input: MistakeLessonInput): MistakeLesson {
  const cause = input.ew.cause;
  const silent = (why: SilentWhy, slots: MistakeLesson['slots'] = {}, heat: HeatState | null = null): MistakeLesson => ({ text: null, slots, silentWhy: why, repairState: null, heat, stems: [], taughtTag: null });
  const cost = input.costCp ?? 0;
  if (cause.kind === 'unexplained') return silent('no-cause');
  if (input.evalBeforeCp != null && Math.abs(input.evalBeforeCp) >= DECIDED_EVAL_CP) return silent('decided-game');
  // The floor in force: a mistake speaks; an inaccuracy only with a mechanism
  // a computer shows (any cause but the positional reading).
  // A mate allowed or missed, and a stalemate, speak whatever the cost read.
  const decisive = cause.kind === 'allowed-mate' || cause.kind === 'missed-mate' || cause.kind === 'stalemate';
  if (!decisive && (cost < INACCURACY_CP || (cost < MISTAKE_CP && cause.kind === 'positional'))) return silent('below-floor');
  // A win THEY missed is the student's own piece left loose: its lesson is
  // worded to the side that could take, so it has no form for their seat.
  if (input.seat === 'them' && (cause.kind === 'missed-win' || cause.kind === 'missed-mate')) return silent('missing-slot');
  const tag = habitTag(cause);
  const heat = tag ? holdState(input.holdOf(tag)) : 'grey';
  // THEIR mistake is said by the record: green silent, amber one clause.
  if (input.seat === 'them' && heat === 'green') return silent('record-green', {}, heat);
  const yours = input.seat === 'you';
  // ROTATION: each slot keyed on the board, the game's ply and the slot, so
  // two boards never move in step; the previous turn's stems are skipped.
  const keyOf = (slot: string): number => stemKeyOf(`${input.fenBefore}|${input.playedSan}|${input.ply ?? ''}|${slot}`);
  const avoid = recentStemsOf(input.memory);
  const fills = fillsFor(input);
  // A "free piece" is a capture, not a tactic: it is told as one.
  const kind: MistakeCauseKind = cause.kind === 'allowed-tactic' && cause.motif && MOTIF_OF_TACTIC[cause.motif] === 'free-piece' ? 'allowed-capture' : cause.kind;
  const recipe = RECIPES[kind];
  const posTag = cause.kind === 'positional' && cause.tag ? cause.tag : null;
  const forms: { lesson: SlotRecipe | null; consequence: SlotRecipe | null } = (() => {
    // A cause reader's fact is told by its own lesson; the consequence is the
    // cause's own.
    const reader = causeReaderKey(cause.detail);
    if (reader) {
      const own = yours ? (posTag ? POSITIONAL[posTag] : recipe) : (posTag ? POSITIONAL_THEM[posTag] : THEIR_SEAT[kind]);
      return { lesson: CAUSE_READER_LESSONS[reader][yours ? 'yours' : 'theirs'], consequence: own?.consequence ?? null };
    }
    if (yours) {
      if (posTag) { const p = POSITIONAL[posTag]; return { lesson: p?.lesson ?? null, consequence: p?.consequence ?? null }; }
      // A queen the better move would have trapped.
      if (kind === 'missed-win' && fills.trapped) return { lesson: TRAPPED_LESSON, consequence: recipe.consequence };
      // A missed fork is told as a fork, with both targets.
      if (kind === 'missed-win' && fills.a && fills.b) return { lesson: FORK_LESSON.yours, consequence: recipe.consequence };
      // A missed tactic is told by its motif, with the piece its line wins.
      if (kind === 'missed-win' && fills.motif) return { lesson: MISSED_MOTIF, consequence: recipe.consequence };
      // A check that just gets blocked or stepped out of says so.
      if (kind === 'tempo-wasted' && fills.answer) return { lesson: EMPTY_CHECK_LESSON, consequence: null };
      return { lesson: recipe.lesson, consequence: recipe.consequence };
    }
    if (posTag) { const p = POSITIONAL_THEM[posTag]; return { lesson: p?.lesson ?? null, consequence: p?.consequence ?? null }; }
    const t = THEIR_SEAT[kind];
    return { lesson: t?.lesson ?? null, consequence: t?.consequence ?? null };
  })();
  const slots: MistakeLesson['slots'] = {};
  const stems: string[] = [];
  // THE BOARD-TRUTH GATE: every "your/their/the {piece} on {square}" a slot
  // says is checked on the board it describes (after the move, or after their
  // reply once it is played) — type AND colour. A slot that fails is dropped.
  const boards = boardsFor(input);
  const studentColor: Color = (() => { const t = new Chess(input.fenBefore).turn(); return yours ? t : (t === 'w' ? 'b' : 'w'); })();
  let dropped = 0;
  const say = (slot: LessonSlot, r: SlotRecipe | null | undefined, f: Fills): void => {
    const x = renderMistakeSlot(r, f, keyOf(slot), avoid);
    if (!x) return;
    if (!boardTrue(x.text, boards, studentColor)) { dropped += 1; return; }
    slots[slot] = x.text; stems.push(x.stem);
  };
  // After their lesson, the student's opens on "Your…"/"You…" (seat-led).
  const led = input.seatLed && forms.lesson ? forms.lesson.stems.filter((x) => /^(?:Your|You)\b/.test(x)) : [];
  say('lesson', led.length > 0 && forms.lesson ? { ...forms.lesson, stems: led } : forms.lesson, fills);
  if (!slots.lesson) return { ...silent('missing-slot', slots, heat), dropped };
  // A SMALL MISTAKE ON A SKILL TAUGHT THIS GAME: the lesson alone (refinement 2).
  if (cost < MISTAKE_CP && tag && input.memory.taught.has(tag)) {
    return { text: slots.lesson, slots, silentWhy: null, repairState: null, heat, stems, taughtTag: tag, dropped };
  }
  // Their reply, once played, carries the consequence when it took the loss.
  if (yours && fills.theirMove && fills.what && /took/.test(fills.theirMove)) say('consequence', THEIR_MOVE_CONSEQUENCE, fills);
  else say('consequence', forms.consequence, fills);
  if (!(input.seat === 'them' && heat === 'short')) {
    const job = betterJob(input, fills);
    // THE BETTER JOB MUST BE ABOUT THE SAME THING AS THE CAUSE (David: every
    // sentence must make sense): its piece, square or target — else silent.
    if (job && betterRelevant(job.job, cause, posTag)) say('better', yours ? BETTER_JOBS[job.job].yours : BETTER_JOBS[job.job].theirs, job.fills);
  }
  const repair = repairFor(input, posTag ? POSITIONAL[posTag]?.repairs ?? [] : recipe.repairs, keyOf('repair'))
    ?? (yours ? planRepair(input) : null);
  if (!repair) return { ...silent('no-recovery', slots, heat), dropped };
  // The repair is said when the state begins, not on every mistake inside it
  // (refinement 3): a state already said this game and still holding is quiet.
  const repeated = input.memory.repairs.has(repair.state);
  if (!repeated && boardTrue(repair.text, boards, studentColor)) { slots.repair = repair.text; stems.push(repair.stem); }
  // THE HABIT: once a game per skill (again only while RED), never two turns
  // running.
  const habitKey = tag ?? kind;
  const habitOk = !input.memory.lastHadHabit && (!input.memory.habits.has(habitKey) || heat === 'red');
  if (yours && habitOk) {
    if (heat === 'red' || heat === 'grey') say('habit', recipe.habit, fills);
    else if (heat === 'short') { const h = rotateStem(HABIT_SHORT[recipe.family], keyOf('habit')); slots.habit = h; stems.push(h); }
  }
  // AMBER on their mistake: the lesson and its repair, one clause each.
  const order: LessonSlot[] = input.seat === 'them' && heat === 'short' ? ['lesson', 'repair'] : ['lesson', 'consequence', 'better', 'repair', 'habit'];
  const text = order.map((sl) => slots[sl]).filter((x): x is string => !!x).join(' ');
  return { text, slots, silentWhy: null, repairState: repair.state, heat, stems, taughtTag: tag, habitKey: slots.habit ? habitKey : null, dropped };
}

/** The boards a turn's words may describe: after the move, and after their
 *  reply (as played, else the engine's) on the student's own mistake. */
function boardsFor(input: MistakeLessonInput): Chess[] {
  const out: Chess[] = [];
  try {
    const c = new Chess(input.fenBefore); if (!c.move(input.playedSan)) return out;
    out.push(new Chess(c.fen()));
    if (input.seat === 'you') {
      // Their reply as played, else the engine's: the board a consequence
      // ("their bishop on f6 will feel at home") is about.
      const r = new Chess(c.fen());
      try {
        const m = input.theirReplySan ? r.move(input.theirReplySan) : (input.replyLineUci[0] ? play(r, input.replyLineUci[0]) : null);
        if (m) out.push(r);
      } catch { /* not their move */ }
    }
  } catch { /* no board */ }
  return out;
}

const PIECE_OF: Record<string, PieceSymbol> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
/** Every "your/their/the {piece} on {sq}" in the text holds on one of the
 *  boards: the piece type, and the colour when the owner is named ("your" is
 *  the student's side, "their" the other). */
export function boardTrue(text: string, boards: readonly Chess[], student: Color): boolean {
  if (!boards.length) return true;
  const re = /\b(your|their|the)\s+(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi;
  for (const m of text.matchAll(re)) {
    const owner = m[1].toLowerCase();
    const type = PIECE_OF[m[2].toLowerCase()];
    const sq = m[3] as Square;
    const ok = boards.some((b) => {
      const p = b.get(sq);
      if (!p || p.type !== type) return false;
      if (owner === 'the') return true;
      return owner === 'your' ? p.color === student : p.color !== student;
    });
    if (!ok) return false;
  }
  return true;
}

/** Which jobs answer which causes: a job said beside an unrelated cause is
 *  two ideas in one turn (worst 4, 5, 7 of the 2026-11-24 sample). The jobs
 *  that carry the cause's own piece (save, guard, remove the attacker) are
 *  relevant by construction — their fill IS the cause's target. */
function betterRelevant(job: BetterJob, cause: MistakeCause, posTag: string | null): boolean {
  const k = cause.kind;
  switch (job) {
    case 'save-piece': case 'guard-piece': case 'take-attacker': return true;
    case 'cover-king': return k === 'allowed-mate' || k === 'king-hunt';
    case 'force-mate': return k === 'missed-mate';
    case 'take-loose': return k === 'missed-win' || k === 'compensation-lost' || k === 'tempo-wasted' || k === 'eyed-guarded';
    case 'castle': return k === 'king-hunt' || posTag === 'king-stuck-center' || posTag === 'weakened-king-safety' || cause.tag === 'king-stuck-center';
    case 'develop-threat': case 'develop': return k === 'tempo-wasted' || posTag === 'neglected-development' || cause.tag === 'neglected-development';
    case 'pawn-break': return posTag === 'mistimed-pawn-break' || posTag === 'space-conceded';
    case 'push-passer': return k === 'passer-handed' || posTag === 'passed-pawn-neglected';
    case 'king-up': return k === 'technique-broken' || posTag === 'passive-king-endgame';
  }
}

/** THE GOOD DECISION (refinement 1): the student found a real decision — the
 *  only move (`onlyMove`) or the prophylactic move (`findProphylaxis`), never a
 *  recapture — and the skill is
 *  still red or grey on the record: one short line on why it worked. Proven
 *  (amber, green) → null. `lines`: the engine's fan before the move. */
export function composeGoodDecision(input: {
  fenBefore: string; playedSan: string;
  lines: ReadonlyArray<{ evaluation: number; mate?: number | null; moves: readonly string[] }>;
  holdOf: (tag: string) => HoldRecord | undefined;
  ply?: number;
  memory: MistakeGameMemory;
  /** Their move before it: a recapture on the square it took on is no decision. */
  priorMove: { fenBefore: string; san: string } | null;
  /** Their lesson is said first this turn: the line opens on "Your…". */
  seatLed?: boolean;
}): { text: string; kind: GoodDecision; stem: string } | null {
  let mv;
  try { mv = new Chess(input.fenBefore).move(input.playedSan); } catch { return null; }
  if (!mv) return null;
  const prev = (() => { try { return input.priorMove ? new Chess(input.priorMove.fenBefore).move(input.priorMove.san) : null; } catch { return null; } })();
  if (mv.captured && prev?.captured && prev.to === mv.to) return null;
  const uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
  const key = (k: string): number => stemKeyOf(`${input.fenBefore}|${input.playedSan}|${input.ply ?? ''}|good:${k}`);
  const open = (tag: string): boolean => { const h = holdState(input.holdOf(tag)); return h === 'red' || h === 'grey'; };
  const say = (kind: GoodDecision, f: Fills): { text: string; kind: GoodDecision; stem: string } | null => {
    const r = GOOD_DECISION[kind];
    const led = input.seatLed ? r.stems.filter((x) => /^(?:Your|You)\b/.test(x)) : [];
    const x = renderMistakeSlot(led.length ? { ...r, stems: led } : r, f, key(kind), recentStemsOf(input.memory));
    return x ? { ...x, kind } : null;
  };
  const only = (() => { try { return onlyMove(input.fenBefore, uci, input.lines.map((l) => ({ evaluation: l.evaluation, mate: l.mate ?? null, moves: l.moves }))); } catch { return null; } })();
  if (only && open('calculation-depth')) return say('only-move', { gives: only.gives.replace(/^gives up /, 'give up ') });
  const pro = (() => { try { return findProphylaxis(input.fenBefore); } catch { return null; } })();
  if (pro && pro.prevention.from === mv.from && pro.prevention.to === mv.to && open('missed-opponents-threat')) return say('prophylaxis', { victim: NAME[pro.victim.piece] });
  return null;
}

/** The `mistake-lesson` row: one per mistake turn, spoken or not. No FEN and
 *  no text — the gaps are counted on real users by cause, tag and phase. */
export function mistakeLessonRow(input: MistakeLessonInput, out: MistakeLesson): Record<string, unknown> {
  let phase: string | null = null;
  try { phase = phaseOfFen(input.fenBefore); } catch { phase = null; }
  return {
    seat: input.seat,
    cost_cp: input.costCp,
    phase,
    surface: input.surface,
    cause: input.ew.cause.kind === 'unexplained' ? null : input.ew.cause.kind,
    motif: input.ew.cause.motif,
    tag: input.ew.cause.tag,
    spoken: out.text !== null,
    silent_why: out.silentWhy,
    slots_filled: LESSON_SLOTS.filter((s) => !!out.slots[s]),
  };
}

function logMistakeLesson(input: MistakeLessonInput, out: MistakeLesson): void {
  const row = mistakeLessonRow(input, out);
  try {
    void logAppAudit({
      kind: 'mistake-lesson', category: 'subsystem', source: 'mistakeLesson',
      summary: [input.seat, input.ew.cause.kind, out.text ? 'spoken' : `silent:${out.silentWhy ?? ''}`].join(' '),
      context: JSON.stringify(row),
    });
  } catch { /* the row never breaks the turn */ }
}

/** Every stem in the table, for the gate. `seat` says which seat reads it. */
export function allSlotsForTests(): Array<{ where: string; stems: readonly string[]; seat: 'you' | 'them' | 'student' }> {
  const out: Array<{ where: string; stems: readonly string[]; seat: 'you' | 'them' | 'student' }> = [];
  for (const [k, r] of Object.entries(RECIPES)) {
    for (const sl of ['lesson', 'consequence', 'habit'] as const) { const x = r[sl]; if (x) out.push({ where: `${k}.${sl}`, stems: x.stems, seat: 'you' }); }
  }
  for (const [k, r] of Object.entries(THEIR_SEAT)) {
    if (!r) continue;
    out.push({ where: `them:${k}.lesson`, stems: r.lesson.stems, seat: 'them' });
    if (r.consequence) out.push({ where: `them:${k}.consequence`, stems: r.consequence.stems, seat: 'them' });
  }
  for (const [k, r] of Object.entries(POSITIONAL)) {
    if (!r) continue;
    out.push({ where: `positional:${k}.lesson`, stems: r.lesson.stems, seat: 'you' });
    if (r.consequence) out.push({ where: `positional:${k}.consequence`, stems: r.consequence.stems, seat: 'you' });
  }
  for (const [k, r] of Object.entries(POSITIONAL_THEM)) {
    if (!r) continue;
    out.push({ where: `positional-them:${k}.lesson`, stems: r.lesson.stems, seat: 'them' });
    if (r.consequence) out.push({ where: `positional-them:${k}.consequence`, stems: r.consequence.stems, seat: 'them' });
  }
  for (const [k, r] of Object.entries(BETTER_JOBS)) { out.push({ where: `better:${k}`, stems: r.yours.stems, seat: 'you' }); out.push({ where: `better-them:${k}`, stems: r.theirs.stems, seat: 'them' }); }
  out.push({ where: 'fork.yours', stems: FORK_LESSON.yours.stems, seat: 'you' });
  out.push({ where: 'trapped', stems: TRAPPED_LESSON.stems, seat: 'you' });
  for (const [k, r] of Object.entries(CAUSE_READER_LESSONS)) { out.push({ where: `reader:${k}`, stems: r.yours.stems, seat: 'you' }); out.push({ where: `reader-them:${k}`, stems: r.theirs.stems, seat: 'them' }); }
  out.push({ where: 'missed-motif', stems: MISSED_MOTIF.stems, seat: 'you' });
  out.push({ where: 'empty-check', stems: EMPTY_CHECK_LESSON.stems, seat: 'you' });
  out.push({ where: 'their-move.consequence', stems: THEIR_MOVE_CONSEQUENCE.stems, seat: 'you' });
  for (const [k, r] of Object.entries(GOOD_DECISION)) out.push({ where: `good:${k}`, stems: r.stems, seat: 'you' });
  for (const [k, r] of Object.entries(REPAIRS)) if (k !== 'plan') out.push({ where: `repair:${k}`, stems: r.stems, seat: 'student' });
  for (const [k, r] of Object.entries(HABIT_SHORT)) out.push({ where: `habit-short:${k}`, stems: r, seat: 'you' });
  return out;
}

/** THE PLAN AS THE RECOVERY (`planOf`): on the student's own mistake with no
 *  recovery state, the plan the board offers them next — on the board after
 *  their reply, the line's own moves as evidence, no move named. */
function planRepair(input: MistakeLessonInput): { text: string; stem: string; state: RepairState } | null {
  if (input.replyLineUci.length < 2) return null;
  try {
    const c = new Chess(input.fenBefore);
    const mv = c.move(input.playedSan);
    if (!mv) return null;
    const reply = input.replyLineUci[0];
    if (!c.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] })) return null;
    const top = planOf({ fen: c.fen(), lines: [{ rank: 1, evaluation: 0, moves: [...input.replyLineUci.slice(1)], mate: null }], student: mv.color, namesMoves: false }).mover[0];
    // The line's plan names the student's next moves; only the structure's
    // plan (said by its pawn, never its move) is the recovery.
    return top && top.source === 'structure' ? { text: top.text, stem: top.claim, state: 'plan' } : null;
  } catch { return null; }
}

/** Tests only: the plan recovery on its own. */
export const planRepairForTests = planRepair;
