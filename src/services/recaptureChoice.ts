// RECAPTURE CHOICE (census #8, 272 of his lines): which piece takes back, and
// why — "dxc6, not bxc6: it opens the bishop's diagonal and the d-file",
// "the knight, not the queen — a queen on d4 gets hit by …c5", "the b-pawn,
// not the d-pawn, which allows a queen trade and costs castling", "toward the
// centre with the f-pawn, opening the f-file".
//
// Pure: for the student's recapture on square S, every legal recapture on S is
// read for the same board facts, and the played one is compared with the
// strongest alternative. Only a DIFFERENCE between the two is spoken.
import { Chess, type Move, type Square } from 'chess.js';
import { rookReachesFile } from './positionalRead';

export interface RecaptureFacts {
  san: string;
  /** Good points of this recapture. */
  plus: string[];
  /** Drawbacks of this recapture, as "would …" clauses ("would double your pawns"). */
  minus: string[];
}

const CENTRE_DIST = (file: string): number => Math.abs(file.charCodeAt(0) - 100.5); // d/e = 0.5
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function pawnsOnFile(c: Chess, file: string, color: 'w' | 'b'): number {
  let n = 0;
  for (let r = 1; r <= 8; r++) { const p = c.get(`${file}${r}` as Square); if (p && p.type === 'p' && p.color === color) n++; }
  return n;
}
function bishopReach(c: Chess, color: 'w' | 'b'): number {
  const probe = new Chess(c.fen().replace(/ [wb] /, ` ${color} `).replace(/ [KQkq-]+ /, ' - ').replace(/ [a-h][36] | - /, ' - '));
  try { return probe.moves({ verbose: true }).filter((m) => m.piece === 'b').length; } catch { return 0; }
}
function isolated(c: Chess, file: string, color: 'w' | 'b'): boolean {
  const f = file.charCodeAt(0);
  const adj = [f - 1, f + 1].filter((x) => x >= 97 && x <= 104).map((x) => String.fromCharCode(x));
  return pawnsOnFile(c, file, color) > 0 && adj.every((a) => pawnsOnFile(c, a, color) === 0);
}
/** Can the opponent hit the square with a pawn or minor next move, safely? */
function hitWithTempo(c: Chess, sq: string, them: 'w' | 'b', skip: string | null): string | null {
  const probe = new Chess(c.fen());
  if (probe.turn() !== them) return null;
  for (const m of probe.moves({ verbose: true })) {
    if (m.piece !== 'p' && m.piece !== 'n' && m.piece !== 'b') continue;
    if (m.captured || m.san === skip) continue;
    probe.move(m);
    const hits = probe.attackers(sq as Square, them).includes(m.to);
    // safe: the moved piece is not simply taken for free
    const safe = !probe.attackers(m.to, them === 'w' ? 'b' : 'w').length || m.piece === 'p';
    probe.undo();
    if (hits && safe) return m.san;
  }
  return null;
}

export function readRecapture(fenBefore: string, m: Move, me: 'w' | 'b', theirReply: string | null = null): RecaptureFacts {
  const plus: string[] = []; const minus: string[] = [];
  const after = new Chess(fenBefore); after.move(m.san);
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  if (m.piece === 'p') {
    const from = m.from[0]; const to = m.to[0];
    // An open file outranks the direction (his gxf6: "the open g-file is worth more here").
    if (pawnsOnFile(after, from, me) === 0 && rookReachesFile(after.fen(), me, from)) {
      plus.push(`it ${pawnsOnFile(after, from, them) ? 'half-opens' : 'opens'} the ${from}-file for your rook`);
    }
    if (CENTRE_DIST(to) < CENTRE_DIST(from)) plus.push('it takes back toward the centre');
    else if (CENTRE_DIST(to) > CENTRE_DIST(from)) minus.push('would take back away from the centre');
    if (pawnsOnFile(after, to, me) >= 2) minus.push(`would double your pawns on the ${to}-file`);
    if (isolated(after, to, me) && !isolated(new Chess(fenBefore), to, me)) minus.push(`would leave an isolated pawn on ${m.to}`);
    const reachGain = bishopReach(after, me) - bishopReach(new Chess(fenBefore), me);
    if (reachGain >= 2) plus.push('it frees your bishop');
  } else {
    if (/^[de][45]$/.test(m.to) && m.piece === 'n') plus.push(`the knight lands in the centre on ${m.to}`);
    // A RECAPTURE THAT JUST LOSES THE PIECE says so first (manual claim check
    // 2026-09-30, item 84: "Qxd4 would put the queen on d4, where …e5 hits
    // it" — Nc6 simply takes it). Taken by something cheaper, or taken with
    // nothing to take back, is the whole reason.
    const takers = after.moves({ verbose: true }).filter((x) => x.to === m.to && x.captured);
    const cheapest = takers.sort((a, b) => (VALUE[a.piece] ?? 99) - (VALUE[b.piece] ?? 99))[0];
    const guarded = after.attackers(m.to, me).length > 0;
    if (cheapest && ((VALUE[cheapest.piece] ?? 99) < (VALUE[m.piece] ?? 0) || !guarded)) {
      minus.push(`would just lose the ${PIECE[m.piece]} to ${cheapest.san}`);
    } else if (m.piece === 'q') {
      // Not the move they actually played: it hit whatever took back (the
      // IMBSR0A9nJs walk: "Qxd4 would be hit by …c5" said after …c5 had just
      // hit the knight on d4 — true of both recaptures, so no reason at all).
      const hit = hitWithTempo(after, m.to, them, theirReply);
      if (hit) minus.push(`would put the queen on ${m.to}, where ${them === 'b' ? '…' : ''}${hit} hits it`);
    }
    const rights = (fenBefore.split(' ')[2] ?? '-');
    if (m.piece === 'k' && (me === 'w' ? /[KQ]/ : /[kq]/).test(rights)) minus.push('would give up castling');
  }
  return { san: m.san, plus, minus };
}

/**
 * The student recaptured with `playedSan` on the square their piece was just
 * taken. When another recapture exists and the two differ on a board fact, a
 * line comparing them — the played one first. `bestSan` is the engine's choice
 * among the recaptures, passed ONLY when the played one costs >= 50cp against
 * it (a near-tie is taste, not a lesson); then the line teaches that one.
 */
export function recaptureChoice(
  fenBefore: string,
  playedSan: string,
  bestSan: string | null,
  /** Their actual answer to the recapture, SAN without dots, when known. */
  theirReply: string | null = null,
): string | null {
  let played: Move; const b = new Chess(fenBefore);
  try { played = b.move(playedSan); } catch { return null; }
  if (!played?.captured || played.promotion) return null;
  const me = played.color;
  const options = new Chess(fenBefore).moves({ verbose: true }).filter((x) => x.to === played.to && x.captured && !x.promotion && x.san !== played.san);
  if (!options.length) return null;
  const reply = theirReply ? theirReply.replace(/^…/, '') : null;
  const mine = readRecapture(fenBefore, played, me, reply);
  const pick = options.find((o) => o.san === bestSan) ?? options[0];
  const other = readRecapture(fenBefore, pick, me, reply);
  const dot = me === 'b' ? '…' : '';
  const P = `${dot}${mine.san}`; const O = `${dot}${other.san}`;
  const what = (x: Move): string => (x.piece === 'p' ? `the ${x.from[0]}-pawn` : `the ${PIECE[x.piece]}`);
  if (bestSan && bestSan === pick.san) {
    // The engine preferred the other recapture — teach that one.
    if (other.plus[0]) return `Better to take back with ${what(pick)} — ${O}: ${other.plus[0]}.`;
    if (mine.minus[0]) return `Better to take back with ${what(pick)} — ${O}; ${P} ${mine.minus[0]}.`;
    return null;
  }
  const good = mine.plus[0]; const bad = other.minus[0];
  if (good && bad) return `${P}, taking back with ${what(played)} — ${good}; ${O} ${bad}.`;
  if (good) return `${P}, taking back with ${what(played)}: ${good}.`;
  if (bad) return `${P}, not ${O}, which ${bad}.`;
  return null;
}
