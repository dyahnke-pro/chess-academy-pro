// exchangeIdeas — TRADES, DEFENCE AND CONVERSION, PRINCIPLES (computers batch 5,
// teach-brief §2 H/J/L and §3 "Trades" / "Defence and conversion" /
// "Principles and nuggets").
//
// Sixteen board reads the reference coach makes and the app could not:
//   trades       — trade off their only developed piece; the defender's trade;
//                  the exchange for the key attacker; deny the exchange their
//                  setup relies on; the duty a recapture abandons; they choose
//                  the trade; duty parity; the maintenance trade; prepare the
//                  recapture.
//   defence      — make the threat cost them; the simplest clean win; safe only
//                  because of an earlier move.
//   nuggets      — a wing pawn for a centre pawn; material arithmetic in words;
//                  a knight is worth its squares; don't block the c-pawn in a
//                  d-pawn opening.
//
// Every read is PURE (chess.js + the static exchange + engine lines handed in;
// no Dexie, no LLM, no randomness) and every one carries the PROOF it rests on
// — a legal line played out or the squares marked. A read that cannot prove
// its claim is not emitted. Seats: the student is "you/your", the opponent
// "they/their"; material is said in words, never as a point total; no move
// numbers. Phrasing rotates on the position (`stemKeyOf`), never rolled.
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import { legalLineProof, lineProof, squaresProof, type Proof } from './proof';
import { legalSeeGain, legalSeeGainFor, seeSequence, asIfToMove } from './positionReadingService';
import { countKingAttack } from './kingSafety';
import { MATERIAL_VALUE } from './pieceValues';
import { MATE_POINTS, type FactStakes } from './factStakes';
import { computeExchangeLedger, netPieceWords } from './exchangeLedger';
import { inFluxAfter } from './boardState';
import { stemKeyOf } from '../utils/rotateStem';
import { imageryFor } from './factImagery';

export type ExchangeIdeaId =
  | 'only-developed' | 'defender-trade' | 'exchange-for-attacker' | 'deny-exchange'
  | 'abandoned-duty' | 'trade-choice' | 'duty-parity' | 'maintenance-trade' | 'prepare-recapture'
  | 'threat-cost' | 'simplest-win' | 'safe-because'
  | 'wing-for-centre' | 'material-arithmetic' | 'knight-squares' | 'c-pawn-block';

/** The fact kind each read speaks as through the one door — one name on both
 *  sides (review `[tag]` and live clause kind). Exhaustive: a new read fails to
 *  compile until it is given a kind. */
export type ExchangeIdeaKind = 'trade-idea' | 'defence-idea' | 'nugget';
export const IDEA_KIND: Record<ExchangeIdeaId, ExchangeIdeaKind> = {
  'only-developed': 'trade-idea',
  'defender-trade': 'trade-idea',
  'exchange-for-attacker': 'trade-idea',
  'deny-exchange': 'trade-idea',
  'abandoned-duty': 'trade-idea',
  'trade-choice': 'trade-idea',
  'duty-parity': 'trade-idea',
  'maintenance-trade': 'trade-idea',
  'prepare-recapture': 'trade-idea',
  'threat-cost': 'defence-idea',
  'simplest-win': 'defence-idea',
  'safe-because': 'defence-idea',
  'wing-for-centre': 'nugget',
  'material-arithmetic': 'nugget',
  'knight-squares': 'nugget',
  'c-pawn-block': 'nugget',
};

export interface ExchangeIdea {
  id: ExchangeIdeaId;
  kind: ExchangeIdeaKind;
  text: string;
  /** The geometry the claim is about, coupled here (never scraped from prose). */
  squares: string[];
  /** What the read found — required: no proof, no read. */
  proof: Proof;
  stakes?: FactStakes;
  /** Say-once identity: the same claim is not said twice in a game. */
  claim: string;
  /** True when the sentence names the student's next move. */
  namesMove?: boolean;
}

type Side = 'w' | 'b';
const other = (s: Side): Side => (s === 'w' ? 'b' : 'w');
const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const val = (t: string | undefined): number => MATERIAL_VALUE[t ?? ''] ?? 0;
const own = (color: Side, student: Side): string => (color === student ? 'your' : 'their');
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const numWord = (n: number): string => WORD[n] ?? 'many';

function load(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}
function play(fen: string, san: string): { c: Chess; m: Move } | null {
  const c = load(fen);
  if (!c) return null;
  try { const m = c.move(san); return { c, m }; } catch { return null; }
}
function legalMoves(fen: string): Move[] {
  const c = load(fen);
  if (!c) return [];
  try { return c.moves({ verbose: true }); } catch { return []; }
}
/** Least-valuable legal capture on `sq` for the side to move on `fen`. */
function cheapestCapture(fen: string, sq: string): Move | null {
  const caps = legalMoves(fen).filter((m) => m.to === sq && m.captured);
  caps.sort((a, b) => val(a.piece) - val(b.piece));
  return caps[0] ?? null;
}
function pawnsOnFile(c: Chess, file: string, color: Side): number {
  let n = 0;
  for (let r = 1; r <= 8; r += 1) { const p = c.get(`${file}${r}` as Square); if (p && p.type === 'p' && p.color === color) n += 1; }
  return n;
}
/** A capture by a pawn that leaves its side two pawns on the landing file. */
function pawnRecaptureDoubles(fen: string, m: Move): boolean {
  if (m.piece !== 'p') return false;
  const r = play(fen, m.san);
  return !!r && pawnsOnFile(r.c, m.to[0], m.color) >= 2;
}

const HOME: Record<Side, Record<string, readonly string[]>> = {
  w: { n: ['b1', 'g1'], b: ['c1', 'f1'], r: ['a1', 'h1'], q: ['d1'] },
  b: { n: ['b8', 'g8'], b: ['c8', 'f8'], r: ['a8', 'h8'], q: ['d8'] },
};
function pieceSquares(c: Chess, color: Side, types: readonly PieceSymbol[]): Array<{ sq: string; type: PieceSymbol }> {
  const out: Array<{ sq: string; type: PieceSymbol }> = [];
  for (const row of c.board()) for (const x of row) if (x && x.color === color && types.includes(x.type)) out.push({ sq: x.square, type: x.type });
  return out;
}
function developed(c: Chess, color: Side): Array<{ sq: string; type: PieceSymbol }> {
  return pieceSquares(c, color, ['n', 'b', 'r', 'q']).filter((p) => !HOME[color][p.type].includes(p.sq));
}
function minorsAtHome(c: Chess, color: Side): string[] {
  return pieceSquares(c, color, ['n', 'b']).filter((p) => HOME[color][p.type].includes(p.sq)).map((p) => p.sq);
}
/** What the side NOT to move wins on `sq` by capturing there — or the side to
 *  move, by `color`; a board that cannot exist reads zero. */
function gainFor(fen: string, sq: string, color: Side): number {
  return legalSeeGainFor(fen, sq as Square, color);
}
function mateInOne(fen: string): Move | null {
  const c = load(fen);
  if (!c) return null;
  for (const m of c.moves({ verbose: true })) {
    c.move(m);
    const mate = c.isCheckmate();
    c.undo();
    if (mate) return m;
  }
  return null;
}
function fullmove(fen: string): number { return Number(fen.split(' ')[5] ?? '1') || 1; }

// ── TRADES ────────────────────────────────────────────────────────────────

/** "The bishop move trades off their only active knight": the student's
 *  capture removes the ONLY piece the opponent has developed while at least
 *  two of their minors still sit at home — their development starts over. */
export function onlyDevelopedTrade(fenBefore: string, san: string, student: Side): ExchangeIdea | null {
  const before = load(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.m.color !== student || !r.m.captured || r.m.captured === 'p') return null;
  if (fullmove(fenBefore) > 15) return null;
  const them = other(student);
  const dev = developed(before, them);
  if (dev.length !== 1 || dev[0].sq !== r.m.to) return null;
  const home = minorsAtHome(before, them);
  if (home.length < 2) return null;
  // A trade, not a loss: what they take back is no more than what was taken.
  const back = gainFor(r.c.fen(), r.m.to, them);
  if (val(r.m.captured) - back < 0) return null;
  const text = `That trades off their only developed piece, the ${NAME[r.m.captured]} on ${r.m.to} — every other piece of theirs is still at home.`;
  const proof = squaresProof(text, [r.m.to, ...home]);
  if (!proof) return null;
  return idea('only-developed', text, [r.m.to, ...home], proof, `only-developed:${r.m.to}`);
}

/** The defender's trade, both seats: a capture that removes a piece aimed at
 *  the student's king (the student thinning their attack), or their attacker
 *  trading itself off on a square the student takes back. */
export function defenderTrade(fenBefore: string, san: string, student: Side): ExchangeIdea | null {
  const before = load(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || !r.m.captured) return null;
  const them = other(student);
  const attack = countKingAttack(before, them); // their pieces on YOUR king zone
  if (!attack || attack.attackers.size < 2) return null;
  const after = r.c.fen();
  if (r.m.color === student) {
    if (!attack.attackers.has(r.m.to) || r.m.captured === 'p') return null;
    const back = gainFor(after, r.m.to, them);
    if (val(r.m.captured) - back < 0) return null;
    const line = [san, ...seeSequence(after, r.m.to)];
    const proof = legalLineProof(fenBefore, line, true);
    if (!proof) return null;
    const text = `That takes off one of their attackers — their ${NAME[r.m.captured]} on ${r.m.to} was aimed at your king, and every attacker traded is one less to meet.`;
    return idea('defender-trade', text, [r.m.to, attack.king], proof, `defender-trade:${r.m.to}`);
  }
  // Their attacker captures and is taken back like for like.
  if (!attack.attackers.has(r.m.from) || val(r.m.captured) !== val(r.m.piece) || r.m.piece === 'p') return null;
  const retake = cheapestCapture(after, r.m.to);
  if (!retake) return null;
  if (val(r.m.piece) - gainFor(play(after, retake.san)?.c.fen() ?? '', r.m.to, them) < 0) return null;
  const proof = legalLineProof(fenBefore, [san, retake.san], true);
  if (!proof) return null;
  const text = `They trade on ${r.m.to}, and when you take back with ${retake.san} one of their own attackers is gone — that ${NAME[r.m.piece]} was aimed at your king.`;
  return idea('defender-trade', text, [r.m.from, r.m.to, attack.king], proof, `defender-trade:${r.m.from}${r.m.to}`);
}

/** Giving up the exchange for the key attacker: the student's rook takes a
 *  minor piece that was attacking their king, accepting the recapture — kept
 *  only where the engine did not count it a mistake. */
export function exchangeForAttacker(fenBefore: string, san: string, student: Side, costCp: number | null): ExchangeIdea | null {
  if (costCp === null || costCp >= 50) return null;
  const before = load(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.m.color !== student || r.m.piece !== 'r' || (r.m.captured !== 'n' && r.m.captured !== 'b')) return null;
  const them = other(student);
  const attack = countKingAttack(before, them);
  if (!attack || !attack.attackers.has(r.m.to)) return null;
  const after = r.c.fen();
  const retake = cheapestCapture(after, r.m.to);
  if (!retake || gainFor(after, r.m.to, them) < 5) return null;
  const proof = legalLineProof(fenBefore, [san, retake.san], true);
  if (!proof) return null;
  const lead = attack.attackers.size === 1 ? 'the piece attacking your king' : 'one of the pieces attacking your king';
  const text = `You give up the exchange — your rook for their ${NAME[r.m.captured]} on ${r.m.to} — because that ${NAME[r.m.captured]} was ${lead}.`;
  return idea('exchange-for-attacker', text, [r.m.from, r.m.to, attack.king], proof, `exchange-for-attacker:${r.m.to}`);
}

/** Their capture on `sq` that would double your pawns: a minor of theirs
 *  takes your minor there and every way back is a pawn landing on a file that
 *  already holds one. Read on `fen` with THEM to move (real or as-if). */
function doublingCapture(fen: string, sq: string): { take: Move; back: Move } | null {
  const take = legalMoves(fen).find((m) => m.to === sq && m.captured && (m.piece === 'n' || m.piece === 'b') && val(m.captured) === val(m.piece));
  if (!take) return null;
  const r = play(fen, take.san);
  if (!r) return null;
  const backs = r.c.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (backs.length === 0 || !backs.every((m) => pawnRecaptureDoubles(r.c.fen(), m))) return null;
  return { take, back: backs[0] };
}

/** "The knight to a4 stops the exchange on c3 the defence relies on": the
 *  student's piece leaves the square where their minor could take it and
 *  force a pawn recapture that doubles the student's pawns. */
export function denyExchange(fenBefore: string, san: string, student: Side, costCp: number | null): ExchangeIdea | null {
  if (costCp !== null && costCp >= 50) return null;
  const r = play(fenBefore, san);
  if (!r || r.m.color !== student || r.m.captured || (r.m.piece !== 'n' && r.m.piece !== 'b')) return null;
  const asIf = asIfToMove(fenBefore, other(student));
  if (!asIf) return null;
  const denied = doublingCapture(asIf, r.m.from);
  if (!denied) return null;
  // The same damage must not be waiting on the piece's new square.
  if (doublingCapture(r.c.fen(), r.m.to)) return null;
  const text = `Your ${NAME[r.m.piece]} leaves ${r.m.from}, so their ${NAME[denied.take.piece]} can no longer take it there and double your pawns.`;
  const sq = [denied.take.from, r.m.from, denied.back.from];
  const proof = squaresProof(text, sq);
  if (!proof) return null;
  return idea('deny-exchange', text, sq, proof, `deny-exchange:${r.m.from}`);
}

/** The duty a recapture abandons: after the student's capture, taking back
 *  with a piece that was guarding something lets the student win it — or mate.
 *  Said for the recapture they would naturally choose (least valuable first). */
export function abandonedDuty(fenBefore: string, san: string, student: Side): ExchangeIdea | null {
  const r = play(fenBefore, san);
  if (!r || r.m.color !== student || !r.m.captured) return null;
  const them = other(student);
  const after = r.c.fen();
  const retake = cheapestCapture(after, r.m.to);
  if (!retake || retake.piece === 'k') return null;
  const b2 = play(after, retake.san);
  if (!b2) return null;
  const mate = mateInOne(b2.c.fen());
  if (mate) {
    const proof = legalLineProof(fenBefore, [san, retake.san, mate.san], true);
    if (!proof) return null;
    const backRank = them === 'w' ? '1' : '8';
    const post = retake.from[1] === backRank && retake.to[1] !== backRank ? 'leaves the back rank' : 'leaves its post';
    const text = `If they take back with the ${NAME[retake.piece]}, it ${post}, and ${mate.san.replace(/[+#]$/, '')} is mate.`;
    return { ...idea('abandoned-duty', text, [retake.from, r.m.to, mate.to], proof, `abandoned-duty:${retake.from}${r.m.to}`), stakes: { points: MATE_POINTS, plies: 2 } };
  }
  // A piece the recapturer guarded that now falls.
  for (const p of pieceSquares(load(after) as Chess, them, ['n', 'b', 'r', 'q', 'p'])) {
    if (p.sq === retake.from) continue;
    const guards = (load(after) as Chess).attackers(p.sq as Square, them);
    if (!guards.includes(retake.from)) continue;
    if (gainFor(after, p.sq, student) > 0) continue; // already falling — not the recapture's doing
    const win = gainFor(b2.c.fen(), p.sq, student);
    if (win < 1) continue;
    const take = cheapestCapture(b2.c.fen(), p.sq);
    if (!take) continue;
    const proof = legalLineProof(fenBefore, [san, retake.san, take.san], true);
    if (!proof) continue;
    const text = `If they take back with the ${NAME[retake.piece]}, it stops guarding their ${NAME[p.type]} on ${p.sq} — and you take that with ${take.san}.`;
    return { ...idea('abandoned-duty', text, [retake.from, r.m.to, p.sq], proof, `abandoned-duty:${retake.from}${p.sq}`), stakes: { points: win, plies: 2 } };
  }
  return null;
}

/** THE DIAGNOSE HALF of the abandoned duty: on the mover's board, a natural
 *  capture (it takes at least what its piece is worth) whose capturer was the
 *  only thing standing between the opponent and a mate in one, or a guarded
 *  unit of the mover's that then falls. The board POSED "does your capture
 *  leave its post?"; the move played answers it (`capabilitiesPosed`). Returns
 *  what would be lost: a mate, or the material. */
export function captureAbandonsDuty(fenBefore: string): 'mate' | 'material' | null {
  const c = load(fenBefore);
  if (!c) return null;
  const mover = c.turn() as Side;
  const them = other(mover);
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured || m.piece === 'k' || val(m.captured) < val(m.piece)) continue;
    const r = play(fenBefore, m.san);
    if (!r) continue;
    if (mateInOne(r.c.fen())) {
      // The capturer's post was the guard: without the capture, no mate.
      const asThem = asIfToMove(fenBefore, them);
      if (asThem && !mateInOne(asThem)) return 'mate';
      continue;
    }
    const before = asIfToMove(fenBefore, them);
    if (!before) continue;
    for (const p of pieceSquares(r.c, mover, ['n', 'b', 'r', 'q'])) {
      if (p.sq === m.to) continue;
      if (!c.attackers(p.sq as Square, mover).includes(m.from)) continue;
      if (legalSeeGain(before, p.sq as Square) > 0) continue;
      if (legalSeeGain(r.c.fen(), p.sq as Square) >= 3) return 'material';
    }
  }
  return null;
}

/** Can they decline? The student's piece now faces an equal piece of theirs,
 *  and THEY decide the trade: if they take first, the only way back is a pawn
 *  that doubles the student's pawns. */
export function tradeChoice(fenBefore: string, san: string, student: Side): ExchangeIdea | null {
  const r = play(fenBefore, san);
  if (!r || r.m.color !== student || r.m.captured || r.m.piece === 'p' || r.m.piece === 'k') return null;
  const after = r.c.fen();
  const take = legalMoves(after).find((m) => m.to === r.m.to && m.captured && val(m.piece) === val(r.m.piece));
  if (!take) return null;
  // A trade OFFER: the student's piece attacks theirs back.
  const asMine = asIfToMove(after, student);
  if (!asMine || !legalMoves(asMine).some((m) => m.from === r.m.to && m.to === take.from)) return null;
  const t = play(after, take.san);
  if (!t) return null;
  const backs = t.c.moves({ verbose: true }).filter((m) => m.to === r.m.to && m.captured);
  if (backs.length === 0 || !backs.every((m) => pawnRecaptureDoubles(t.c.fen(), m))) return null;
  const proof = legalLineProof(after, [take.san, backs[0].san], true);
  if (!proof) return null;
  const text = `You offer the ${NAME[r.m.piece]} trade, but the choice is theirs: if they take on ${r.m.to}, you must take back with the ${backs[0].from[0]}-pawn and double your pawns.`;
  return idea('trade-choice', text, [take.from, r.m.to, backs[0].from], proof, `trade-choice:${r.m.to}`);
}

/** Duty parity, read on the board with the student to move: one guard of
 *  yours holds a unit that exactly one piece of theirs attacks, and their
 *  attacker is worth at least as much as your guard — both are tied, so the
 *  guard costs nothing. */
export function dutyParity(fen: string, student: Side): ExchangeIdea | null {
  const c = load(fen);
  if (!c || c.turn() !== student || c.inCheck()) return null;
  const them = other(student);
  const asThem = asIfToMove(fen, them);
  if (!asThem) return null;
  const theirMoves = legalMoves(asThem);
  for (const t of pieceSquares(c, student, ['p', 'n', 'b', 'r'])) {
    const attackers = c.attackers(t.sq as Square, them);
    if (attackers.length !== 1) continue;
    const a = c.get(attackers[0]);
    if (!a || a.type === 'p' || a.type === 'k') continue;
    const take = theirMoves.find((m) => m.from === attackers[0] && m.to === t.sq);
    if (!take) continue;
    const guards = c.attackers(t.sq as Square, student);
    if (guards.length !== 1) continue;
    const d = c.get(guards[0]);
    if (!d || d.type === 'p' || d.type === 'k') continue;
    if (val(a.type) < val(d.type) || val(a.type) <= val(t.type)) continue;
    // Without the guard it falls: their capture wins it outright.
    const probe = new Chess(asThem);
    probe.remove(guards[0]);
    try { probe.move({ from: attackers[0], to: t.sq }); } catch { continue; }
    if (probe.attackers(t.sq as Square, student).length > 0) continue;
    const text = `Your ${NAME[d.type]} on ${guards[0]} is tied to guarding the ${NAME[t.type]} on ${t.sq} — but their ${NAME[a.type]} on ${attackers[0]} is just as tied to attacking it, so the guard costs you nothing.`;
    const sq = [guards[0], t.sq, attackers[0]];
    const proof = squaresProof(text, sq);
    if (!proof) continue;
    return idea('duty-parity', text, sq, proof, `duty-parity:${guards[0]}${t.sq}${attackers[0]}`);
  }
  return null;
}

/** The maintenance trade: the student's pawn was attacked more often than it
 *  was defended, so it takes a pawn and is taken back — it wins nothing, it
 *  only keeps the pawn count. */
export function maintenanceTrade(fenBefore: string, san: string, student: Side, costCp: number | null): ExchangeIdea | null {
  if (costCp !== null && costCp >= 50) return null;
  const r = play(fenBefore, san);
  if (!r || r.m.color !== student || r.m.piece !== 'p' || r.m.captured !== 'p') return null;
  const them = other(student);
  if (gainFor(fenBefore, r.m.from, them) < 1) return null;
  const after = r.c.fen();
  const back = cheapestCapture(after, r.m.to);
  if (!back || gainFor(after, r.m.to, them) < 1) return null;
  const proof = legalLineProof(fenBefore, [san, back.san], true);
  if (!proof) return null;
  const text = `Your pawn on ${r.m.from} was attacked more often than it was defended, so it takes on ${r.m.to} — that wins nothing, it just keeps the pawn count.`;
  return idea('maintenance-trade', text, [r.m.from, r.m.to], proof, `maintenance-trade:${r.m.from}`);
}

/** Prepare the recapture: a quiet student move makes a piece the way back on
 *  a square where their capture would otherwise force a doubling pawn
 *  recapture ("knight to e2 first, so a knight retakes on c3"). */
export function prepareRecapture(fenBefore: string, san: string, student: Side, costCp: number | null): ExchangeIdea | null {
  if (costCp !== null && costCp >= 50) return null;
  const r = play(fenBefore, san);
  if (!r || r.m.color !== student || r.m.captured || r.m.piece === 'p' || r.m.piece === 'k') return null;
  const asThemBefore = asIfToMove(fenBefore, other(student));
  if (!asThemBefore) return null;
  const after = r.c.fen();
  for (const t of pieceSquares(r.c, student, ['n', 'b'])) {
    if (t.sq === r.m.to) continue;
    const was = doublingCapture(asThemBefore, t.sq);
    if (!was) continue;
    const take = legalMoves(after).find((m) => m.from === was.take.from && m.to === t.sq);
    if (!take) continue;
    const tk = play(after, take.san);
    const back = tk?.c.moves({ verbose: true }).find((m) => m.from === r.m.to && m.to === t.sq);
    if (!tk || !back) continue;
    const proof = legalLineProof(after, [take.san, back.san], true);
    if (!proof) continue;
    const text = `Your ${NAME[r.m.piece]} goes to ${r.m.to} first, so if they take on ${t.sq} it takes back instead of a pawn.`;
    return idea('prepare-recapture', text, [r.m.to, t.sq, was.take.from], proof, `prepare-recapture:${t.sq}`);
  }
  return null;
}

// ── DEFENCE AND CONVERSION ────────────────────────────────────────────────

/** Their best material-winning capture on `fen` with THEM to move. */
function theirBestGrab(fen: string): { m: Move; gain: number } | null {
  let best: { m: Move; gain: number } | null = null;
  for (const m of legalMoves(fen)) {
    if (!m.captured) continue;
    const g = legalSeeGain(fen, m.to);
    if (g >= 1 && (!best || g > best.gain)) best = { m, gain: g };
  }
  return best;
}

/** "Push h3; if they play the skewer anyway, you take their other bishop":
 *  their threat still stands after the student's move, but now carrying it
 *  out lets the student win back at least as much, and before the move it
 *  did not. */
export function threatCost(fenBefore: string, san: string, student: Side): ExchangeIdea | null {
  const r = play(fenBefore, san);
  if (!r || r.m.color !== student) return null;
  const asThem = asIfToMove(fenBefore, other(student));
  if (!asThem) return null;
  const threat = theirBestGrab(asThem);
  if (!threat) return null;
  const after = r.c.fen();
  const still = legalMoves(after).find((m) => m.from === threat.m.from && m.to === threat.m.to);
  if (!still || legalSeeGain(after, still.to) < threat.gain) return null;
  const b2 = play(after, still.san);
  const b0 = play(asThem, threat.m.san);
  if (!b2 || !b0) return null;
  let answer: { m: Move; gain: number } | null = null;
  for (const m of b2.c.moves({ verbose: true })) {
    if (!m.captured || m.to === still.to) continue;
    const g = legalSeeGain(b2.c.fen(), m.to);
    if (g >= threat.gain && (!answer || g > answer.gain)) answer = { m, gain: g };
  }
  if (!answer) return null;
  // The student's move made the answer: without it, the same grab cost them less.
  if (legalSeeGain(b0.c.fen(), answer.m.to) >= threat.gain) return null;
  const proof = legalLineProof(after, [still.san, answer.m.san], true);
  if (!proof) return null;
  const victim = b2.c.get(answer.m.to);
  const how = answer.gain > threat.gain ? 'more than it wins' : 'as much as it wins';
  const text = `Now if they go ahead with ${still.san} anyway, you take their ${NAME[victim?.type ?? 'p']} on ${answer.m.to} — the threat costs them ${how}.`;
  return { ...idea('threat-cost', text, [still.from, still.to, answer.m.to], proof, `threat-cost:${still.from}${still.to}`), stakes: { points: threat.gain, plies: 1 } };
}

/** The engine lines at `fen`, student POV. */
interface LineIn { moves: readonly string[]; evaluation: number; mate: number | null }
const WIN_CP = 300;
function studentScore(l: LineIn, student: Side): { win: boolean; mate: number | null } {
  const sign = student === 'w' ? 1 : -1;
  if (l.mate !== null) {
    const m = l.mate * sign;
    return { win: m > 0, mate: m > 0 ? m : null };
  }
  return { win: l.evaluation * sign >= WIN_CP, mate: null };
}
function uciSans(fen: string, uci: readonly string[], max = 99): string[] {
  const c = load(fen);
  const out: string[] = [];
  if (!c) return out;
  for (const u of uci.slice(0, max)) {
    try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; }
  }
  return out;
}

/** The simplest clean win: more than one engine line wins, and one of them
 *  either forces mate or wins material at once with nothing left hanging. */
export function simplestWin(fen: string, student: Side, lines: readonly LineIn[]): ExchangeIdea | null {
  const c = load(fen);
  if (!c || c.turn() !== student) return null;
  const winning = lines.filter((l) => l.moves.length > 0 && studentScore(l, student).win);
  if (winning.length < 2) return null;
  const them = other(student);
  const reads = winning.map((l, i) => {
    const sans = uciSans(fen, l.moves);
    const first = sans[0] ? play(fen, sans[0]) : null;
    const net = first?.m.captured ? val(first.m.captured) - gainFor(first.c.fen(), first.m.to, them) : 0;
    const safe = !!first && gainFor(first.c.fen(), first.m.to, them) === 0;
    return { i, sans, mate: studentScore(l, student).mate, net, safe };
  }).filter((x) => x.sans.length > 0);
  const mates = reads.filter((x) => x.mate !== null).sort((a, b) => (a.mate ?? 0) - (b.mate ?? 0) || a.i - b.i);
  const grabs = reads.filter((x) => x.net >= 2 && x.safe).sort((a, b) => b.net - a.net || a.i - b.i);
  if (mates.length === 0 && grabs.length === 0) return null;
  const pick = mates.length > 0 ? mates[0] : grabs[0];
  const why = pick.mate !== null ? 'it forces mate' : 'it wins material straight away and leaves nothing hanging';
  const proof = lineProof({ fen, sans: pick.sans }, pick.mate !== null);
  if (!proof) return null;
  const move = pick.sans[0];
  const text = `More than one move wins here; ${move} is the simplest — ${why}.`;
  const to = play(fen, move)?.m.to;
  return { ...idea('simplest-win', text, to ? [to] : [], proof, `simplest-win:${fen.split(' ')[0]}`), namesMove: true, stakes: pick.mate !== null ? { points: MATE_POINTS, plies: 0 } : { points: pick.net, plies: 0 } };
}

/** The student's move before the one played from `fenBefore`, replayed from
 *  the start of `history` (the whole game's SANs). Null when the history does
 *  not reach this board. */
export function previousOwnMove(history: readonly string[], fenBefore: string): { fenBefore: string; san: string } | null {
  const key = fenBefore.split(' ').slice(0, 2).join(' ');
  const c = new Chess();
  const fens: string[] = [c.fen()];
  try { for (const s of history) { c.move(s); fens.push(c.fen()); } } catch { return null; }
  const i = fens.findIndex((f) => f.split(' ').slice(0, 2).join(' ') === key);
  if (i < 2) return null;
  return { fenBefore: fens[i - 2], san: history[i - 2] };
}

/** Safe only because of an earlier move: with the student's previous move
 *  taken back (that piece home again), the move just played would lose
 *  material or allow mate; on the real board it does not. */
export function safeBecause(fenBefore: string, san: string, student: Side, prev: { fenBefore: string; san: string } | null): ExchangeIdea | null {
  if (!prev) return null;
  const p = play(prev.fenBefore, prev.san);
  const r = play(fenBefore, san);
  if (!p || !r || p.m.color !== student || r.m.color !== student) return null;
  if (p.m.captured || p.m.promotion || p.m.isKingsideCastle() || p.m.isQueensideCastle() || p.m.isEnPassant()) return null;
  if (r.m.from === p.m.to) return null; // the same piece moving again
  const cf = load(fenBefore);
  if (!cf) return null;
  const piece = cf.get(p.m.to);
  if (!piece || piece.type !== p.m.piece || piece.color !== student || cf.get(p.m.from)) return null;
  cf.remove(p.m.to);
  cf.put({ type: piece.type, color: piece.color }, p.m.from);
  const cfFen = cf.fen();
  if (!load(cfFen) || asIfToMove(cfFen, student) === null) return null; // their king in check: no such board
  const cfAfter = play(cfFen, san);
  if (!cfAfter) return null;
  const realAfter = r.c.fen();
  if (mateInOne(realAfter)) return null;
  const cfMate = mateInOne(cfAfter.c.fen());
  const where = `${NAME[piece.type]} is already on ${p.m.to}`;
  const back = `with it back on ${p.m.from}`;
  if (cfMate) {
    const proof = legalLineProof(cfFen, [san, cfMate.san], true);
    if (!proof) return null;
    const text = `${san} is fine only because your ${where} — ${back}, ${cfMate.san.replace(/[+#]$/, '')} would be mate.`;
    return idea('safe-because', text, [p.m.to, p.m.from, cfMate.to], proof, `safe-because:${san}`);
  }
  // What their best grab SETTLES at, proven over the line by the ledger — on
  // the real board and with the earlier piece put back.
  const settle = (fen: string): { grab: Move; line: string[]; net: number; lost: string | null } | null => {
    const after = play(fen, san);
    const g = after ? theirBestGrab(after.c.fen()) : null;
    if (!after || !g) return null;
    const taken = play(after.c.fen(), g.m.san);
    if (!taken) return null;
    const line = [san, g.m.san, ...seeSequence(taken.c.fen(), g.m.to)];
    const ledger = computeExchangeLedger(fen, line, student);
    if (!ledger || !ledger.settled) return null;
    return { grab: g.m, line, net: ledger.netPawns, lost: netPieceWords(ledger.opponentWon, ledger.studentWon) };
  };
  const real = settle(fenBefore)?.net ?? 0;
  const cfGrab = settle(cfFen);
  if (!cfGrab || !cfGrab.lost || cfGrab.net > real - 2) return null;
  const proof = legalLineProof(cfFen, cfGrab.line, true);
  if (!proof) return null;
  const text = `${san} is fine only because your ${where} — ${back}, ${cfGrab.grab.san} would cost you ${cfGrab.lost}.`;
  const grab = cfGrab.grab;
  return idea('safe-because', text, [p.m.to, p.m.from, grab.to], proof, `safe-because:${san}`);
}

// ── PRINCIPLES AND NUGGETS ────────────────────────────────────────────────

const CENTRE_FILES = new Set(['d', 'e']);
const WING_FILES = new Set(['a', 'b', 'g', 'h']);

/** A wing pawn for a centre pawn, along an engine line from `fen`: the first
 *  point where the only material gone is one wing pawn of yours and one centre
 *  pawn of theirs, on a board where nothing is left to take back. */
export function wingForCentre(fen: string, uciLine: readonly string[], student: Side): ExchangeIdea | null {
  const c = load(fen);
  if (!c) return null;
  const sans: string[] = [];
  const lost: Record<Side, Array<{ type: string; file: string }>> = { w: [], b: [] };
  for (const u of uciLine.slice(0, 8)) {
    let m: Move | null = null;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { m = null; }
    if (!m) return null;
    sans.push(m.san);
    if (m.captured) {
      lost[other(m.color)].push({ type: m.captured, file: m.to[0] });
    }
    const mine = lost[student]; const theirs = lost[other(student)];
    if (mine.length === 1 && theirs.length === 1 && mine[0].type === 'p' && theirs[0].type === 'p'
      && WING_FILES.has(mine[0].file) && CENTRE_FILES.has(theirs[0].file) && m.captured
      && legalSeeGain(c.fen(), m.to) === 0) {
      const proof = lineProof({ fen, sans: [...sans] });
      if (!proof) return null;
      const text = `This line wins their ${theirs[0].file}-pawn for your ${mine[0].file}-pawn — a wing pawn for a centre pawn is a good bargain.`;
      return idea('wing-for-centre', text, [], proof, `wing-for-centre:${fen.split(' ')[0]}`);
    }
    if (mine.length + theirs.length >= 2) return null;
  }
  return null;
}

/** Material arithmetic in words, after a capture that leaves an imbalance on
 *  a settled board: "your three pawns for their bishop — material is level". */
export function materialArithmetic(fenBefore: string, san: string, student: Side): ExchangeIdea | null {
  const before = load(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || !r.m.captured) return null;
  if (inFluxAfter(fenBefore, san)) return null; // a take-back is still pending — the one flux test
  const diff = (c: Chess): Record<string, number> => {
    const d: Record<string, number> = { q: 0, r: 0, m: 0, p: 0 };
    for (const row of c.board()) for (const x of row) {
      if (!x || x.type === 'k') continue;
      const k = x.type === 'n' || x.type === 'b' ? 'm' : x.type;
      d[k] += x.color === student ? 1 : -1;
    }
    return d;
  };
  const d = diff(r.c);
  const d0 = diff(before);
  const kinds = ['q', 'r', 'm', 'p'] as const;
  const imbalanced = (x: Record<string, number>): boolean => kinds.filter((k) => x[k] !== 0).length >= 2;
  // Said when the capture made or changed the imbalance, never on a board
  // that merely carries an old one.
  if (!imbalanced(d) || kinds.every((k) => d[k] === d0[k])) return null;
  const balance = d.q * 9 + d.r * 5 + d.m * 3 + d.p;
  if (Math.abs(balance) > 1) return null;
  const unit: Record<string, [string, string]> = { q: ['queen', 'queens'], r: ['rook', 'rooks'], m: ['piece', 'pieces'], p: ['pawn', 'pawns'] };
  const say = (k: string, n: number): string => (n === 1 ? `a ${unit[k][0]}` : `${numWord(n)} ${unit[k][1]}`);
  const mine = kinds.filter((k) => d[k] > 0).map((k) => say(k, d[k]));
  const theirs = kinds.filter((k) => d[k] < 0).map((k) => say(k, -d[k]));
  const join = (xs: string[]): string => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
  const verdict = balance === 0 ? 'material is level' : balance > 0 ? 'you are a pawn up overall' : 'they are a pawn up overall';
  const text = `${cap(join(mine))} for ${join(theirs)} — ${verdict}.`;
  const sq: string[] = [];
  for (const row of r.c.board()) for (const x of row) {
    if (!x || x.type === 'k') continue;
    const k = x.type === 'n' || x.type === 'b' ? 'm' : x.type;
    if (k !== 'p' && d[k] !== 0) sq.push(x.square);
  }
  const proof: Proof = { kind: 'count', exact: true, short: `A piece is worth three pawns, a rook five, a queen nine`, full: `Counting a piece as three pawns, a rook as five and a queen as nine: ${verdict}`, ...(sq.length ? { squares: sq } : {}) };
  return idea('material-arithmetic', text, sq, proof, `material-arithmetic:${kinds.map((k) => d[k]).join(',')}`);
}

/** The squares a knight on `sq` touches (geometry, not legality). */
export function knightReach(sq: string): string[] {
  const f = sq.charCodeAt(0) - 97; const r = Number(sq[1]) - 1;
  const out: string[] = [];
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const nf = f + df; const nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
  }
  return out;
}

/** A knight is worth its squares: a knight going to the rim (four squares or
 *  fewer, from six or more), or a student's knight coming back to the centre. */
export function knightSquares(fenBefore: string, san: string, student: Side, costCp: number | null): ExchangeIdea | null {
  const r = play(fenBefore, san);
  if (!r || r.m.piece !== 'n') return null;
  const from = knightReach(r.m.from).length;
  const reach = knightReach(r.m.to);
  const to = reach.length;
  const mover = own(r.m.color, student);
  let text: string | null = null;
  if (to <= 4 && from >= 6) {
    // The student's own rim move is taught only when it cost something —
    // never as criticism of a good move.
    if (r.m.color === student && (costCp === null || costCp < 50)) return null;
    text = `On ${r.m.to} ${mover} knight touches only ${numWord(to)} squares; in the centre it would touch eight.`;
  } else if (r.m.color === student && to === 8 && from <= 4) {
    text = `Your knight on ${r.m.to} now touches eight squares, up from ${numWord(from)} on ${r.m.from}.`;
  }
  if (!text) return null;
  text = `${text} A knight is worth the squares it reaches.`;
  const proof = squaresProof(text, [r.m.to, ...reach]);
  if (!proof) return null;
  return idea('knight-squares', text, [r.m.to, ...reach], proof, `knight-squares:${r.m.to}`);
}

/** Don't block the c-pawn in a d-pawn opening: the student's queen's knight
 *  lands in front of its unmoved c-pawn, with both d-pawns locked and no
 *  e-pawn fight — the c-pawn break is the plan the knight now stands on. */
export function cPawnBlock(fenBefore: string, san: string, student: Side, bestSan: string | null): ExchangeIdea | null {
  const r = play(fenBefore, san);
  if (!r || r.m.color !== student || r.m.piece !== 'n' || fullmove(fenBefore) > 10) return null;
  if (bestSan && bestSan === r.m.san) return null; // never argue with the engine's own move
  const w = student === 'w';
  const blockSq = w ? 'c3' : 'c6';
  if (r.m.to !== blockSq) return null;
  const c = r.c;
  const at = (sq: string): { type: string; color: string } | null => c.get(sq as Square) ?? null;
  const ownD = at(w ? 'd4' : 'd5'); const theirD = at(w ? 'd5' : 'd4');
  const cPawn = at(w ? 'c2' : 'c7');
  const ownE4 = at(w ? 'e4' : 'e5');
  if (!ownD || ownD.type !== 'p' || ownD.color !== student) return null;
  if (!theirD || theirD.type !== 'p' || theirD.color === student) return null;
  if (!cPawn || cPawn.type !== 'p' || cPawn.color !== student) return null;
  if (ownE4 && ownE4.type === 'p' && ownE4.color === student) return null;
  const cTarget = w ? 'c4' : 'c5';
  const text = `In a d-pawn opening the knight on ${blockSq} stands in front of your c-pawn — that pawn wants to go to ${cTarget} first and hit their centre.`;
  const sq = [blockSq, w ? 'c2' : 'c7', cTarget, w ? 'd5' : 'd4'];
  const proof = squaresProof(text, sq);
  if (!proof) return null;
  return idea('c-pawn-block', text, sq, proof, 'c-pawn-block');
}

function idea(id: ExchangeIdeaId, text: string, squares: string[], proof: Proof, claim: string): ExchangeIdea {
  return { id, kind: IDEA_KIND[id], text, squares: [...new Set(squares)], proof, claim };
}

// ── THE AGGREGATOR — every surface asks this one function ─────────────────

export interface ExchangeIdeasInput {
  /** The board now. */
  fen: string;
  student: Side;
  /** The engine lines at `fen` (UCI moves, white-POV evaluation). */
  lines: readonly LineIn[];
  /** The student's move just played, with its graded cost (cp, null = ungraded),
   *  the engine's move there (SAN, or null) and the whole game's SANs up to and
   *  including it (null when the surface has no move list). */
  studentMove?: { fenBefore: string; san: string; costCp: number | null; bestSan: string | null; history: readonly string[] | null } | null;
  /** The opponent's move just played. */
  opponentMove?: { fenBefore: string; san: string } | null;
  /** The engine's line from `fen` after the student's move (their reply
   *  first), when the surface holds it — what the played move leads to. */
  continuation?: readonly string[] | null;
  /** May a read name the student's next move here (the door's move advice)? */
  nameMove: boolean;
}

/** Every read that holds on this board, imagery appended where a fact has one.
 *  No cap: the door ranks and the floor sweeps. */
export function exchangeIdeas(input: ExchangeIdeasInput): ExchangeIdea[] {
  const out: ExchangeIdea[] = [];
  const push = (x: ExchangeIdea | null): void => { if (x) out.push(x); };
  const safe = (f: () => ExchangeIdea | null): ExchangeIdea | null => { try { return f(); } catch { return null; } };
  const s = input.student;
  const sm = input.studentMove ?? null;
  if (sm) {
    const { fenBefore: fb, san, costCp } = sm;
    push(safe(() => onlyDevelopedTrade(fb, san, s)));
    push(safe(() => defenderTrade(fb, san, s)));
    push(safe(() => exchangeForAttacker(fb, san, s, costCp)));
    push(safe(() => denyExchange(fb, san, s, costCp)));
    push(safe(() => abandonedDuty(fb, san, s)));
    push(safe(() => tradeChoice(fb, san, s)));
    push(safe(() => maintenanceTrade(fb, san, s, costCp)));
    push(safe(() => prepareRecapture(fb, san, s, costCp)));
    push(safe(() => threatCost(fb, san, s)));
    push(safe(() => safeBecause(fb, san, s, sm.history ? previousOwnMove(sm.history, fb) : null)));
    push(safe(() => materialArithmetic(fb, san, s)));
    push(safe(() => knightSquares(fb, san, s, costCp)));
    push(safe(() => cPawnBlock(fb, san, s, sm.bestSan)));
  }
  const om = input.opponentMove ?? null;
  if (om) {
    push(safe(() => defenderTrade(om.fenBefore, om.san, s)));
    push(safe(() => materialArithmetic(om.fenBefore, om.san, s)));
    push(safe(() => knightSquares(om.fenBefore, om.san, s, null)));
  }
  const c = load(input.fen);
  if (c && c.turn() === s) {
    push(safe(() => dutyParity(input.fen, s)));
    if (input.nameMove) {
      push(safe(() => simplestWin(input.fen, s, input.lines)));
      if (input.lines.length > 0) { const top = input.lines[0]; push(safe(() => wingForCentre(input.fen, top.moves, s))); }
    }
  }
  if (c && c.turn() !== s && input.continuation && input.continuation.length > 0) {
    const line = input.continuation;
    push(safe(() => wingForCentre(input.fen, line, s)));
  }
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.claim) ? false : (seen.add(x.claim), true))).map((x) => {
    const image = imageryFor(x.id, stemKeyOf(`${input.fen}|${x.id}`));
    return image ? { ...x, text: `${x.text} ${image}` } : x;
  });
}
