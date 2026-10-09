// deliberation — narrate the WEIGHING, not just the winner (G0).
//
// THE KEYSTONE (David 2026-08-26, emphatic): Danya has a one-sided DISCUSSION
// with his viewers; the app BROADCASTS. Every position we already run a MultiPV
// fan — the top candidate moves and why each falls short — and then speak ONLY
// the winner as a bare fact. That fan IS the discussion: "Knight f3? No, drops
// the pawn. Bishop d3? Solid but slow. It's got to be this." We compute the whole
// deliberation and delete it before we open our mouth. This turns it back on.
//
// It DECIDES nothing (G0): the candidates, their evals, and whether each drops
// material are all Stockfish + chess.js. This orders the weighing into board-true
// facts; the DNA register phrases them into the spoken discussion. Nothing is
// invented — the deliberation is SPOKEN, not manufactured.
//
// Doc: docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0.
import { Chess, type Square } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import { findHangingPieces } from './tacticClassifier';
import { proofAgainstMover, proofForMover } from './exchangeLedger';
import { strategicWhyLed } from './moveFundamentals';
import { computeTerritory, legalSeeGainFor, seeReadsStanding } from './positionReadingService';
import { isPinnedPiece } from './nextPlans';
import { countKingAttack } from './kingSafety';
import { andList, orList } from '../utils/andList';
import { computeMustDefend } from './threatOut';

const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** A capture that WINS material, the exchange counted out — that is the move's
 *  reason, ahead of any positional gloss. Hand walk 2340: dxe5 "stakes out the
 *  center" when his line was "that's a free pawn" (…Nxe5 loses the knight to
 *  Nxe5). Null for a trade or a sacrifice. */
function materialWhy(fenBefore: string, san: string, mover: 'w' | 'b', opponentLastSan: string | null): string | null {
  try {
    const c = new Chess(fenBefore);
    const m = c.move(san);
    // MATE IS THE REASON. "The move is Qxd6# — it wins the bishop on d6" (hand
    // walk 1200) named the capture and missed the point.
    if (c.isCheckmate()) return 'ends the game';
    if (!m?.captured) return null;
    // A recapture is the trade finishing, never material won — and taking back
    // IS the reason ("The move is Rexd8 — it takes the open d-file" after Qxd8).
    if (opponentLastSan && new RegExp(`x${m.to}(?![1-8])`).test(opponentLastSan)) return `takes back the ${PIECE_NOUN[m.captured] ?? 'piece'}`;
    // SEE counts the recaptures: a positive net is material won, not a trade.
    if (legalSeeGainFor(fenBefore, m.to, mover) <= 0) return null;
    return `wins the ${PIECE_NOUN[m.captured] ?? 'piece'} on ${m.to}`;
  } catch {
    return null;
  }
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MATE_CP = 100000;
/** Default candidates to weigh — David's call: "the first 3, maybe 4." */
const DEFAULT_MAX = 3;
/** A gap (cp, mover POV) past which an alternative is "clearly worse", not just
 *  "a touch less precise". */
const CLEARLY_WORSE_CP = 150;
/** Below this gap (cp) an alternative is a coin-flip, not a fork in the road.
 *  On a quiet opening spine EVERY reasonable move sits inside this band, so
 *  weighing them out loud is filler ("X is playable, but not as precise") — the
 *  exact banned register. `meaningfulAlternatives` drops these; a position with
 *  nothing past the band weighs to '' (silence, which the voice rules allow). */
const MEANINGFUL_DELTA_CP = 40;

export type Shortfall = 'drops-material' | 'clearly-worse' | 'less-precise' | 'trades-queens';

export interface Candidate {
  san: string;
  /** Eval of THIS candidate, mover POV (cp; mate → ±100000). */
  evalCp: number;
  /** How much worse than the best move, mover POV (cp, ≥0). 0 for the best. */
  deltaCp: number;
  /** Why it falls short (alternatives only). */
  shortfall?: Shortfall;
  /** The piece it drops, when `shortfall === 'drops-material'`. */
  drops?: { piece: string; square: string };
  /** A piece of the mover's the move leaves under fire — not loose, but lost
   *  to the exchange (a pawn hit by a knight, guarded by a queen). The BOARD
   *  fact behind "clearly worse" when no line proves more (pass 1: "Bxc4 is
   *  clearly worse than Nf3" with no reason — …Nxd4 takes the d4 pawn). */
  leaves?: { piece: string; square: string; attacker: string; attackerSquare: string };
  /** The candidate's own engine line cut to the point it PROVES against the
   *  mover ("Nxe5, Qd4 and Qxe5 — they win a knight"), when it proves one
   *  (WO-TEACH-02 S5). A candidate is a lesson only with its reason. */
  proof?: string;
}

export interface Deliberation {
  /** The move the engine plays. */
  best: Candidate;
  /** The tempting-but-worse alternatives, most-tempting first (best runner-up). */
  alternatives: Candidate[];
  /** True when there's a genuine choice to weigh out loud (≥1 real alternative). */
  isRealChoice: boolean;
  /** Why the best move is best, from the board (`strategicWhyLed`). Null when
   *  the board gives no reason — then the verdict is not spoken. */
  bestWhy: string | null;
  /** The best move's own line, played out, when it proves a win of material
   *  or mate within the horizon — the "if X, then Y" half of the verdict. */
  bestLine?: string | null;
  /** The move the student named, weighed (when `named` was given). */
  named?: Candidate;
  /** Why the NAMED move is good, from the board — its own reason, never the
   *  best move's (hand walk 2026-10-09: "d4 is fine … it guards e4" — that was
   *  d3's reason, said of d4). */
  namedWhy?: string | null;
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m ? m.san : null;
  } catch { return null; }
}

/** Material the MOVER leaves hanging after playing `uci` from `fen` (SEE-lite via
 *  findHangingPieces) — the concrete "that drops the …" read. Returns the biggest
 *  hanging piece, or null. */
function dropsAfter(fen: string, uci: string, moverColor: 'w' | 'b'): { piece: string; square: string; value: number } | null {
  let after: Chess;
  let captured = 0;
  let landed = '';
  try {
    after = new Chess(fen);
    const m = after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!m) return null;
    captured = m.captured ? VAL[m.captured] ?? 0 : 0;
    landed = m.to;
  } catch { return null; }
  let worst: { piece: string; square: string; value: number } | null = null;
  try {
    for (const h of findHangingPieces(after)) {
      if (h.color !== moverColor) continue;
      const value = VAL[h.piece.toLowerCase()] ?? 0;
      if (!worst || value > worst.value) worst = { piece: h.piece.toLowerCase(), square: h.square, value };
    }
  } catch { return null; }
  if (!worst || worst.value < 2) return null;
  // AN EXCHANGE IS NOT A DROP. The capturing piece standing en prise on the
  // square it took on is a trade when it took at least as much (hand walk
  // 2026-09-24: "Rxd8? That drops the rook on d8." — rook for rook).
  if (worst.square === landed && captured >= worst.value - 1) return null;
  return worst;
}

/**
 * Build the weighing from the MultiPV fan. Takes the top `maxCandidates`
 * (default 3) lines, converts each to a SAN, computes the mover-POV eval + the
 * gap to the best, and classifies why each alternative falls short (drops
 * material / clearly worse / just less precise). Empty `alternatives` → nothing
 * to weigh (a forced position); `isRealChoice` is then false.
 */
export function buildDeliberation(input: {
  analysis: Pick<StockfishAnalysis, 'topLines'>;
  fenBefore: string;
  moverColor: 'w' | 'b';
  maxCandidates?: number;
  /** The move the surface is committed to (the DB-canonical TAUGHT move on a
   *  walkthrough). Dropped from the alternatives so the weighing never lists
   *  the move being played as a weaker option — which reads as a
   *  self-contradiction on the board (G3). */
  excludeSan?: string;
  /** The opponent's move just before (SAN), or null at the start. REQUIRED: a
   *  capture back on the square they just took on is the trade finishing, so
   *  "it wins the queen on d8" after …Qxd8 is false (hand walk 2026-09-25). */
  opponentLastSan: string | null;
  /** A move the STUDENT named ("why is Ne4 best?", "is Qf3 ok?"), weighed
   *  beside the engine's own candidates (chat thinks like the coach,
   *  2026-10-09). `lineUci` is the engine's line from `fenBefore` STARTING
   *  with the named move; `evaluation`/`mate` are White's view of it, the
   *  same convention as `topLines`. Ignored when the named move already is
   *  one of the top lines — then that line is used. */
  named?: { lineUci: string[]; evaluation: number; mate: number | null };
}): Deliberation | null {
  const { fenBefore, moverColor, excludeSan } = input;
  const sign = moverColor === 'w' ? 1 : -1;
  const max = input.maxCandidates ?? DEFAULT_MAX;

  const lines = [...(input.analysis.topLines ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .filter((l) => l.moves.length > 0);
  if (lines.length === 0) return null;

  const moverEval = (l: { evaluation: number; mate: number | null }): number =>
    (l.mate != null ? (l.mate > 0 ? MATE_CP : -MATE_CP) : l.evaluation) * sign;

  const bestLine = lines[0];
  const bestSan = uciToSan(fenBefore, bestLine.moves[0]);
  if (!bestSan) return null;
  const bestEval = moverEval(bestLine);
  const best: Candidate = { san: bestSan, evalCp: bestEval, deltaCp: 0 };

  const alternatives: Candidate[] = [];
  for (const l of lines.slice(1, max)) {
    const san = uciToSan(fenBefore, l.moves[0]);
    if (!san || san === bestSan || san === excludeSan) continue;
    const evalCp = moverEval(l);
    const deltaCp = Math.max(0, bestEval - evalCp);
    // A DROP THE ENGINE DOES NOT PUNISH IS NOT A DROP (Damiano walk 2026-09-27:
    // "Bh6 was cleaner" then "Bh6? That drops the knight on a7" — the knight is
    // loose, but taking it walks into something worse, so the line holds). A
    // piece left en prise only counts when the eval says it costs.
    const loose = dropsAfter(fenBefore, l.moves[0], moverColor);
    const drop = loose && Math.max(0, bestEval - moverEval(l)) >= CLEARLY_WORSE_CP ? loose : null;
    // THE QUEEN TRADE THAT THROWS AWAY SPACE (game 1: "we have more space, and
    // the effect of a space advantage is greatly diminished if the queens are
    // off — fewer pieces to attack with"). Only where the engine agrees it is worse.
    // …and the same when you are ATTACKING (game 1: "there's zero reason to
    // trade queens here — you have a huge attack").
    const tradesQueens = !drop && deltaCp >= MEANINGFUL_DELTA_CP && (moreSpace(fenBefore, moverColor) || attacking(fenBefore, moverColor)) && queensOffWithin(fenBefore, l.moves, 5);
    const shortfall: Shortfall = drop ? 'drops-material' : tradesQueens ? 'trades-queens' : deltaCp >= CLEARLY_WORSE_CP ? 'clearly-worse' : 'less-precise';
    const proof = proofAgainstMover(fenBefore, l.moves, moverColor);
    alternatives.push({
      san, evalCp, deltaCp, shortfall,
      drops: drop ? { piece: drop.piece, square: drop.square } : undefined,
      ...(proof ? { proof } : {}),
    });
  }

  // THE NAMED MOVE joins the weighing like any candidate — same eval maths,
  // same drop and proof computers — and is marked so the answer can speak to it.
  let namedCandidate: Candidate | null = null;
  const namedSan = input.named?.lineUci[0] ? uciToSan(fenBefore, input.named.lineUci[0]) : null;
  if (input.named && namedSan) {
    const inTop = lines.slice(0, max).find((l) => uciToSan(fenBefore, l.moves[0]) === namedSan);
    const line = inTop ? { moves: inTop.moves, evaluation: inTop.evaluation, mate: inTop.mate } : { moves: input.named.lineUci, evaluation: input.named.evaluation, mate: input.named.mate };
    if (namedSan === bestSan) {
      namedCandidate = best;
    } else {
      const existing = alternatives.find((a) => a.san === namedSan);
      if (existing) {
        namedCandidate = existing;
      } else {
        const evalCp = moverEval(line);
        const deltaCp = Math.max(0, bestEval - evalCp);
        const loose = dropsAfter(fenBefore, line.moves[0], moverColor);
        const drop = loose && deltaCp >= CLEARLY_WORSE_CP ? loose : null;
        const proof = proofAgainstMover(fenBefore, line.moves, moverColor);
        let leaves: Candidate['leaves'];
        try {
          const after = new Chess(fenBefore);
          const u = line.moves[0];
          after.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
          const md = computeMustDefend(after.fen(), moverColor).pieces.find((h) => h.attacker && h.attackerSquare);
          if (md?.attacker && md.attackerSquare) leaves = { piece: md.piece, square: md.square, attacker: md.attacker, attackerSquare: md.attackerSquare };
        } catch { leaves = undefined; }
        namedCandidate = {
          san: namedSan, evalCp, deltaCp,
          shortfall: drop ? 'drops-material' : deltaCp >= CLEARLY_WORSE_CP ? 'clearly-worse' : 'less-precise',
          drops: drop ? { piece: drop.piece, square: drop.square } : undefined,
          ...(proof ? { proof } : {}),
          ...(leaves ? { leaves } : {}),
        };
      }
    }
  }

  const bestWhy = moveWhy(fenBefore, bestSan, moverColor, input.opponentLastSan);
  // Played out only when it takes more than the move itself to see (3+ plies):
  // a one-move win is already the reason.
  const played = proofForMover(fenBefore, bestLine.moves, moverColor);
  const bestLineText = played && played.plies >= 3 ? played.text : null;
  const namedWhy = namedCandidate && namedCandidate.san !== bestSan ? moveWhy(fenBefore, namedCandidate.san, moverColor, input.opponentLastSan) : null;
  return { best, alternatives, isRealChoice: alternatives.length > 0, bestWhy, bestLine: bestLineText, ...(namedCandidate ? { named: namedCandidate, namedWhy } : {}) };
}


/** One alternative's shortfall, board-true and terse. Concrete where the drop is
 *  computed; honest-terse ("isn't as strong here") where only the eval says so —
 *  never an invented positional reason. */
function shortfallText(c: Candidate): string {
  // The proof leads: the line that shows WHY beats a label for it.
  // …for EVERY shortfall with a proof. `deliberationFacts` lets a less-precise
  // move through only BECAUSE it has one, and this branch used to skip it for
  // exactly that category — so the move fell to the filler line below (hand
  // walk 2026-09-24: "Bb3 is playable, but not as precise").
  if (c.proof) {
    // The proof line starts with the candidate itself; asked as a question it
    // is already named, so the answer starts with the REPLY — "Qf5? Then
    // castles, and the rook on e8 falls", never "Qf5? Qf5, castles…".
    const esc = c.san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rest = c.proof.replace(new RegExp(`^${esc}(?:, | and )`), '');
    if (rest !== c.proof) return `${c.san}? Then ${rest}.`;
    return `${c.san}? ${c.proof[0].toUpperCase()}${c.proof.slice(1)}.`;
  }
  if (c.shortfall === 'trades-queens') {
    return `${c.san}? ${c.san} trades the queens — with more space or an attack going, you want them on; every piece that comes off shrinks the edge.`;
  }
  if (c.shortfall === 'drops-material' && c.drops) {
    return `${c.san}? That drops the ${PNAME[c.drops.piece] ?? 'piece'} on ${c.drops.square}.`;
  }
  return `${c.san} is playable, but not as precise.`;
}

/**
 * The weighing as ordered board-true facts for voiceFacts — the tempting
 * alternatives first (each with why it falls short), then the move. The DNA
 * register turns this into the spoken discussion; this is only the facts.
 * Returns '' when there's nothing to weigh.
 */
export function deliberationFacts(d: Deliberation): string {
  // Only a REAL fork is weighed out loud (the 2026-09-24 Learn tape: "h5 is
  // playable, but not as precise. g6 is playable, but not as precise. The move
  // is Rg8." on a quiet endgame move). Coin-flip alternatives are the banned
  // filler register; with none left there is no choice to narrate — silence.
  // …and only with a REASON. "g6 is playable, but not as precise" came back on
  // a real 40–150cp gap (same tape): true, and still filler — it names a move
  // and teaches nothing about it. An alternative is weighed out loud only when
  // the board says WHY it falls short: a line that proves it, a piece it drops,
  // or a gap big enough to call clearly worse.
  // "Clearly worse here" is a verdict, not a reason (rule 1, hand walk 1380:
  // "cxb3? Clearly worse here."). An alternative is ruled out loud only with
  // the line that proves it or the piece it drops.
  const reasoned = reasonedAlternatives(d);
  if (!d.isRealChoice || reasoned.length === 0) return '';
  // THE VERDICT CARRIES ITS REASON, or it is not said (David 2026-09-24:
  // "The move is Rxf3" alone is an order, not teaching). The weighing still
  // stands on its own — ruling the bad moves out IS the thinking out loud.
  const line = d.bestLine ? ` ${d.bestLine[0].toUpperCase()}${d.bestLine.slice(1)}.` : '';
  const verdict = d.bestWhy ? ` The move is ${d.best.san} — it ${d.bestWhy}.${line}` : '';
  // WEIGH THE CANDIDATES BEFORE NAMING ONE (plan P2 #4): name the moves on the
  // table first, then rule the bad ones out, then conclude. Said only when a
  // conclusion follows — naming candidates and never choosing is not thinking
  // out loud. Alphabetical, so the order never telegraphs the answer.
  const opener = verdict
    ? `Candidates: ${orList([...new Set([...reasoned.map((a) => a.san), d.best.san])].sort())}. `
    : '';
  return `${opener}${reasoned.map(shortfallText).join(' ')}${verdict}`;
}

/** The alternatives ruled out WITH a reason — the line that proves it or the
 *  piece it drops. The weighing speaks only these. */
function reasonedAlternatives(d: Deliberation): Candidate[] {
  return meaningfulAlternatives(d).filter((a) => !!a.proof || (a.shortfall === 'drops-material' && !!a.drops) || a.shortfall === 'trades-queens');
}

/**
 * THE WEIGHING WITH THE ANSWER HELD BACK (David 2026-10-02: "hold the move only
 * at deciding moments, and the student's next move on the board is the answer").
 * The bad moves are ruled out loud — that is the thinking — and the move that
 * holds is kept for after the student has answered on the board. Empty when
 * there is nothing reasoned to rule out.
 */
export function deliberationWeighing(d: Deliberation): string {
  if (!d.isRealChoice) return '';
  return reasonedAlternatives(d).map(shortfallText).join(' ');
}

/** The held answer — the move and the reason it is the move, or null when no
 *  reason is computed (a bare "the move is X" is an order, not teaching). */
export interface HeldVerdict { san: string; why: string; line: string | null }
export function deliberationVerdict(d: Deliberation): HeldVerdict | null {
  if (!d.isRealChoice || !d.bestWhy) return null;
  return { san: d.best.san, why: d.bestWhy, line: d.bestLine ?? null };
}

/** The alternatives that are a real fork in the road — they drop material or
 *  sit a meaningful gap below the best. Coin-flip moves (inside
 *  `MEANINGFUL_DELTA_CP`) are dropped: on a quiet opening spine every reasonable
 *  move is one, and weighing them is filler. */
export function meaningfulAlternatives(d: Deliberation): Candidate[] {
  return d.alternatives.filter(
    (a) => a.shortfall === 'drops-material' || a.deltaCp >= MEANINGFUL_DELTA_CP,
  );
}

/**
 * The weighing WITHOUT the "the move is X" conclusion. Safe to splice into a
 * TAUGHT line (the Watch walkthrough), where the conclusion is the DB-canonical
 * taught move — NOT necessarily the engine's best. Emitting the tempting
 * alternatives + why each falls short teaches the discussion without ever
 * contradicting the board (which would break G3).
 *
 * Only MEANINGFUL alternatives are spoken (a genuine fork — drops material or a
 * real gap). A quiet position where every move is a coin-flip weighs to '' —
 * silence, which the voice rules allow, instead of "X is playable, but not as
 * precise" filler on every equal opening move.
 */
export function deliberationAlternativesFacts(d: Deliberation): string {
  if (!d.isRealChoice) return '';
  const meaningful = meaningfulAlternatives(d);
  if (meaningful.length === 0) return '';
  return meaningful.map(shortfallText).join(' ');
}

/** Why `san` is the move, phrased to follow "it" ("…— it wins the pawn on
 *  d5"). The ONE reason computer behind "The move is X" — shared so every lane
 *  that names a move gives the same reason. Null when nothing is computable. */
export function moveWhy(fenBefore: string, san: string, mover: 'w' | 'b', opponentLastSan: string | null): string | null {
  const first = materialWhy(fenBefore, san, mover, opponentLastSan)
    ?? threatAnswerWhy(fenBefore, san, mover)
    ?? threatMadeWhy(fenBefore, san, mover);
  if (first) return first;
  // A CAPTURE SAYS WHAT IT TAKES (walk 4: "Bxc6+ — it lines up an x-ray at
  // their rook on a8", the knight it takes and the check never named). An even
  // trade is still the move's first job.
  const took = captureLead(fenBefore, san);
  if (took) {
    const extras = extraJobs(fenBefore, san);
    return extras.length ? `${took}; it also ${andList(extras)}` : took;
  }
  // SEVERAL JOBS AT ONCE (catalogue §3; game 1, Bf4: "it develops the bishop,
  // protects the pawn and sets up a potential x-ray"): the fundamental, plus
  // the guard it adds and the x-ray it lines up.
  const strategic = strategicWhyLed(fenBefore, san, mover === 'w' ? 'white' : 'black');
  const extras = extraJobs(fenBefore, san);
  if (strategic && extras.length > 0) return `${strategic}; it also ${andList(extras)}`;
  if (extras.length > 0) return andList(extras);
  return strategic ?? checkWhy(fenBefore, san);
}

/** "takes their knight on c6, with check" — the capture a move makes. */
function captureLead(fen: string, san: string): string | null {
  let m;
  try { m = new Chess(fen).move(san); } catch { return null; }
  if (!m?.captured) return null;
  const check = /[+#]$/.test(m.san) ? (m.san.endsWith('#') ? ', and it is mate' : ', with check') : '';
  return `takes their ${PIECE_WORD[m.captured] ?? 'piece'} on ${m.to}${check}`;
}

/**
 * The jobs a move does that the fundamentals computer does not name (game 1,
 * Bf4): it adds a guard to one of your attacked pieces that was short of
 * guards, and it lines up THROUGH one piece at their queen, rook or king.
 */
export function extraJobs(fen: string, san: string): string[] {
  const out: string[] = [];
  let before: Chess; let after: Chess;
  try { before = new Chess(fen); after = new Chess(fen); } catch { return out; }
  let m;
  try { m = after.move(san); } catch { return out; }
  if (!m) return out;
  const me = m.color; const them = me === 'w' ? 'b' : 'w';
  for (const cell of after.board().flat()) {
    if (!cell || cell.color !== me || cell.square === m.to || cell.type === 'k') continue;
    try {
      const hits = after.attackers(cell.square, them).length;
      const was = before.attackers(cell.square, me).length;
      const now = after.attackers(cell.square, me).length;
      if (hits > was && now > was && after.attackers(cell.square, me).includes(m.to)) {
        out.push(`protects your ${cell.type === 'p' ? 'pawn' : PIECE_WORD[cell.type]} on ${cell.square}`);
        break;
      }
    } catch { /* skip */ }
  }
  if ('bqr'.includes(m.piece)) {
    const dirs = m.piece === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : m.piece === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      let x = m.to.charCodeAt(0) + dx; let y = Number(m.to[1]) + dy; let between = 0; let front = '';
      while (x >= 97 && x <= 104 && y >= 1 && y <= 8) {
        const p = after.get(`${String.fromCharCode(x)}${y}` as Square);
        if (p) {
          if (between === 0) { between = 1; front = p.color === them && p.type === 'k' ? 'king' : ''; }
          else {
            const at = `${String.fromCharCode(x)}${y}`;
            // Through THEIR king, it is a skewer (game 2, 20.Bb4+).
            if (p.color === them && front === 'king' && p.type !== 'p') out.push(`checks the king with their ${PIECE_WORD[p.type]} on ${at} standing behind it`);
            else if (p.color === them && (p.type === 'q' || p.type === 'r' || p.type === 'k')) out.push(`lines up an x-ray at their ${PIECE_WORD[p.type]} on ${at}`);
            break;
          }
        }
        x += dx; y += dy;
      }
    }
  }
  return out;
}
const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };



/** The plain fact of a check, when nothing richer is computed — in an ending
 *  the centre reason no longer stands in for it (Rh5+ "takes aim at the
 *  center, hitting d5" was the king on d5, Learn walk 2026-10-01). */
function checkWhy(fenBefore: string, san: string): string | null {
  if (!/\+$/.test(san)) return null;
  try {
    const c = new Chess(fenBefore);
    const m = c.move(san);
    const k = c.board().flat().find((x) => x && x.type === 'k' && x.color !== m.color);
    return k ? `checks the king on ${k.square}` : null;
  } catch { return null; }
}

/**
 * THE THREAT, AND THE MOVE THAT MEETS IT (David 2026-09-27 — the corpus names
 * the threat and the answer together: "the threat is Qe7 hitting e4, so you
 * double back to f3"). The coach named the threat and stopped; when the move
 * IS the answer, its reason should say so. Two board-true shapes:
 *  - another of the mover's pieces (a minor or more) that the opponent was
 *    winning is safe after the move — a defender arrived or the attacker was
 *    blocked;
 *  - a piece pinned to the king before the move is free after it.
 * The moved piece itself is `strategicWhyLed`'s "steps out of reach", not this.
 */
export function threatAnswerWhy(fenBefore: string, san: string, mover: 'w' | 'b'): string | null {
  try {
    const board0 = new Chess(fenBefore);
    const after = new Chess(fenBefore);
    const m = after.move(san);
    if (!m) return null;
    const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
    const mine = board0.board().flat().flatMap((c) => (c && c.color === mover && c.type !== 'k' ? [c] : []));
    for (const c of mine) {
      if (c.square === m.from || VAL[c.type] < 3) continue;
      const still = after.get(c.square);
      if (!still || still.color !== mover) continue;
      if (legalSeeGainFor(fenBefore, c.square, opp) <= 0) continue;
      if (legalSeeGainFor(after.fen(), c.square, opp) > 0) continue;
      // TAKING THE ATTACKER IS NOT GUARDING (hand walk 1690, 2026-09-27:
      // 18.Nxf7 "guards the queen on h6" — it removed the knight that forked it).
      if (m.captured && board0.attackers(c.square, opp).includes(m.to)) {
        return `takes the ${PNAME[m.captured]} that was hitting the ${PNAME[c.type]} on ${c.square}`;
      }
      // A CHECK IS NOT A GUARD (clean-pass walk 13, SI5q0VJz 31.Rc7+: "guards
      // the knight on f3"). In check, the capture is illegal for one move only
      // — the piece hangs again after the king steps away. Safe-by-check is no
      // reason to name.
      if (!seeReadsStanding(after.fen(), c.square, opp)) continue;
      return `guards the ${PNAME[c.type]} on ${c.square}, which they were about to win`;
    }
    for (const c of mine) {
      if (c.square === m.from) continue;
      if (isPinnedPiece(board0, c.square, mover) && !isPinnedPiece(after, c.square, mover) && after.get(c.square)?.color === mover) {
        return `breaks the pin on the ${PNAME[c.type]} on ${c.square}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * THE MOVE MAKES A THREAT (question walk 2026-09-27: "why did they play e5?"
 * was graded and costed but never said e5 hits the knight on f6). The moved
 * piece now attacks an enemy piece that is worth more than it, or that nothing
 * defends — the question the opponent must answer next move.
 */
export function threatMadeWhy(fenBefore: string, san: string, mover: 'w' | 'b'): string | null {
  try {
    const after = new Chess(fenBefore);
    const m = after.move(san);
    if (!m || m.captured || after.inCheck()) return null;
    const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
    const targets = after.board().flat()
      .flatMap((c) => (c && c.color === opp && c.type !== 'k' && c.type !== 'p' ? [c] : []))
      .filter((c) => after.attackers(c.square, mover).includes(m.to))
      .filter((c) => VAL[c.type] > VAL[m.piece] || after.attackers(c.square, opp).length === 0)
      .sort((a, b) => VAL[b.type] - VAL[a.type]);
    if (targets.length === 0) return null;
    return `attacks ${andList(targets.map((t) => `the ${PNAME[t.type]} on ${t.square}`))}`;
  } catch {
    return null;
  }
}

/**
 * The held answer in words. `now` — the student tapped "show me" before
 * moving; `found` — they played it; `missed` — they played something else and
 * nothing before this named the move. The reason always rides with the move.
 */
export function heldVerdictText(v: HeldVerdict, when: 'now' | 'found' | 'missed'): string {
  const line = v.line ? ` ${v.line[0].toUpperCase()}${v.line.slice(1)}.` : '';
  if (when === 'found') return `That was the move here — it ${v.why}.`;
  if (when === 'missed') return `The move here was ${v.san} — it ${v.why}.${line}`;
  return `The move is ${v.san} — it ${v.why}.${line}`;
}

/** The mover's pawns have claimed more room behind them (`computeTerritory`). */
function moreSpace(fen: string, mover: 'w' | 'b'): boolean {
  try {
    const sp = computeTerritory(fen);
    return mover === 'w' ? sp.white >= sp.black + 2 : sp.black >= sp.white + 2;
  } catch { return false; }
}

/** Both queens are gone within `plies` of the line. */
function queensOffWithin(fen: string, uci: readonly string[], plies: number): boolean {
  try {
    const c = new Chess(fen);
    for (const u of uci.slice(0, plies)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return !c.board().flat().some((x) => x && x.type === 'q');
  } catch { return false; }
}

/** The mover has more pieces bearing on the enemy king than defend it (`countKingAttack`). */
function attacking(fen: string, mover: 'w' | 'b'): boolean {
  try {
    const a = countKingAttack(new Chess(fen), mover);
    return !!a && a.attackers.size >= 2 && a.attackers.size > a.defenders.size;
  } catch { return false; }
}

/** MEANINGFUL_DELTA_CP, for the answer about a named move. */
export const NAMED_SAME_AS_BEST_CP = MEANINGFUL_DELTA_CP;

/**
 * THE ANSWER ABOUT A MOVE THE STUDENT NAMED — the coach's own weighing, said
 * to the student who asked. The best move with its reason, or why theirs falls
 * short with the line that proves it, or "about as good" inside the coin-flip
 * band. Null when the weighing has nothing to say about it.
 */
export function namedMoveAnswer(d: Deliberation, ask: 'why-best' | 'is-it-good'): string | null {
  const n = d.named;
  if (!n) return null;
  const line = d.bestLine ? ` ${d.bestLine[0].toUpperCase()}${d.bestLine.slice(1)}.` : '';
  const bestReason = d.bestWhy ? ` — it ${d.bestWhy}` : '';
  if (n.san === d.best.san) {
    const others = deliberationWeighing(d);
    return `${n.san} is the best move here${bestReason}.${line}${others ? ` ${others}` : ''}`;
  }
  if (n.deltaCp < NAMED_SAME_AS_BEST_CP && n.shortfall !== 'drops-material') {
    // Each move carries its own reason: the student's move first, then the
    // engine's alternative with its reason, never one reason across both.
    const own = d.namedWhy ? ` — it ${d.namedWhy}` : '';
    const alt = d.bestWhy ? ` ${d.best.san} is the engine's choice${bestReason}.` : ` The engine slightly prefers ${d.best.san}.`;
    // "Fine" is a verdict on the position, not only on the gap (walk 4:
    // "castling is fine" with the b5 bishop hanging and the game lost). When
    // the move leaves a piece under fire, say so; when the position is bad
    // either way, say it holds up as well as the engine's move — not "fine".
    const leaves = n.leaves
      ? ` It leaves your ${PIECE_WORD[n.leaves.piece] ?? 'piece'} on ${n.leaves.square} under fire from their ${PIECE_WORD[n.leaves.attacker] ?? 'piece'} on ${n.leaves.attackerSquare}.`
      : '';
    const verdict = n.evalCp <= -200 ? 'holds up about as well as anything here' : 'is fine';
    return `${n.san} ${verdict}${own}.${leaves}${alt}`;
  }
  const lead = ask === 'why-best' ? `${n.san} isn't the best move here. ` : '';
  const subject = lead ? 'It' : n.san;
  let why: string;
  let namesBest = false;
  if (n.proof || (n.shortfall === 'drops-material' && n.drops)) {
    why = shortfallText(n);
  } else if (n.shortfall === 'clearly-worse') {
    const leaves = n.leaves
      ? ` It leaves your ${PIECE_WORD[n.leaves.piece] ?? 'piece'} on ${n.leaves.square} under fire from their ${PIECE_WORD[n.leaves.attacker] ?? 'piece'} on ${n.leaves.attackerSquare}.`
      : '';
    why = `${subject} is clearly worse than ${d.best.san}${d.bestWhy ? `, which ${d.bestWhy}` : ''}.${leaves}${d.bestWhy ? line : ''}`;
    namesBest = true;
  } else {
    why = `${subject} is playable, but ${d.best.san} is more accurate${d.bestWhy ? ` — it ${d.bestWhy}` : ''}.${d.bestWhy ? line : ''}`;
    namesBest = true;
  }
  // The better move is named WITH its reason, or attributed — never a bare
  // "The move is X" (an order, not teaching).
  const verdict = namesBest ? ''
    : d.bestWhy ? ` The move is ${d.best.san}${bestReason}.${line}` : ` The engine prefers ${d.best.san}.${line}`;
  return `${lead}${why}${verdict}`;
}
