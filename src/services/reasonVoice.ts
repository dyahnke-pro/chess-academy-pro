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

/** Name whatever stands on a square, reading the board rather than assuming. */
function pieceOn(board: Chess, square: Square): string | null {
  const p = board.get(square);
  return p ? PIECE[p.type] : null;
}

/** Join clauses the way a person speaks a short list. */
function joinClauses(parts: readonly string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/** One reason as a VERB-FIRST clause — no leading "it", so clauses join into
 *  one sentence without "and it … and it …". Null when the board no longer
 *  supports naming it; belt and braces, since a surviving reason should always
 *  be nameable. */
function clauseFor(after: Chess, before: Chess, r: Reason): string | null {
  switch (r.kind) {
    case 'attacks': {
      const p = pieceOn(after, r.square);
      return p ? `hits the ${p} on ${r.square}` : null;
    }
    case 'defends': {
      const p = pieceOn(after, r.square);
      return p ? `covers the ${p} on ${r.square}` : null;
    }
    case 'controls':
      return `takes ${r.square} under control`;
    case 'deprives': {
      const p = pieceOn(after, r.from);
      return p ? `takes ${r.square} away from the ${p} on ${r.from}` : null;
    }
    case 'prevents':
      return `rules out ${normSan(r.san)}`;
    case 'meets':
      return `leaves ${normSan(r.san)} landing on a square you cover`;
    case 'blocks': {
      const p = pieceOn(before, r.from);
      return p ? `shuts the ${p} on ${r.from} off from ${r.to}` : null;
    }
    case 'opens': {
      const p = pieceOn(after, r.from);
      if (!p) return null;
      // A bishop or rook is opened ONTO a square — that is its new line. A king
      // or a pawn is not: "opens the king on e1 onto a1" says nothing a player
      // would recognise, and the corpus does produce it (a queen move clearing
      // the back rank). Name the line instead and the fact survives intact.
      return p === 'king' || p === 'pawn'
        ? `clears the line from ${r.from} to ${r.to}`
        : `opens the ${p} on ${r.from} onto ${r.to}`;
    }
    case 'traps': {
      const p = pieceOn(after, r.square);
      return p ? `leaves the ${p} on ${r.square} with nowhere to go` : null;
    }
    default:
      return null;
  }
}

/** Fold reasons that read as one idea into one clause.
 *
 *  Two shapes came straight out of the corpus and both sounded like a machine:
 *  attacking a piece that is ALSO trapped produced "hits the knight on c3 and
 *  the knight on c3 has nowhere to go", naming the same square twice; and two
 *  `controls` reasons produced "takes c4 under control and takes e4 under
 *  control". A person says "traps the knight on c3" and "takes c4 and e4 under
 *  control", so the merge happens before phrasing rather than being patched out
 *  of the string afterwards. */
function foldReasons(after: Chess, before: Chess, reasons: readonly Reason[]): { text: string; reasons: Reason[] }[] {
  const trapped = new Set(reasons.filter((r) => r.kind === 'traps').map((r) => r.square));
  const controls = reasons.filter((r) => r.kind === 'controls');
  const out: { text: string; reasons: Reason[] }[] = [];
  const emittedControls = { done: false };

  // Same verb, several targets: "hits the pawn on b2 and hits the pawn on e5"
  // is machine phrasing for "hits the pawn on b2 and the pawn on e5".
  const grouped = { attacks: false, defends: false };
  const sameKind = (kind: 'attacks' | 'defends'): (Reason & { square: Square })[] =>
    reasons.filter((o): o is Reason & { kind: typeof kind; square: Square } =>
      o.kind === kind && !(kind === 'attacks' && trapped.has(o.square)));

  for (const r of reasons) {
    // An attack on a piece that is also trapped IS the trap — one clause.
    if (r.kind === 'attacks' && trapped.has(r.square)) continue;
    if (r.kind === 'attacks' || r.kind === 'defends') {
      if (grouped[r.kind]) continue;
      grouped[r.kind] = true;
      const group = sameKind(r.kind);
      const named = group
        .map((g) => ({ g, p: pieceOn(after, g.square) }))
        .filter((x): x is { g: typeof group[number]; p: string } => x.p !== null);
      if (!named.length) continue;
      // ATTACKING A KING IS A CHECK. "hits the king on e8" is not something a
      // chess player says, and the corpus does produce it — `Bxf7+` carries an
      // `attacks` reason on the king's square. Split so the king gets its own
      // verb and the rest still group.
      const kings = named.filter((x) => x.p === 'king');
      const rest = named.filter((x) => x.p !== 'king');
      const verb = r.kind === 'attacks' ? 'hits' : 'covers';
      if (kings.length) {
        out.push({
          text: `checks the king on ${kings[0].g.square}`,
          reasons: kings.map((x) => x.g),
        });
      }
      if (rest.length) {
        out.push({
          text: `${verb} ${joinClauses(rest.map((x) => `the ${x.p} on ${x.g.square}`))}`,
          reasons: rest.map((x) => x.g),
        });
      }
      continue;
    }
    if (r.kind === 'traps') {
      const p = pieceOn(after, r.square);
      if (!p) continue;
      const alsoHit = reasons.some((o) => o.kind === 'attacks' && o.square === r.square);
      out.push({
        text: alsoHit ? `traps the ${p} on ${r.square}` : `leaves the ${p} on ${r.square} with nowhere to go`,
        reasons: [r],
      });
      continue;
    }
    if (r.kind === 'controls') {
      if (emittedControls.done) continue;
      emittedControls.done = true;
      const squares = controls.map((c) => (c as { square: Square }).square);
      out.push({
        text: `takes ${joinClauses(squares)} under control`,
        reasons: controls,
      });
      continue;
    }
    const text = clauseFor(after, before, r);
    if (text) out.push({ text, reasons: [r] });
  }
  return out;
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
  // them are ("takes c4 and e4 under control" says something about the centre
  // one does not), and at the note's own position even one is — the author
  // judged that square worth teaching there. What this stops is the same claim
  // travelling onto an unrelated board, where "takes b4 under control" is true
  // of a3 almost everywhere and teaches nobody.
  if (reasons.length < 2
    && !reasons.some((r) => CONCRETE.has(r.kind))
    && !atOwnAnchor(fenBefore, san)) return null;

  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  try { after.move(san); } catch { return null; }

  const folded = foldReasons(after, before, reasons).slice(0, max);
  if (!folded.length) return null;

  const squares: Square[] = [];
  for (const r of folded.flatMap((f) => f.reasons)) {
    if ('square' in r) squares.push(r.square);
    if ('from' in r) squares.push(r.from);
    if ('to' in r) squares.push(r.to);
  }

  return {
    spoken: `That ${joinClauses(folded.map((f) => f.text))}.`,
    squares: [...new Set(squares)],
    key: `reason:${folded.flatMap((f) => f.reasons).map(reasonKey).join('|')}`,
  };
}
