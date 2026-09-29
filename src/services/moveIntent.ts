// moveIntent — what a move is FOR (David 2026-09-29: "focus on number 1": the
// coach describes the board; Naroditsky says why a move is played).
//
// Two questions, each answered by the engine, never by a guess:
//   PREVENTS — what would the opponent play if this side PASSED? If this move
//              takes that reply away (illegal now, or no longer one of their
//              good moves), the move stops it: "h3 — so …Bg4 isn't possible."
//   PREPARES — what would this side play if it moved AGAIN? If that move was
//              illegal or clearly worse before this one, this move prepares it:
//              "first X, so that Y".
// Both at once is "one move, two jobs". The same computer reads either seat, so
// "what is their move for?" is the same question asked of the other side.
//
// Pure: the four engine reads are handed in (see `IntentReads`). No engine call
// here, no model — the caller owns the search budget.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { legalSeeGainOn } from './positionReadingService';

export interface IntentReads {
  /** Mover to move at the board BEFORE the move (the ordinary read). */
  before: readonly AnalysisLine[];
  /** Opponent to move at the board before the move — a null move: the side
   *  that is about to move passes. `nullMoveFen(fenBefore)`. */
  passBefore: readonly AnalysisLine[];
  /** Opponent to move at the board AFTER the move (the ordinary read). */
  after: readonly AnalysisLine[];
  /** Mover to move again at the board after the move — a null move for the
   *  opponent. `nullMoveFen(fenAfter)`. */
  passAfter: readonly AnalysisLine[];
  /** Their actual reply to the move, when the surface knows it (Learn does:
   *  the coach's own move). Defaults to the first move of `after[0]`. */
  reply?: string;
}

export interface IntentMove { uci: string; san: string }

/** How each half reads the engine. Chosen by measurement against his games
 *  (`moveIntent.measure.test.ts`), not by taste. */
export interface IntentOptions {
  /** 'pass' — the best move after a free extra move; 'line' — the next move
   *  this side plays in the engine's own main line after the move. */
  prepare: 'pass' | 'line' | 'unlock';
  /** 'any' — every strong reply after a pass; 'concrete' — only a reply that
   *  mates, gives check, or wins material by exchange. */
  prevent: 'any' | 'concrete' | 'deny' | 'any+deny';
  /** The move is still in opening book: speak only a real stopped threat or a
   *  prepared move with its reason (never silence for being in book). */
  book?: boolean;
}
export const DEFAULT_INTENT: IntentOptions = { prepare: 'unlock', prevent: 'any+deny' };

export interface MoveIntent {
  /** The reply this move took away from the opponent. */
  prevents: (IntentMove & { threatCp: number }) | null;
  /** The follow-up this move made possible or clearly better. */
  prepares: (IntentMove & { gainCp: number }) | null;
  text: string;
  /** Every square the text is about — the move's own landing square, and the
   *  from/to of the move it stops or prepares. Always non-empty, so the fact
   *  can SUPPORT a lead that shares a square (the Learn door, WO-1b). */
  squares: string[];
  /** Whose move this is about. */
  about: 'student' | 'opponent';
}

/** A real threat costs the side that passes at least this much. */
export const THREAT_CP = 100;
/** A follow-up is "prepared" when it gained at least this much. */
export const PREPARE_CP = 50;
/** A reply counts as gone when it now scores this much worse than their best. */
const GONE_CP = 60;

const MATE = 100_000;

/** Line value in centipawns from `pov`'s side ('w' | 'b'). Mate is folded to a
 *  large number, nearer mates larger. */
function valueFor(l: AnalysisLine, pov: 'w' | 'b'): number {
  const white = l.mate !== null && l.mate !== undefined
    ? (l.mate > 0 ? MATE - Math.abs(l.mate) : -(MATE - Math.abs(l.mate)))
    : l.evaluation;
  return pov === 'w' ? white : -white;
}

/** The same board with the other side to move — a pass. Null when the side to
 *  move is in check (a pass would be illegal) or the FEN is unreadable. */
export function nullMoveFen(fen: string): string | null {
  try {
    const c = new Chess(fen);
    if (c.inCheck()) return null;
    const parts = fen.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    // The side passing is not in check, so nothing attacks its king and the
    // flipped board is legal as it stands.
    const flipped = parts.join(' ');
    new Chess(flipped);
    return flipped;
  } catch { return null; }
}

function sanOf(fen: string, uci: string): string | null {
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return m?.san ?? null;
  } catch { return null; }
}

const firstMove = (l: AnalysisLine | undefined): string | null => l?.moves?.[0] ?? null;

/** The value of `uci` among `lines` for `pov`, or null when it is not listed. */
function valueOfMove(lines: readonly AnalysisLine[], uci: string, pov: 'w' | 'b'): number | null {
  const hit = lines.find((l) => firstMove(l) === uci);
  return hit ? valueFor(hit, pov) : null;
}

/**
 * What `playedSan` (from `fenBefore`) is FOR, or null when the engine shows no
 * reply it took away and no follow-up it made possible.
 */
export function moveIntent(
  fenBefore: string,
  playedSan: string,
  reads: IntentReads,
  /** Whose move this is, for the wording: the student's, or their opponent's. */
  seat: 'student' | 'opponent',
  opts: IntentOptions = DEFAULT_INTENT,
): MoveIntent | null {
  let fenAfter: string;
  let playedUci: string;
  let mover: 'w' | 'b';
  try {
    const c = new Chess(fenBefore);
    mover = c.turn();
    const m = c.move(playedSan);
    if (!m) return null;
    playedUci = `${m.from}${m.to}${m.promotion ?? ''}`;
    fenAfter = c.fen();
    if (c.isGameOver()) return null;
  } catch { return null; }
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  if (!reads.before.length || !reads.after.length) return null;

  // ── PREVENTS ────────────────────────────────────────────────────────────
  // Every reply the opponent would have after a pass is a candidate — his
  // "prevents" is often their second idea, not their first. The strongest
  // real threat the move took away is the one named.
  let prevents: MoveIntent['prevents'] = null;
  const passFen = nullMoveFen(fenBefore);
  if (passFen && opts.prevent === 'deny') {
    prevents = denied(fenBefore, fenAfter, passFen, playedUci, mover, reads);
  } else if (passFen && reads.before[0]) {
    const ifBest = -valueFor(reads.before[0], mover);
    const theirBestNow = reads.after[0] ? valueFor(reads.after[0], opp) : null;
    const worstListed = reads.after.length ? Math.min(...reads.after.map((l) => valueFor(l, opp))) : null;
    for (const line of reads.passBefore) {
      const threat = firstMove(line);
      if (!threat) continue;
      // What passing would cost the mover: this reply after a pass, against
      // the mover's own best move now (both from the opponent's side).
      const threatCp = valueFor(line, opp) - ifBest;
      if (threatCp < THREAT_CP || (prevents && prevents.threatCp >= threatCp)) continue;
      const threatSan = sanOf(passFen, threat);
      // Moving the attacked piece away is a rescue, not a purpose worth naming.
      const rescue = threat.slice(2, 4) === playedUci.slice(0, 2);
      if (!threatSan || rescue || threat === playedUci) continue;
      if (opts.prevent === 'concrete' && !concreteThreat(passFen, threat, threatSan, line)) continue;
      const stillLegal = sanOf(fenAfter, threat) !== null;
      const threatNow = valueOfMove(reads.after, threat, opp);
      const gone = !stillLegal
        || (theirBestNow !== null && threatNow !== null && threatNow <= theirBestNow - GONE_CP)
        // Not even among their listed moves: worse than the worst of them.
        || (threatNow === null && theirBestNow !== null && worstListed !== null && worstListed <= theirBestNow - GONE_CP)
        // Their best reply to a pass, worth a real threat, and now not even in
        // their top lines: it no longer works.
        || (threatNow === null && line === reads.passBefore[0]);
      if (gone) prevents = { uci: threat, san: threatSan, threatCp };
    }
    if (!prevents && opts.prevent === 'any+deny') prevents = denied(fenBefore, fenAfter, passFen, playedUci, mover, reads);
  }

  // ── PREPARES ────────────────────────────────────────────────────────────
  let prepares: MoveIntent['prepares'] = null;
  if (opts.prepare === 'unlock') {
    // What the move UNLOCKS (board + exchange counting), and of those, the one
    // the engine actually plays for this side in its lines; a lone unlock is
    // named as it stands; several with none in the lines stay unnamed.
    // THE REPLAY GUARD (WO-COACH-TEACHER review 2026-09-29): the move must be
    // the CAUSE. Replay their reply without the move (this side passes) — the
    // follow-up must fail there, and must work after the move and the reply.
    const reply = reads.reply ?? reads.after[0]?.moves?.[0];
    const unlocked = unlockedMoves(fenBefore, playedSan);
    const engineSaw = new Set<string>();
    for (const l of [...reads.after, ...reads.passAfter]) (l.moves ?? []).forEach((u) => engineSaw.add(u));
    // Two kinds of evidence. The engine playing it in its lines is one (it sees
    // the pins and lines exchange counting cannot — Kh1 then f4). Without that,
    // a lone unlock must pass the replay guard AND not merely step into the
    // square the moved piece left (Kh1 → Rg1 is not a plan).
    const vacated = playedUci.slice(0, 2);
    const pick = unlocked.find((u) => engineSaw.has(u.uci))
      ?? (unlocked.length === 1 && unlocked[0].uci.slice(2, 4) !== vacated && causedBy(fenBefore, fenAfter, reply, unlocked[0]) ? unlocked[0] : undefined);
    if (pick) prepares = { uci: pick.uci, san: pick.san, gainCp: PREPARE_CP };
  } else if (opts.prepare === 'line') {
    // The engine's main line after the move, walked for THIS side's moves (the
    // 2nd, 4th, 6th ply). The first one that was not available before — illegal
    // then, or clearly worse then — is what this move is heading for. "Kh1, …,
    // then f4": the plan move is rarely the very next one.
    const line = reads.after[0]?.moves ?? [];
    const bestBefore = valueFor(reads.before[0], mover);
    try {
      const c = new Chess(fenAfter);
      for (let i = 0; i < Math.min(line.length, 6); i += 1) {
        const u = line[i];
        const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined });
        if (!mv) break;
        if (i % 2 === 0) continue; // their move
        if (mv.captured || /[+#]/.test(mv.san)) continue; // forcing is not a plan
        if (u === playedUci) continue;
        const legalBefore = sanOf(fenBefore, u) !== null;
        const beforeValue = valueOfMove(reads.before, u, mover);
        const gainCp = !legalBefore ? PREPARE_CP : beforeValue !== null ? bestBefore - beforeValue : null;
        if (gainCp !== null && gainCp >= PREPARE_CP) { prepares = { uci: u, san: mv.san, gainCp }; break; }
      }
    } catch { /* an unreadable line prepares nothing */ }
  } else {
    const againFen = nullMoveFen(fenAfter);
    const follow = firstMove(reads.passAfter[0]);
    if (againFen && follow && reads.passAfter[0] && follow !== playedUci) {
      const followSan = sanOf(againFen, follow);
      // A capture or a check after a PASS is an artifact of the pass — the
      // opponent never got to answer. A plan move is quiet.
      const forcing = !!followSan && /[x+#]/.test(followSan);
      const nowValue = valueFor(reads.passAfter[0], mover);
      const legalBefore = sanOf(fenBefore, follow) !== null;
      const beforeValue = valueOfMove(reads.before, follow, mover);
      const gainCp = !legalBefore ? PREPARE_CP : beforeValue !== null ? nowValue - beforeValue : null;
      if (followSan && !forcing && gainCp !== null && gainCp >= PREPARE_CP) prepares = { uci: follow, san: followSan, gainCp };
    }
  }

  // A follow-up by the piece this move just put down is not a plan the move
  // prepared — castling "prepares Re1" is the castled rook moving again
  // (walk 2026-09-29).
  if (prepares) {
    try {
      const m = new Chess(fenBefore).move(playedSan);
      const own = [m.to, castledRookSquare(m)].filter(Boolean);
      if (own.includes(prepares.uci.slice(0, 2))) prepares = null;
    } catch { /* keep */ }
  }
  // IN BOOK THE SAME TEACHING, HELD TO ITS SUBSTANCE (David 2026-09-29: "He
  // is not quiet during book moves"). He speaks every move of the opening,
  // so book is never a reason for silence — but "e4 stops …d5 and prepares
  // Be2" teaches nothing. In book a stopped move must be a real threat (a
  // check, a capture, mate — "Nf3 stops …Qh4+") and a prepared move must come
  // with what it does.
  if (opts.book) {
    if (prevents && !/[x+#]/.test(prevents.san)) prevents = null;
    if (prepares && !whatItDoes(fenAfter, prepares.uci, mover)) prepares = null;
  }
  if (!prevents && !prepares) return null;
  const squares = [...new Set([
    playedUci.slice(2, 4),
    ...(prevents ? [prevents.uci.slice(0, 2), prevents.uci.slice(2, 4)] : []),
    ...(prepares ? [prepares.uci.slice(0, 2), prepares.uci.slice(2, 4)] : []),
  ])];
  return { prevents, prepares, text: phrase(playedSan, prevents, prepares, seat, mover, fenAfter, prepares ? whatItDoes(fenAfter, prepares.uci, mover) : null), squares, about: seat };
}

/** A threat worth naming as "stopped": it mates, checks, or wins material by
 *  exchange on the square it lands on. A quiet reply the engine merely likes
 *  is not a threat a student can see. */
function concreteThreat(passFen: string, uci: string, san: string, line: AnalysisLine): boolean {
  if (line.mate !== null && line.mate !== undefined) return true;
  if (/[+#]/.test(san)) return true;
  if (!san.includes('x')) return false;
  try { return legalSeeGainOn(new Chess(passFen), uci.slice(2, 4) as Parameters<typeof legalSeeGainOn>[1]) >= 1; } catch { return false; }
}

function phrase(
  san: string,
  prevents: MoveIntent['prevents'],
  prepares: MoveIntent['prepares'],
  seat: 'student' | 'opponent',
  mover: 'w' | 'b',
  fenAfter: string,
  /** What the prepared move does once played — "hit the pawn on e5", "take
   *  the open e-file", "castle" — so the line teaches the WHY, not a bare move. */
  does: PreparedPoint | null,
): string {
  const dot = (s: string, side: 'w' | 'b'): string => (side === 'b' ? `…${s}` : s);
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  const played = dot(san, mover);
  const key = stemKeyOf(fenAfter);
  if (seat === 'student') {
    const stop = prevents ? dot(prevents.san, opp) : '';
    const prep = prepares ? dot(prepares.san, mover) : '';
    if (prevents && prepares) return `${played} does two jobs: it stops ${stop}, and it prepares ${prep}${does ? `, to ${does.verb}` : ''}.`;
    if (prevents) return rotateStem([`${played} — so ${stop} isn't possible any more.`, `The point of ${played}: it takes ${stop} away.`], key);
    if (does?.castle) return rotateStem([`${played} clears the way to castle.`, `${played} first, so you can castle next.`], key);
    if (does) return rotateStem([`${played} first, so that ${prep} can ${does.verb}.`, `${played} prepares ${prep}, to ${does.verb}.`], key);
    return rotateStem([`${played} prepares ${prep}.`, `${played} first, so that ${prep} comes next.`], key);
  }
  const stop = prevents ? `your ${dot(prevents.san, opp)}` : '';
  const prep = prepares ? dot(prepares.san, mover) : '';
  if (prevents && prepares) return `Their ${played} does two jobs: it stops ${stop}, and it prepares ${prep}${does ? `, to ${does.verb}` : ''}.`;
  if (prevents) return rotateStem([`Their ${played} stops ${stop}.`, `The point of their ${played}: it takes ${stop} away.`], key);
  if (does?.castle) return rotateStem([`Their ${played} clears the way to castle.`, `They play ${played} first, so they can castle next.`], key);
  if (does) return rotateStem([`Their ${played} prepares ${prep}, to ${does.verb}.`, `They play ${played} first, so that ${prep} can ${does.verb}.`], key);
  return rotateStem([`Their ${played} prepares ${prep}.`, `They play ${played} first, so that ${prep} comes next.`], key);
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export interface PreparedPoint { verb: string; castle: boolean }

/** What the prepared move DOES once played, read off the board where the mover
 *  moves again (the opponent passes): castle; hit an enemy piece or pawn the
 *  moved piece did not hit before (the most valuable one); or put a rook or
 *  queen on a file with no pawn of its own side. Null when none is true — the
 *  line then names the move alone rather than inventing a reason. */
export function whatItDoes(fenAfter: string, prepUci: string, mover: 'w' | 'b'): PreparedPoint | null {
  const again = nullMoveFen(fenAfter);
  if (!again) return null;
  let board: Chess; let m;
  try { board = new Chess(again); m = board.move({ from: prepUci.slice(0, 2), to: prepUci.slice(2, 4), promotion: prepUci.slice(4, 5) || undefined }); } catch { return null; }
  if (!m) return null;
  if (m.isKingsideCastle() || m.isQueensideCastle()) return { verb: 'castle', castle: true };
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  const hits = (b: Chess, from: string): string[] => {
    try {
      const probe = new Chess(nullMoveFen(b.fen()) ?? b.fen());
      if (probe.turn() !== mover) return [];
      return probe.moves({ square: from as never, verbose: true }).filter((x) => x.captured).map((x) => x.to);
    } catch { return []; }
  };
  const before = new Set(hits(new Chess(again), m.from));
  const now = hits(board, m.to).filter((sq) => !before.has(sq));
  const targets: Array<{ sq: string; type: string }> = [];
  for (const sq of now) {
    const p = board.get(sq as never);
    if (p && p.color === opp && p.type !== 'k') targets.push({ sq, type: p.type });
  }
  targets.sort((a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type]);
  if (targets.length) return { verb: `hit the ${PIECE_NAME[targets[0].type]} on ${targets[0].sq}`, castle: false };
  if (m.piece === 'r' || m.piece === 'q') {
    const file = m.to[0];
    const cells = board.board().flat().filter((c) => c && c.type === 'p' && c.square[0] === file) as Array<{ color: 'w' | 'b' }>;
    if (!cells.some((c) => c.color === mover) && m.from[0] !== file) {
      return { verb: `take the ${cells.length ? 'half-open' : 'open'} ${file}-file`, castle: false };
    }
  }
  return null;
}

/** SQUARE DENIAL: of the moves they would play after a pass, the first whose
 *  landing square this move now covers and did not before — "Bf5 stops the
 *  knight landing on e4", "f3 takes g4 away", "d6 shuts the door on e5". */
function denied(
  fenBefore: string, fenAfter: string, passFen: string, playedUci: string, mover: 'w' | 'b', reads: IntentReads,
): MoveIntent['prevents'] {
  const covered = (fen: string, sq: string): boolean => { try { return new Chess(fen).isAttacked(sq as never, mover); } catch { return false; } };
  for (const line of reads.passBefore) {
    const t = firstMove(line);
    if (!t || t === playedUci) continue;
    const to = t.slice(2, 4);
    const tSan = sanOf(passFen, t);
    if (!tSan || tSan.includes('x')) continue; // a capture is not a square they wanted
    if (!covered(fenBefore, to) && covered(fenAfter, to)) return { uci: t, san: tSan, threatCp: 0 };
  }
  return null;
}

/** The replay guard: `u` works after the move and their reply, and fails when
 *  the same reply is played without the move (this side passes instead). A
 *  reply that is illegal without the move falls back to the board before it. */
function causedBy(fenBefore: string, fenAfter: string, reply: string | undefined, u: IntentMove): boolean {
  const toMove = (uci: string): { from: string; to: string; promotion?: string } => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
  const afterReply = (fen: string | null): string | null => {
    if (!fen || !reply) return null;
    try { const c = new Chess(fen); return c.move(toMove(reply)) ? c.fen() : null; } catch { return null; }
  };
  const real = afterReply(fenAfter);
  // With no reply to replay (game over, unreadable), the unlock test stands.
  if (!real) return true;
  const works = (fen: string): boolean => {
    try { return !!new Chess(fen).moves({ verbose: true }).find((m) => `${m.from}${m.to}${m.promotion ?? ''}` === u.uci) && safeLanding(fen, toMove(u.uci)); } catch { return false; }
  };
  if (!works(real)) return false;
  const without = afterReply(nullMoveFen(fenBefore));
  return without ? !works(without) : true;
}

/** Moving `m` from `fen` lands safely: the opponent wins nothing by taking. */
function safeLanding(fen: string, m: { from: string; to: string; promotion?: string }): boolean {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: m.from, to: m.to, promotion: m.promotion });
    if (!mv) return false;
    return legalSeeGainOn(c, mv.to) <= 0;
  } catch { return false; }
}

/**
 * What a move UNLOCKS: this side's quiet moves that were illegal before the
 * move, or legal but losing material, and are legal and safe after it — with
 * this side to move again (a pass by the opponent). Board geometry and exchange
 * counting only; no engine. "e6 opens d6 for the bishop", "Qd2 makes Bh6 safe",
 * "h3 makes g4 safe". The moved piece's own continuations are not unlocks.
 */
/** Where the rook lands when `m` castles, else null. */
function castledRookSquare(m: { color: 'w' | 'b'; isKingsideCastle: () => boolean; isQueensideCastle: () => boolean }): string | null {
  const rank = m.color === 'w' ? '1' : '8';
  if (m.isKingsideCastle()) return `f${rank}`;
  if (m.isQueensideCastle()) return `d${rank}`;
  return null;
}

export function unlockedMoves(fenBefore: string, playedSan: string): IntentMove[] {
  let fenAfter: string;
  let movedTo: string;
  let castledRook: string | null = null;
  try {
    const c = new Chess(fenBefore);
    const m = c.move(playedSan);
    if (!m) return [];
    movedTo = m.to;
    castledRook = castledRookSquare(m);
    fenAfter = c.fen();
  } catch { return []; }
  const again = nullMoveFen(fenAfter);
  if (!again) return [];
  const before = new Map<string, { from: string; to: string; promotion?: string }>();
  try {
    for (const b of new Chess(fenBefore).moves({ verbose: true })) before.set(`${b.from}${b.to}${b.promotion ?? ''}`, b);
  } catch { return []; }
  const out: IntentMove[] = [];
  let now: ReturnType<Chess['moves']>;
  try { now = new Chess(again).moves({ verbose: true }); } catch { return []; }
  for (const u of now as Array<{ from: string; to: string; promotion?: string; san: string; captured?: string }>) {
    if (u.from === movedTo || u.from === castledRook || u.captured || /[+#]/.test(u.san)) continue;
    const key = `${u.from}${u.to}${u.promotion ?? ''}`;
    if (!safeLanding(again, u)) continue;
    const b = before.get(key);
    if (!b || !safeLanding(fenBefore, b)) out.push({ uci: key, san: u.san });
  }
  return out;
}
