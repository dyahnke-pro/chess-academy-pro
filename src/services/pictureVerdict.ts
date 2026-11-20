/**
 * THE PICTURE'S CONCLUSIONS, SECOND HALF (WO-PICTURE-01 P3, David
 * 2026-11-19): the verdict, "the but", and the plan as the try that survives.
 *
 * Danya reads a board by trying things. On the rook-lift board he writes:
 * "White is hanging on the precipice, but it is actually very difficult to
 * finish him off. …Qf6 is always met by the annoying Rh5 … I was itching to
 * play …c4. However … Nxg5! … Black is not in much of a hurry, and a rook lift
 * can be the solution." The verdict comes AFTER the tries; the "but" is the
 * tries that fail; the plan is what survives them (scratchpad
 * `danya-how-he-reads.md`, "one level deeper").
 *
 * This computer reads the conclusions off what the refuters already proved:
 *  1. THE BUT — the winning-looking tries the refuters ruled out
 *     (`temptingOnBoard`, `standingRefutations`; their own sentences are
 *     referenced, never re-worded), plus one shape no refuter reads: a try
 *     whose engine line sends the piece straight back to where it stood
 *     (his "…Qf6 is met by Rh5, and the queen has to go back"). Most tempting
 *     first (`eyeRead`). A try that simply hands over a piece is a blunder,
 *     not a try, unless it goes at the plan's target.
 *  2. THE PLAN — the engine's best move, the try that survives, with the link
 *     that makes it the answer: on the board after one of its moves (the best
 *     move, or a later move of the same side in its line) a piece now guards
 *     the unit the refuting reply took, hits the piece that made the reply, or
 *     adds an attacker on the target the reply held — each read by chess.js
 *     on the boards, never off the words. No link, no "because".
 *  3. THE VERDICT WORD — the band is the check, the tries are the source:
 *     better and every direct try fails → better, but hard to finish; a
 *     direct try that is itself the best move and wins material → it works
 *     now; level with the direct tries failing → no direct way in; no try
 *     read → the band said plainly.
 *  4. THE MOVE WITH ITS JOBS — the links above, the plan of the board
 *     (`planOfTheBoard`) it starts, and what the purpose computer reads it for
 *     (`purposeFromLine`).
 *
 * The ledger (`pictureLedger`, built beside this) joins through an optional
 * input: their counterplay alive or dead.
 *
 * Pure: chess.js, the refuters' outputs and the engine reads handed in.
 */
import { renderPictureVerdict, renderReturnTry } from './teachingSentence';
import { Chess, type Color, type Square } from 'chess.js';
import { eyeRead, bestOfReads, type WeighRead, type ConsideredTries, type TemptingRefuted, type StandingRefuted } from './weighedMoves';
import { planOfTheBoard, type BoardPlan, type PlanLineIn } from './planOfTheBoard';
import { purposeFromLine } from './movePurpose';
import { seatCp } from './winChance';
import { evalBand } from './evalBand';
import { settledNetForLine } from './exchangeLedger';
import { pieceRef } from './pieceRef';
import { PIECE_NAME } from './engineLineRead';
import { andList, orList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import type { AnalysisLine } from '../types';

/** A try that hands over a piece (a knight's worth or more, net) is a blunder,
 *  not a winning try — unless it goes at the plan's own target. */
export const PIECE_BAR_CP = 300;
/** How many of the mover's moves down the best line a link is looked for in. */
export const LINK_MOVES = 6;

/** Why a try looks like it wins. */
export type TryLook = 'plan' | 'storm' | 'capture' | 'check' | 'threat' | 'mate-threat' | 'lever' | 'passer' | 'king' | 'attack';

/** The kinds of considered try that go after something (a reroute, a guard or
 *  a doubling regroups; it does not try to win). */
const DIRECT_WHY: ReadonlySet<string> = new Set(['plan', 'capture', 'check', 'threat', 'mate-threat', 'lever', 'passer', 'king']);

/** One try in "the but": a winning-looking move that fails. */
export interface FailedTry {
  uci: string;
  /** SAN, "…" on a Black move. */
  name: string;
  look: TryLook;
  /** The weak pawn or the king it goes after, when it is the plan's try. */
  target: string | null;
  /** The reply that meets it, SAN with "…" on a Black move. */
  reply: string;
  /** Where the reply came from and went to, and what it took there (a unit of
   *  the try's side), on the board after the try. */
  replyFrom: string;
  replyTo: string;
  replyTook: boolean;
  /** Which proof rules it out: the material refuter, the result refuter, or
   *  the line that sends the piece back. */
  by: 'material' | 'result' | 'returns';
  /** The refuter's own sentence (unchanged), or the returns sentence. */
  text: string;
  costCp: number;
  eye: number;
}

export type LinkKind = 'guards-taken' | 'hits-replier' | 'adds-attacker';

/** A computed reason the survivor answers a failed try. */
export interface SurvivorLink {
  kind: LinkKind;
  /** The survivor-side move that makes it (SAN), its index among the mover's
   *  moves in the best line (0 = the best move), and the square it lands on. */
  moveSan: string;
  moveIndex: number;
  at: string;
  /** The square the link is about: the unit guarded, the replier hit, the target. */
  square: string;
  tries: FailedTry[];
  text: string;
}

export interface PicturePlan {
  /** The best move, the try that survives (SAN). */
  san: string;
  uci: string;
  /** The plan of the board it starts, when one is read. */
  plan: BoardPlan | null;
  /** Its name when the line shows a named manoeuvre ("the rook lift"). */
  named: string | null;
  links: SurvivorLink[];
  /** The move's jobs: what each link does, and what it is for. */
  jobs: string[];
  text: string;
  squares: string[];
}

export type VerdictKind = 'works-now' | 'hard-to-finish' | 'no-direct-way' | 'tries-worsen' | 'plain';

export interface PictureVerdictWord {
  kind: VerdictKind;
  /** The standing from the mover's seat: −3 losing … 0 level … 3 winning. */
  step: number;
  /** The word, from the mover's seat ("slightly better, but hard to finish"). */
  word: string;
  /** The direct try that works now, when one does. */
  works: { uci: string; name: string } | null;
  text: string;
  /** The same verdict said AFTER a standing that already gave the band and its
   *  reason ("You're slightly better — their king is in the middle."): the
   *  difficulty and the tries, without the band again. Empty on a plain band. */
  afterStanding: string;
}

export interface PictureConclusions {
  mover: Color;
  verdict: PictureVerdictWord;
  but: FailedTry[];
  plan: PicturePlan | null;
}

/** The ledger's half (`pictureLedger`, built beside this): the other side's
 *  one resource, alive or dead by the engine. Optional, so the two join later. */
export interface PictureLedgerIn {
  counterplay: { alive: boolean } | null;
}

export interface PictureVerdictIn {
  fen: string;
  student: Color;
  rating: number;
  /** One engine read per candidate from `fen` (the best among them). */
  reads: readonly WeighRead[];
  /** The tries weighed past the eye (`tryCandidates.consideredTries`). */
  considered: ConsideredTries | null;
  /** What the refuters produced on these reads. */
  tempting: readonly TemptingRefuted[];
  standing: readonly StandingRefuted[];
  /** The engine's lines on `fen` (MultiPV) for the plan of the board; absent:
   *  the best read alone. */
  lines?: readonly PlanLineIn[];
  ledger?: PictureLedgerIn | null;
}

const BAND_STEP: Record<ReturnType<typeof evalBand>, number> = { level: 0, slightly: 1, clearly: 2, decisive: 3 };

function stepOf(cp: number): number { return Math.sign(cp) * BAND_STEP[evalBand(cp)]; }
function boardOf(fen: string): Chess | null { try { return new Chess(fen); } catch { return null; } }
function playUci(b: Chess, u: string): ReturnType<Chess['move']> | null {
  try { return b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
}
function named(color: Color, san: string): string { return `${color === 'b' ? '…' : ''}${san}`; }
function placement(fen: string): string { return fen.split(' ').slice(0, 2).join(' '); }
function attacks(b: Chess, sq: string, by: Color, from: string): boolean {
  try { return b.attackers(sq as Square, by).includes(from as Square); } catch { return false; }
}

/** The enemy unit the moved piece newly attacks: a piece (not a pawn or the
 *  king), or one of the plan's target pawns. Null when it hits nothing new. */
function newlyAttacks(fen: string, uci: string, targets: ReadonlySet<string>): string | null {
  const before = boardOf(fen);
  if (!before) return null;
  const after = new Chess(fen);
  const m = playUci(after, uci);
  if (!m) return null;
  const them: Color = m.color === 'w' ? 'b' : 'w';
  for (const row of after.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== them || cell.type === 'k') continue;
      if (cell.type === 'p' && !targets.has(cell.square)) continue;
      if (attacks(after, cell.square, m.color, m.to) && !attacks(before, cell.square, m.color, m.from)) return cell.square;
    }
  }
  return null;
}

/** The read of `uci` among `reads`. */
function readOf(reads: readonly WeighRead[], uci: string): WeighRead | null {
  return reads.find((r) => r.moves[0] === uci) ?? null;
}

/** The reply the engine plays after the try, on the board after it. */
function replyOf(fen: string, read: WeighRead): { san: string; from: string; to: string; took: boolean } | null {
  if (read.moves.length < 2) return null;
  const b = boardOf(fen);
  if (!b || !playUci(b, read.moves[0])) return null;
  const r = playUci(b, read.moves[1]);
  return r ? { san: named(r.color, r.san), from: r.from, to: r.to, took: !!r.captured } : null;
}

/** THE TRY THAT GOES NOWHERE (his "…Qf6 is always met by the annoying Rh5,
 *  and Black's queen has to go back"): its line answers it, the piece goes
 *  straight back to the square it came from, and the board after those four
 *  moves is the board before the try. */
function returnsLine(fen: string, read: WeighRead): { reply: string; piece: string; from: string } | null {
  if (read.moves.length < 4) return null;
  const [t, r, back, again] = read.moves;
  if (back.slice(0, 2) !== t.slice(2, 4) || back.slice(2, 4) !== t.slice(0, 2)) return null;
  const b = boardOf(fen);
  if (!b) return null;
  const tm = playUci(b, t);
  const rm = tm ? playUci(b, r) : null;
  if (!tm || !rm || !playUci(b, back) || !playUci(b, again)) return null;
  if (placement(b.fen()) !== placement(fen)) return null;
  return { reply: named(rm.color, rm.san), piece: PIECE_NAME[tm.piece] ?? 'piece', from: tm.from };
}

/** 1. THE BUT. */
function failedTries(i: PictureVerdictIn, mover: Color, bestUci: string, bestCp: number): FailedTry[] {
  const eye = new Map(eyeRead(i.fen, i.rating).map((r) => [r.uci, r.p]));
  const planTargets = new Set<string>();
  for (const c of i.considered?.values() ?? []) if (c.why === 'plan' && !c.storm && /^[a-h][1-8]$/.test(c.target)) planTargets.add(c.target);
  const out = new Map<string, FailedTry>();
  const lookOf = (uci: string): { look: TryLook; target: string | null } | null => {
    const c = i.considered?.get(uci);
    if (c?.why === 'plan') return { look: c.storm ? 'storm' : 'plan', target: c.target };
    if (c && DIRECT_WHY.has(c.why)) return { look: c.why as TryLook, target: null };
    const b = boardOf(i.fen);
    const m = b ? playUci(b, uci) : null;
    if (m?.captured) return { look: 'capture', target: null };
    if (m && /[+#]/.test(m.san)) return { look: 'check', target: null };
    return newlyAttacks(i.fen, uci, planTargets) ? { look: 'attack', target: null } : null;
  };
  const add = (uci: string, by: FailedTry['by'], text: string, costCp: number, replyOverride: string | null = null): void => {
    if (out.has(uci) || uci === bestUci) return;
    const look = lookOf(uci);
    if (!look) return;
    const goesAtTarget = look.look === 'plan' || look.look === 'storm';
    if (!goesAtTarget && costCp >= PIECE_BAR_CP) return;
    const read = readOf(i.reads, uci);
    const r = read ? replyOf(i.fen, read) : null;
    if (!r) return;
    const b = boardOf(i.fen);
    const m = b ? playUci(b, uci) : null;
    if (!m) return;
    out.set(uci, { uci, name: named(m.color, m.san), look: look.look, target: look.target, reply: replyOverride ?? r.san, replyFrom: r.from, replyTo: r.to, replyTook: r.took, by, text, costCp, eye: eye.get(uci) ?? 0 });
  };
  for (const t of i.tempting) add(t.uci, 'material', t.text, t.costCp);
  for (const t of i.standing) add(t.uci, 'result', t.text, t.costCp);
  // THE TRY THAT GOES NOWHERE — no refuter reads it (it costs little: the
  // board comes straight back), so it is read here.
  for (const read of i.reads) {
    const uci = read.moves[0];
    if (!uci || uci === bestUci || out.has(uci)) continue;
    const back = returnsLine(i.fen, read);
    if (!back) continue;
    const b = boardOf(i.fen);
    const m = b ? playUci(b, uci) : null;
    if (!m) continue;
    const name = named(m.color, m.san);
    const text = renderReturnTry(name, back.reply, back.piece, back.from, stemKeyOf(`${i.fen}|returns|${uci}`));
    add(uci, 'returns', text, Math.max(0, Math.round(bestCp - seatCp(read, mover))), back.reply);
  }
  return [...out.values()].sort((a, b) => b.eye - a.eye);
}

/** What the plan's try goes after, in words. */
function aimWords(fen: string, target: string, student: Color): string {
  return pieceRef(fen, target, student)?.words ?? `the pawn on ${target}`;
}

/** 3. THE VERDICT WORD. */
function verdictOf(i: PictureVerdictIn, mover: Color, step: number, but: FailedTry[], works: { uci: string; name: string } | null): PictureVerdictWord {
  const mine = mover === i.student;
  const stem = stemKeyOf(`${i.fen}|picture-verdict`);
  const names = but.map((t) => t.name);
  const targets = [...new Set(but.map((t) => (t.look === 'plan' ? t.target : null)))];
  const oneTarget = targets.length === 1 && targets[0] ? aimWords(i.fen, targets[0], i.student) : null;
  const noCounterplay = i.ledger?.counterplay?.alive === false && step > 0;
  // THE DECISION: which verdict the board reads; the words are the renderer's.
  const kind: PictureVerdictWord['kind'] = works && step > 0 ? 'works-now'
    : but.length > 0 && step > 0 ? 'hard-to-finish'
      : but.length > 0 && step === 0 ? 'no-direct-way'
        : but.length > 0 ? 'tries-worsen' : 'plain';
  const r = renderPictureVerdict({ kind, step, mine, works: works?.name ?? null, butNames: names, oneTarget, noCounterplay, stem });
  return { kind, step, word: r.word, works: kind === 'works-now' ? works : null, text: r.text, afterStanding: r.afterStanding };
}

/** The best line's moves as SAN from `fen`, as far as they play. */
function sansOf(fen: string, uci: readonly string[]): string[] {
  const b = boardOf(fen);
  const out: string[] = [];
  if (!b) return out;
  for (const u of uci) { const m = playUci(b, u); if (!m) break; out.push(m.san); }
  return out;
}

/** "The rook lift": a rook of the mover's in the best line that climbs its
 *  file, then swings along a rank (his Rd7-f7, Re3-h3). */
function rookLiftIn(fen: string, line: readonly string[], mover: Color): boolean {
  const b = boardOf(fen);
  if (!b) return false;
  const climbed = new Set<string>();
  let k = 0;
  for (const u of line) {
    const m = playUci(b, u);
    if (!m) return false;
    if (m.color !== mover) continue;
    if (k >= LINK_MOVES) break;
    k += 1;
    if (m.piece !== 'r') continue;
    const up = mover === 'w' ? Number(m.to[1]) > Number(m.from[1]) : Number(m.to[1]) < Number(m.from[1]);
    if (m.from[0] === m.to[0] && up) climbed.add(m.to);
    else if (m.from[1] === m.to[1] && climbed.has(m.from)) return true;
  }
  return false;
}

/** 2. THE LINKS: down the best line, each move of the mover's is read on the
 *  board after it against every failed try. */
function linksOf(i: PictureVerdictIn, mover: Color, line: readonly string[], but: FailedTry[]): SurvivorLink[] {
  const b = boardOf(i.fen);
  if (!b || but.length === 0) return [];
  // The replier as it stood after the try: its type and colour.
  const replier = new Map<string, { type: string; color: Color }>();
  for (const t of but) {
    const tb = boardOf(i.fen);
    if (!tb || !playUci(tb, t.uci)) continue;
    const p = tb.get(t.replyFrom as Square);
    if (p) replier.set(t.uci, { type: p.type, color: p.color });
  }
  const found = new Map<string, SurvivorLink>();
  let k = 0;
  for (const u of line) {
    const before = new Chess(b.fen());
    const m = playUci(b, u);
    if (!m) break;
    if (m.color !== mover) continue;
    if (k >= LINK_MOVES) break;
    const idx = k;
    k += 1;
    // A failed try played later in the line is that try, not the survivor.
    if (but.some((t) => t.uci === u)) continue;
    for (const t of but) {
      // A try is answered once, by the first move that answers it.
      if ([...found.values()].some((l) => l.tries.includes(t))) continue;
      // Every link holds only while the piece that made the reply still
      // stands where it made it from: once it has gone, so has the reply.
      const rp = replier.get(t.uci);
      const here = b.get(t.replyFrom as Square);
      if (!rp || !here || here.type !== rp.type || here.color !== rp.color) continue;
      let kind: LinkKind | null = null;
      let square = '';
      // GUARDS WHAT THE REPLY TOOK: the unit still stands, and this move's
      // piece now guards it where it did not before.
      const took = t.replyTook ? b.get(t.replyTo as Square) : null;
      if (took && took.color === mover && attacks(b, t.replyTo, mover, m.to) && !attacks(before, t.replyTo, mover, m.from)) { kind = 'guards-taken'; square = t.replyTo; }
      // HITS THE REPLIER: this move's piece now attacks the piece (not a
      // pawn) that made the reply.
      if (!kind && here.type !== 'p' && attacks(b, t.replyFrom, mover, m.to) && !attacks(before, t.replyFrom, mover, m.from)) { kind = 'hits-replier'; square = t.replyFrom; }
      // ADDS AN ATTACKER ON THE TARGET the reply held: one more of the mover's
      // pieces on the plan's target than before.
      if (!kind && t.look === 'plan' && t.target && /^[a-h][1-8]$/.test(t.target)) {
        const tp = b.get(t.target as Square);
        let n0 = 0; let n1 = 0;
        try { n0 = before.attackers(t.target as Square, mover).length; n1 = b.attackers(t.target as Square, mover).length; } catch { /* none */ }
        if (tp && tp.color !== mover && n1 > n0 && attacks(b, t.target, mover, m.to)) { kind = 'adds-attacker'; square = t.target; }
      }
      if (!kind) continue;
      const key = `${idx}|${kind}|${square}`;
      const prev = found.get(key);
      if (prev) prev.tries.push(t);
      else found.set(key, { kind, moveSan: named(m.color, m.san), moveIndex: idx, at: m.to, square, tries: [t], text: '' });
    }
  }
  const out = [...found.values()];
  for (const l of out) l.text = linkText(i, l, mover);
  return out;
}

function linkText(i: PictureVerdictIn, l: SurvivorLink, mover: Color): string {
  // Words for the unit on the board where the move lands (the start board for
  // the best move): the piece words come off the board after the move.
  const after = boardAfterMoves(i.fen, i.reads, mover, l.moveIndex);
  const ref = (sq: string): string => (after ? pieceRef(after, sq, i.student)?.words : null) ?? `the piece on ${sq}`;
  const piece = after ? (PIECE_NAME[new Chess(after).get(l.at as Square)?.type ?? ''] ?? 'piece') : 'piece';
  const tries = orList(l.tries.map((t) => t.name));
  const replies = [...new Set(l.tries.map((t) => t.reply))];
  const reply = orList(replies);
  // THE LINK KNOWS ITS BOARD (CLAUDE.md rule 1): the board's own move links
  // from the board on screen; a later move of the line is said where it is
  // played — "later in the line, after Qe3" — never as if it stood now
  // (0Km5u Qe3: "On g4 the bishop hits their bishop" was a move away).
  const at = l.moveIndex === 0 ? `On ${l.at} the ${piece}` : `Later in the line, after ${l.moveSan}, the ${piece} on ${l.at}`;
  if (l.kind === 'guards-taken') return `${at} guards ${ref(l.square)}, which ${reply} takes after ${tries}.`;
  // Each try with its own reply: "…g4 with Nh4 and …d5 with Nxe5".
  if (l.kind === 'hits-replier') return `${at} hits ${ref(l.square)}, which answers ${andList(l.tries.map((t) => `${t.name} with ${t.reply}`))}.`;
  return `${at} adds an attacker on ${ref(l.square)}, which ${reply} holds after ${tries}.`;
}

/** The board after the mover's `idx`-th move of the best line (0 = the best move). */
function boardAfterMoves(fen: string, reads: readonly WeighRead[], mover: Color, idx: number): string | null {
  const best = bestOfReads(fen, reads);
  if (!best) return null;
  const b = boardOf(fen);
  if (!b) return null;
  let k = -1;
  for (const u of best.read.moves) {
    const m = playUci(b, u);
    if (!m) return null;
    if (m.color === mover) { k += 1; if (k === idx) return b.fen(); }
  }
  return null;
}

/** THE CONCLUSIONS of one board, or null on a forced mate (the mate is the
 *  story) or with no read. */
export function pictureVerdictOf(i: PictureVerdictIn): PictureConclusions | null {
  const b = boardOf(i.fen);
  if (!b) return null;
  const mover = b.turn();
  const best = bestOfReads(i.fen, i.reads);
  if (!best || best.read.mate !== null) return null;
  const bestUci = best.read.moves[0];
  const bestCp = seatCp(best.read, mover);
  const step = stepOf(bestCp);
  const but = failedTries(i, mover, bestUci, bestCp);
  // A DIRECT TRY THAT WORKS: the best move is itself one, and its line wins
  // material for the mover.
  const bestLook = ((): boolean => {
    const c = i.considered?.get(bestUci);
    if (c && (c.why === 'plan' || DIRECT_WHY.has(c.why))) return true;
    const mb = boardOf(i.fen);
    const m = mb ? playUci(mb, bestUci) : null;
    return !!m && (!!m.captured || /[+#]/.test(m.san));
  })();
  const net = bestLook ? settledNetForLine(i.fen, sansOf(i.fen, best.read.moves), mover) : null;
  const works = bestLook && net !== null && net >= 1 ? { uci: bestUci, name: named(mover, best.san) } : null;
  const verdict = verdictOf(i, mover, step, but, works);
  // 2 + 4. THE PLAN: only where a direct try failed and none works — the
  // survivor is chosen by elimination.
  let plan: PicturePlan | null = null;
  if (but.length > 0 && !works) {
    const lines = i.lines && i.lines.length > 0 ? i.lines : [{ moves: best.read.moves, evaluation: best.read.evaluation, mate: best.read.mate }];
    const boardPlan = planOfTheBoard({ fen: i.fen, lines, student: i.student, namesMoves: true });
    const lift = rookLiftIn(i.fen, best.read.moves, mover) ? 'the rook lift' : null;
    const links = linksOf(i, mover, best.read.moves, but);
    const analysis: AnalysisLine[] = lines.map((l, k) => ({ rank: k + 1, depth: 0, evaluation: l.evaluation, mate: l.mate, moves: [...l.moves] }));
    const intent = purposeFromLine(i.fen, best.san, analysis, mover === i.student ? 'student' : 'opponent');
    const san = named(mover, best.san);
    const mine = mover === i.student;
    const stem = stemKeyOf(`${i.fen}|picture-plan`);
    const lead = lift
      ? (boardPlan && boardPlan.starts > 0
        ? `So the slower way: ${san} first, then ${lift}.`
        : `So the slower way: ${lift}, starting with ${san}.`)
      : mine
        ? rotateStem([`So first ${san}.`, `So the quiet ${san} instead.`], stem)
        : rotateStem([`So their move is the quiet ${san}.`, `So they go slower, with ${san}.`], stem);
    const jobs = [...links.map((l) => l.text), ...(intent ? [intent.text] : [])];
    const squares = [...new Set([bestUci.slice(0, 2), bestUci.slice(2, 4), ...links.flatMap((l) => [l.at, l.square]), ...(boardPlan?.squares ?? [])])];
    plan = { san, uci: bestUci, plan: boardPlan, named: lift, links, jobs, text: [lead, ...jobs].join(' '), squares };
  }
  return { mover, verdict, but, plan };
}

/** The verdict alone (the registry's `pictureVerdict`). */
export function pictureVerdict(i: PictureVerdictIn): { verdict: PictureVerdictWord; but: FailedTry[] } | null {
  const c = pictureVerdictOf(i);
  return c ? { verdict: c.verdict, but: c.but } : null;
}

/** The plan that survives (the registry's `picturePlan`). */
export function picturePlan(i: PictureVerdictIn): PicturePlan | null {
  return pictureVerdictOf(i)?.plan ?? null;
}
