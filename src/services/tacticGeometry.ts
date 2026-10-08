// tacticGeometry — THE LINE TACTICS THE COACH COULD NOT SEE (computers batch 3,
// teach-brief §"Tactics and geometry"). Twelve board reads, each a habit of a
// strong player's calculation said out loud, each one dual-use: the read that
// TEACHES "the knight check blocks your own queen's cover of e7" is the read
// that tags a missed interference in the student's record (`geometryMotif`,
// which the one tactic classifier asks when the engine walker names nothing).
//
// Act 1 of the batch (the pin that breaks with tempo, with its "can the escaped
// piece just be taken" check) is `pinBreak.ts`; nothing here copies it.
//
// G0: nothing here decides. Every read is either the engine's own line played
// out (the move is the engine's first move — never argued with) or a geometry
// certain on the board, and every read carries the PROOF it was found by
// (proof.ts). A read that cannot prove itself is not emitted.
//
// PURE: chess.js + the engine line handed in. No Dexie, no LLM, no randomness:
// phrasing ROTATES on the move number, so a replay says the same thing.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import type { TacticType } from '../types';
import { sayMoveClause, sayMoveNoun } from './spokenMove';
import { legalSeeGainFor } from './positionReadingService';
import { isPinnedPiece } from './nextPlans';
import { MATERIAL_VALUE } from './pieceValues';
import { legalLineProof, lineProofFromUci, squaresProof, type Proof } from './proof';
import type { FactStakes } from './factStakes';
import { andList } from '../utils/andList';
import { settledExchange, netPieceWords } from './exchangeLedger';

export type GeometryAct =
  | 'pinner-pinned' | 'false-mate-block' | 'interference' | 'clearance' | 'decoy' | 'deflection'
  | 'discovery-audit' | 'zwischenzug-refuted' | 'fork-for-plan' | 'kick-fails'
  | 'counterfactual-fork' | 'pawn-block-gone' | 'interpose-facing' | 'loaded-line';

export interface GeometryRead {
  act: GeometryAct;
  text: string;
  /** The idea without the move, for a surface that holds the move back. */
  idea?: string;
  /** The sentence names the engine's move — speaks only where a move is earned. */
  namesMove: boolean;
  squares: string[];
  /** REQUIRED: the line or the squares the read was found by. */
  proof: Proof;
  stakes?: FactStakes;
  /** The ONE tactic vocabulary (tacticVocabulary.ts) — the weakness join. Null
   *  where the read names no motif a student can be recorded as missing. */
  motif: TacticType | null;
  /** Say-once key for the game. */
  claim: string;
}

export interface GeometryContext {
  fen: string;
  /** The student's colour. */
  me: Color;
  /** The engine's best line from `fen`, UCI, best move first ([] when unknown). */
  pv: readonly string[];
  /** The opponent's last move, from the board it was played on. */
  lastOpponentMove?: { fenBefore: string; san: string };
  /** Learn and chat speak the present; Review the move that was there. */
  register: 'live' | 'review';
  /** Review only: the move the student actually played from `fen`. */
  played?: string;
}

type Vec = readonly [number, number];
const DIAG: Vec[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHO: Vec[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VAL = (t: PieceSymbol): number => (t === 'k' ? 100 : MATERIAL_VALUE[t] ?? 0);
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const xy = (s: string): [number, number] => [s.charCodeAt(0) - 97, Number(s[1]) - 1];
const sq = (f: number, r: number): Square | null => (f < 0 || f > 7 || r < 0 || r > 7 ? null : (`${String.fromCharCode(97 + f)}${r + 1}` as Square));
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const slides = (t: PieceSymbol, d: Vec): boolean => t === 'q' || (t === 'b' ? d[0] !== 0 && d[1] !== 0 : t === 'r' ? d[0] === 0 || d[1] === 0 : false);
const dirsOf = (t: PieceSymbol): Vec[] => (t === 'b' ? DIAG : t === 'r' ? ORTHO : t === 'q' ? [...DIAG, ...ORTHO] : []);
/** PHRASING ROTATES, NEVER ROLLS: keyed on the move number. */
const rot = (fen: string, ...forms: string[]): string => forms[(Number(fen.split(' ')[5] ?? 1) || 1) % forms.length];
const tense = (ctx: GeometryContext, live: string, review: string): string => (ctx.register === 'live' ? live : review);

function board(fen: string): Chess | null { try { return new Chess(fen); } catch { return null; } }
function applyUci(c: Chess, uci: string | undefined): Move | null {
  if (!uci || uci.length < 4) return null;
  try { return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
}
function pieces(c: Chess): Array<{ square: Square; type: PieceSymbol; color: Color }> {
  return c.board().flat().filter((x): x is NonNullable<typeof x> => !!x);
}
function kingOf(c: Chess, color: Color): Square | null {
  return pieces(c).find((p) => p.type === 'k' && p.color === color)?.square ?? null;
}
/** The first piece along a ray from `from` (exclusive), and the empty squares crossed. */
function rayFirst(c: Chess, from: string, d: Vec): { at: Square; piece: { type: PieceSymbol; color: Color } ; between: Square[] } | null {
  const [f, r] = xy(from);
  const between: Square[] = [];
  for (let i = 1; i < 8; i += 1) {
    const s = sq(f + d[0] * i, r + d[1] * i);
    if (!s) return null;
    const p = c.get(s);
    if (p) return { at: s, piece: p, between };
    between.push(s);
  }
  return null;
}
function material(c: Chess, color: Color): number {
  return pieces(c).reduce((n, p) => n + (p.color === color && p.type !== 'k' ? VAL(p.type) : 0), 0);
}
const balance = (c: Chess, me: Color): number => material(c, me) - material(c, other(me));

/** What the engine's line nets for `me`, read where `me` is to move again (an
 *  even ply, so a capture is never counted before its recapture). A mate for
 *  `me` along the line counts as a hundred. Null without two plies. */
export function pvGain(fen: string, pv: readonly string[], me: Color, maxPlies = 6): number | null {
  const c = board(fen);
  if (!c || c.turn() !== me) return null;
  const start = balance(c, me);
  let at: number | null = null;
  for (let i = 0; i < Math.min(maxPlies, pv.length); i += 1) {
    if (!applyUci(c, pv[i])) break;
    if (c.isCheckmate()) return c.turn() === me ? -100 : 100;
    if (i % 2 === 1) at = balance(c, me) - start;
  }
  return at;
}

/** The engine's first move from `fen`, applied, with the board after it. */
function engineFirst(fen: string, pv: readonly string[]): { before: Chess; after: Chess; mv: Move } | null {
  const before = board(fen);
  const after = board(fen);
  if (!before || !after) return null;
  const mv = applyUci(after, pv[0]);
  return mv ? { before, after, mv } : null;
}
/** A board with `color` to move (null when the other side is in check). */
function asMover(fen: string, color: Color): Chess | null {
  const parts = fen.split(' ');
  if (parts[1] === color) return board(fen);
  const c = board(fen);
  if (!c || c.inCheck()) return null;
  parts[1] = color; parts[3] = '-';
  return board(parts.join(' '));
}
const lineName = (a: string, b: string): string => (a[0] === b[0] ? `${a[0]}-file` : a[1] === b[1] ? `${a[1]}${['th', 'st', 'nd', 'rd'][Number(a[1])] ?? 'th'} rank` : 'diagonal');
const pieceWord = (owner: 'your' | 'their', t: PieceSymbol, s: string): string => `${owner} ${NAME[t]} on ${s}`;
const studentMoves = (ctx: GeometryContext): boolean => board(ctx.fen)?.turn() === ctx.me;

// ── 2. THE WOULD-BE PINNER IS ITSELF PINNED ──────────────────────────────────
/** "Their bishop can't pin you from c5: your queen pins it to their king." A
 *  square the piece could reach to pin one of yours, unreachable because your
 *  piece pins it to its own king. Certain on the board: the pin is absolute,
 *  the square is off the pin line, so chess.js has no such move. */
export function pinnerIsPinned(ctx: GeometryContext): GeometryRead | null {
  const c = board(ctx.fen);
  if (!c || !studentMoves(ctx) || ctx.register !== 'live') return null;
  const them = other(ctx.me);
  const theirKing = kingOf(c, them);
  if (!theirKing) return null;
  for (const x of pieces(c)) {
    if (x.color !== them || !['b', 'r', 'q'].includes(x.type) || !isPinnedPiece(c, x.square, them)) continue;
    const [kf, kr] = xy(theirKing); const [xf, xr] = xy(x.square);
    const d: Vec = [Math.sign(xf - kf), Math.sign(xr - kr)];
    const pinner = rayFirst(c, x.square, d);
    if (!pinner || pinner.piece.color !== ctx.me) continue;
    const pinLine = new Set<string>([...pinner.between, pinner.at]);
    const legal = new Set(c.moves({ square: x.square, verbose: true }).map((m) => m.to));
    for (const dir of dirsOf(x.type)) {
      for (let i = 1; i < 8; i += 1) {
        const t = sq(xf + dir[0] * i, xr + dir[1] * i);
        if (!t || c.get(t)) break;
        if (pinLine.has(t) || legal.has(t)) continue;
        for (const pd of dirsOf(x.type)) {
          const front = rayFirst(c, t, pd);
          if (!front || front.at === x.square || front.piece.color !== ctx.me || !['n', 'b', 'r'].includes(front.piece.type)) continue;
          const back = rayFirst(c, front.at, pd);
          if (!back || back.piece.color !== ctx.me || !(back.piece.type === 'k' || back.piece.type === 'q') || VAL(back.piece.type) <= VAL(front.piece.type)) continue;
          const text = `Their ${NAME[x.type]} on ${x.square} can't pin your ${NAME[front.piece.type]} from ${t}: your ${NAME[pinner.piece.type]} on ${pinner.at} pins it to their king.`;
          const proof = squaresProof(text, [pinner.at, x.square, theirKing, t, front.at, back.at]);
          if (!proof) return null;
          return { act: 'pinner-pinned', text, namesMove: false, squares: [pinner.at, x.square, theirKing, t, front.at], proof, motif: 'pin', claim: `geo:pinner-pinned:${x.square}${t}` };
        }
      }
    }
  }
  return null;
}

// ── 3a. SELF-INTERFERENCE: THE CHECK THAT IS NOT MATE ────────────────────────
/** "The knight check isn't mate: it blocks the queen's cover of the escape
 *  square." Every legal reply to the check is a king step onto a square the
 *  checking piece itself cut off from one of your long pieces. Live: a check
 *  that is not the engine's move (the tempting near-mate); Review: the check
 *  the student actually played. */
export function falseMateBlock(ctx: GeometryContext): GeometryRead | null {
  const c = board(ctx.fen);
  if (!c || !studentMoves(ctx)) return null;
  for (const m of c.moves({ verbose: true })) {
    if (!m.san.includes('+') || m.san.includes('#')) continue;
    if (ctx.register === 'live' ? `${m.from}${m.to}` === ctx.pv[0]?.slice(0, 4) : m.san !== ctx.played) continue;
    const after = board(c.fen()); if (!after) continue;
    after.move(m.san);
    const replies = after.moves({ verbose: true });
    if (replies.length === 0 || !replies.every((r) => r.piece === 'k' && !r.captured)) continue;
    const without = board(after.fen()); if (!without) continue;
    without.remove(m.to);
    const blocked: Array<{ escape: string; slider: Square }> = [];
    for (const r of replies) {
      const was = new Set(after.attackers(r.to, ctx.me));
      const fresh = without.attackers(r.to, ctx.me).find((s) => !was.has(s) && s !== m.to);
      if (!fresh) break;
      blocked.push({ escape: r.to, slider: fresh });
    }
    if (blocked.length !== replies.length) continue;
    const slider = c.get(blocked[0].slider);
    if (!slider) continue;
    const escapes = andList([...new Set(blocked.map((b) => b.escape))]);
    const text = tense(ctx,
      `${cap(sayMoveClause(m.san, ctx.fen))} gives check, but it isn't mate: it lands between your ${NAME[slider.type]} on ${blocked[0].slider} and ${escapes}, cutting that cover, so their king walks out there.`,
      `${cap(sayMoveClause(m.san, ctx.fen))} gave check, but it wasn't mate: it landed between your ${NAME[slider.type]} on ${blocked[0].slider} and ${escapes}, cutting that cover, so their king walked out there.`);
    const proof = legalLineProof(ctx.fen, [m.san, replies[0].san], true);
    if (!proof) return null;
    return { act: 'false-mate-block', text, namesMove: false, squares: [m.to, blocked[0].slider, ...blocked.map((b) => b.escape)], proof, motif: 'interference', claim: `geo:false-mate:${m.from}${m.to}` };
  }
  return null;
}

// ── 3b. INTERFERENCE: THE MOVE THAT CUTS THEIR GUARD ─────────────────────────
/** The engine's move lands on the line between one of their long pieces and
 *  the piece it guards, and the engine's next move takes the piece that lost
 *  its guard. */
export function interferenceCut(ctx: GeometryContext): GeometryRead | null {
  if (!studentMoves(ctx)) return null;
  const e = engineFirst(ctx.fen, ctx.pv);
  if (!e) return null;
  const { before, after, mv } = e;
  const them = other(ctx.me);
  const next = board(after.fen());
  const reply = next ? applyUci(next, ctx.pv[1]) : null;
  const take = next && reply ? applyUci(next, ctx.pv[2]) : null;
  if (!take || !take.captured) return null;
  const g = take.to;
  const guarded = after.get(g) ?? null;
  if (!guarded || guarded.color !== them) return null;
  const gain = pvGain(ctx.fen, ctx.pv, ctx.me, 6);
  if (gain === null || gain < 2) return null;
  for (const d of before.attackers(g, them)) {
    const dp = before.get(d);
    if (!dp || !['b', 'r', 'q'].includes(dp.type) || d === mv.to || after.get(d)?.type !== dp.type) continue;
    if (after.attackers(g, them).includes(d)) continue;
    // The cut must be the moved piece standing on the line between them.
    const [df, dr] = xy(d); const [gf, gr] = xy(g); const [tf, tr] = xy(mv.to);
    const dir: Vec = [Math.sign(gf - df), Math.sign(gr - dr)];
    const ray = rayFirst(after, d, dir);
    if (!ray || ray.at !== mv.to || Math.sign(tf - df) !== dir[0] || Math.sign(tr - dr) !== dir[1]) continue;
    const text = tense(ctx,
      `${cap(sayMoveClause(mv.san, ctx.fen))} cuts the line between their ${NAME[dp.type]} on ${d} and their ${NAME[guarded.type]} on ${g}, so the ${NAME[guarded.type]} loses its guard and falls.`,
      `${cap(sayMoveClause(mv.san, ctx.fen))} would have cut the line between their ${NAME[dp.type]} on ${d} and their ${NAME[guarded.type]} on ${g}, and the ${NAME[guarded.type]} would have lost its guard.`);
    const proof = lineProofFromUci(ctx.fen, ctx.pv.slice(0, 3));
    if (!proof) return null;
    return {
      act: 'interference', text, namesMove: true,
      idea: 'One of their guards works along a line — a piece dropped onto that line cuts it.',
      squares: [mv.from, mv.to, d, g], proof, stakes: { points: gain, plies: 2 }, motif: 'interference', claim: `geo:interference:${mv.to}${g}`,
    };
  }
  return null;
}

// ── 4. CLEARANCE WITH TEMPO ───────────────────────────────────────────────────
/** "Move the g4 knight off with a capture that hits the queen, and the pin
 *  lands." Your piece stands in your own long piece's way; the engine moves it
 *  with tempo (check, a capture, or a hit on their queen) and the long piece's
 *  line opens onto one of theirs — pinning it, or winning it. */
export function clearanceTempo(ctx: GeometryContext): GeometryRead | null {
  if (!studentMoves(ctx)) return null;
  const e = engineFirst(ctx.fen, ctx.pv);
  if (!e) return null;
  const { before, after, mv } = e;
  const them = other(ctx.me);
  const gain = pvGain(ctx.fen, ctx.pv, ctx.me, 6);
  if (gain === null || gain < 1) return null;
  const queen = pieces(after).find((p) => p.color === them && p.type === 'q');
  const hitsQueen = !!queen && after.attackers(queen.square, ctx.me).includes(mv.to);
  const how = mv.san.includes('+') ? ' with check' : hitsQueen ? ', hitting their queen' : mv.captured ? '' : null;
  if (!how) return null;
  for (const s of pieces(before)) {
    if (s.color !== ctx.me || s.square === mv.from || !['b', 'r', 'q'].includes(s.type)) continue;
    for (const d of dirsOf(s.type)) {
      const blocker = rayFirst(before, s.square, d);
      if (!blocker || blocker.at !== mv.from) continue;
      const opened = rayFirst(after, s.square, d);
      if (!opened || opened.piece.color !== them || opened.piece.type === 'k' || opened.at === mv.to) continue;
      const behind = rayFirst(after, opened.at, d);
      const pins = !!behind && behind.piece.color === them && VAL(behind.piece.type) > VAL(opened.piece.type);
      const hangs = legalSeeGainFor(after.fen(), opened.at, ctx.me) > 0;
      if (!pins && !hangs) continue;
      const lands = pins && behind ? `, pinning it to their ${NAME[behind.piece.type]}` : '';
      const text = tense(ctx,
        `Your ${NAME[mv.piece]} on ${mv.from} is in your ${NAME[s.type]}'s way. Move it off with tempo: ${sayMoveClause(mv.san, ctx.fen)}${how}, and the ${NAME[s.type]}'s line opens onto their ${NAME[opened.piece.type]} on ${opened.at}${lands}.`,
        `Your ${NAME[mv.piece]} on ${mv.from} was in your ${NAME[s.type]}'s way. It could have left with tempo: ${sayMoveClause(mv.san, ctx.fen)}${how}, opening the ${NAME[s.type]}'s line onto their ${NAME[opened.piece.type]} on ${opened.at}${lands}.`);
      const proof = lineProofFromUci(ctx.fen, ctx.pv.slice(0, 3));
      if (!proof) return null;
      return {
        act: 'clearance', text, namesMove: true,
        idea: 'One of your own pieces is in the way of your long piece — moving it with a threat clears the line.',
        squares: [mv.from, mv.to, s.square, opened.at, ...(pins && behind ? [behind.at] : [])], proof, stakes: { points: gain, plies: 2 }, motif: 'clearance', claim: `geo:clearance:${mv.from}${opened.at}`,
      };
    }
  }
  return null;
}

// ── 5. DECOY AND DEFLECTION, LIVE ─────────────────────────────────────────────
/** "Push b5 first; when the bishop takes, the queen check forks." The engine
 *  offers a piece or pawn, their capture is its line's next move, and the move
 *  after uses where the capturing piece went (decoy) or what it stopped
 *  guarding (deflection). The line must net material. */
export function decoyDeflection(ctx: GeometryContext): GeometryRead | null {
  if (!studentMoves(ctx) || ctx.pv.length < 3) return null;
  const c = board(ctx.fen);
  if (!c) return null;
  const m1 = applyUci(c, ctx.pv[0]);
  const afterM1 = m1 ? board(c.fen()) : null;
  const r = m1 ? applyUci(c, ctx.pv[1]) : null;
  if (!m1 || !afterM1 || !r || !r.captured || r.to !== m1.to) return null;
  const afterR = board(c.fen());
  const m2 = applyUci(c, ctx.pv[2]);
  if (!m2 || !afterR) return null;
  const gain = pvGain(ctx.fen, ctx.pv, ctx.me, 6);
  if (gain === null || gain < 2) return null;
  const s = m1.to;
  const them = other(ctx.me);
  if (m2.to === s) return null; // taking back on the bait square is a trade, not a lure
  const lineProofHere = lineProofFromUci(ctx.fen, ctx.pv.slice(0, 4));
  if (!lineProofHere) return null;
  const first = `First ${sayMoveClause(m1.san, ctx.fen)}`;
  const second = sayMoveClause(m2.san, afterR.fen());
  const lands = m2.promotion ? `your pawn queens on ${m2.to}` : `${second} lands there`;
  const landed = m2.promotion ? `your pawn would have queened on ${m2.to}` : `${second} would have landed there`;
  // DECOY: the move after hits the lured piece where it now stands, with check
  // or beside another target.
  const hitsLured = c.attackers(s, ctx.me).includes(m2.to);
  const otherTarget = m2.san.includes('+') || pieces(c).some((p) => p.color === them && p.square !== s && p.type !== 'p' && p.type !== 'k' && c.attackers(p.square, ctx.me).includes(m2.to) && !afterR.attackers(p.square, ctx.me).includes(m2.from));
  if (hitsLured && otherTarget && r.piece !== 'p') {
    const check = m2.san.includes('+') ? ' is check, and it' : '';
    const text = tense(ctx,
      `${first}: once their ${NAME[r.piece]} takes on ${s}, ${second}${check} hits the ${NAME[r.piece]} there.`,
      `${first} was the way: once their ${NAME[r.piece]} took on ${s}, ${second}${check} would have hit the ${NAME[r.piece]} there.`);
    return { act: 'decoy', text, namesMove: true, idea: 'A piece that has to take can be lured onto a bad square — look for the bait first.', squares: [m1.to, m2.from, m2.to, s], proof: lineProofHere, stakes: { points: gain, plies: 3 }, motif: 'deflection', claim: `geo:decoy:${s}${m2.to}` };
  }
  // DEFLECTION: the capture took the piece off a square it guarded, and the
  // move after lands on that square.
  if (afterM1.attackers(m2.to, them).includes(r.from) && !afterR.attackers(m2.to, them).includes(s)) {
    const text = tense(ctx,
      `${first}: once their ${NAME[r.piece]} takes on ${s}, it no longer guards ${m2.to}, and ${lands}.`,
      `${first} was the way: once their ${NAME[r.piece]} took on ${s}, it no longer guarded ${m2.to}, and ${landed}.`);
    return { act: 'deflection', text, namesMove: true, idea: 'One of their pieces is doing a job — make it take something, and the job goes undone.', squares: [m1.to, r.from, m2.to], proof: lineProofHere, stakes: { points: gain, plies: 3 }, motif: 'deflection', claim: `geo:deflection:${r.from}${m2.to}` };
  }
  return null;
}

// ── 6. THE DISCOVERY AUDIT ────────────────────────────────────────────────────
/** "c3 kicks the knight but allows a discovery; check every square it can land
 *  on first." Your pawn kick hits their piece that stands in front of one of
 *  their long pieces aimed at your king or a big piece; the kicked piece can
 *  leave with check or a capture, and the long piece then hits yours. */
export function discoveryAudit(ctx: GeometryContext): GeometryRead | null {
  const c = board(ctx.fen);
  if (!c || !studentMoves(ctx)) return null;
  const them = other(ctx.me);
  for (const k of c.moves({ verbose: true })) {
    if (k.piece !== 'p' || k.captured || `${k.from}${k.to}` === ctx.pv[0]?.slice(0, 4)) continue;
    const after = board(c.fen()); if (!after) continue;
    after.move(k.san);
    for (const n of pieces(after)) {
      if (n.color !== them || n.type === 'p' || n.type === 'k') continue;
      if (!after.attackers(n.square, ctx.me).includes(k.to) || c.attackers(n.square, ctx.me).includes(k.from)) continue;
      for (const d of [...DIAG, ...ORTHO]) {
        const back = rayFirst(after, n.square, [-d[0], -d[1]]);
        const front = rayFirst(after, n.square, d);
        if (!back || !front || back.piece.color !== them || !slides(back.piece.type, d) || front.piece.color !== ctx.me) continue;
        if (front.piece.type !== 'k' && VAL(front.piece.type) < 3) continue;
        // The exit must cost you: a discovered check, or an exit that itself
        // checks, or an exit that takes something while the long piece wins
        // your piece on the line.
        const exit = after.moves({ square: n.square, verbose: true }).find((x) => {
          if (front.piece.type === 'k' || x.san.includes('+')) return true;
          if (!x.captured) return false;
          const t = board(after.fen()); if (!t) return false;
          t.move(x.san);
          return legalSeeGainFor(asMover(t.fen(), them)?.fen() ?? t.fen(), front.at, them) > 0;
        });
        if (!exit) continue;
        const target = front.piece.type === 'k' ? 'your king' : pieceWord('your', front.piece.type, front.at);
        const text = tense(ctx,
          `${cap(sayMoveClause(k.san, ctx.fen))} would kick their ${NAME[n.type]} on ${n.square}, but it opens their ${NAME[back.piece.type]} on ${back.at} onto ${target} — check every square the ${NAME[n.type]} can land on first, like ${exit.to}.`,
          `${cap(sayMoveClause(k.san, ctx.fen))} kicked their ${NAME[n.type]} on ${n.square}, but it opened their ${NAME[back.piece.type]} on ${back.at} onto ${target} — check every square the ${NAME[n.type]} can land on first, like ${exit.to}.`);
        if (ctx.register === 'review' && k.san !== ctx.played) continue;
        const proof = legalLineProof(ctx.fen, [k.san, exit.san], true);
        if (!proof) continue;
        return { act: 'discovery-audit', text, namesMove: false, squares: [k.to, n.square, back.at, front.at, exit.to], proof, stakes: { points: front.piece.type === 'k' ? 3 : VAL(front.piece.type), plies: 2 }, motif: 'discovered_attack', claim: `geo:disc-audit:${k.to}${n.square}` };
      }
    }
  }
  return null;
}

// ── 7. THEIR IN-BETWEEN MOVE, ONE STEP FURTHER ───────────────────────────────
/** "Their in-between check looks scary; your king steps up and wins the
 *  piece." They owed a recapture and checked instead; the engine's answer is a
 *  king step, and its line keeps the extra material. */
export function zwischenzugRefuted(ctx: GeometryContext): GeometryRead | null {
  const lom = ctx.lastOpponentMove;
  if (!lom || !studentMoves(ctx)) return null;
  const c = board(ctx.fen);
  const fb = board(lom.fenBefore);
  if (!c || !fb || !c.inCheck()) return null;
  const them = other(ctx.me);
  let lm: Move | null = null;
  try { lm = new Chess(lom.fenBefore).move(lom.san); } catch { lm = null; }
  if (!lm || lm.captured || !lm.san.includes('+') || lm.color !== them) return null;
  // They were owed material: a capture that wins it, which they did not make.
  const owedAt = fb.moves({ verbose: true }).filter((m) => m.captured)
    .map((m) => ({ sq: m.to, won: legalSeeGainFor(lom.fenBefore, m.to, them) }))
    .sort((a, b) => b.won - a.won || a.sq.localeCompare(b.sq))[0];
  if (!owedAt || owedAt.won < 3) return null;
  const e = engineFirst(ctx.fen, ctx.pv);
  if (!e || e.mv.piece !== 'k') return null;
  const kept = e.after.get(owedAt.sq);
  if (!kept || kept.color !== ctx.me || legalSeeGainFor(e.after.fen(), owedAt.sq, them) > 0) return null;
  const gain = pvGain(ctx.fen, ctx.pv, ctx.me, 4);
  if (gain === null || gain < 0) return null;
  const step = sayMoveClause(e.mv.san, ctx.fen);
  const piece = pieceWord('your', kept.type, owedAt.sq);
  const text = tense(ctx,
    rot(ctx.fen,
      `Their in-between check looks scary, but it runs out of steam: ${step}, and ${piece} stays yours.`,
      `That in-between check is their last trick: ${step}, and ${piece} is safe again.`),
    `Their in-between check looked scary, but it ran out of steam: ${step}, and ${piece} would have stayed yours.`);
  const proof = lineProofFromUci(ctx.fen, ctx.pv.slice(0, 4));
  if (!proof) return null;
  const owed = owedAt.won;
  return {
    act: 'zwischenzug-refuted', text, namesMove: true,
    idea: 'Their in-between check looks scary — follow it one move further before giving anything back.',
    squares: [e.mv.from, e.mv.to, lm.to, owedAt.sq], proof, stakes: { points: owed, plies: 1 }, motif: 'zwischenzug', claim: `geo:zwischen:${lm.to}`,
  };
}

// ── 8. THE FORK THAT SERVES A PLAN ────────────────────────────────────────────
/** "Knight to g5 hits bishop and rook; it wins nothing but loosens d5." The
 *  engine's move attacks two pieces, its line wins no material, and their
 *  answer leaves one of their pieces with no defender. */
export function forkForPlan(ctx: GeometryContext): GeometryRead | null {
  if (!studentMoves(ctx) || ctx.pv.length < 2) return null;
  const e = engineFirst(ctx.fen, ctx.pv);
  if (!e) return null;
  const { after, mv } = e;
  if (mv.captured) return null;
  const them = other(ctx.me);
  // A real double attack: each target is worth more than the attacker, or has
  // no defender — a queen "attacking" a defended queen is an offer, not a fork.
  const targets = pieces(after).filter((p) => p.color === them && p.type !== 'p' && p.type !== 'k' && after.attackers(p.square, ctx.me).includes(mv.to)
    && (VAL(p.type) > VAL(mv.piece) || after.attackers(p.square, them).length === 0 || (p.type !== mv.piece && VAL(p.type) >= VAL(mv.piece))));
  if (targets.length < 2) return null;
  const gain = pvGain(ctx.fen, ctx.pv, ctx.me, 6);
  if (gain === null || gain > 0) return null;
  const afterR = board(after.fen());
  const r = afterR ? applyUci(afterR, ctx.pv[1]) : null;
  if (!afterR || !r) return null;
  const loosened = pieces(afterR)
    .filter((p) => p.color === them && p.type !== 'k' && p.square !== r.to && after.get(p.square)?.type === p.type
      && after.attackers(p.square, them).length > 0 && afterR.attackers(p.square, them).length === 0)
    .sort((a, b) => VAL(b.type) - VAL(a.type) || a.square.localeCompare(b.square))[0];
  if (!loosened) return null;
  const [a, b] = targets;
  const text = tense(ctx,
    `${cap(sayMoveClause(mv.san, ctx.fen))} hits their ${NAME[a.type]} and ${NAME[b.type]}. It wins nothing, but after ${sayMoveNoun(r.san, after.fen())} their ${NAME[loosened.type]} on ${loosened.square} has no defender left.`,
    `${cap(sayMoveClause(mv.san, ctx.fen))} would have hit their ${NAME[a.type]} and ${NAME[b.type]}. It won nothing, but after ${sayMoveNoun(r.san, after.fen())} their ${NAME[loosened.type]} on ${loosened.square} would have had no defender left.`);
  const proof = legalLineProof(ctx.fen, [mv.san, r.san]);
  if (!proof) return null;
  return {
    act: 'fork-for-plan', text, namesMove: true,
    idea: 'A double attack that wins nothing can still serve a plan — ask what their answer leaves loose.',
    squares: [mv.to, a.square, b.square, loosened.square], proof, motif: null, claim: `geo:fork-plan:${mv.to}${loosened.square}`,
  };
}

// ── 9. THEIR USUAL REPLY IS UNAVAILABLE ───────────────────────────────────────
/** "b3 usually chases the b6 knight, but here b3 doesn't work." After the
 *  engine's move posts a piece, every pawn kick they have against it loses
 *  material to a capture of yours. (No frequency is claimed: "usually" would
 *  need population data this board does not carry — the kick is named as the
 *  natural reaction, which is what a pawn hitting a piece is.) */
export function kickFails(ctx: GeometryContext): GeometryRead | null {
  if (!studentMoves(ctx)) return null;
  const e = engineFirst(ctx.fen, ctx.pv);
  if (!e) return null;
  const { after, mv } = e;
  if (mv.piece === 'p' || mv.piece === 'k') return null;
  const kicks = after.moves({ verbose: true }).filter((k) => {
    if (k.piece !== 'p' || k.captured) return false;
    const t = board(after.fen()); if (!t) return false;
    t.move(k.san);
    return t.attackers(mv.to, other(ctx.me)).includes(k.to);
  });
  if (kicks.length === 0) return null;
  let shown: { kick: Move; punish: Move; won: number } | null = null;
  for (const k of kicks) {
    const t = board(after.fen()); if (!t) return null;
    t.move(k.san);
    // The punishment must be the KICK's doing: a capture of the kicking pawn,
    // or a win that was not already there before it (a piece left hanging by
    // something else is a different lesson).
    const best = t.moves({ verbose: true }).filter((m) => m.captured)
      .map((m) => ({ m, won: legalSeeGainFor(t.fen(), m.to, ctx.me) }))
      .filter((x) => x.won >= 1 && (x.m.to === k.to || legalSeeGainFor(asMover(after.fen(), ctx.me)?.fen() ?? after.fen(), x.m.to, ctx.me) < x.won))
      .sort((x, y) => y.won - x.won || x.m.san.localeCompare(y.m.san))[0];
    if (!best) return null;
    if (!shown) shown = { kick: k, punish: best.m, won: best.won };
  }
  if (!shown) return null;
  const afterKick = board(after.fen());
  if (!afterKick) return null;
  afterKick.move(shown.kick.san);
  // What the punishment nets is the LEDGER's to say (outcomeSentences gate):
  // a finished exchange, named in pieces — or nothing is claimed at all.
  const ledger = settledExchange(afterKick.fen(), [shown.punish.san], ctx.me, null);
  const net = ledger && ledger.netPawns > 0 ? netPieceWords(ledger.studentWon, ledger.opponentWon) : null;
  if (!net) return null;
  const what = `winning ${net}`;
  const text = tense(ctx,
    `After ${sayMoveNoun(mv.san, ctx.fen)}, kicking it with ${sayMoveNoun(shown.kick.san, after.fen())} doesn't work here: ${sayMoveClause(shown.punish.san, afterKick.fen())}, ${what}.`,
    `After ${sayMoveNoun(mv.san, ctx.fen)}, kicking it with ${sayMoveNoun(shown.kick.san, after.fen())} would not have worked: ${sayMoveClause(shown.punish.san, afterKick.fen())}, ${what}.`);
  const proof = legalLineProof(ctx.fen, [mv.san, shown.kick.san, shown.punish.san], true);
  if (!proof) return null;
  return {
    act: 'kick-fails', text, namesMove: true,
    idea: 'Before you post a piece, check the pawn kick against it — here the kick fails.',
    squares: [mv.to, shown.kick.to, shown.punish.to], proof, motif: null, claim: `geo:kick-fails:${mv.to}`,
  };
}

// ── 10. THE COUNTERFACTUAL PATTERN ────────────────────────────────────────────
/** "If their queen stood there, the knight jump to e4 would fork it." A safe
 *  knight jump of yours gives check and also covers an empty square their
 *  queen can move to — the fork waiting for the queen to walk into it. */
export function counterfactualFork(ctx: GeometryContext): GeometryRead | null {
  const c = board(ctx.fen);
  if (!c || !studentMoves(ctx) || ctx.register !== 'live') return null;
  const them = other(ctx.me);
  const queen = pieces(c).filter((p) => p.color === them && p.type === 'q');
  const king = kingOf(c, them);
  if (queen.length !== 1 || !king) return null;
  const q = queen[0].square;
  const theirs = asMover(ctx.fen, them);
  if (!theirs) return null;
  const queenTo = new Set(theirs.moves({ square: q, verbose: true }).filter((m) => !m.captured).map((m) => m.to));
  for (const j of c.moves({ verbose: true })) {
    if (j.piece !== 'n' || j.captured || !j.san.includes('+') || `${j.from}${j.to}` === ctx.pv[0]?.slice(0, 4)) continue;
    const after = board(c.fen()); if (!after) continue;
    after.move(j.san);
    if (legalSeeGainFor(after.fen(), j.to, them) > 0) continue;
    const [f, r] = xy(j.to);
    const covers = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
      .map(([df, dr]) => sq(f + df, r + dr)).filter((s): s is Square => !!s);
    if (covers.includes(q)) continue; // a real fork, not a counterfactual one
    if (!covers.includes(king)) continue; // a discovered check is not the knight's fork
    const t = covers.find((s) => s !== king && !c.get(s) && queenTo.has(s) && c.attackers(s, ctx.me).length === 0);
    if (!t) continue;
    const text = `Keep the knight jump to ${j.to} in mind: it gives check, so if their queen ever lands on ${t}, the jump forks king and queen.`;
    const proof = squaresProof(text, [j.from, j.to, king, t, q]);
    if (!proof) return null;
    return { act: 'counterfactual-fork', text, namesMove: false, squares: [j.from, j.to, king, t, q], proof, motif: 'fork', claim: `geo:cf-fork:${j.to}${t}` };
  }
  return null;
}

// ── 11. A PUSHED PAWN CAN'T BLOCK A CHECK ────────────────────────────────────
/** "Their c-pawn is on c5, so a bishop check on b5 can't be met by c6." The
 *  engine's check runs along a line whose block square their pawn has already
 *  passed, and no pawn of theirs can reach it. */
export function pawnBlockGone(ctx: GeometryContext): GeometryRead | null {
  if (!studentMoves(ctx)) return null;
  const e = engineFirst(ctx.fen, ctx.pv);
  if (!e || !e.mv.san.includes('+') || !['b', 'q'].includes(e.mv.piece)) return null;
  const { after, mv } = e;
  const them = other(ctx.me);
  const king = kingOf(after, them);
  if (!king) return null;
  const [kf, kr] = xy(king); const [cf, cr] = xy(mv.to);
  const d: Vec = [Math.sign(kf - cf), Math.sign(kr - cr)];
  const ray = rayFirst(after, mv.to, d);
  // A pawn steps onto a DIAGONAL; along a file or rank no pawn move ever blocks.
  if (d[0] === 0 || d[1] === 0) return null;
  if (!ray || ray.at !== king || ray.between.length === 0) return null;
  const replies = after.moves({ verbose: true });
  const fwd = them === 'w' ? 1 : -1;
  // A pawn that CAN still block anywhere on the line makes the read pointless.
  if (replies.some((m) => m.piece === 'p' && ray.between.includes(m.to))) return null;
  for (const i of ray.between) {
    const ri = xy(i)[1];
    // Their pawn on that file has already gone past the block square.
    const passed = pieces(after).find((p) => p.color === them && p.type === 'p' && p.square[0] === i[0] && (xy(p.square)[1] - ri) * fwd > 0);
    if (!passed) continue;
    const startRank = them === 'w' ? 1 : 6;
    if ((ri - startRank) * fwd <= 0) continue; // the pawn never stood behind it
    const pieceBlocks = replies.some((m) => m.piece !== 'k' && m.piece !== 'p' && ray.between.includes(m.to));
    const tail = pieceBlocks ? 'the block has to come from a piece' : replies.every((m) => m.piece === 'k') ? 'the king has to move' : '';
    const text = tense(ctx,
      `Their ${i[0]}-pawn is already on ${passed.square}, so the check from ${mv.to} can't be blocked by a pawn on ${i}${tail ? ` — ${tail}` : ''}.`,
      `Their ${i[0]}-pawn was already on ${passed.square}, so the check from ${mv.to} couldn't be blocked by a pawn on ${i}${tail ? ` — ${tail}` : ''}.`);
    const proof = squaresProof(text, [passed.square, i, mv.to, king]);
    if (!proof) return null;
    return {
      act: 'pawn-block-gone', text, namesMove: true,
      idea: 'A pawn that has advanced can never come back to block a check on the square it passed.',
      squares: [passed.square, i, mv.to, king], proof, motif: null, claim: `geo:pawn-block:${i}`,
    };
  }
  return null;
}

// ── 12. INTERPOSITION BETWEEN FACING PIECES ──────────────────────────────────
/** "The rook steps in between the rooks staring down the d-file." The engine's
 *  quiet move lands between one of your long pieces and one of theirs that
 *  see each other along a line. */
export function interposeFacing(ctx: GeometryContext): GeometryRead | null {
  if (!studentMoves(ctx)) return null;
  const e = engineFirst(ctx.fen, ctx.pv);
  if (!e || e.mv.captured) return null;
  const { before, mv } = e;
  const them = other(ctx.me);
  for (const d of [...DIAG, ...ORTHO]) {
    const one = rayFirst(before, mv.to, d);
    const two = rayFirst(before, mv.to, [-d[0], -d[1]]);
    if (!one || !two || one.at === mv.from || two.at === mv.from) continue;
    const mine = one.piece.color === ctx.me ? one : two.piece.color === ctx.me ? two : null;
    const theirs = mine === one ? two : one;
    if (!mine || theirs.piece.color !== them || !slides(mine.piece.type, d) || !slides(theirs.piece.type, d)) continue;
    if (mine.piece.type === 'k' || theirs.piece.type === 'k') continue;
    const hanging = legalSeeGainFor(ctx.fen, mine.at, them);
    const line = lineName(mine.at, theirs.at);
    const tail = hanging > 0 ? `, taking your ${NAME[mine.piece.type]} out of their ${NAME[theirs.piece.type]}'s line` : '';
    const text = tense(ctx,
      `${cap(sayMoveClause(mv.san, ctx.fen))} steps in between your ${NAME[mine.piece.type]} on ${mine.at} and their ${NAME[theirs.piece.type]} on ${theirs.at}, facing each other down the ${line}${tail}.`,
      `${cap(sayMoveClause(mv.san, ctx.fen))} would have stepped in between your ${NAME[mine.piece.type]} on ${mine.at} and their ${NAME[theirs.piece.type]} on ${theirs.at}, facing each other down the ${line}${tail}.`);
    const proof = squaresProof(text, [mine.at, mv.to, theirs.at]);
    if (!proof) return null;
    return {
      act: 'interpose-facing', text, namesMove: true,
      idea: `Two long pieces face each other down the ${line} — a piece stepped in between changes who controls it.`,
      squares: [mine.at, mv.to, theirs.at], proof, ...(hanging > 0 ? { stakes: { points: hanging, plies: 1 } } : {}), motif: null, claim: `geo:interpose:${mv.to}`,
    };
  }
  return null;
}

// ── 13. THE LOADED LINE ───────────────────────────────────────────────────────
/** "When your central pawn advances, the bishop behind it hits their king."
 *  A pawn stands alone between a long piece and the enemy king; any move that
 *  takes it off the line is a discovered check. Both seats: yours to use,
 *  theirs to respect. */
export function loadedLine(ctx: GeometryContext): GeometryRead | null {
  const c = board(ctx.fen);
  if (!c || !studentMoves(ctx) || ctx.register !== 'live') return null;
  for (const side of [ctx.me, other(ctx.me)]) {
    const king = kingOf(c, other(side));
    const mover = asMover(ctx.fen, side);
    if (!king || !mover) continue;
    for (const s of pieces(c)) {
      if (s.color !== side || !['b', 'r', 'q'].includes(s.type)) continue;
      for (const d of dirsOf(s.type)) {
        const p = rayFirst(c, s.square, d);
        if (!p || p.piece.color !== side || p.piece.type !== 'p') continue;
        const k = rayFirst(c, p.at, d);
        if (!k || k.at !== king) continue;
        const onLine = (to: string): boolean => {
          const [sf, sr] = xy(s.square); const [tf, tr] = xy(to);
          return (tf - sf) * d[1] === (tr - sr) * d[0] && Math.sign(tf - sf) === Math.sign(d[0]) && Math.sign(tr - sr) === Math.sign(d[1]);
        };
        const leaves = mover.moves({ square: p.at, verbose: true }).filter((m) => !onLine(m.to));
        if (leaves.length === 0) continue;
        const yours = side === ctx.me;
        const text = yours
          ? `Your pawn on ${p.at} is loaded: when it moves, your ${NAME[s.type]} on ${s.square} behind it gives check, so that pawn moves with tempo.`
          : `Their pawn on ${p.at} is loaded: when it moves, their ${NAME[s.type]} on ${s.square} behind it checks your king, so that pawn moves with tempo.`;
        const proof = squaresProof(text, [s.square, p.at, king]);
        if (!proof) return null;
        return { act: 'loaded-line', text, namesMove: false, squares: [s.square, p.at, king], proof, motif: 'discovered_attack', claim: `geo:loaded:${s.square}${p.at}` };
      }
    }
  }
  return null;
}

const READERS: ReadonlyArray<(ctx: GeometryContext) => GeometryRead | null> = [
  decoyDeflection, interferenceCut, clearanceTempo, zwischenzugRefuted, pawnBlockGone, kickFails,
  forkForPlan, interposeFacing, falseMateBlock, discoveryAudit, pinnerIsPinned, loadedLine, counterfactualFork,
];

/** Every geometry read on this board, in the order above (the line-proven
 *  reads first). No cap: the one door ranks and subsumes. */
export function geometryReads(ctx: GeometryContext): GeometryRead[] {
  const out: GeometryRead[] = [];
  for (const read of READERS) {
    try { const r = read(ctx); if (r) out.push(r); } catch { /* a read is a bonus, never a blocker */ }
  }
  return out;
}

/**
 * THE DIAGNOSE HALF — the motif a best line delivers, by the same reads that
 * teach it. The one tactic classifier (`missedTacticService.detectTacticType`)
 * asks this only when its engine walker names no motif, so a missed
 * deflection, interference or clearance reaches the student's record under the
 * one vocabulary instead of the "no named motif" sentinel.
 */
export function geometryMotif(
  fen: string,
  pv: readonly string[],
  lastOpponentMove?: { fenBefore: string; san: string },
): TacticType | null {
  const me = board(fen)?.turn();
  if (!me) return null;
  const ctx: GeometryContext = { fen, me, pv, register: 'review', ...(lastOpponentMove ? { lastOpponentMove } : {}) };
  // Their in-between move needs the move before this one; with it, the miss
  // (not stepping the king and keeping the piece) reaches the record too.
  const reads = lastOpponentMove
    ? [zwischenzugRefuted, decoyDeflection, interferenceCut, clearanceTempo]
    : [decoyDeflection, interferenceCut, clearanceTempo];
  for (const read of reads) {
    try { const r = read(ctx); if (r?.motif) return r.motif; } catch { /* next */ }
  }
  return null;
}
