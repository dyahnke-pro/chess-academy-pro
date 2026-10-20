// THINK ALOUD — the speed-run depth (David 2026-10-05: "We mirror the speed
// runs"). Measured on his narration (video -4hTQEnwa7s): ~50 words a move,
// 20-47 on a routine move, 90-133 at a decision; every spoken idea joined by a
// reason. He does not know more facts than our computers — he CHAINS them:
//   what their move changed → what I still owe → on one hand / on the other →
//   the line, their reply in words, ending on what it achieves → "not yet,
//   first this" → what they keep doing wrong.
// Every computer here is a pure board read (G0); the composer only orders and
// joins. Lines are returned as WalkableLine so every spoken line is arrowed.
import { inBookCachedSync } from './masterPlayLookup';
import { MIN_BOOK_GAMES } from './bookDeparture';
import { openSentence } from '../utils/openSentence';
import { Chess, type Square } from 'chess.js';
import type { WalkableLine } from '../types';
import { settledNetForLine } from './exchangeLedger';
import { sayMoveClause } from './spokenMove';
import { countWords } from '../utils/countWords';
import { pvSans, hookCreated, holeAccess } from './moveInsight';
import { walkableLine, lineProof, NO_PROOF, type FactProof, type Proof } from './proof';
import { findProphylaxis, prophylaxisThreatProof } from './prophylaxis';
import { criticalityThresholds } from './criticalityScan';
import { lineSeatAt } from '../utils/andList';
import { kingAttackReads, type KingRead } from './kingAttackReads';
import { readTheirMove } from './opponentMoveReads';
import { threatStoppedBy, playItAnyway } from './opponentMovePurpose';
import { knownAttack } from './attackLibrary';
import { tempoCount } from './tempoCount';
import { homeMinorCount } from './development';
import { legalSeeGainFor } from './positionReadingService';
import type { FactStakes } from './factStakes';
import type { GamePromise } from './learnBoardTeaching';
import { speedRunReads } from './speedRunReads';
import { namesMoves, type NamesStudentMove } from './studentMoveNaming';
import { readBoardAll } from './boardComputers';
import type { TacticType } from '../types';
import { orderReads } from './orderReads';
import { inBetweenMove } from './inBetweenMove';

const cap = (s: string): string => openSentence(s);
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const num = (n: number): string => NUM[n] ?? String(n);

function pawnOnFile(board: Chess, file: string, color: 'w' | 'b'): boolean {
  for (let r = 1; r <= 8; r += 1) {
    const p = board.get(`${file}${r}` as Square);
    if (p && p.type === 'p' && p.color === color) return true;
  }
  return false;
}
function heavyOn(board: Chess, file: string, c: 'w' | 'b'): boolean {
  for (let r = 1; r <= 8; r += 1) {
    const p = board.get(`${file}${r}` as Square);
    if (p && p.color === c && (p.type === 'r' || p.type === 'q')) return true;
  }
  return false;
}
function kingSq(board: Chess, c: 'w' | 'b'): string | null {
  for (const row of board.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === c) return cell.square;
  return null;
}
/** Pawns of `c` directly in front of its king (the shelter rank). */
function shield(board: Chess, c: 'w' | 'b'): number {
  const k = kingSq(board, c);
  if (!k) return 0;
  const f = k.charCodeAt(0); const r = Number(k[1]); const d = c === 'w' ? 1 : -1;
  let n = 0;
  for (const df of [-1, 0, 1]) for (const dr of [1]) {
    const ff = f + df; const rr = r + d * dr;
    if (ff < 97 || ff > 104 || rr < 1 || rr > 8) continue;
    const p = board.get(`${String.fromCharCode(ff)}${rr}` as Square);
    if (p && p.type === 'p' && p.color === c) n += 1;
  }
  return n;
}

export interface LineOutcome {
  /** What the line achieves, as a clause ("the h-file opens", "you come out a knight up"). */
  text: string;
  kind: 'mate' | 'material' | 'file' | 'king' | 'promotion' | 'pawn-ending' | 'none';
}

/**
 * WHAT A LINE ACHIEVES, read where the line ENDS (his "…opening the h-file,
 * which is exactly what I wanted"). In order of weight: mate, promotion,
 * material, a file opened toward their king, their king's pawn cover gone.
 */
export function lineAchieves(startFen: string, sans: readonly string[], me: 'w' | 'b'): LineOutcome {
  let start: Chess; let end: Chess;
  try { start = new Chess(startFen); end = new Chess(startFen); } catch { return { text: '', kind: 'none' }; }
  let promoted = false;
  for (const s of sans) {
    try { const m = end.move(s); if (m.promotion && m.color === me) promoted = true; } catch { break; }
  }
  const them = me === 'w' ? 'b' : 'w';
  if (end.isCheckmate() && end.turn() === them) return { text: 'it is mate', kind: 'mate' };
  if (promoted) return { text: 'your pawn queens', kind: 'promotion' };
  // TRANSFORMING THE ADVANTAGE (game 2, 36.Rxc7+ — "we sacrifice back our
  // exchange in order to get a pawn endgame"): the line ends with only kings
  // and pawns, from a board that had pieces, and you have the extra pawn.
  const piecesOf = (b: Chess): number => b.board().flat().filter((x) => x && x.type !== 'k' && x.type !== 'p').length;
  const pawnsOf = (b: Chess, c: 'w' | 'b'): number => b.board().flat().filter((x) => x && x.type === 'p' && x.color === c).length;
  if (piecesOf(start) > 0 && piecesOf(end) === 0 && pawnsOf(end, me) > pawnsOf(end, them)) {
    return { text: `it becomes a pawn ending and ${pawnsOf(end, me) - pawnsOf(end, them) === 1 ? 'an extra pawn' : `${num(pawnsOf(end, me) - pawnsOf(end, them))} extra pawns`} for you — the advantage changes shape and stays yours`, kind: 'pawn-ending' };
  }
  const net = settledNetForLine(startFen, sans, me);
  if (net !== null && net >= 1) return { text: `you come out ${countWords(net)} up`, kind: 'material' };
  // A sacrifice's compensation is `reviewSacrifice.sacrificeCompensation`'s to
  // say — not a second copy here.
  if (net !== null && net <= -1) return { text: `you come out ${countWords(-net)} down`, kind: 'material' };
  const theirKing = kingSq(end, them);
  if (theirKing) {
    const kf = theirKing.charCodeAt(0);
    for (const df of [0, -1, 1]) {
      const file = String.fromCharCode(kf + df);
      if (file < 'a' || file > 'h') continue;
      // OUR pawn left the file — it is now open (or half-open) for our rooks.
      if (pawnOnFile(start, file, me) && !pawnOnFile(end, file, me) && heavyOn(end, file, me)) return { text: `the ${file}-file opens toward their king`, kind: 'file' };
    }
    if (shield(end, them) < shield(start, them)) return { text: 'their king loses its pawn cover', kind: 'king' };
  }
  return { text: '', kind: 'none' };
}

/**
 * THE LINE IN WORDS — "if I check on g4, he takes my knight, and I take back
 * with the pawn, opening the h-file". Each ply spoken as a clause, their reply
 * named as theirs, ending on what the line achieves. The WalkableLine draws
 * every ply's arrow (David: "When we speak lines we also draw arrows!").
 */
export function sayLine(startFen: string, sans: readonly string[], me: 'w' | 'b', maxPlies = 4): { text: string; line: WalkableLine } | null {
  const used = sans.slice(0, maxPlies);
  const line = walkableLine(startFen, used, used[0] ?? '');
  if (!line || line.plies.length === 0) return null;
  const clauses: string[] = [];
  for (const [i, p] of line.plies.entries()) {
    const said = sayMoveClause(p.san, p.fenBefore);
    const check = p.san.includes('#') ? ', mate' : p.san.includes('+') ? ', check' : '';
    const mover = new Chess(p.fenBefore).turn();
    if (i === 0) clauses.push(`${said}${check}`);
    else {
      // "the f-pawn takes g5" → "their f-pawn takes g5"; "castle short" → "they castle short".
      const owner = mover === me ? 'your' : 'their';
      const subject = mover === me ? 'you' : 'they';
      clauses.push(said.startsWith('the ') ? `${owner} ${said.slice(4)}${check}` : `${subject} ${said}${check}`);
    }
  }
  const out = lineAchieves(startFen, line.plies.map((p) => p.san), me);
  const tail = out.text ? `, and ${out.text}` : '';
  const body = clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join(', ')}, then ${clauses[clauses.length - 1]}`;
  return { text: `${cap(body)}${tail}.`, line };
}

export interface Candidate { san: string; pv: readonly string[]; /** Mover's-seat centipawns. */ cp: number }

/**
 * NOT YET — FIRST THIS (his "I didn't take on h4 right away; Be5 first,
 * hitting the rook, and only then did I take"): a capture is on the board,
 * the engine's move is a different, forcing move, and the capture is still
 * there later in its line.
 */
export function notYet(fen: string, best: Candidate): { text: string; capture: string } | null {
  // ONE DETECTOR (A-plan P7): the in-between move, read by `inBetweenMove`,
  // which the tactic record reads too.
  // `best.pv` is the engine's line in UCI, its first move the best move.
  const ib = inBetweenMove(fen, [...best.pv]);
  if (!ib) return null;
  return {
    capture: ib.capture,
    text: `The capture on ${ib.captureSquare} is not going anywhere. Not yet — first ${sayMoveClause(best.san, fen)}${ib.check ? ' with check' : ''}, and take after.`,
  };
}

export interface Habit { kind: 'tempo' | 'undeveloped' | 'loose' | 'king-pawns'; text: string }

/**
 * WHAT THEY KEEP DOING (his "he keeps moving the same piece in the opening —
 * you punish that by obeying the principles yourself"). The piece-moved-again
 * count is THE tempo computer (`tempoCount`, census P2 #7) — never a second
 * copy here; the queen out early is `ruleException`'s. This adds only the
 * development count: their minors still at home deep into the opening.
 */
export function opponentHabits(sans: readonly string[], opp: 'w' | 'b'): Habit[] {
  return habitsOf(sans, opp, 'their');
}

/** ONE HABIT COMPUTER, BOTH SEATS (A-plan P4, 2026-10-16: the opponent in
 *  Learn is the coach's engine and had NO habits in either audit game, while
 *  the student left pieces loose two and five times and nothing was said).
 *  The same counts, read for whichever side, worded from the student's seat:
 *  "they keep…" for the opponent, "you keep…" for the student — the habit
 *  that finds it next time is the same lesson in both directions. */
export function habitsOf(sans: readonly string[], side: 'w' | 'b', seat: 'their' | 'your'): Habit[] {
  const out: Habit[] = [];
  // THE SAME MISTAKE TWICE IS A HABIT, AND A HABIT IS A PLAN AGAINST THEM
  // (step 5 of the teaching order: "what the opponent keeps doing wrong —
  // closing on the habit that finds it next time"; Learn audit 2026-10-15
  // never heard it). Both read off the moves alone, so every surface that
  // holds the game speaks them.
  const reads = habitReads(sans, side);
  if (reads.looseMoves >= 2) {
    out.push({ kind: 'loose', text: seat === 'their'
      ? `That's ${num(reads.looseMoves)} times now they've left a piece loose under your attack — they don't check what their move leaves behind. After every move of theirs, look first for what they left loose.`
      : `That's ${num(reads.looseMoves)} times now you've left a piece loose under their attack. Before every move, check what it leaves without a guard — that one question saves most pieces.` });
  }
  if (reads.kingPawnPushes >= 2) {
    out.push({ kind: 'king-pawns', text: seat === 'their'
      ? `They keep pushing the pawns in front of their own king — ${num(reads.kingPawnPushes)} so far, and every push leaves a hole beside it. Aim your pieces at those squares.`
      : `You keep pushing the pawns in front of your own king — ${num(reads.kingPawnPushes)} so far, and every push leaves a hole beside it for their pieces. Leave those pawns at home unless the push wins something.` });
  }
  if (seat === 'their') {
    const t = tempoCount(sans, side === 'w' ? 'b' : 'w');
    if (t) out.push({ kind: 'tempo', text: t.text });
  }
  const c = new Chess();
  for (const s of sans.slice(0, 24)) { try { c.move(s); } catch { break; } }
  const home = homeMinorCount(c, side);
  if (Math.min(sans.length, 24) >= 16 && home >= 2) {
    out.push({ kind: 'undeveloped', text: seat === 'their'
      ? `They still have ${num(home)} minor pieces at home — the more they wait, the more you attack.`
      : `You still have ${num(home)} minor pieces at home — bring them out before anything else; a piece at home cannot join the fight.` });
  }
  return out;
}

/** Counted off the moves: how many of their moves left a piece of theirs
 *  winnable by exchange (a capture in progress is a trade, not a habit), and
 *  how many pawn pushes they made in front of their own castled king. */
export function habitReads(sans: readonly string[], opp: 'w' | 'b'): { looseMoves: number; kingPawnPushes: number } {
  const me: 'w' | 'b' = opp === 'w' ? 'b' : 'w';
  let looseMoves = 0;
  let kingPawnPushes = 0;
  const c = new Chess();
  for (const san of sans) {
    let m;
    try { m = c.move(san); } catch { break; }
    if (m.color !== opp) continue;
    if (!m.captured && !c.inCheck()) {
      const fen = c.fen();
      const left = c.board().flat().some((x) => !!x && x.color === opp && x.type !== 'k' && x.type !== 'p'
        && legalSeeGainFor(fen, x.square, me) >= 2);
      if (left) looseMoves += 1;
    }
    if (m.piece === 'p' && !m.captured) {
      const king = c.board().flat().find((x) => x?.type === 'k' && x.color === opp);
      const homeRank = opp === 'w' ? '1' : '8';
      const castled = !!king && king.square[1] === homeRank && 'abcgh'.includes(king.square[0]);
      if (castled && king && Math.abs(m.from.charCodeAt(0) - king.square.charCodeAt(0)) <= 1) kingPawnPushes += 1;
    }
  }
  return { looseMoves, kingPawnPushes };
}

export interface DepthClause {
  kind: 'not-yet' | 'line' | 'their-habit' | 'your-habit' | 'stop-flaw' | 'hole-access' | 'speedrun-read' | 'tactic' | 'king-read'
    | 'equivalence' | 'timing' | 'refuted' | 'capture-choice' | 'plan-race' | 'kick'
    | 'their-read' | 'prevent-test' | 'attack-pattern';
  /** The motif, in the one tactic vocabulary — the weakness join. */
  motif?: TacticType;
  text: string;
  /** The proof the clause rests on (a played line or the squares), or why it
   *  waits — an idea said in place of a held move withholds its proof too. */
  proof?: FactProof;
  /** The line the clause says, from the board it starts on (arrows). */
  lines?: Array<{ fen: string; sans: string[] }>;
  squares?: string[];
  /** What rides on it — handed to the ranker (factStakes). */
  stakes?: FactStakes;
  /** The student's moves the clause names unasked, for the door's hold (OS-10). */
  namesStudentMove?: NamesStudentMove;
  /** A once-per-game claim. */
  claim?: string;
  /** What pays the idea off later (the thread across moves). */
  promise?: GamePromise;
}

/**
 * THE ONE PRODUCER (David 2026-10-05: "Should be from one place"). Every
 * surface gets the speed-run depth from here, as typed facts the one deciding
 * door ranks: what they keep doing, and — only where the surface may NAME the
 * move — "not yet, first this" and the line in words, ending on what it
 * achieves. `nameMove: false` (a held verdict, a withheld puzzle answer)
 * returns the habit alone.
 */
/** The side to move's own previous move, read off the history — only when
 *  replaying it reproduces this board (a history from another start is never
 *  guessed at). */
function ownLastMove(history: readonly string[], fen: string): { fenBefore: string; san: string } | null {
  if (history.length < 2) return null;
  try {
    const c = new Chess();
    let before = '';
    history.forEach((m, i) => { if (i === history.length - 2) before = c.fen(); c.move(m); });
    return c.fen().split(' ')[0] === fen.split(' ')[0] ? { fenBefore: before, san: history[history.length - 2] } : null;
  } catch { return null; }
}

export function depthClauses(args: {
  fen: string;
  history: readonly string[];
  topLines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>;
  studentColor: 'w' | 'b';
  nameMove: boolean;
  /** The student's own last move — what it gave up. */
  lastStudentMove?: { fenBefore: string; san: string };
  /** The opponent's last move — what it opened. */
  lastOpponentMove?: { fenBefore: string; san: string };
}): DepthClause[] {
  const out: DepthClause[] = [];
  try {
    const habit = opponentHabits(args.history, args.studentColor === 'w' ? 'b' : 'w')[0];
    // A HABIT IS SAID ONCE A GAME (Black walk 2026-10-19: "you keep pushing the
    // pawns in front of your own king — two… three… four so far" on every
    // move). The claim is keyed by the habit, never by its count, so the
    // rising number cannot slip a repeat past the say-once ledger.
    if (habit) out.push({ kind: 'their-habit', text: habit.text, claim: `habit:their:${habit.kind}` });
    // …and the student's own, read by the same computer (A-plan P4).
    const mine = habitsOf(args.history, args.studentColor, 'your')[0];
    if (mine) out.push({ kind: 'your-habit', text: mine.text, claim: `habit:your:${mine.kind}` });
    if (args.lastStudentMove) {
      // Counted on the board as it stands now, after their reply.
      const h = holeAccess(args.lastStudentMove.fenBefore, args.lastStudentMove.san, args.fen);
      if (h) out.push({ kind: 'hole-access', text: h.text, squares: [h.hole, ...(h.from ? [h.from] : [])] });
    }
    const toMove = new Chess(args.fen).turn();
    const topUci = args.topLines[0]?.moves?.[0];
    const engineBest = (() => { try { return topUci ? new Chess(args.fen).move({ from: topUci.slice(0, 2), to: topUci.slice(2, 4), promotion: topUci[4] }).san : null; } catch { return null; } })();
    if (toMove === args.studentColor) {
      // Never argue with the engine: the verdict on the stop is its own
      // (game 2, 10.Ng5 — the engine prefers h3, so h3 is the answer, not a flaw).
      const flaw = obviousStopFlaw(args.fen, args.studentColor, args.topLines);
      if (flaw) out.push({ kind: 'stop-flaw', text: flaw.text, proof: flaw.proof, squares: flaw.squares, lines: flaw.lines, ...(flaw.motif ? { motif: flaw.motif } : {}) });
    }
    // READING THEIR MOVE (computers batch 2) — on the student's turn, what
    // their last move threatened quietly, needs, lifted, wrongly expected, or
    // handed you. A read that names your move waits for `nameMove` like the
    // speed-run reads below.
    if (toMove === args.studentColor && args.lastOpponentMove) {
      const own = ownLastMove(args.history, args.fen);
      const prev = own && args.history.length >= 2 ? { fenBefore: own.fenBefore, san: own.san } : null;
      // Learn does not grade their move here: a criticism of it stays silent.
      for (const r of readTheirMove({ fenBefore: args.lastOpponentMove.fenBefore, san: args.lastOpponentMove.san, student: args.studentColor, topLines: args.topLines, prev, theirMoveFlagged: null })) {
        if (r.namesMove && !args.nameMove) continue;
        out.push({ kind: r.kind === 'wedged-pawn' ? 'prevent-test' : 'their-read', text: r.text, proof: r.proof, squares: r.squares, ...(r.stakes ? { stakes: r.stakes } : {}), claim: r.claim });
      }
      // "CAN YOU PLAY IT ANYWAY?" — their move stopped your threat on paper;
      // the engine says the move still works.
      if (args.nameMove && prev) {
        try {
          const mid = new Chess(prev.fenBefore); mid.move(prev.san);
          const stop = threatStoppedBy(prev.fenBefore, mid.fen(), args.lastOpponentMove.san, args.studentColor);
          const any = stop ? playItAnyway(stop, args.fen, args.topLines, args.studentColor) : null;
          const proof = any ? lineProof({ fen: args.fen, sans: any.line }, lineSeatAt(args.fen, args.studentColor)) : null;
          if (any && proof) out.push({ kind: 'prevent-test', text: any.text, proof, squares: any.squares, lines: [{ fen: args.fen, sans: any.line }], claim: `anyway:${any.san}` });
        } catch { /* a bonus */ }
      }
    }
    // A KNOWN ATTACKING STRUCTURE, by its conditions (never "it feels right").
    if (toMove === args.studentColor) {
      const top = args.topLines[0];
      const cp = top ? (top.mate != null ? (top.mate > 0 ? 100000 : -100000) : top.evaluation) * (args.studentColor === 'w' ? 1 : -1) : null;
      const ka = knownAttack(args.fen, args.studentColor, cp);
      if (ka) out.push({ kind: 'attack-pattern', text: ka.text, proof: ka.proof, squares: ka.squares, claim: ka.claim });
    }
    // His habits of thought that name no move: keep the tension, which side to
    // castle, "any move is fine". The ones that name the engine's move (the
    // ugly move, the provoked commitment) wait for nameMove below.
    const reads = toMove === args.studentColor ? speedRunReads({ fen: args.fen, me: args.studentColor, lines: args.topLines, inTheory: inBookCachedSync(args.fen, MIN_BOOK_GAMES), ...(args.lastOpponentMove ? { lastMove: args.lastOpponentMove } : {}), ...((): { lastOwnMove?: { fenBefore: string; san: string } } => { const o = ownLastMove(args.history, args.fen); return o ? { lastOwnMove: o } : {}; })() }) : [];
    const push = (r: (typeof reads)[number], text: string): void => { out.push({ kind: 'speedrun-read', text, ...(r.ideaNames && text === r.idea ? { namesStudentMove: namesMoves(args.studentColor, args.fen, r.ideaNames) } : {}), ...(r.squares && text === r.text ? { squares: r.squares } : {}), ...(r.stakes ? { stakes: r.stakes } : {}), ...(r.claim ? { claim: r.claim } : {}), ...(r.promise ? { promise: r.promise } : {}) }); };
    // ATTACK, SACRIFICES AND KINGS (batch 4) — each read carries its proof.
    const kings = toMove === args.studentColor ? kingAttackReads({ fen: args.fen, me: args.studentColor, lines: args.topLines }) : [];
    const pushKing = (r: KingRead, text: string): void => { out.push({ kind: 'king-read', text, squares: r.squares, proof: text === r.text ? r.proof : NO_PROOF.withheld, ...(r.stakes ? { stakes: r.stakes } : {}), ...(r.claim ? { claim: r.claim } : {}), ...(r.lines && text === r.text ? { lines: r.lines } : {}) }); };
    for (const r of kings.filter((x) => !x.namesMove)) pushKing(r, r.text);
    for (const r of reads.filter((x) => !x.namesMove)) push(r, r.text);
    // THE LINE TACTICS (tacticGeometry, via the one registry): each read
    // carries its proof. One that names the engine's move speaks it only where
    // the move is earned; elsewhere its idea, as a habit of thought.
    if (toMove === args.studentColor) {
      const geo = readBoardAll('tacticGeometry', { fen: args.fen, me: args.studentColor, pv: args.topLines[0]?.moves ?? [], register: 'live', ...(args.lastOpponentMove ? { lastOpponentMove: args.lastOpponentMove } : {}) });
      for (const g of geo) {
        if (g.namesMove && !args.nameMove) {
          if (g.idea) out.push({ kind: 'speedrun-read', text: g.idea.text, proof: g.idea.proof, ...(g.idea.squares.length ? { squares: [...g.idea.squares] } : {}), claim: `${g.key}:idea` });
          continue;
        }
        out.push({ kind: 'tactic', text: g.text, squares: g.squares, claim: g.key, ...('kind' in g.proof ? { proof: g.proof } : {}), ...(g.stakes ? { stakes: g.stakes } : {}), ...(g.motif ? { motif: g.motif } : {}), ...(g.lines ? { lines: g.lines.map((l) => ({ fen: l.fen, sans: [...l.sans] })) } : {}) });
      }
    }
    // BATCH 1 — opening equivalence, order and timing (`orderReads`), each
    // with its proof. The ones that name the student's move wait for nameMove.
    const order = orderReads({ fen: args.fen, history: args.history, student: args.studentColor, topLines: args.topLines, engineBest });
    const pushOrder = (o: (typeof order)[number]): void => { out.push({ kind: o.kind, text: o.text, proof: o.proof, squares: o.squares, claim: o.claim, ...(o.lines ? { lines: o.lines } : {}), ...(o.stakes ? { stakes: o.stakes } : {}) }); };
    for (const o of order.filter((x) => !x.namesMove)) pushOrder(o);
    // A read that names the move speaks it only where the move is earned;
    // elsewhere it speaks its IDEA — the habit of thought without the answer.
    if (!args.nameMove || toMove !== args.studentColor) {
      for (const r of reads.filter((x) => x.namesMove && x.idea)) push(r, r.idea as string);
      for (const r of kings.filter((x) => x.namesMove && x.idea)) pushKing(r, r.idea as string);
      return out;
    }
    for (const r of reads.filter((x) => x.namesMove)) push(r, r.text);
    for (const r of kings.filter((x) => x.namesMove)) pushKing(r, r.text);
    for (const o of order.filter((x) => x.namesMove)) pushOrder(o);
    const top = args.topLines[0];
    const uci = top?.moves?.[0];
    if (!top || !uci) return out;
    let bestSan: string;
    try { bestSan = new Chess(args.fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return out; }
    const best: Candidate = { san: bestSan, pv: top.moves, cp: top.evaluation };
    const ny = notYet(args.fen, best);
    if (ny) out.push({ kind: 'not-yet', text: ny.text });
    const sans = pvSans(args.fen, [...best.pv], 6);
    // Material and mate are THE ledger's to say (`deliberation`'s played-out
    // line, `moverLineProof`): the line fact speaks only the outcomes the ledger
    // has no words for — a file opening, the king's cover, a pawn ending, an
    // investment, a pawn queening.
    const outcome = lineAchieves(args.fen, sans.slice(0, 4), args.studentColor);
    const said = outcome.kind !== 'material' && outcome.kind !== 'mate' && outcome.kind !== 'none' ? sayLine(args.fen, sans, args.studentColor) : null;
    if (said) {
      out.push({
        kind: 'line',
        text: said.text,
        lines: [{ fen: args.fen, sans: said.line.plies.map((p) => p.san) }],
        squares: said.line.plies.flatMap((p) => [p.uci.slice(0, 2), p.uci.slice(2, 4)]),
      });
    }
  } catch { /* depth is a bonus, never a blocker */ }
  return out;
}

// ── THE REST OF HIS GAME-2 READ (full transcript, 2026-10-05) ────────────────

/**
 * THE OBVIOUS STOP THAT DOESN'T WORK (his "what does Black want? …Bg4, a nasty
 * pin. The obvious move is h3 — why don't I want it? h3 creates a hook").
 *
 * ONE COMPUTER OWNS THEIR WANTED PIN, KICK OR FORK (OS-1 root cause 1):
 * `findProphylaxis` finds it and its stop; this reads only the VERDICT on that
 * stop. A pawn stop that hands them a hook is the obvious stop that fails only
 * when the ENGINE agrees — it ranked the stop a notable step below the best
 * move. Otherwise the
 * stop is the held answer (the prophylaxis lane), never both: the two used to
 * say "one move stops it" and "find another way" about the same h3.
 * The clause is ONE fact: the threat and the verdict in one text, carrying the
 * threat's line from the board where they would play it, its squares and an
 * exact proof — so it is graded on the board it is about.
 */
export function obviousStopFlaw(
  fen: string,
  me: 'w' | 'b',
  topLines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>,
): { threatSan: string; stopSan: string; text: string; proof: Proof; squares: string[]; lines: Array<{ fen: string; sans: string[] }>; motif?: TacticType } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== me) return null;
  const p = findProphylaxis(fen);
  if (!p || p.prevention.piece !== 'p') return null;
  const hook = hookCreated(fen, p.prevention.san);
  if (!hook) return null;
  if (!stopRefuted(fen, `${p.prevention.from}${p.prevention.to}`, topLines)) return null;
  const verb = p.kind === 'pin' ? 'pinning' : p.kind === 'fork' ? 'forking' : 'hitting';
  const theirTurn = p.threat.line.fen;
  return {
    threatSan: p.intent.san,
    stopSan: p.prevention.san,
    text: `They want ${sayMoveClause(p.intent.san, theirTurn)}, ${verb} your ${PIECE_WORD[p.victim.piece] ?? 'piece'} on ${p.victim.square}. The obvious stop is ${sayMoveClause(p.prevention.san, fen)}, but that pawn becomes a hook for their pawn on ${hook.pawn} — find another way.`,
    proof: prophylaxisThreatProof(p),
    squares: [...p.threat.squares],
    lines: [{ fen: p.threat.line.fen, sans: [...p.threat.line.sans] }],
    ...(p.threat.motif ? { motif: p.threat.motif } : {}),
  };
}

const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The engine's verdict on a stop (UCI): refuted only when the engine ranked
 *  it and it sits a notable step below the best line. */
function stopRefuted(fen: string, uci: string, lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>): boolean {
  if (lines.length === 0) return false;
  const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
  const cp = (l: { evaluation: number; mate: number | null }): number => (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation) * sign;
  const at = lines.findIndex((l) => l.moves[0]?.slice(0, 4) === uci);
  if (at === 0) return false;
  // Absent from the lines, its value is unknown — a MultiPV list can hold
  // worse moves than the stop (h3 −0.31 at d20 sat below Ng5 −0.41 on the
  // OS-1 board), so absence is never a refutation.
  return at > 0 && cp(lines[0]) - cp(lines[at]) >= criticalityThresholds().notable;
}
