// costReason — WHY A MOVE COST WHAT IT COST, THE SAME DEPTH FOR BOTH SIDES
// (WO-DECIDER-02, David 2026-10-28: "We can't give shallow reasoning for their
// moves and deeper reasons for users moves. They both need the same level of
// quality").
//
// One walker, both seats. A move that lost a pawn or more is explained by the
// first thing in the engine's line that covers the cost and holds:
//   allowed — the line after the move wins material (or mates) for the other side;
//   missed  — the best line from before won it for the mover.
// Measured on 337 of David's costly moves: Review named the reason for the
// student's moves at 70–93% inside three moves and for the opponent's at
// 14–57% — the readers were different for the two seats, not the board. This
// is the one reader; the seat only changes the words a surface puts around it.
//
// Whether the LINE may be said is `lineTrust` (two moves on one read, five on
// two agreeing reads, past five only forcing and agreed). A reason found but
// not trusted is HELD: the cost is still the engine's and stands; the line is
// not taught (a held reason is recorded, never a gap).
//
// Pure: chess.js + the one ledger (`proofCut`) + the one classifier.
import { Chess } from 'chess.js';
import { gainAfterLine, promotedIn, proofCut, type ExchangeLedger } from './exchangeLedger';
import { countWords } from '../utils/countWords';
import { lineTrust, type LineSeconds, type LineTrust } from './lineTrust';
import { detectTacticType } from './missedTacticService';
import { MATERIAL_VALUE } from './pieceValues';
import type { TacticType } from '../types';
import { lineSeatAt, lineShape } from '../utils/andList';
import { markSaysMate } from '../utils/sanMark';

/** A read of one board: its principal line, where it came from, and the other
 *  reads of the SAME board that may vouch for it. (Named `LineRead`: the board
 *  registry's reads used to be called `BoardRead` too — one name, two things.) */
export interface LineRead {
  uci: readonly string[];
  source: 'deep' | 'record';
  /** REQUIRED: other reads of this board (`[]` = none), or `VERIFIED_LINE`. */
  seconds: LineSeconds;
}

export interface ReasonPly { san: string; uci: string; fenBefore: string; fenAfter: string; moverColor: 'white' | 'black' }

export interface CostReason {
  /** WHO PAYS — the side that played the costly move, seat-relative to the
   *  student. Required on the one shape: the 92 seat flips of 2026-10-28 were a
   *  reason with no seat. */
  seat: 'you' | 'them';
  kind: 'allowed' | 'missed';
  mate: boolean;
  /** The board the line starts from: after the move (allowed) or before it (missed). */
  fen: string;
  /** The line up to and including the blow (plus a forced recapture the
   *  ledger plays out). */
  plies: ReasonPly[];
  /** Plies from the line's start to the blow. */
  blowPlies: number;
  /** The settled exchange, counted for the student (`describeProofResult`). */
  ledger: ExchangeLedger | null;
  /** What the side that wins nets, in pawns (a mate is 100). */
  netForWinner: number;
  trust: LineTrust;
  source: 'deep' | 'record';
  /** The one classifier's name for the line, when it names one. */
  motif: TacticType | null;
}

/** The pawns a reason must win to explain a cost: most of it, never less than
 *  one. A pawn does not explain a lost knight. */
export function reasonNeed(costCp: number): number {
  return Math.max(1, Math.round((0.6 * costCp) / 100));
}

/** THE PROMOTION A PERSON PLAYS (Review 2026-11-08: "they play a1, making a
 *  rook"). An engine picks a rook or bishop when the result is the same either
 *  way, and its pick is not the point of the line. A queen is said unless it
 *  stalemates, or loses the check the engine's piece gave — then the engine's
 *  piece IS the point. A knight is kept: it does what a queen cannot. */
function promotionToSay(c: Chess, u: string): string {
  const piece = u[4];
  if (piece !== 'r' && piece !== 'b') return u;
  try {
    const q = new Chess(c.fen());
    const withQueen = q.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: 'q' });
    if (!withQueen || q.isStalemate()) return u;
    const e = new Chess(c.fen());
    const engine = e.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: piece });
    if (engine && /[+#]$/.test(engine.san) && !/[+#]$/.test(withQueen.san)) return u;
    return `${u.slice(0, 4)}q`;
  } catch { return u; }
}

function replay(fen: string, uci: readonly string[]): { sans: string[]; plies: ReasonPly[] } {
  const sans: string[] = [];
  const plies: ReasonPly[] = [];
  try {
    const c = new Chess(fen);
    for (const raw of uci) {
      const u = promotionToSay(c, raw);
      const fenBefore = c.fen();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      sans.push(m.san);
      plies.push({ san: m.san, uci: u, fenBefore, fenAfter: c.fen(), moverColor: m.color === 'w' ? 'white' : 'black' });
    }
  } catch { /* the playable prefix is what we have */ }
  return { sans, plies };
}

/** The winner's material lead on a board, in pawns. */
function lead(fen: string, winner: 'w' | 'b'): number {
  let w = 0; let b = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = MATERIAL_VALUE[ch.toLowerCase()];
    if (v === undefined || ch.toLowerCase() === 'k') continue;
    if (ch === ch.toUpperCase()) w += v; else b += v;
  }
  return winner === 'w' ? w - b : b - w;
}

/** WHAT THE OTHER MOVE GIVES THE WINNER TOO (Learn replay of his Scotch Gambit,
 *  2026-11-08, 8…d6: "Nce7 looks natural, but it doesn't work: they play Nxc3 —
 *  they win a pawn" — and d6 lost the same c3 pawn to the Qxc3 they played).
 *  A cost is a DIFFERENCE between two moves, so its reason is the material the
 *  costly line wins beyond what the other move's line also gives the same
 *  side. What `winner` nets along `line` (UCI from `fenBefore`, its first move
 *  included), in pawns, a mate 100; 0 when the line is unknown, ends
 *  unsettled (it proves nothing), or nets the winner nothing. */
function otherNet(
  fenBefore: string, line: readonly string[] | null, winner: 'w' | 'b', student: 'w' | 'b',
  /** Counted the way the walk it is compared with counts (a 'missed' walk
   *  starts its ledger before the move that led here). */
  prior: { fenBefore: string; san: string } | null,
): number {
  if (!line || line.length === 0) return 0;
  const { sans, plies } = replay(fenBefore, line);
  if (sans.length === 0) return 0;
  const p = proofCut(fenBefore, sans, student, prior);
  if (!p) return 0;
  if (p.mate) return plies[Math.min(p.plies, plies.length) - 1]?.moverColor === (winner === 'w' ? 'white' : 'black') ? 100 : 0;
  if (!p.ledger?.settled) return 0;
  return Math.max(0, (winner === student ? 1 : -1) * p.ledger.netPawns);
}

function walk(
  fen: string, read: LineRead, winner: 'w' | 'b', student: 'w' | 'b', need: number,
  prior: { fenBefore: string; san: string } | null,
  /** A PUNISHMENT IS COUNTED FROM BEFORE THE MOVE IT PUNISHES (clean-pass
   *  review walk 2026-10-04, 41.Qxe5+: the queen it took counts — over the line
   *  alone "you give up a rook and a pawn for a rook and a bishop" was false,
   *  White ended a queen up). The played move, when the line follows it. */
  countFrom: { fenBefore: string; san: string } | null,
  /** What the other move's line gives the winner too (`otherNet`): a blow is
   *  the reason only past it. */
  given: number,
): Omit<CostReason, 'seat' | 'kind'> | null {
  const { sans, plies } = replay(fen, read.uci);
  if (sans.length === 0) return null;
  const sign = winner === student ? 1 : -1;
  // THE FIRST BLOW THAT COVERS THE COST AND HOLDS. A deep line rarely ENDS
  // settled — it is cut off mid-fight — so the ledger is asked of each prefix
  // in turn: the first one whose settled result wins enough for the winner,
  // and whose lead the rest of the line never gives back by more than half
  // the need, is the reason (measured this way on David's 337 costly moves).
  let proof: ReturnType<typeof proofCut> = null;
  for (let k = 1; k <= sans.length && !proof; k += 1) {
    const p = countFrom
      ? (() => {
        const q = proofCut(countFrom.fenBefore, [countFrom.san, ...sans.slice(0, k)], student);
        return q ? { ...q, plies: q.plies - 1, sans: q.sans.slice(1) } : null;
      })()
      : proofCut(fen, sans.slice(0, k), student, prior);
    if (!p || p.plies < 1) continue;
    if (p.mate) {
      const mater = plies[Math.min(p.plies, plies.length) - 1]?.moverColor;
      if (mater === (winner === 'w' ? 'white' : 'black') && given < 100) proof = p;
      continue;
    }
    if (!p.ledger?.settled || sign * p.ledger.netPawns - given < need) continue;
    const at = plies[Math.min(p.plies, plies.length) - 1]?.fenAfter;
    if (at && p.sans.length <= plies.length) {
      const blowLead = lead(at, winner);
      const gaveBack = plies.slice(p.plies).some((x) => lead(x.fenAfter, winner) < blowLead - need / 2);
      if (gaveBack) continue;
    }
    proof = p;
  }
  if (!proof) return null;
  const blowPlies = proof.plies;
  // The ledger may play a forced recapture past the engine's line; those
  // plies are part of what is shown.
  const shown = plies.slice(0, Math.min(blowPlies, plies.length));
  if (blowPlies > shown.length) {
    try {
      const c = new Chess(shown.length ? shown[shown.length - 1].fenAfter : fen);
      for (const san of proof.sans.slice(shown.length, blowPlies)) {
        const fenBefore = c.fen();
        const m = c.move(san);
        shown.push({ san: m.san, uci: `${m.from}${m.to}${m.promotion ?? ''}`, fenBefore, fenAfter: c.fen(), moverColor: m.color === 'w' ? 'white' : 'black' });
      }
    } catch { return null; }
  }
  const trust = lineTrust({ fen, uci: shown.map((p) => p.uci), plies: blowPlies, winner, seconds: read.seconds });
  let motif: TacticType | null = null;
  try { motif = detectTacticType(fen, shown[0].uci, shown.map((p) => p.uci)); } catch { motif = null; }
  return {
    mate: proof.mate,
    fen,
    plies: shown,
    blowPlies,
    ledger: proof.ledger,
    netForWinner: proof.mate ? 100 : sign * (proof.ledger?.netPawns ?? 0),
    trust,
    source: read.source,
    motif,
  };
}

/**
 * THE ONE REASON for a costly move, read the same way for both seats. Null
 * when the cost has no material reason in the reads (a positional cost — the
 * surface's position computers say that one) or the move cost under a pawn.
 */
export function costReason(args: {
  fenBefore: string;
  playedSan: string;
  /** The side that played the move. */
  mover: 'w' | 'b';
  /** REQUIRED — whose seat the words are for. */
  student: 'w' | 'b';
  /** What the move cost, centipawns, from the mover's side. */
  costCp: number;
  /** The board after the move (their reply first), or null. */
  after: LineRead | null;
  /** The best line from before the move (the mover's best move first), or null. */
  before: LineRead | null;
  /** The move that led to `fenBefore`, so a recapture is half a trade. */
  priorMove: { fenBefore: string; san: string } | null;
  /** REQUIRED — the line of the move this cost is MEASURED AGAINST, UCI from
   *  `fenBefore` with its first move: the better move's line for an
   *  'allowed' reason (a candidate weighed against the move played, the
   *  played move against the best), the played move's line for a 'missed'
   *  one. A reason is what the costly line wins beyond what this line also
   *  gives the same side (`otherNet`). Null: none is known — then a call
   *  that carries both reads compares each with the other (the best line for
   *  'allowed', the played move and its reply line for 'missed'), and a call
   *  with one reads it alone. */
  against: readonly string[] | null;
}): CostReason | null {
  if (!(args.costCp >= 100)) return null;
  const seat: 'you' | 'them' = args.mover === args.student ? 'you' : 'them';
  const other: 'w' | 'b' = args.mover === 'w' ? 'b' : 'w';
  const need = reasonNeed(args.costCp);
  let fenAfter: string | null = null;
  try { const c = new Chess(args.fenBefore); c.move(args.playedSan); fenAfter = c.fen(); } catch { fenAfter = null; }
  if (fenAfter && args.after) {
    const against = args.against ?? args.before?.uci ?? null;
    const a = walk(fenAfter, args.after, other, args.student, need, null, { fenBefore: args.fenBefore, san: args.playedSan }, otherNet(args.fenBefore, against, other, args.student, null));
    if (a) return { seat, kind: 'allowed', ...a };
  }
  if (args.before) {
    const playedUci = (() => { try { const m = new Chess(args.fenBefore).move(args.playedSan); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; } })();
    const against = args.against ?? (args.after && playedUci ? [playedUci, ...args.after.uci] : null);
    const b = walk(args.fenBefore, args.before, args.mover, args.student, need, args.priorMove, null, otherNet(args.fenBefore, against, args.mover, args.student, args.priorMove));
    if (b) return { seat, kind: 'missed', ...b };
  }
  return null;
}

/** What the side the line wins for nets, in piece words ("a knight for a
 *  pawn"), whoever's seat the ledger was counted from — the one rendering a
 *  surface says after "win". */
/**
 * `said` is REQUIRED: the plies of `r.plies` (by index) the sentence says
 * before these words — `lineShapePlies` for a line said by `lineShape`, `[0]`
 * for "it runs into X", `[]` when no move of the line is said. A promotion
 * the line says ("a1, making a queen") is not said again after it (prod
 * Review 2026-11-06); when the line's words named the whole gain the answer
 * is null and the sentence ends on the line. With nothing said it is always
 * the words.
 */
export function reasonWinWords(r: CostReason, said: readonly []): string;
export function reasonWinWords(r: CostReason, said: readonly number[]): string | null;
export function reasonWinWords(r: CostReason, said: readonly number[]): string | null {
  const count = (): string => countWords(Math.max(1, r.netForWinner), { unit: true });
  if (!r.ledger) return count();
  // The ledger is counted for the student: the winner is the student exactly
  // when the reason is the student's missed win or their slip's punishment.
  const winnerIsLedgerStudent = (r.kind === 'missed') === (r.seat === 'you');
  const took = winnerIsLedgerStudent ? r.ledger.studentWon : r.ledger.opponentWon;
  const gave = winnerIsLedgerStudent ? r.ledger.opponentWon : r.ledger.studentWon;
  const made = winnerIsLedgerStudent ? r.ledger.studentPromoted : r.ledger.opponentPromoted;
  // The line's first move is the winner's: their reply (allowed) or their
  // own best move (missed).
  const winner = r.plies[0]?.moverColor;
  const saidMade = promotedIn(said.map((i) => r.plies[i]).filter((p): p is ReasonPly => !!p && p.moverColor === winner).map((p) => p.san));
  const after = gainAfterLine(took, gave, made, saidMade);
  if (!after.left) return null;
  return after.words ?? count();
}

/** WHAT A COSTLY MOVE ALLOWS, as the move's predicate, from the student's
 *  seat — the one rendering the lesson and chat composer say (fix 1,
 *  2026-11-13: the lessons said "You play Bxd8 — it wins a queen for a
 *  bishop" and nothing of …Bxf2+ Ke2 Bg4#). A line the reads vouch for
 *  (`lineTrust`) is said to its blow and what it wins; one they do not is
 *  said only by its first move, and only when that move is a check or a
 *  capture (a fact one move deep). Null for a 'missed' reason (the better
 *  move's job says that one) or nothing to say. */
export function allowedClause(r: CostReason, studentWB: 'w' | 'b'): string | null {
  if (r.kind !== 'allowed') return null;
  const sans = reasonSans(r);
  if (sans.length === 0) return null;
  const whom = r.seat === 'you' ? 'them' : 'you';
  if (r.trust.name) {
    const line = lineShape(sans, lineSeatAt(r.fen, studentWB), r.fen, 'first');
    if (r.mate) return `walks into mate: ${line}${markSaysMate(sans[sans.length - 1]) ? '' : ", and it's mate"}`;
    const won = reasonWinWords(r, []);
    return won ? `lets ${whom} win ${won}: ${line}` : null;
  }
  return /x|\+|#/.test(sans[0]) ? `lets ${whom} play ${sans[0]}` : null;
}

/** The line to the blow, as SAN with the black move marked (…Nxe5). */
export function reasonSans(r: CostReason): string[] {
  return r.plies.map((p) => `${p.moverColor === 'black' ? '…' : ''}${p.san}`);
}

/** The decision row's view of a reason: what it was, how far, whether it was
 *  said and why — so an audit can hold both seats to the same depth. */
export interface CostReasonRow {
  ply: number;
  seat: 'you' | 'them';
  kind: 'allowed' | 'missed' | 'none';
  blowPlies: number | null;
  named: boolean;
  why: string;
  source: 'deep' | 'record' | null;
  /** The line was said on this ply. */
  spoken?: boolean;
  /** Their slip's punishment, held for the student's own next move (U8). */
  withheld?: boolean;
}

export function costReasonRow(ply: number, seat: 'you' | 'them', r: CostReason | null): CostReasonRow {
  if (!r) return { ply, seat, kind: 'none', blowPlies: null, named: false, why: 'no-material-reason', source: null };
  return { ply, seat, kind: r.kind, blowPlies: r.blowPlies, named: r.trust.name, why: r.trust.why, source: r.source };
}
