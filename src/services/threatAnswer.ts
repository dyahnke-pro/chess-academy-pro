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
import { captureRead, legalSeeGainFor } from './positionReadingService';
import { askThenAnswer } from '../utils/thinkPause';

export type ThreatAnswerKind = 'take' | 'step-out' | 'with-gain' | 'kick' | 'block' | 'guard' | 'wait';

export interface ThreatAnswer {
  kind: ThreatAnswerKind;
  san: string;
  /** Question + answer, e.g. "What do you do about it? Ask the question — h3 hits the bishop at once." */
  text: string;
  /** Drawn only when the move is named — a held answer draws nothing, or the
   *  arrow would name the move the words held back. */
  arrow: ArrowClaim | null;
}

/** Student-POV floor for "it can wait" — the same floor as `falseAlarm`. */
export const THREAT_WAIT_FLOOR_CP = -50;

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** What the found answer did, said after the move. */
const FOUND: Record<ThreatAnswerKind, string> = {
  take: 'took the piece doing it',
  'with-gain': 'moved it with gain',
  'step-out': 'took it out of danger',
  kick: 'hit the attacker at once',
  block: 'blocked it',
  guard: 'added the defender',
  wait: 'was the stronger move — the threat could wait',
};

/** Rotated, never rolled: keyed on the ply so a resume says the same thing. */
const STEMS = ['What do you do about it?', 'How do you meet it?', 'How do you deal with it?'] as const;

const isSq = (s: string): s is Square => /^[a-h][1-8]$/.test(s);

/** Does the piece on `a` attack along the line to `b` — a rook on a rank or
 *  file, a bishop on a diagonal, a queen on either. A pawn or knight named in
 *  the threat (the piece that would move to uncover it) runs no line. */
function lineFrom(c: Chess, a: Square, b: Square): boolean {
  const df = b.charCodeAt(0) - a.charCodeAt(0);
  const dr = Number(b[1]) - Number(a[1]);
  if (df === 0 && dr === 0) return false;
  const straight = df === 0 || dr === 0;
  const diagonal = Math.abs(df) === Math.abs(dr);
  const t = c.get(a)?.type;
  return (t === 'q' && (straight || diagonal)) || (t === 'r' && straight) || (t === 'b' && diagonal);
}

/** Is a line threat on the board NOW: some attacker sees a victim along an
 *  open line, or the only pieces between are theirs and one of them can step
 *  off the line on their next move (a discovery they can play). With no
 *  line piece aimed at a victim it cannot be judged here and counts as live. */
function lineIsLive(c: Chess, attackers: readonly Square[], victims: readonly Square[], foe: Color): boolean {
  const pairs = attackers.flatMap((a) => victims.filter((v) => lineFrom(c, a, v)).map((v) => [a, v] as const));
  if (pairs.length === 0) return true;
  let theirs: Chess | null = null;
  try {
    const parts = c.fen().split(' ');
    parts[1] = foe; parts[3] = '-';
    theirs = new Chess(parts.join(' '));
  } catch { theirs = null; }
  const next = theirs;
  return pairs.some(([a, v]) => {
    const path = between(a, v);
    const blockers = path.filter((sq) => c.get(sq));
    if (blockers.length === 0) return true;
    // Through THEIR piece only, and only one: with two of theirs on the line,
    // moving one cannot open it (review 2026-10-19).
    if (!next || blockers.length !== 1 || c.get(blockers[0])?.color !== foe) return false;
    const onLine = new Set<string>([...path, a]);
    return blockers.some((sq) => next.moves({ square: sq, verbose: true }).some((mv) => !onLine.has(mv.to)));
  });
}

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
  /** REQUIRED. Learn free play names no move unasked (David 2026-10-10): the
   *  answer says what KIND of move meets the threat, and the move waits for
   *  the ask (hard-question walk 2026-10-11: "It can wait — Nf3 comes first"
   *  named the student's move unasked). */
  namesMove: boolean;
}): ThreatAnswer | null {
  const { fen, bestUci, studentCp, student, ply } = input;
  if (!bestUci) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== student) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  const squares = input.squares.filter(isSq);
  // A VICTIM IS A PIECE THE ATTACKER REALLY HITS. For a hit, a square of
  // ours the detector listed but nothing of theirs attacks is not under threat
  // ("Move it with gain — Rxb6" moved the c6 rook while the c8 rook was the one
  // hit, Learn walk 2026-10-02). A line threat keeps its x-rayed back piece.
  const victims0 = squares.filter((s) => c.get(s)?.color === student);
  const victims = input.shape === 'hit' ? victims0.filter((v) => c.attackers(v, foe).length > 0) : victims0;
  // A hit piece's line often names only the victim ("your bishop on e6 is
  // attacked"); whoever attacks it is the board's fact, read here.
  const named = squares.filter((s) => c.get(s)?.color === foe);
  const attackers = named.length > 0 || input.shape === 'line'
    ? named
    : [...new Set(victims.flatMap((v) => c.attackers(v, foe)))];
  if (attackers.length === 0 || victims.length === 0) return null;
  // A LINE THREAT MUST BE ON THE BOARD NOW (Smith-Morra replay 2026-10-19).
  // "No rush yet — if you play e5 and they answer dxe5, … reveals their queen
  // on d8 attacking your queen on d1" is a threat that needs a move of yours
  // first; answering it with "Step out of it — take the queen off the line"
  // told the student to dodge a line that is shut. The answer to a
  // hypothetical is not to play into it, which the warning already says.
  if (input.shape === 'line' && !lineIsLive(c, attackers, victims, foe)) return null;

  let m: Move;
  try { m = c.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] || undefined }); } catch { return null; }
  const after = c.fen();
  const piece = (sq: Square, fenAt = fen): string => {
    const p = new Chess(fenAt).get(sq);
    return p ? NAME[p.type] : 'piece';
  };
  const safeThere = captureRead(after, m.to, foe) === 0;
  let kind: ThreatAnswerKind | null = null;
  let answer = '';

  if (m.captured && attackers.includes(m.to)) {
    kind = 'take';
    answer = `Take it — ${m.san} removes the ${piece(m.to)} doing it.`;
  } else if (victims.includes(m.from) && (m.captured || new Chess(after).inCheck())) {
    // THE ATTACKED PIECE LEAVES WITH GAIN — a capture or a check (walk
    // 2026-09-30: "Guard it — Rxe7+ adds a defender to your rook on d7" was
    // the rook itself leaving with check).
    kind = 'with-gain';
    answer = m.captured
      // The action first, the move last — "Bxf3 takes the knight" is spoken
      // "bishop takes f3 takes the knight" (run B walk 2026-09-30).
      ? `Move it with gain — take their ${NAME[m.captured]}${new Chess(after).inCheck() ? ' with check' : ''}: ${m.san}.`
      : `Move it with gain — give check: ${m.san}.`;
  } else if (victims.includes(m.from) && safeThere) {
    kind = 'step-out';
    answer = input.shape === 'hit'
      ? `Move it — ${m.san} puts the ${NAME[m.piece]} on ${m.to}, where they can't win it.`
      : m.piece === 'k'
        // The piece leads, the move follows: "Qh4 takes your queen out of
        // it" is spoken as a capture ("queen to h4 takes your queen").
        ? `Step off the line — your king steps out of it with ${m.san}.`
        : `Step off the line — your ${NAME[m.piece]} on ${m.from} steps out of it with ${m.san}.`;
  } else if (m.piece === 'p' && attackers.some((a) => new Chess(after).attackers(a, student).includes(m.to))) {
    const hit = attackers.find((a) => new Chess(after).attackers(a, student).includes(m.to)) as Square;
    kind = 'kick';
    answer = `Ask the question — ${m.san} hits the ${piece(hit)} at once.`;
  } else if (!victims.includes(m.from) && input.shape === 'line' && attackers.some((a) => victims.some((v) => between(a, v).includes(m.to))) && safeThere) {
    kind = 'block';
    answer = `Block it — ${m.san} steps in between.`;
  } else {
    const guarded = victims.includes(m.from) ? undefined : victims.find((v) => c.get(v)?.type !== 'k'
      && new Chess(after).attackers(v, student).length > new Chess(fen).attackers(v, student).length);
    // A CHECK OR A CAPTURE ELSEWHERE comes first — that is the answer, not the
    // defender it happens to leave behind (merged walk 2026-09-30: "Guard it —
    // after Nxf3+ your bishop on c5 defends it").
    const forcing = !!m.captured || new Chess(after).inCheck();
    if (guarded && !forcing) {
      kind = 'guard';
      // NAME THE DEFENDER (walk 2026-09-30: "Nb2 adds a defender to your pawn
      // on a3" — the knight left, and the rook on a8 behind it did the work).
      const newDef = new Chess(after).attackers(guarded, student)
        .find((sq) => !new Chess(fen).attackers(guarded, student).includes(sq));
      answer = newDef && newDef !== m.to
        ? `Guard it — after ${m.san} your ${piece(newDef, after)} on ${newDef} defends it.`
        : `Guard it — ${m.san} adds a defender to your ${piece(guarded)} on ${guarded}.`;
    } else if (studentCp !== null && studentCp >= THREAT_WAIT_FLOOR_CP && !new Chess(fen).inCheck()
      // A move that rescues a piece en prise is the ANSWER to a threat, never
      // "it can wait" (Learn walk 2026-10-02: "It can wait — Qd2 comes first"
      // with Qd2 moving the queen Rxb2 was about to take).
      && legalSeeGainFor(fen, m.from, foe) <= 0) {
      kind = 'wait';
      answer = `It can wait — ${m.san} comes first.`;
    }
  }
  if (!kind) return null;
  if (!input.namesMove) {
    const held = heldAnswer(kind, m, input.shape, piece, fen, student);
    if (!held) return null;
    answer = held;
  }
  return {
    kind,
    san: m.san,
    // Question, a pause to think, then the answer (the Danya pattern).
    // After the student's move: the engine's answer found is credited; any
    // other move is the verdict's and the threat lanes' to judge — the answer
    // is never said as a present-tense instruction on a board that is gone.
    text: askThenAnswer(STEMS[ply % STEMS.length], answer, (pm) => {
      if (pm.fenBefore.split(' ').slice(0, 2).join(' ') !== fen.split(' ').slice(0, 2).join(' ')) return null;
      return pm.san.replace(/[+#]/g, '') === m.san.replace(/[+#]/g, '') ? `You found it — ${m.san} ${FOUND[kind]}.` : null;
    }),
    arrow: input.namesMove ? { from: m.from, to: m.to, role: 'play', vouchedBy: 'engine', source: 'threatAnswer' } : null,
  };
}

/** The answer with the move held: what kind of move meets the threat, in the
 *  same order as the named answer, never the move itself. */
function heldAnswer(kind: ThreatAnswerKind, m: Move, shape: 'line' | 'hit', piece: (sq: Square) => string, fen: string, student: Color): string | null {
  switch (kind) {
    case 'take': {
      // "TAKE IT" WITH ONE CAPTURE ON THE BOARD IS THE MOVE (Black walk
      // 2026-10-19, ply 31: "Take it — one capture removes the bishop doing
      // it", next move hxg3; ply 85 the same before Kxh5). With several, "take
      // it" sent the student to the obvious one — and the next turn said "Why
      // not Qxb4? … Bxf2+ refutes it". Only the engine's capture is vouched,
      // and it cannot be named here, so: one capture → nothing; several → which
      // one matters, never that any will do.
      let takers = 0;
      try { takers = new Chess(fen).moves({ verbose: true }).filter((x) => x.to === m.to && !!x.captured && x.color === student).length; } catch { return null; }
      if (takers <= 1) return null;
      return `Take it — but with the right piece: check what each capture of the ${piece(m.to)} allows before you choose.`;
    }
    case 'with-gain': return m.captured
      ? 'Move it with gain — the attacked piece has a capture of its own.'
      : 'Move it with gain — the attacked piece can go with check.';
    case 'step-out': return shape === 'hit'
      ? `Move it — your ${NAME[m.piece]} has a square where they can't win it.`
      // Named, never "it" with nothing before it to point at.
      : m.piece === 'k'
        ? 'Step off the line — your king has a square out of it.'
        : `Step off the line — your ${NAME[m.piece]} on ${m.from} has a square out of it.`;
    case 'kick': return 'Ask the question — a pawn move hits the attacker at once.';
    case 'block': return 'Block it — a piece of yours can step in between.';
    case 'guard': return 'Guard it — one move adds a defender.';
    // THE HELD "WAIT" SAYS WHAT KIND OF MOVE COMES FIRST (OS-1 g2 ply 18:
    // "It can wait — something stronger comes first." named nothing). A
    // forcing move is said by its kind; a quiet one has no kind the student
    // can look for, and "not urgent yet" already rode on the threat line, so
    // the answer stays silent rather than say nothing out loud.
    case 'wait': {
      const after = new Chess(fen);
      try { after.move(m.san); } catch { return null; }
      if (after.isCheckmate()) return null;
      if (after.inCheck()) return 'It can wait — a check of yours comes first.';
      if (m.captured) return `It can wait — you have a capture that comes first: their ${NAME[m.captured]} is there to take.`;
      return null;
    }
  }
}
