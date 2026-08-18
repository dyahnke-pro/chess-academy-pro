/**
 * reasonVoice — speak the reasons a move actually has ON THIS BOARD.
 *
 * This is the runtime half of the multi-reason rule (David 2026-08-17: *"why
 * only pick one if there are multiple reasons to play a certain move. this is
 * the cap that i want removed."*). The authoring half already existed:
 * `reasonCheck` verifies each atomic claim, `check-notes.mjs` runs it over the
 * hand-written corpus. What was missing is the part that reaches a student —
 * `reasonCheck` had ZERO runtime importers, and `emit-notes.mjs` was dropping
 * the `reasons` field on its way into the shipped corpus, so the structure was
 * computed, verified, and then thrown away.
 *
 * WHY THIS IS THE COMPUTED LANE'S JOB. The computed lane fills the ~86% of
 * plies the corpus cannot reach by position. Until now it filled them with
 * generic beats, because a note anchored elsewhere could not be trusted about
 * THIS board. A structured reason can: it names the squares it claims, so code
 * can test it here and speak only what survives. That turns the corpus from
 * something that reaches one exact position into something that reaches every
 * position where its claims are still true — without ever loosening selection,
 * which is the failure mode the note-selection rule exists to prevent.
 *
 * G0 IN ITS PLAINEST FORM. Nothing here consults a model. Which reasons apply
 * is decided by `survivingReasons` against the live FEN; the phrasing is a
 * fixed template over the reason's own squares, read off the real board. A
 * reason that fails is not softened or hedged — it is not spoken.
 *
 * THE MATCH IS THE MOVE, NOT THE OPENING. A reason is attached to the move a
 * note teaches, so it is offered when the student plays that same move, and
 * kept only if it verifies here. Matching more loosely than that (same opening
 * family, similar structure) would be selecting by name again — the exact bug
 * that had a Caro-Kann lesson narrating a bishop on d6 at move two.
 */
import { Chess } from 'chess.js';
import type { PieceSymbol, Square } from 'chess.js';
import { survivingReasons, type Reason } from './reasonCheck';
import teachings from '../data/video-teachings.json';

interface CorpusNote {
  id: string;
  lineSan: string[];
  reasons?: Reason[];
}

const PIECE: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Reasons indexed by the move they were written about, each remembering the
 *  position it was written AT. The anchor matters at speak time: at its own
 *  position a reason is the author's judgement about what mattered there, and
 *  the weakest kind is still teaching. Carried onto a different board it has to
 *  earn the sentence on its own. */
interface IndexedReason { reason: Reason; anchor: string }
const byMove = new Map<string, IndexedReason[]>();
let indexBuilt = false;

/** A move's SAN minus check/mate marks, so `Bb5+` and `Bb5` index together —
 *  whether the move happens to give check depends on the rest of the board, not
 *  on what the move is doing. */
const normSan = (san: string): string => san.replace(/[+#]$/, '');

/** Placement + side + castling + en-passant, the same shape the corpus indexes
 *  by — so a transposition into the note's position still counts as its anchor. */
const posKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

function buildIndex(): void {
  if (indexBuilt) return;
  indexBuilt = true;
  for (const note of (teachings as { notes: CorpusNote[] }).notes) {
    if (!note.reasons?.length || !note.lineSan.length) continue;
    const board = new Chess();
    let legal = true;
    try { for (const san of note.lineSan) board.move(san); } catch { legal = false; }
    if (!legal) continue;
    const anchor = posKey(board.fen());
    const key = normSan(note.lineSan[note.lineSan.length - 1]);
    const bucket = byMove.get(key) ?? [];
    for (const r of note.reasons) bucket.push({ reason: r, anchor });
    byMove.set(key, bucket);
  }
}

/** Two reasons are the same claim if they name the same kind and squares. */
function reasonKey(r: Reason): string {
  switch (r.kind) {
    case 'attacks':
    case 'defends':
    case 'controls':
    case 'traps':
      return `${r.kind}:${r.square}`;
    case 'deprives':
      return `deprives:${r.from}:${r.square}`;
    case 'prevents':
    case 'meets':
      return `${r.kind}:${normSan(r.san)}`;
    case 'blocks':
    case 'opens':
      return `${r.kind}:${r.from}:${r.to}`;
    default:
      return JSON.stringify(r);
  }
}

/**
 * Every reason the corpus attaches to this move that is TRUE on this board.
 *
 * Returns [] on the overwhelming majority of plies, which is correct — the move
 * is not one the hand-written corpus has written reasons for, and inventing one
 * is what this module exists to avoid.
 */
export function reasonsForMove(fenBefore: string, san: string): Reason[] {
  buildIndex();
  const candidates = byMove.get(normSan(san));
  if (!candidates?.length) return [];
  const seen = new Set<string>();
  const out: Reason[] = [];
  for (const r of survivingReasons(fenBefore, san, candidates.map((c) => c.reason))) {
    const key = reasonKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** True when this move reproduces a position some note carrying it was written
 *  at — i.e. we are standing where the author was standing. */
function atOwnAnchor(fenBefore: string, san: string): boolean {
  const board = new Chess(fenBefore);
  try { board.move(san); } catch { return false; }
  const here = posKey(board.fen());
  return (byMove.get(normSan(san)) ?? []).some((c) => c.anchor === here);
}

/** Deterministic variant picker. Same board, same move, same sentence — so a
 *  transcript is reproducible and a test can assert on it — while different
 *  positions get different wording, which is what stops the lane sounding like
 *  a template being filled in. */
function variant(fen: string, san: string, count: number): number {
  let h = 0;
  const key = `${fen}|${san}`;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % count;
}

const pick = (options: readonly string[], fen: string, san: string, salt = ''): string =>
  options[variant(fen + salt, san, options.length)];

/**
 * HAND-WRITTEN PHRASING. David 2026-08-18: *"I want hand written phrases for
 * the computed speech … not rough compete phrase."*
 *
 * The first version composed clauses mechanically — "That hits the pawn on e4
 * and takes d5 under control" — which is legible and reads like a machine
 * filling in a form. Every line below is written out by hand for the shape it
 * covers, including the COMBINED shapes: a pair of reasons gets its own
 * sentence rather than two clauses stapled together with "and".
 *
 * This does not weaken G0 one bit. Code still decides WHICH reasons are true on
 * this board; the table only decides how a surviving reason is said. Nothing
 * here consults a model, and no phrase can assert anything the reason did not
 * already claim — the squares and piece names are read off the live board.
 *
 * Variants exist because the narration rules ask for varied stems on anything
 * spoken often (rule 9), and `attacks` alone is 75 of the 166 claims in the
 * corpus. One wording repeated every third move is how a voice starts sounding
 * automated even when every word is true.
 */

type Named = { square: Square; piece: string };

const SINGLE = {
  attacks: [
    'The {p} on {sq} is the target now.',
    'That comes down on the {p} on {sq}.',
    'Now the {p} on {sq} has to be answered.',
  ],
  check: [
    "That's check — the king has to deal with it first.",
    'Check, so nothing else happens until the king is safe.',
    'The king is in check, and everything else waits.',
  ],
  defends: [
    'The {p} on {sq} is held now.',
    'Nothing wins the {p} on {sq} any more.',
    '{sq} is covered.',
  ],
  controls: [
    '{sq} belongs to you now.',
    'Nothing settles on {sq} any more.',
    'That takes {sq} away.',
  ],
  traps: [
    'The {p} on {sq} has nowhere to go.',
    'The {p} on {sq} is stuck where it stands.',
  ],
  prevents: [
    '{san} is off the table now.',
    'That rules out {san}.',
  ],
  meets: [
    '{san} runs into your cover now.',
    'If {san}, it lands where you are already waiting.',
  ],
  blocks: [
    'The {p} on {from} no longer sees {to}.',
    'That shuts the line to {to}.',
  ],
  opens: [
    'The {p} on {from} has {to} now.',
    'That clears the line from {from} to {to}.',
  ],
  deprives: [
    'The {p} on {from} has lost {sq}.',
    '{sq} is gone for the {p} on {from}.',
  ],
} as const;

const PAIR = {
  'attacks+attacks': [
    'Two targets at once — the {p1} on {s1} and the {p2} on {s2}.',
    'That hits the {p1} on {s1} and the {p2} on {s2}, and one move cannot save both.',
  ],
  'attacks+controls': [
    'That comes down on the {p1} on {s1}, and takes {s2} on the way.',
    'The {p1} on {s1} is the target, and {s2} goes with it.',
  ],
  'attacks+defends': [
    'That hits the {p1} on {s1} and holds {s2} behind it.',
    'The {p1} on {s1} is the target, and nothing is left loose on {s2}.',
  ],
  'defends+defends': [
    'One move holds both {s1} and {s2}.',
    '{s1} and {s2} are both covered now.',
  ],
  'defends+controls': [
    '{s1} is held, and {s2} is taken away too.',
    'That covers {s1} and claims {s2} in the same move.',
  ],
  'controls+controls': [
    '{s1} and {s2} are both taken away.',
    'Nothing settles on {s1} or {s2} now.',
  ],
} as const;

const fill = (template: string, vals: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => vals[k] ?? '');

/** Name whatever the reason points at, reading the live board. Null when the
 *  square is empty — a phrase that would say "the on e4" is not spoken. */
function named(board: Chess, square: Square): Named | null {
  const p = board.get(square);
  return p ? { square, piece: PIECE[p.type] } : null;
}

export interface ReasonLine {
  /** The sentence to speak. */
  spoken: string;
  /** Squares the sentence names — the arrows come from HERE, never from prose. */
  squares: Square[];
  /** Repeat guard key for the caller's said-set. */
  key: string;
}

/**
 * The computed line for a move, built from its surviving reasons.
 *
 * `max` is the caller's register, not a cost control: Watch speaks several, a
 * Learn cue the sharpest one, Review all of them. Defaults to two, which is
 * one sentence a student can hold while the board is still moving.
 *
 * The move's own SAN is deliberately absent from the sentence — the student
 * just watched it land, and restating the board is filler (the narration voice
 * rules). What the picture does not carry is WHY, and that is all this says.
 */
/** Kinds that assert something CONCRETE about this board — a piece hit, a piece
 *  held, a reply removed, a line changed. `controls` is deliberately not one of
 *  them: "takes b4 under control" is true of a3 on almost any board, so alone it
 *  is filler dressed as teaching. Caught by ship-check the moment the corpus
 *  gained an `a3` note — the reason verified TRUE from the bare starting
 *  position, which is exactly when it is worth least. */
const CONCRETE = new Set(['attacks', 'defends', 'traps', 'prevents', 'meets', 'blocks', 'opens', 'deprives']);

export function reasonLineFor(fenBefore: string, san: string, max = 2): ReasonLine | null {
  const reasons = reasonsForMove(fenBefore, san);
  if (!reasons.length) return null;
  // A lone square-control claim is not worth a sentence AWAY FROM HOME. Two of
  // them are, and at the note's own position even one is — the author judged
  // that square worth teaching there. What this stops is the same claim
  // travelling onto an unrelated board, where "b4 belongs to you now" is true
  // of a3 almost everywhere and teaches nobody.
  if (reasons.length < 2
    && !reasons.some((r) => CONCRETE.has(r.kind))
    && !atOwnAnchor(fenBefore, san)) return null;

  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  try { after.move(san); } catch { return null; }

  const spoken = composeSentence(after, before, reasons, fenBefore, san, max);
  if (!spoken) return null;

  const squares: Square[] = [];
  for (const r of reasons.slice(0, max === 99 ? reasons.length : max + 1)) {
    if ('square' in r) squares.push(r.square);
    if ('from' in r) squares.push(r.from);
    if ('to' in r) squares.push(r.to);
  }

  return {
    spoken,
    squares: [...new Set(squares)],
    key: `reason:${reasons.map(reasonKey).join('|')}`,
  };
}

/** One hand-written sentence for the reasons that survived.
 *
 *  PAIRS FIRST, and that ordering is the point. Two reasons of the same kind,
 *  or the attack-plus-square shape the corpus produces constantly, each have
 *  their own written line — so the common cases never fall through to clause
 *  assembly. Only the rarer mixtures compose, and they compose as whole
 *  sentences rather than as clauses joined by "and". */
function composeSentence(
  after: Chess,
  before: Chess,
  reasons: readonly Reason[],
  fen: string,
  san: string,
  max: number,
): string | null {
  // A check is never folded into anything — it outranks every other reason on
  // the board, and burying it in the second half of a sentence is exactly how a
  // student misses it.
  const check = reasons.find((r): r is Reason & { kind: 'attacks'; square: Square } =>
    r.kind === 'attacks' && after.get(r.square)?.type === 'k');
  if (check) return fill(pick(SINGLE.check, fen, san), {});

  const bySquare = (r: Reason): Named | null =>
    'square' in r ? named(r.kind === 'blocks' || r.kind === 'opens' ? before : after, r.square) : null;

  const attacks = reasons.filter((r) => r.kind === 'attacks').map(bySquare).filter((n): n is Named => n !== null);
  const defends = reasons.filter((r) => r.kind === 'defends').map(bySquare).filter((n): n is Named => n !== null);
  const controls = reasons.filter((r): r is Reason & { kind: 'controls'; square: Square } => r.kind === 'controls');

  const pairLine = (key: keyof typeof PAIR, vals: Record<string, string>): string =>
    fill(pick(PAIR[key], fen, san), vals);

  // ── the written pair shapes ──────────────────────────────────────────────
  if (attacks.length >= 2) {
    return pairLine('attacks+attacks', {
      p1: attacks[0].piece, s1: attacks[0].square, p2: attacks[1].piece, s2: attacks[1].square,
    });
  }
  if (defends.length >= 2) {
    return pairLine('defends+defends', { s1: defends[0].square, s2: defends[1].square });
  }
  if (controls.length >= 2) {
    return pairLine('controls+controls', { s1: controls[0].square, s2: controls[1].square });
  }
  if (attacks.length === 1 && controls.length >= 1) {
    return pairLine('attacks+controls', { p1: attacks[0].piece, s1: attacks[0].square, s2: controls[0].square });
  }
  if (attacks.length === 1 && defends.length >= 1) {
    return pairLine('attacks+defends', { p1: attacks[0].piece, s1: attacks[0].square, s2: defends[0].square });
  }
  if (defends.length === 1 && controls.length >= 1) {
    return pairLine('defends+controls', { s1: defends[0].square, s2: controls[0].square });
  }

  // ── singles, and the rarer kinds ─────────────────────────────────────────
  const sentences: string[] = [];
  for (const r of reasons) {
    if (sentences.length >= Math.min(max, 2)) break;
    const line = singleSentence(after, before, r, fen, san);
    if (line && !sentences.includes(line)) sentences.push(line);
  }
  return sentences.length ? sentences.join(' ') : null;
}

function singleSentence(after: Chess, before: Chess, r: Reason, fen: string, san: string): string | null {
  const salt = reasonKey(r);
  switch (r.kind) {
    case 'attacks': {
      const n = named(after, r.square);
      return n ? fill(pick(SINGLE.attacks, fen, san, salt), { p: n.piece, sq: n.square }) : null;
    }
    case 'defends': {
      const n = named(after, r.square);
      return n ? fill(pick(SINGLE.defends, fen, san, salt), { p: n.piece, sq: n.square }) : null;
    }
    case 'controls':
      return fill(pick(SINGLE.controls, fen, san, salt), { sq: r.square });
    case 'traps': {
      const n = named(after, r.square);
      return n ? fill(pick(SINGLE.traps, fen, san, salt), { p: n.piece, sq: n.square }) : null;
    }
    case 'prevents':
      return fill(pick(SINGLE.prevents, fen, san, salt), { san: normSan(r.san) });
    case 'meets':
      return fill(pick(SINGLE.meets, fen, san, salt), { san: normSan(r.san) });
    case 'blocks': {
      const n = named(before, r.from);
      return n ? fill(pick(SINGLE.blocks, fen, san, salt), { p: n.piece, from: r.from, to: r.to }) : null;
    }
    case 'opens': {
      const n = named(after, r.from);
      if (!n) return null;
      // A king or a pawn is not "opened onto" a square — that says nothing a
      // player would recognise, and the corpus does produce it (a queen move
      // clearing the back rank). Name the line instead.
      return n.piece === 'king' || n.piece === 'pawn'
        ? fill(SINGLE.opens[1], { from: r.from, to: r.to })
        : fill(pick(SINGLE.opens, fen, san, salt), { p: n.piece, from: r.from, to: r.to });
    }
    case 'deprives': {
      const n = named(after, r.from);
      return n ? fill(pick(SINGLE.deprives, fen, san, salt), { p: n.piece, from: r.from, sq: r.square }) : null;
    }
    default:
      return null;
  }
}
