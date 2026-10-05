// THINK ALOUD — the speed-run depth (David 2026-10-05: "We mirror the speed
// runs"). Measured on his narration (video -4hTQEnwa7s): ~50 words a move,
// 20-47 on a routine move, 90-133 at a decision; every spoken idea joined by a
// reason. He does not know more facts than our computers — he CHAINS them:
//   what their move changed → what I still owe → on one hand / on the other →
//   the line, their reply in words, ending on what it achieves → "not yet,
//   first this" → what they keep doing wrong.
// Every computer here is a pure board read (G0); the composer only orders and
// joins. Lines are returned as WalkableLine so every spoken line is arrowed.
import { Chess, type Square } from 'chess.js';
import type { WalkableLine } from '../types';
import { CAPTURE_VALUE } from './pieceValues';
import { settledNetForLine } from './exchangeLedger';
import { sayMoveClause } from './spokenMove';
import { countWords } from '../utils/countWords';
import { walkableLine, pvSans, hookCreated, holeAccess } from './moveInsight';
import { tempoCount } from './tempoCount';
import { homeMinorCount } from './development';
import type { FactStakes } from './factStakes';
import { speedRunReads } from './speedRunReads';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
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
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const first = (() => { try { return new Chess(fen).move(best.san); } catch { return null; } })();
  if (!first || first.captured) return null;
  // FORCING: a check, or a new hit on a piece worth at least the mover.
  const after = new Chess(fen); after.move(best.san);
  const forcing = first.san.includes('+') || after.board().flat().some((x) => {
    if (!x || x.color === first.color || x.type === 'p' || x.type === 'k') return false;
    try { return after.attackers(x.square, first.color).includes(first.to) && (CAPTURE_VALUE[x.type] ?? 0) >= (CAPTURE_VALUE[first.piece] ?? 0); } catch { return false; }
  });
  if (!forcing) return null;
  const caps = board.moves({ verbose: true }).filter((m) => m.captured);
  const sans = pvSans(fen, [...best.pv], 8);
  for (let i = 2; i < sans.length; i += 2) {
    const later = caps.find((m) => sans[i]?.replace(/[+#]/g, '').endsWith(m.to) && sans[i].includes('x'));
    if (later) {
      return {
        capture: later.san,
        text: `The capture on ${later.to} is not going anywhere. Not yet — first ${sayMoveClause(best.san, fen)}${first.san.includes('+') ? ' with check' : ''}, and take after.`,
      };
    }
  }
  return null;
}

export interface Habit { kind: 'tempo' | 'undeveloped'; text: string }

/**
 * WHAT THEY KEEP DOING (his "he keeps moving the same piece in the opening —
 * you punish that by obeying the principles yourself"). The piece-moved-again
 * count is THE tempo computer (`tempoCount`, census P2 #7) — never a second
 * copy here; the queen out early is `ruleException`'s. This adds only the
 * development count: their minors still at home deep into the opening.
 */
export function opponentHabits(sans: readonly string[], opp: 'w' | 'b'): Habit[] {
  const out: Habit[] = [];
  const t = tempoCount(sans, opp === 'w' ? 'b' : 'w');
  if (t) out.push({ kind: 'tempo', text: t.text });
  const c = new Chess();
  for (const s of sans.slice(0, 24)) { try { c.move(s); } catch { break; } }
  const home = homeMinorCount(c, opp);
  if (Math.min(sans.length, 24) >= 16 && home >= 2) out.push({ kind: 'undeveloped', text: `They still have ${num(home)} minor pieces at home — the more they wait, the more you attack.` });
  return out;
}

export interface DepthClause {
  kind: 'not-yet' | 'line' | 'their-habit' | 'stop-flaw' | 'hole-access' | 'speedrun-read';
  text: string;
  /** The line the clause says, from the board it starts on (arrows). */
  lines?: Array<{ fen: string; sans: string[] }>;
  squares?: string[];
  /** What rides on it — handed to the ranker (factStakes). */
  stakes?: FactStakes;
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
    if (habit) out.push({ kind: 'their-habit', text: habit.text });
    if (args.lastStudentMove) {
      const h = holeAccess(args.lastStudentMove.fenBefore, args.lastStudentMove.san);
      if (h) out.push({ kind: 'hole-access', text: h.text, squares: [h.hole, ...(h.from ? [h.from] : [])] });
    }
    const toMove = new Chess(args.fen).turn();
    const topUci = args.topLines[0]?.moves?.[0];
    const engineBest = (() => { try { return topUci ? new Chess(args.fen).move({ from: topUci.slice(0, 2), to: topUci.slice(2, 4), promotion: topUci[4] }).san : null; } catch { return null; } })();
    if (toMove === args.studentColor) {
      const flaw = obviousStopFlaw(args.fen, args.studentColor);
      // Never argue with the engine: when the "obvious stop" IS its best move
      // (game 2, 10.Ng5 — the engine prefers h3), the human preference is not a fact.
      if (flaw && flaw.stopSan !== engineBest) out.push({ kind: 'stop-flaw', text: flaw.text });
    }
    // His habits of thought that name no move: keep the tension, which side to
    // castle, "any move is fine". The ones that name the engine's move (the
    // ugly move, the provoked commitment) wait for nameMove below.
    const reads = toMove === args.studentColor ? speedRunReads({ fen: args.fen, me: args.studentColor, lines: args.topLines, ...(args.lastOpponentMove ? { lastMove: args.lastOpponentMove } : {}), ...((): { lastOwnMove?: { fenBefore: string; san: string } } => { const o = ownLastMove(args.history, args.fen); return o ? { lastOwnMove: o } : {}; })() }) : [];
    for (const r of reads.filter((x) => !x.namesMove)) out.push({ kind: 'speedrun-read', text: r.text, ...(r.squares ? { squares: r.squares } : {}), ...(r.stakes ? { stakes: r.stakes } : {}) });
    if (!args.nameMove || toMove !== args.studentColor) return out;
    for (const r of reads.filter((x) => x.namesMove)) out.push({ kind: 'speedrun-read', text: r.text, ...(r.squares ? { squares: r.squares } : {}), ...(r.stakes ? { stakes: r.stakes } : {}) });
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
    // line, `proofForMover`): the line fact speaks only the outcomes the ledger
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
 * pin. The obvious move is h3 — why don't I want it? h3 creates a hook"):
 * their bishop can land on a square that pins your knight to your queen or
 * king; the pawn move that takes that square away hands them a hook.
 */
export function obviousStopFlaw(fen: string, me: 'w' | 'b'): { threatSan: string; stopSan: string; text: string } | null {
  const them = me === 'w' ? 'b' : 'w';
  let theirTurn: Chess;
  try { theirTurn = new Chess([fen.split(' ')[0], them, '-', '-', '0', '1'].join(' ')); } catch { return null; }
  for (const t of theirTurn.moves({ verbose: true })) {
    if (t.piece !== 'b' || t.captured) continue;
    const b = new Chess(theirTurn.fen()); b.move(t.san);
    // A pin: your knight on the bishop's diagonal with your queen or king behind it.
    const pinned = (() => {
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let x = t.to.charCodeAt(0) + dx; let y = Number(t.to[1]) + dy; let front: { type: string; color: string } | null = null;
        while (x >= 97 && x <= 104 && y >= 1 && y <= 8) {
          const p = b.get(`${String.fromCharCode(x)}${y}` as Square);
          if (p) {
            if (!front) { if (p.color !== me || p.type !== 'n') break; front = p; }
            else return p.color === me && (p.type === 'q' || p.type === 'k');
          }
          x += dx; y += dy;
        }
      }
      return false;
    })();
    if (!pinned) continue;
    // The obvious stop: a pawn of yours that covers that square.
    let mine: Chess;
    try { mine = new Chess([fen.split(' ')[0], me, '-', '-', '0', '1'].join(' ')); } catch { return null; }
    for (const s of mine.moves({ verbose: true })) {
      if (s.piece !== 'p' || s.captured) continue;
      const c2 = new Chess(mine.fen()); c2.move(s.san);
      if (!c2.attackers(t.to, me).includes(s.to)) continue;
      const hook = hookCreated(mine.fen(), s.san);
      if (!hook) continue;
      return {
        threatSan: t.san,
        stopSan: s.san,
        text: `They want ${sayMoveClause(t.san, theirTurn.fen())}, pinning your knight. The obvious stop is ${sayMoveClause(s.san, mine.fen())}, but that pawn becomes a hook for their pawn on ${hook.pawn} — find another way.`,
      };
    }
  }
  return null;
}
