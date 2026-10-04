// exchangeLedger — WHO WON WHAT, across a projected line (unified-coach N7,
// David 2026-09-16: "Now is the time for it").
//
// The review speaks engine lines under headings like "Here's how you take
// advantage: …". The per-ply line renderer (deleted 2026-10-04) rendered each
// capture as a subjectless "winning the rook" — fine on a one-sided line,
// ambiguous the moment the line
// ALTERNATES, because half those captures belong to the opponent. At ply 29 of
// David's Alapin the spoken line reads "Kxd7, winning the knight … then Nxa8,
// winning the rook" under a heading promising the student an advantage; the
// rook is the student's, taken from them. The app's most engaged real user
// wrote exactly this in feedback: "I have a hard time understanding if they are
// talking about me or the opponent."
//
// This computes the NET of the sequence from the student's seat and says it in
// piece names — "you come out with two knights for the rook" — which is the
// sentence that settles the ambiguity AND carries the lesson (why an engine
// still calls that fork a mistake). Pure chess.js, no engine, no model (G0/G3).
import { andList } from '../utils/andList';
import { Chess, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { MAX_PV_DEPTH_PLIES } from './ratingBands';

export type PieceLetter = 'p' | 'n' | 'b' | 'r' | 'q';

export interface ExchangeLedger {
  /** Enemy pieces the STUDENT captured, in capture order. */
  studentWon: PieceLetter[];
  /** The student's OWN pieces the opponent captured, in capture order. */
  opponentWon: PieceLetter[];
  /** Net material from the student's seat, in pawns (positive = student up). */
  netPawns: number;
  /** True when BOTH sides captured — the case a subjectless line garbles. */
  isExchange: boolean;
  /** False when the line stops mid-trade: the side to move at its end can
   *  still take back on the last capture's square. A net read there is the
   *  middle of an exchange, not its result (walk 6, R7: "you come out behind,
   *  a pawn for a queen, but you're clearly better" — the queen was coming
   *  straight back). */
  settled: boolean;
}

const VALUE: Record<PieceLetter, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const NOUN: Record<PieceLetter, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const COUNT_WORD = ['no', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** One replay of a line, every prefix's ledger available without replaying
 *  again. `settled` (a static exchange read) is computed only when asked —
 *  it is the expensive part, and most prefixes are never cut at. */
interface LedgerWalk {
  /** Number of moves that replayed legally. */
  length: number;
  /** The ledger after the first `k` moves (1 ≤ k ≤ length); null if illegal. */
  at(k: number): ExchangeLedger | null;
}

function walkLedger(fenBefore: string, sans: readonly string[], studentColorWB: 'w' | 'b'): LedgerWalk | null {
  let chess: Chess;
  try { chess = new Chess(fenBefore); } catch { return null; }
  interface Step { studentWon: PieceLetter[]; opponentWon: PieceLetter[]; net: number; lastCaptureSq: string | null; fen: string }
  const steps: Step[] = [];
  const studentWon: PieceLetter[] = [];
  const opponentWon: PieceLetter[] = [];
  let lastCaptureSq: string | null = null;
  // A PROMOTED piece was a pawn when the line began (walk oct3b, 15.dxc6:
  // "… bxa8=Q Rxa8" counted the new queen as a queen lost and never the
  // promotion, and the coach said "win a rook and a piece and a pawn" of a
  // line that wins a rook and a bishop). Captured, it costs a pawn; surviving,
  // it adds what it became minus that pawn.
  const promoted = new Set<string>();
  let illegal = false;
  for (const san of sans) {
    let mv;
    try { mv = chess.move(san); } catch { illegal = true; break; }
    if (!mv) { illegal = true; break; }
    // The last capture square is REMEMBERED across quiet moves: after exd5 Nf6
    // the pawn on d5 can still be taken back, and forgetting the square the
    // moment a quiet move was played is how "exd5 Nf6" read as a won pawn.
    if (mv.captured) lastCaptureSq = mv.to;
    const wasPromoted = promoted.has(mv.to);
    if (promoted.has(mv.from)) { promoted.delete(mv.from); promoted.add(mv.to); } else if (wasPromoted) promoted.delete(mv.to);
    if (mv.promotion) promoted.add(mv.to);
    if (mv.captured && mv.captured !== 'k') {
      const piece: PieceLetter = wasPromoted ? 'p' : mv.captured as PieceLetter;
      if (mv.color === studentColorWB) studentWon.push(piece);
      else opponentWon.push(piece);
    }
    let promotionNet = 0;
    for (const sq of promoted) {
      const pc = chess.get(sq as Square);
      if (!pc || pc.type === 'k') continue;
      promotionNet += (pc.color === studentColorWB ? 1 : -1) * (VALUE[pc.type as PieceLetter] - 1);
    }
    steps.push({
      studentWon: [...studentWon], opponentWon: [...opponentWon],
      net: sum(studentWon) - sum(opponentWon) + promotionNet, lastCaptureSq, fen: chess.fen(),
    });
  }
  const cache = new Map<number, ExchangeLedger>();
  return {
    length: illegal ? -1 : steps.length,
    at(k: number): ExchangeLedger | null {
      if (k < 1 || k > steps.length) return null;
      const hit = cache.get(k);
      if (hit) return hit;
      const st = steps[k - 1];
      let settledCache: boolean | null = null;
      const ledger: ExchangeLedger = {
        studentWon: st.studentWon,
        opponentWon: st.opponentWon,
        netPawns: st.net,
        isExchange: st.studentWon.length > 0 && st.opponentWon.length > 0,
        // Settled = the side that lost that square cannot profitably win it
        // back, WHOEVER is to move (a take-back next move is still a take-back).
        // Pin-aware. Read lazily: it is the expensive part.
        get settled(): boolean {
          if (settledCache !== null) return settledCache;
          let occ: ReturnType<Chess['get']> | null = null;
          try { occ = st.lastCaptureSq ? new Chess(st.fen).get(st.lastCaptureSq as Square) : null; } catch { occ = null; }
          // A KING on the square ends the exchange: it cannot be taken back
          // (walk 900: …Kxg2 Qh2+ read as an unsettled trade on g2).
          settledCache = st.lastCaptureSq === null || !occ || occ.type === 'k'
            || legalSeeGainFor(st.fen, st.lastCaptureSq as Square, occ.color === 'w' ? 'b' : 'w') <= 0;
          return settledCache;
        },
      };
      cache.set(k, ledger);
      return ledger;
    },
  };
}

const sum = (xs: readonly PieceLetter[]): number => xs.reduce((a, p) => a + VALUE[p], 0);

/** Walk a line of SANs from `fenBefore` and record every capture by side. */
export function computeExchangeLedger(
  fenBefore: string,
  sans: readonly string[],
  studentColorWB: 'w' | 'b',
): ExchangeLedger | null {
  const w = walkLedger(fenBefore, sans, studentColorWB);
  if (!w || w.length < 0) return null;
  if (sans.length === 0) {
    return { settled: true, studentWon: [], opponentWon: [], netPawns: 0, isExchange: false };
  }
  return w.at(sans.length);
}

/** "two knights", "a rook and a pawn" — grouped by piece so the ledger reads
 *  the way a coach says it, never as a point total. */
function nameSide(pieces: readonly PieceLetter[]): string {
  const order: PieceLetter[] = ['q', 'r', 'b', 'n', 'p'];
  const counts = new Map<PieceLetter, number>();
  for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
  const parts = order
    .filter((p) => counts.has(p))
    .map((p) => {
      const n = counts.get(p) ?? 0;
      const word = COUNT_WORD[n] ?? String(n);
      return n === 1 ? `a ${NOUN[p]}` : `${word} ${NOUN[p]}s`;
    });
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The net of the sequence, from the student's seat — or NULL when saying it
 * would only restate what the line already showed (Narration Voice Rule 3):
 *  - nothing was captured;
 *  - only ONE side captured (the line's own "winning the knight" already says
 *    it, and there is nothing to confuse it with);
 *  - the trade is materially even AND piece-for-piece identical (a plain
 *    recapture the student watched happen).
 */
export function describeExchange(ledger: ExchangeLedger | null): string | null {
  if (!ledger || !ledger.isExchange || !ledger.settled) return null;
  const mine = nameSide(ledger.studentWon);
  const theirs = nameSide(ledger.opponentWon);
  if (!mine || !theirs) return null;
  if (ledger.netPawns === 0 && mine === theirs) return null; // a plain recapture
  // No embedded dash: the caller joins, and two em-dashes in one sentence read
  // as a stutter when the terminal verdict follows.
  if (ledger.netPawns === 0) return `that trade is even, ${mine} for ${theirs}`;
  return ledger.netPawns > 0
    ? `you come out ahead on material, ${mine} for ${theirs}`
    : `you come out behind on material, ${mine} for ${theirs}`;
}

/** The ledger sentence for a projected line, or null. One call for every
 *  projection pass (punishment / better-line / threat) — invariant 1. */
export function exchangeNetForLine(
  fenBefore: string,
  sans: readonly string[],
  studentColorWB: 'w' | 'b',
): string | null {
  return describeExchange(computeExchangeLedger(fenBefore, sans, studentColorWB));
}

/** Whether the exchange in `sans` is FINISHED after its first `k` moves — the
 *  one rule for "where does a line's trade end". Inside the line the engine's
 *  choice decides: finished when the next move does not take back on the last
 *  capture square. A static count stops one ply early on an EVEN recapture
 *  (Qxd4 Qxd4 Nxd4 read as "you win the pawn" after Qxd4; …Bxc3+ Bxc3 …Qxc3+
 *  cut after …Bxc3+) and runs on where the engine declines a take-back the
 *  count likes (…dxc5 dxc5, then Nf8, not Qxc5). Where the line ENDS, the
 *  count (`settled`) is all there is. */
function finishedAt(sans: readonly string[], k: number, ledger: ExchangeLedger): boolean {
  if (k >= sans.length) return ledger.settled;
  const sq = (san: string): string | undefined => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(san)?.[1];
  let last: string | undefined;
  for (let i = 0; i < k; i += 1) if (/x/.test(sans[i])) last = sq(sans[i]);
  const next = sans[k];
  return !(last !== undefined && /x/.test(next) && sq(next) === last);
}

/** THE MATERIAL A LINE SETTLES ON, from `seatWB`'s side, in pawns: the ledger
 *  at the LAST point the line's trades are finished. Two lines compared by a
 *  raw count at a fixed ply read a trade as a win whenever that ply landed on
 *  the capture and the take-back came one move later (moveComparison counted
 *  eight plies in and said "it comes out N better on material" — review walk
 *  oct3b). 0 for a line with no capture; null when the line never finishes
 *  one, so no material may be claimed from it. */
export function settledNetForLine(
  fenBefore: string,
  sans: readonly string[],
  seatWB: 'w' | 'b',
): number | null {
  if (sans.length === 0) return 0;
  const w = walkLedger(fenBefore, sans, seatWB);
  if (!w) return null;
  const line = sans.slice(0, w.length);
  for (let k = line.length; k >= 1; k -= 1) {
    const ledger = w.at(k);
    if (ledger && finishedAt(line, k, ledger)) return ledger.netPawns;
  }
  return null;
}

/**
 * The exchange a capture STARTS, read off the engine's line: the ledger at the
 * first point the trade is finished (no profitable take-back on the last
 * capture square). Null when the line never finishes it — then the trade has
 * no result yet and nothing may be claimed. When the line's first move takes
 * back on the square `prior` captured on, the ledger starts before `prior`, so
 * the two halves of one trade are counted together (review walk 2026-10-02,
 * "their queen for your pawn" of Qxd4 Qxd4 Nxd4).
 */
export function settledExchange(
  fenBefore: string,
  sans: readonly string[],
  studentColorWB: 'w' | 'b',
  prior: { fenBefore: string; san: string } | null,
): ExchangeLedger | null {
  const sq = (san: string): string | undefined => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(san)?.[1];
  const recapture = prior && sans.length > 0 && /x/.test(prior.san) && /x/.test(sans[0]) && sq(sans[0]) === sq(prior.san);
  const start = recapture && prior ? prior.fenBefore : fenBefore;
  const line = recapture && prior ? [prior.san, ...sans] : [...sans];
  const first = recapture ? 2 : 1;
  const w = walkLedger(start, line, studentColorWB);
  if (!w || w.length < 0) return null;
  for (let k = first; k <= line.length; k += 1) {
    const ledger = w.at(k);
    if (!ledger) return null;
    if (finishedAt(line, k, ledger)) return ledger;
  }
  return null;
}

/**
 * THE LINE AS PROOF (WO-LAYERS-01, from 424 narrated moves of Naroditsky: a
 * line is played only to prove ONE claim — "Qxd4, Qxd4, and the knight forks on
 * c2, winning a piece" — two to four plies that END ON THE RESULT, with no
 * adjective per move). Ours spoke all six plies with a description on each
 * ("the bishop trains on their rook on a8 — pressure they have to answer…"),
 * 120–300 words a move.
 *
 * The shortest prefix of a projected line that already reaches the line's
 * FINAL result:
 *  - the whole line mates → the whole line (mate is the point), or
 *  - the whole line ends on a FINISHED trade (no take-back on the last capture
 *    square) with a net gain → the first point that net is reached and settled.
 * Null when the line settles no material point — the line proves no material point,
 * and the caller says the verdict instead of reciting it. The cut is decided by
 * the claim, never by a count (G4.5: a cap stops after N regardless of worth).
 */
export interface LineProof {
  /** Plies of the line that prove the point — counted in `sans`. */
  plies: number;
  /** The line the proof ran on: the given line, plus any forced recapture it
   *  stopped one move short of. Show `sans.slice(0, plies)`. */
  sans: string[];
  mate: boolean;
  ledger: ExchangeLedger | null;
}

export function proofCut(
  fenBefore: string,
  sans: readonly string[],
  studentColorWB: 'w' | 'b',
  /** The move that led to `fenBefore`. When the line opens by taking back on
   *  the square that move captured on, the ledger starts BEFORE it, so a
   *  recapture is the other half of a trade, never a win (review walk
   *  2026-10-02: "Why gxf6 was better — the line runs gxf6 — you win a
   *  knight" after Nxf6+). Optional: a line from a quiet board has none. */
  prior?: { fenBefore: string; san: string } | null,
): LineProof | null {
  if (prior && sans.length > 0 && /x/.test(prior.san)) {
    const sq = (san: string): string | undefined => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(san)?.[1];
    if (/x/.test(sans[0]) && sq(sans[0]) === sq(prior.san)) {
      const p = proofCut(prior.fenBefore, [prior.san, ...sans], studentColorWB);
      if (!p) return null;
      return { ...p, plies: Math.max(1, p.plies - 1), sans: p.sans.slice(1) };
    }
  }
  // The claim is what the WHOLE line ends on — mate, or its settled net. A
  // pawn grabbed on the way to a mate is not the point, so the cut is the
  // shortest prefix that already reaches the line's FINAL result.
  let chess: Chess;
  try { chess = new Chess(fenBefore); } catch { return null; }
  for (const san of sans) {
    try { if (!chess.move(san)) return null; } catch { return null; }
  }
  // A LINE CUT ONE MOVE SHORT OF A FORCED RECAPTURE is played out: when the
  // side to move can profitably take back on the last capture square, that is
  // what happens next (the cheapest legal capture, the one material computer's
  // exchange). When the side that could take back is NOT on move, nothing is
  // forced and the line proves nothing (3.Nxe5 d6: Nf3 and …Nxe4 later).
  const line = [...sans];
  for (let guard = 0; guard < 8; guard += 1) {
    const last = [...line].reverse().find((x) => /x/.test(x));
    const sq = last ? /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(last)?.[1] : undefined;
    if (!sq) break;
    const occ = chess.get(sq as Square);
    const mover = chess.turn();
    if (!occ || occ.color === mover || legalSeeGainFor(chess.fen(), sq as Square, mover) <= 0) break;
    const caps = chess.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
    if (!caps.length) break;
    caps.sort((x, y) => (VALUE[x.piece as PieceLetter] ?? 100) - (VALUE[y.piece as PieceLetter] ?? 100));
    try { chess.move(caps[0]); } catch { break; }
    line.push(caps[0].san);
  }
  if (chess.isCheckmate()) return { plies: line.length, mate: true, ledger: null, sans: line };
  // The line's result is where it ENDS, and only if it ends finished. A line
  // cut off mid-fight proves nothing: from the board alone the count cannot
  // tell "the attacked piece steps away" (17.Bxd4 … Qe3) from "the material
  // comes back" (3.Nxe5 d6 — then Nf3 Nxe4). Silence beats a wrong guess.
  const end = line.length;
  const walk = walkLedger(fenBefore, line, studentColorWB);
  if (!walk || walk.length < 0) return null;
  const full = walk.at(end);
  if (!full || !full.settled) return null;
  if (full.netPawns === 0) return null;
  // The PROOF is the shortest prefix that reaches that result where the count
  // ALSO agrees nothing can be taken back — so exd5 is proved through c4, the
  // move that holds the pawn, not stopped at exd5 (the engine merely did not
  // take back yet). Where no such point exists, the engine's own stop.
  let engineCut: { plies: number; ledger: ExchangeLedger } | null = null;
  for (let k = 1; k <= end; k += 1) {
    const ledger = walk.at(k);
    if (!ledger || ledger.netPawns !== full.netPawns || !finishedAt(line, k, ledger)) continue;
    if (ledger.settled) return { plies: k, mate: false, ledger, sans: line };
    engineCut ??= { plies: k, ledger };
  }
  return engineCut ? { ...engineCut, mate: false, sans: line } : { plies: end, mate: false, ledger: full, sans: line };
}

/** The result a proof line ends on, from the student's seat, in piece names:
 *  "you win a knight", "they win a rook", or the two-sided trade sentence. */
export function describeProofResult(ledger: ExchangeLedger): string {
  const two = describeExchange(ledger);
  if (two) return two;
  if (ledger.studentWon.length > 0 && ledger.opponentWon.length === 0) return `you win ${nameSide(ledger.studentWon)}`;
  if (ledger.opponentWon.length > 0 && ledger.studentWon.length === 0) return `they win ${nameSide(ledger.opponentWon)}`;
  return ledger.netPawns > 0 ? 'you come out ahead on material' : 'you come out behind on material';
}

/** A line cut to the point it PROVES AGAINST the side that starts it — mate
 *  of that side, or a settled material loss for it — rendered from that
 *  side's seat ("Qh4 and Nxh4 — they win a queen"). Null when the line
 *  proves nothing against it (then no reason may be invented). One helper for
 *  every "why that move fails" surface (WO-TEACH-02 S5): the critical-moment
 *  reveal and the live deliberation. */
export function proofAgainstMover(fen: string, uci: readonly string[], moverWB: 'w' | 'b'): string | null {
  const sans: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }).san);
  } catch { /* the playable prefix is what we have */ }
  if (sans.length === 0) return null;
  const proof = proofCut(fen, sans, moverWB);
  if (!proof) return null;
  // A PROOF IS HEARD, SO IT HAS A HORIZON. "Qd2? Then e4, Ne5, Nxe5, dxe5,
  // O-O, Qf4, Ng6, Qg3, h5, Be2, h4, Qe3 and Nxe5" (hand walk 2340, 13 plies)
  // proves nothing to a listener. Past the horizon the line is not a reason,
  // and a move without a reason is not ruled out loud.
  if (proof.plies > MAX_PV_DEPTH_PLIES) return null;
  const moves = andList(proof.sans.slice(0, proof.plies));
  // The line starts with the mover's move, so a mate of the MOVER ends on an
  // even ply; an odd-length mate is the mover mating, which explains nothing.
  if (proof.mate) return proof.plies % 2 === 0 ? `${moves} — and it's mate` : null;
  if (!proof.ledger || proof.ledger.netPawns >= 0) return null;
  return `${moves} — ${describeProofResult(proof.ledger)}`;
}

/** THE WINNING LINE, played out (WO-TEACH-GAPS P2 #3 — his "if X, then Y, and
 *  Z"): the line cut to where it PROVES FOR the side that starts it — that side
 *  mates, or settles a material gain — said from the student's seat. Null when
 *  the line proves nothing, or runs past the horizon a listener can follow. */
export function proofForMover(fen: string, uci: readonly string[], moverWB: 'w' | 'b'): { text: string; plies: number } | null {
  const sans: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }).san);
  } catch { /* the playable prefix is what we have */ }
  if (sans.length === 0) return null;
  const proof = proofCut(fen, sans, moverWB);
  if (!proof || proof.plies > MAX_PV_DEPTH_PLIES) return null;
  const moves = andList(proof.sans.slice(0, proof.plies));
  if (proof.mate) return proof.plies % 2 === 1 ? { text: `${moves} — and it's mate`, plies: proof.plies } : null;
  if (!proof.ledger || proof.ledger.netPawns <= 0) return null;
  return { text: `${moves} — ${describeProofResult(proof.ledger)}`, plies: proof.plies };
}
