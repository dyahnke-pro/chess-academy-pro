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
import { andList } from '../utils/andList';
import { leadingFundamentals } from './moveFundamentals';
import { doubleAttack, skewer, positionAsk, walkableLine, pvSans, hookCreated, holeAccess } from './moveInsight';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const side = (c: 'w' | 'b'): 'white' | 'black' => (c === 'w' ? 'white' : 'black');
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
    return { text: `it becomes a pawn ending with you ${pawnsOf(end, me) - pawnsOf(end, them) === 1 ? 'a pawn' : `${num(pawnsOf(end, me) - pawnsOf(end, them))} pawns`} up — the advantage changes shape and stays yours`, kind: 'pawn-ending' };
  }
  const net = settledNetForLine(startFen, sans, me);
  if (net !== null && net >= 1) return { text: `you come out ${countWords(net)} up`, kind: 'material' };
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

/** Why a candidate is played, from the board: its tactic, what its line
 *  achieves, else its fundamental. Null when nothing true can be said. */
export function candidateReason(fen: string, c: Candidate, me: 'w' | 'b'): string | null {
  const da = doubleAttack(fen, c.san);
  if (da) return `it hits ${andList(da.targets.map((t) => t.phrase))} at once`;
  const sk = skewer(fen, c.san);
  if (sk) return 'it checks with something standing behind the king';
  // What the MOVE does leads; a line's outcome speaks only when it lands
  // close (replay, game 2: 1.e4 was given "the e-file opens" from six plies on).
  const sans = pvSans(fen, [...c.pv], 6);
  const near = lineAchieves(fen, sans.slice(0, 3).length ? sans.slice(0, 3) : [c.san], me);
  if (near.kind === 'mate' || near.kind === 'promotion' || near.kind === 'pawn-ending' || (near.kind === 'material' && !near.text.endsWith('down'))) return near.text;
  const f = leadingFundamentals(fen, c.san, side(me))[0];
  if (f) return f.led;
  const far = lineAchieves(fen, sans.length ? sans : [c.san], me);
  return far.kind !== 'none' && !(far.kind === 'material' && far.text.endsWith('down')) ? far.text : null;
}

/**
 * ON ONE HAND / ON THE OTHER (his "let's think, this is an instructive
 * moment"): the top two moves, each with its own reason, and the choice made
 * by the engine's number — said as the reason that decides, never as a score.
 */
export function weighTwo(fen: string, a: Candidate, b: Candidate): { text: string; chosen: string } | null {
  let me: 'w' | 'b';
  try { me = new Chess(fen).turn(); } catch { return null; }
  if (a.san === b.san) return null;
  const ra = candidateReason(fen, a, me);
  const rb = candidateReason(fen, b, me);
  if (!ra || !rb || ra === rb) return null;
  const [best, other, rBest] = a.cp >= b.cp ? [a, b, ra] : [b, a, rb];
  const rOther = best === a ? rb : ra;
  const close = Math.abs(a.cp - b.cp) < 30;
  const say = (x: Candidate): string => sayMoveClause(x.san, fen);
  return {
    chosen: best.san,
    text: close
      ? `Two good moves here. ${cap(say(other))} — ${rOther}. Or ${say(best)} — ${rBest}. Either keeps you on track.`
      : `On one hand, ${say(other)} — ${rOther}. On the other, ${say(best)} — ${rBest}, and that is the stronger idea.`,
  };
}

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

export interface Habit { kind: 'same-piece' | 'undeveloped' | 'early-queen'; text: string }

/**
 * WHAT THEY KEEP DOING (his "he keeps moving the same piece in the opening —
 * you punish that by obeying the principles yourself"): read from the game so
 * far, never from one position.
 */
export function opponentHabits(sans: readonly string[], opp: 'w' | 'b'): Habit[] {
  const c = new Chess();
  const moved = new Map<string, number>();   // piece's current square → times moved
  const out: Habit[] = [];
  let earlyQueen = false;
  for (const [i, s] of sans.entries()) {
    let m;
    try { m = c.move(s); } catch { break; }
    if (m.color !== opp || i >= 24) continue;
    if (m.piece === 'p' || m.piece === 'k' || m.san.startsWith('O-O')) continue;
    const n = (moved.get(m.from) ?? 0) + 1;
    moved.delete(m.from);
    moved.set(m.to, n);
    if (m.piece === 'q' && i < 10) earlyQueen = true;
  }
  const busiest = [...moved.entries()].sort((a, b) => b[1] - a[1])[0];
  if (busiest && busiest[1] >= 3) {
    const p = c.get(busiest[0] as Square);
    if (p && p.color === opp) out.push({ kind: 'same-piece', text: `They keep moving the same piece — that ${p.type === 'n' ? 'knight' : p.type === 'b' ? 'bishop' : p.type === 'r' ? 'rook' : 'queen'} has moved ${num(busiest[1])} times. You punish that by developing everything else.` });
  }
  const r = opp === 'w' ? '1' : '8';
  const home = ['b', 'g', 'c', 'f'].filter((f) => { const p = c.get(`${f}${r}` as Square); return p && p.color === opp && (p.type === 'n' || p.type === 'b'); });
  const plies = Math.min(sans.length, 24);
  if (plies >= 16 && home.length >= 2) out.push({ kind: 'undeveloped', text: `They still have ${num(home.length)} minor pieces at home — the more they wait, the more you attack.` });
  if (earlyQueen) out.push({ kind: 'early-queen', text: 'Their queen came out early — every developing move that hits it gains you a tempo.' });
  return out;
}

export interface ThinkAloud { text: string; lines: WalkableLine[]; words: number; /** The two-move weighing spoke (it names the choice). */ weighed: boolean }

/** The engine's top lines (white-POV evals) as candidates in the mover's seat. */
export function candidatesFromLines(fen: string, lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>): Candidate[] {
  let mover: 'w' | 'b';
  try { mover = new Chess(fen).turn(); } catch { return []; }
  const out: Candidate[] = [];
  for (const l of lines) {
    const uci = l.moves?.[0];
    if (!uci || uci.length < 4) continue;
    let san: string;
    try { san = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { continue; }
    const white = l.mate != null ? (l.mate > 0 ? 10000 : -10000) : l.evaluation;
    out.push({ san, pv: l.moves ?? [], cp: mover === 'w' ? white : -white });
  }
  return out;
}

/**
 * THE COMPOSER — his order, his volume. `critical` (the ranking computer's
 * verdict) decides how deep: a routine move gets what changed plus one idea
 * with its reason (~30 words); a decision gets the weighing, the line and the
 * "not yet" (~100). Nothing is said that a computer did not produce.
 */
export function thinkAloud(args: {
  fen: string;
  history: readonly string[];
  lastMove?: { fenBefore: string; san: string };
  candidates: readonly Candidate[];
  critical: boolean;
  /** The surface already spoke the position read (positionAsk) — skip it. */
  skipRead?: boolean;
}): ThinkAloud {
  const parts: string[] = [];
  const lines: WalkableLine[] = [];
  let me: 'w' | 'b';
  try { me = new Chess(args.fen).turn(); } catch { return { text: '', lines: [], words: 0, weighed: false }; }
  let weighed = false;
  // WHAT CHANGED + WHAT I STILL OWE (his "what haven't I done yet?"): the
  // position read leads, the one computer for both.
  const ask = positionAsk(args.fen, { bestSan: args.candidates[0]?.san, lastMove: args.lastMove });
  // The hint register ("start with the captures", "keep pressing") points at an
  // answer this composer is about to NAME — drop it, keep the reading.
  const read = args.skipRead ? '' : ask.text.split(/(?<=[.!?])\s+/).filter((x) => !/^(Start with|Look for|Keep pressing|You have the initiative here)/.test(x)).join(' ');
  if (read) parts.push(read);
  const habit = opponentHabits(args.history, me === 'w' ? 'b' : 'w')[0];
  if (habit && args.critical) parts.push(habit.text);
  const [a, b] = args.candidates;
  if (a) {
    if (args.critical && b) {
      const w = weighTwo(args.fen, a, b);
      if (w) { parts.push(w.text); weighed = true; }
    } else {
      const why = candidateReason(args.fen, a, me);
      if (why) parts.push(`The idea: ${why}.`);
    }
    if (args.critical) {
      const ny = notYet(args.fen, a);
      if (ny) parts.push(ny.text);
      const said = sayLine(args.fen, pvSans(args.fen, [...a.pv], 6), me);
      if (said) { parts.push(said.text); lines.push(said.line); }
    }
  }
  const text = parts.join(' ');
  return { text, lines, words: text.split(/\s+/).filter(Boolean).length, weighed };
}

export interface DepthClause {
  kind: 'not-yet' | 'line' | 'their-habit' | 'stop-flaw' | 'hole-access';
  text: string;
  /** The line the clause says, from the board it starts on (arrows). */
  lines?: Array<{ fen: string; sans: string[] }>;
  squares?: string[];
}

/**
 * THE ONE PRODUCER (David 2026-10-05: "Should be from one place"). Every
 * surface gets the speed-run depth from here, as typed facts the one deciding
 * door ranks: what they keep doing, and — only where the surface may NAME the
 * move — "not yet, first this" and the line in words, ending on what it
 * achieves. `nameMove: false` (a held verdict, a withheld puzzle answer)
 * returns the habit alone.
 */
export function depthClauses(args: {
  fen: string;
  history: readonly string[];
  topLines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate: number | null }>;
  studentColor: 'w' | 'b';
  nameMove: boolean;
  /** The student's own last move — what it gave up. */
  lastStudentMove?: { fenBefore: string; san: string };
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
    if (toMove === args.studentColor) {
      const flaw = obviousStopFlaw(args.fen, args.studentColor);
      if (flaw) out.push({ kind: 'stop-flaw', text: flaw.text });
    }
    if (!args.nameMove || toMove !== args.studentColor) return out;
    const best = candidatesFromLines(args.fen, args.topLines)[0];
    if (!best) return out;
    const ny = notYet(args.fen, best);
    if (ny) out.push({ kind: 'not-yet', text: ny.text });
    const sans = pvSans(args.fen, [...best.pv], 6);
    const said = sayLine(args.fen, sans, args.studentColor);
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
