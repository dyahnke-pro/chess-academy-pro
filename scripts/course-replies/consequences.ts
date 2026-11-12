// CONSEQUENCES — what a move sets in motion beyond the board in front of you
// (WO-OPENINGS-REWRITE-01, David 2026-11-12: "i want deeper narrations, more
// second and third order consequences, things that cant be seen on the
// board"). Read by the Watch fact sheet (`lessonFacts.measure.test.ts`) so a
// writer can trace a move two or three steps on — and say only what these
// computed facts prove:
//   - `givesUp`: the squares a pawn move stops covering FOR GOOD (no pawn of
//     that side can ever cover them again), and the enemy pieces that can
//     land there within two moves;
//   - `lineDiff`: where a line of moves leads — material, the pieces traded,
//     new doubled / isolated / passed pawns, the bishop pair, files opened,
//     where the kings stand.
// Pure: chess.js and the board only.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

const FILES = 'abcdefgh';
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const fileOf = (sq: string): number => FILES.indexOf(sq[0]);
const rankOf = (sq: string): number => Number(sq[1]);
const sqAt = (f: number, r: number): string | null => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? `${FILES[f]}${r}` : null);

/** The squares a pawn of `color` on `sq` attacks. */
export function pawnAttacks(sq: string, color: Color): string[] {
  const r = rankOf(sq) + (color === 'w' ? 1 : -1);
  return [sqAt(fileOf(sq) - 1, r), sqAt(fileOf(sq) + 1, r)].filter((s): s is string => s !== null);
}

/** Whether a pawn of `color` could ever attack `sq` again: one stands on a
 *  neighbouring file behind the square's attacking rank (it can still walk
 *  up). Blockers are ignored, so a square called lost is lost for certain. */
export function pawnCanEverCover(board: Chess, sq: string, color: Color): boolean {
  const f = fileOf(sq); const r = rankOf(sq);
  for (const df of [-1, 1]) {
    for (let rr = 1; rr <= 8; rr += 1) {
      const s = sqAt(f + df, rr);
      if (!s) continue;
      const p = board.get(s as Square);
      if (!p || p.type !== 'p' || p.color !== color) continue;
      if (color === 'w' ? rr <= r - 1 : rr >= r + 1) return true;
    }
  }
  return false;
}

/** A board with `color` to move (castling and en passant kept only where they
 *  stay legal); null when that side is in check-impossible states. */
function withTurn(fen: string, color: Color): Chess | null {
  const parts = fen.split(' ');
  parts[1] = color; parts[3] = '-';
  try { return new Chess(parts.join(' ')); } catch { return null; }
}

/** The other side's knights and bishops that can land on `sq` in one or two
 *  moves of their own, read on `fen` (the board after the move). Named
 *  without an owner: the sheet says whose from the student's seat. */
function minorsReaching(fen: string, sq: string, enemy: Color): string[] {
  const b = withTurn(fen, enemy);
  if (!b) return [];
  // One entry per piece, by its fastest way there.
  const best = new Map<string, { piece: PieceSymbol; via: string | null }>();
  const moves = b.moves({ verbose: true }).filter((m) => m.piece === 'n' || m.piece === 'b');
  for (const m of moves) if (m.to === sq) best.set(m.from, { piece: m.piece, via: null });
  // A stepping stone a pawn of the side that gave the square up still covers
  // is no road there (the Four Knights Scotch …c6: the knight "via b5" ran
  // into the new c6 pawn).
  const after = new Chess(fen);
  const guarded = (via: string): boolean => (['w', 'b'] as Color[]).filter((c) => c !== enemy).some((own) =>
    after.board().flat().some((p) => p && p.type === 'p' && p.color === own && pawnAttacks(p.square, own).includes(via)));
  for (const m of moves) {
    if (best.has(m.from) || m.to === sq || guarded(m.to)) continue;
    const b2 = withTurn(b.fen(), enemy);
    if (!b2) continue;
    try { b2.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { continue; }
    const b3 = withTurn(b2.fen(), enemy);
    if (!b3) continue;
    if (b3.moves({ verbose: true }).some((m2) => m2.from === m.to && m2.to === sq)) best.set(m.from, { piece: m.piece, via: m.to });
  }
  return [...best].map(([from, r]) => `the ${NAME[r.piece]} on ${from} (${r.via ? `two moves, via ${r.via}` : 'one move'})`);
}

export interface GivenUp { square: string; reachedBy: string[] }

/** What a pawn move gives up for good: the squares the pawn covered before it
 *  moved that no pawn of its side can ever cover again and that an enemy
 *  knight or bishop can reach within two moves (named with each). Empty for a
 *  piece move. */
export function givesUp(fenBefore: string, san: string): GivenUp[] {
  const before = new Chess(fenBefore);
  let mv;
  try { mv = before.move(san); } catch { return []; }
  if (mv.piece !== 'p') return [];
  const after = before; // the board after the move
  const color = mv.color; const enemy: Color = color === 'w' ? 'b' : 'w';
  const lost = pawnAttacks(mv.from, color).filter((s) => !pawnAttacks(mv.to, color).includes(s));
  const out: GivenUp[] = [];
  for (const s of lost) {
    if (pawnCanEverCover(after, s, color)) continue;
    const r = rankOf(s);
    // Only squares in or near the mover's own camp matter as weaknesses.
    if (color === 'w' ? r > 6 : r < 3) continue;
    // A square the mover's own pawn stands on is no hole while it stands.
    const there = after.get(s as Square);
    if (there && there.type === 'p' && there.color === color) continue;
    // A square no enemy piece can reach is a fact with no consequence yet.
    const reachedBy = minorsReaching(after.fen(), s, enemy);
    if (!reachedBy.length) continue;
    out.push({ square: s, reachedBy });
  }
  return out;
}

interface Snapshot {
  material: Record<Color, number>;
  pieces: Record<Color, Record<PieceSymbol, number>>;
  pawns: Record<Color, string[]>;
  king: Record<Color, string>;
  bishops: Record<Color, number>;
}

function snap(board: Chess): Snapshot {
  const s: Snapshot = {
    material: { w: 0, b: 0 },
    pieces: { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } },
    pawns: { w: [], b: [] }, king: { w: '', b: '' }, bishops: { w: 0, b: 0 },
  };
  for (const row of board.board()) for (const p of row) {
    if (!p) continue;
    s.material[p.color] += VALUE[p.type];
    s.pieces[p.color][p.type] += 1;
    if (p.type === 'p') s.pawns[p.color].push(p.square);
    if (p.type === 'k') s.king[p.color] = p.square;
    if (p.type === 'b') s.bishops[p.color] += 1;
  }
  return s;
}

function filesOf(pawns: readonly string[]): number[] { return pawns.map(fileOf); }

/** Doubled, isolated and passed pawns of `color`, as square lists. */
export function pawnFeatures(s: Snapshot, color: Color): { doubled: string[]; isolated: string[]; passed: string[] } {
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const mine = s.pawns[color]; const theirs = s.pawns[enemy];
  const files = filesOf(mine);
  const doubled = mine.filter((sq) => files.filter((f) => f === fileOf(sq)).length > 1);
  const isolated = mine.filter((sq) => !files.includes(fileOf(sq) - 1) && !files.includes(fileOf(sq) + 1));
  const passed = mine.filter((sq) => !theirs.some((t) => Math.abs(fileOf(t) - fileOf(sq)) <= 1 && (color === 'w' ? rankOf(t) > rankOf(sq) : rankOf(t) < rankOf(sq))));
  return { doubled, isolated, passed };
}

function openFiles(s: Snapshot): { open: number[]; halfW: number[]; halfB: number[] } {
  const w = new Set(filesOf(s.pawns.w)); const b = new Set(filesOf(s.pawns.b));
  const open: number[] = []; const halfW: number[] = []; const halfB: number[] = [];
  for (let f = 0; f < 8; f += 1) {
    if (!w.has(f) && !b.has(f)) open.push(f);
    else if (!w.has(f)) halfW.push(f);
    else if (!b.has(f)) halfB.push(f);
  }
  return { open, halfW, halfB };
}

const newOf = (a: readonly string[], b: readonly string[]): string[] => b.filter((x) => !a.includes(x));
const newFiles = (a: readonly number[], b: readonly number[]): string[] => b.filter((x) => !a.includes(x)).map((f) => `${FILES[f]}-file`);

function kingWords(sq: string, color: Color, who: string): string {
  const home = color === 'w' ? '1' : '8';
  if (sq[1] === home && (sq[0] === 'g' || sq[0] === 'h')) return `${who} king castled short (${sq})`;
  if (sq[1] === home && (sq[0] === 'b' || sq[0] === 'c')) return `${who} king castled long (${sq})`;
  if (sq === `e${home}`) return `${who} king still on ${sq}`;
  return `${who} king on ${sq}`;
}

/** Where `uciLine` leads from `fen`, said from `student`'s seat: material,
 *  the pieces traded, new pawn weaknesses and passed pawns, the bishop pair,
 *  files opened, the kings. Null when the line is empty or illegal at once. */
export function lineDiff(fen: string, uciLine: readonly string[], student: Color, maxPlies = 8): { plies: number; sans: string[]; facts: string[] } | null {
  // THE LINE ENDS AT A QUIET BOARD: never in the middle of a trade. A line
  // cut after a capture whose recapture comes next reads a piece won that is
  // taken straight back (the fact-sheet bug class A, 2026-11-12). Play up to
  // four plies past `maxPlies`, then keep the longest quiet prefix up to the
  // bar (or, failing that, the first one past it).
  const probe = new Chess(fen);
  const played: Array<{ san: string; capture: boolean; to: string }> = [];
  for (const u of uciLine.slice(0, maxPlies + 4)) {
    try {
      const m = probe.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined });
      played.push({ san: m.san, capture: Boolean(m.captured), to: m.to });
    } catch { break; }
  }
  // A board is quiet when the line's next move is not a capture; where the
  // line runs out, when its last move was not a capture or took back on the
  // square the move before captured on (the trade is complete).
  const quiet = (n: number): boolean => {
    if (n < played.length) return !played[n].capture;
    const last = played[n - 1];
    return !last.capture || (n >= 2 && played[n - 2].capture && played[n - 2].to === last.to);
  };
  let k = 0;
  for (let n = Math.min(played.length, maxPlies); n >= 1 && !k; n -= 1) if (quiet(n)) k = n;
  for (let n = maxPlies + 1; n <= played.length && !k; n += 1) if (quiet(n)) k = n;
  if (k === 0) return null;
  const board = new Chess(fen);
  const start = snap(board);
  const sans: string[] = [];
  const colors: Color[] = [];
  const snaps: Snapshot[] = [start];
  for (const p of played.slice(0, k)) { const m = board.move(p.san); sans.push(p.san); colors.push(m.color); snaps.push(snap(board)); }
  const end = snap(board);
  // WHICH MOVE OF THE LINE MADE THE PASSER (Watch writers 2026-11-12, Scotch
  // e5: "you get a passed pawn (e5)" — it is passed only once …f5 is played;
  // the f7 pawn stops it until then). A passer the line's first move did not
  // make is said with the move that made it: the first one from which a passed
  // pawn of that side stands on the file to the line's end.
  const madeBy = (sq: string, c: Color): string | null => {
    const f = fileOf(sq);
    let j = snaps.length - 1;
    while (j > 0 && pawnFeatures(snaps[j - 1], c).passed.some((x) => fileOf(x) === f)) j -= 1;
    return j > 1 ? `${colors[j - 1] === 'b' ? '…' : ''}${sans[j - 1]}` : null;
  };
  const them: Color = student === 'w' ? 'b' : 'w';
  const facts: string[] = [];
  const bal = (s: Snapshot): number => s.material[student] - s.material[them];
  const dm = bal(end) - bal(start);
  if (dm !== 0) facts.push(`material ${dm > 0 ? '+' : ''}${dm} for you over the line`);
  const gone = (c: Color): string[] => (['q', 'r', 'b', 'n', 'p'] as PieceSymbol[]).flatMap((t) => {
    const n = start.pieces[c][t] - end.pieces[c][t];
    return n > 0 ? [`${n > 1 ? `${n} ` : 'a '}${NAME[t]}${n > 1 ? 's' : ''}`] : [];
  });
  const yg = gone(student); const tg = gone(them);
  if (yg.length || tg.length) facts.push(`off the board: yours ${yg.join(', ') || 'nothing'}; theirs ${tg.join(', ') || 'nothing'}`);
  if (start.pieces.w.q + start.pieces.b.q > 0 && end.pieces.w.q + end.pieces.b.q === 0) facts.push('the queens are off');
  for (const [c, who] of [[student, 'you'], [them, 'they']] as Array<[Color, string]>) {
    const a = pawnFeatures(start, c); const b = pawnFeatures(end, c);
    const d = newOf(a.doubled, b.doubled); const i = newOf(a.isolated, b.isolated); const p = newOf(a.passed, b.passed);
    if (d.length) facts.push(`${who} get doubled pawns (${d.join(', ')})`);
    if (i.length) facts.push(`${who} get an isolated pawn (${i.join(', ')})`);
    if (p.length) facts.push(`${who} get a passed pawn (${p.map((x) => { const by = madeBy(x, c); return by ? `${x}, once ${by} is played` : x; }).join('; ')})`);
  }
  const pair = (s: Snapshot, c: Color): boolean => s.bishops[c] >= 2;
  if (pair(start, student) && !pair(end, student)) facts.push('you lose the bishop pair');
  if (pair(start, them) && !pair(end, them)) facts.push('they lose the bishop pair');
  if (!pair(start, student) && pair(end, student) && !pair(end, them)) facts.push('you keep the bishop pair, they do not');
  const fa = openFiles(start); const fb = openFiles(end);
  const opened = newFiles(fa.open, fb.open);
  if (opened.length) facts.push(`open file: ${opened.join(', ')}`);
  const halfMine = newFiles(student === 'w' ? fa.halfW : fa.halfB, student === 'w' ? fb.halfW : fb.halfB);
  const halfTheirs = newFiles(student === 'w' ? fa.halfB : fa.halfW, student === 'w' ? fb.halfB : fb.halfW);
  if (halfMine.length) facts.push(`half-open for you (no pawn of yours on it): ${halfMine.join(', ')}`);
  if (halfTheirs.length) facts.push(`half-open for them: ${halfTheirs.join(', ')}`);
  facts.push(`${kingWords(end.king[student], student, 'your')}; ${kingWords(end.king[them], them, 'their')}`);
  return { plies: sans.length, sans, facts };
}

/** A plan's break or manoeuvre as words, whatever shape the record holds. */
export function planItem(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return [o.move, o.piece, o.route, o.from && o.to ? `${String(o.from)}–${String(o.to)}` : null, o.explanation ?? o.description ?? o.idea ?? o.purpose]
      .filter((v) => typeof v === 'string' && v).join(' — ');
  }
  return '';
}
