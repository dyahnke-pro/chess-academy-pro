// THREAT → ANSWER (census T4, David 2026-09-30: "Describing the board is what we
// do not want"). "Watch out — their bishop on g4 pins your knight on f3" names a
// pin and stops; he never does. He names it and says what you do about it: "the
// pin is annoying — h3 asks the question right away", "just take the bishop",
// "the king steps off the diagonal and it's gone".
//
// Question first, answer second, both decided here: the question is a rotated
// stem, the answer is the ENGINE's best move at the position, classified by WHAT
// IT DOES TO THE THREAT — take the attacker, step the target off the line, hit
// the attacker with a pawn, block the line, add a guard — or, when it does none
// of those and the student is not worse, "it can wait". A best move that does
// none of those while the student IS worse gets no answer at all: we cannot say
// what it does, so we say nothing (empty > generic).
//
// A LEAF: chess.js + the SEE helper; the caller hands in the engine's move.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import type { ArrowClaim } from './arrowDoor';
import { legalSeeGainFor } from './positionReadingService';
import { THINK_MARK } from '../utils/thinkPause';

export type ThreatAnswerKind = 'take' | 'step-out' | 'kick' | 'block' | 'guard' | 'wait';

export interface ThreatAnswer {
  kind: ThreatAnswerKind;
  san: string;
  /** Question + answer, e.g. "What do you do about it? Ask the question — h3 hits the bishop at once." */
  text: string;
  arrow: ArrowClaim;
}

/** Student-POV floor for "it can wait" — the same floor as `falseAlarm`. */
export const THREAT_WAIT_FLOOR_CP = -50;

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** Rotated, never rolled: keyed on the ply so a resume says the same thing. */
const STEMS = ['What do you do about it?', 'How do you meet it?', 'So what is the answer?'] as const;

const isSq = (s: string): s is Square => /^[a-h][1-8]$/.test(s);

function between(a: Square, b: Square): Square[] {
  const df = b.charCodeAt(0) - a.charCodeAt(0);
  const dr = Number(b[1]) - Number(a[1]);
  if (!(df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr))) return [];
  const sf = Math.sign(df);
  const sr = Math.sign(dr);
  const out: Square[] = [];
  let f = a.charCodeAt(0) + sf;
  let r = Number(a[1]) + sr;
  while (f !== b.charCodeAt(0) || r !== Number(b[1])) {
    out.push(`${String.fromCharCode(f)}${r}` as Square);
    f += sf;
    r += sr;
  }
  return out;
}

export function threatAnswer(input: {
  /** Student to move. */
  fen: string;
  /** The threat's squares, as the detector gave them (attacker and victims). */
  squares: readonly string[];
  /** Engine best move at `fen`, UCI. */
  bestUci: string | null;
  /** Student-POV centipawns at `fen` after best play, or null when unknown. */
  studentCp: number | null;
  student: Color;
  ply: number;
  /** `line` — a pin, skewer, battery or discovery: the threat runs along a line,
   *  so stepping out of it means leaving the line. `hit` — a piece simply
   *  attacked (hanging, forked): there is no line to leave, only a safe square
   *  to go to. */
  shape: 'line' | 'hit';
}): ThreatAnswer | null {
  const { fen, bestUci, studentCp, student, ply } = input;
  if (!bestUci) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== student) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  const squares = input.squares.filter(isSq);
  const victims = squares.filter((s) => c.get(s)?.color === student);
  // A hit piece's line often names only the victim ("your bishop on e6 is
  // attacked"); whoever attacks it is the board's fact, read here.
  const named = squares.filter((s) => c.get(s)?.color === foe);
  const attackers = named.length > 0 || input.shape === 'line'
    ? named
    : [...new Set(victims.flatMap((v) => c.attackers(v, foe)))];
  if (attackers.length === 0 || victims.length === 0) return null;

  let m: Move;
  try { m = c.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] || undefined }); } catch { return null; }
  const after = c.fen();
  const piece = (sq: Square, fenAt = fen): string => {
    const p = new Chess(fenAt).get(sq);
    return p ? NAME[p.type] : 'piece';
  };
  const safeThere = legalSeeGainFor(after, m.to, foe) <= 0;
  let kind: ThreatAnswerKind | null = null;
  let answer = '';

  if (m.captured && attackers.includes(m.to)) {
    kind = 'take';
    answer = `Take it — ${m.san} removes the ${piece(m.to)} doing it.`;
  } else if (victims.includes(m.from) && safeThere) {
    kind = 'step-out';
    answer = input.shape === 'hit'
      ? `Move it — ${m.san} puts the ${NAME[m.piece]} on ${m.to}, where they can't win it.`
      : m.piece === 'k'
        ? `Step out of it — ${m.san} takes the king off the line.`
        : `Step out of it — ${m.san} takes the ${NAME[m.piece]} off the line.`;
  } else if (m.piece === 'p' && attackers.some((a) => new Chess(after).attackers(a, student).includes(m.to))) {
    const hit = attackers.find((a) => new Chess(after).attackers(a, student).includes(m.to)) as Square;
    kind = 'kick';
    answer = `Ask the question — ${m.san} hits the ${piece(hit)} at once.`;
  } else if (input.shape === 'line' && attackers.some((a) => victims.some((v) => between(a, v).includes(m.to))) && safeThere) {
    kind = 'block';
    answer = `Block it — ${m.san} steps in between.`;
  } else {
    const guarded = victims.find((v) => c.get(v)?.type !== 'k'
      && new Chess(after).attackers(v, student).length > new Chess(fen).attackers(v, student).length);
    if (guarded) {
      kind = 'guard';
      answer = `Guard it — ${m.san} adds a defender to your ${piece(guarded)} on ${guarded}.`;
    } else if (studentCp !== null && studentCp >= THREAT_WAIT_FLOOR_CP && !new Chess(fen).inCheck()) {
      kind = 'wait';
      answer = `It can wait — ${m.san} comes first.`;
    }
  }
  if (!kind) return null;
  return {
    kind,
    san: m.san,
    // Question, a pause to think, then the answer (the Danya pattern).
    text: `${STEMS[ply % STEMS.length]} ${THINK_MARK} ${answer}`,
    arrow: { from: m.from, to: m.to, role: 'play', vouchedBy: 'engine', source: 'threatAnswer' },
  };
}
