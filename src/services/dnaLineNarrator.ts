/**
 * dnaLineNarrator — the ONE deterministic DNA-register renderer for a
 * projected LINE of moves, shared by every surface that talks out a future
 * sequence (post-game review projections, Learn/Play engine deltas).
 *
 * David 2026-09-07: the review's future-sequence lines "only say wins
 * material" and don't follow the same standard as everything else; make ALL
 * narrations — review, learn, play — run through the COMPUTER and the DNA
 * register, NOT the LLM. So this writes the DNA register in code: it reads
 * like the warm pass with zero model in the loop (the purest G0).
 *
 * The register is the SAME one `buildReviewMoveTeaching` already speaks (the
 * board-true per-move "why"). The only thing this adds is the TACTICAL
 * outcome of a move woven into that same voice: a winning capture NAMES the
 * piece won ("winning the knight") instead of a bare, repeated "wins
 * material"; a tactic, check, mate, outpost, passed pawn or opened file joins
 * the concept clause as flowing prose — never the robotic `SAN (…, wins
 * material), then …` template that shipped when the review's warm pass was
 * structurally rejected on a multi-FEN projection line.
 *
 * G0/G3: every clause is computed from chess.js + the existing board-truth
 * computers (`computePlyFacts`, `buildReviewMoveTeaching`). Nothing is
 * invented; nothing is a point count (David 2026-07-24 — "we don't need to
 * call out how many points were gained"). Robust to an empty/invalid FEN (a
 * caller holding only a raw PV still gets the SAN) so it never throws on the
 * live path.
 */
import { Chess } from 'chess.js';
import { computePlyFacts, tacticWord, type PrevCaptureContext } from './pvPlayback';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { tacticInvariant } from './conceptEngine';

const PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** A move + the position it is played FROM. `narrateDnaLine` walks these in
 *  order, threading recapture context so an even trade never reads as a
 *  windfall. */
export interface DnaLinePly {
  fenBefore: string;
  san: string;
}

/** Teach tags that are too generic to add after a tactical clause — they read
 *  as filler when repeated down a line (2026-07-25 hand-audit: the same
 *  "quiet development" glued to four moves). The universal teacher's
 *  last-resort forms fall here. */
const GENERIC_TEACH = /quiet development|ready to join the attack|getting into the game|joining the game|steps to [a-h][1-8]/i;

const NO_PREV: PrevCaptureContext = { square: null, capturedValue: 0 };

/** Strip a full teaching SENTENCE into a lower-cased clause that flows after a
 *  move ("The knight bears down on d4…" → "the knight bears down on d4…"). */
function toClause(sentence: string): string {
  let s = sentence.trim().replace(/\.$/, '');
  s = s.replace(/^(The|A|An|It|Now)\s+/i, (m) => (/^the$/i.test(m.trim()) ? 'the ' : ''));
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * One ply of a projected line, in the DNA register. Returns the clause text
 * (SAN-led — the TTS sanitizer spells the SAN out at speak time) plus the
 * recapture context to thread into the next call.
 */
export function dnaMoveClause(
  fenBefore: string,
  san: string,
  prev: PrevCaptureContext = NO_PREV,
  /** Concept clauses the line ALREADY spoke — the same idea is said once per
   *  line ("forces the king to react" on every check read as a stuck record
   *  in the 2026-09-14 prod audit). */
  spoken: ReadonlySet<string> | null = null,
): { text: string; prev: PrevCaptureContext; tacticLanded: string | null; concept: string | null } {
  let mv: ReturnType<Chess['move']> | null = null;
  let fenAfter = '';
  try {
    const c = new Chess(fenBefore);
    mv = c.move(san);
    fenAfter = c.fen();
  } catch {
    return { text: san, prev: NO_PREV, tacticLanded: null, concept: null };
  }
  if (!mv) return { text: san, prev: NO_PREV, tacticLanded: null, concept: null };

  const nextPrev: PrevCaptureContext = mv.captured
    ? { square: mv.to, capturedValue: PTS[mv.captured] ?? 0 }
    : NO_PREV;

  const facts = computePlyFacts(
    fenBefore,
    fenAfter,
    { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion },
    prev,
  );

  // Mate ends the line — nothing else matters.
  if (facts.isMate) return { text: `${mv.san} — checkmate`, prev: nextPrev, tacticLanded: null, concept: null };

  // Tactical outcome, in the DNA register. A winning capture NAMES the piece
  // it wins (concrete + naturally varied by piece) rather than the flat,
  // repeated "wins material" that was David's complaint. An even trade /
  // recapture (materialGained < 1) says nothing here — the concept clause
  // below carries it, so the line never reads "wins material" on a swap.
  const bits: string[] = [];
  if (mv.captured && facts.materialGained >= 1) bits.push(`winning the ${facts.captured}`);
  if (facts.tacticLanded) bits.push(`landing a ${tacticWord(facts.tacticLanded)}`);
  if (facts.promotion) bits.push(`promoting to a ${facts.promotion}`);
  // NOT "with check" — the SAN's "+" is spelled out as "check" by the TTS
  // sanitizer at speak time, so adding it here doubled it ("…to b5, check, with
  // check…"), and the check concept clause below tripled it (David 2026-09-14).
  // The SAN carries the check; the concept clause carries WHY it matters.
  if (facts.outpostGained) bits.push(`planting an outpost on ${facts.outpostGained}`);
  if (facts.newPassedPawns.length > 0) bits.push(`creating a passed pawn on ${facts.newPassedPawns[0]}`);
  if (facts.newOpenFiles.length > 0) bits.push(`opening the ${facts.newOpenFiles[0]}-file`);
  if (facts.shieldLost > 0) bits.push('stripping the king cover');

  // The board-true positional concept — the SAME DNA voice the rest of the
  // walk speaks. buildReviewMoveTeaching never returns null and never
  // restates the move.
  const teach = buildReviewMoveTeaching(fenBefore, san);
  const rawConcept = teach && !GENERIC_TEACH.test(teach) ? toClause(teach) : null;
  // An idea the line already said → say it once. The move still gets its
  // tactical bits; only the repeated concept clause is dropped.
  const concept = rawConcept && spoken?.has(rawConcept) ? null : rawConcept;

  // Compose. A quiet move rides its concept alone. A tactical move leads with
  // the outcome; the concept is added only when it brings a DISTINCT idea and
  // the line hasn't already earned two clauses (keeps each move tight).
  if (bits.length === 0) {
    return { text: concept ? `${mv.san}, ${concept}` : mv.san, prev: nextPrev, tacticLanded: facts.tacticLanded, concept: rawConcept };
  }
  let text = `${mv.san}, ${bits.join(', ')}`;
  if (concept && bits.length <= 1) text += `, ${concept}`;
  return { text, prev: nextPrev, tacticLanded: facts.tacticLanded, concept: rawConcept };
}

/** Sentence form of a tactic invariant ("A fork hits two targets…"). */
function invariantSentence(full: string): string {
  const s = full.charAt(0).toUpperCase() + full.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

/**
 * The FIRST landed tactic in an already-computed line (a PvLine's plies carry
 * their PlyFacts) and the computed WHY behind it — spoken once per line, at
 * the ply it lands on. The review's better-line walk and the shot-sequence
 * playback consume this so a line that "lands a fork" also TEACHES the fork
 * (David 2026-09-14: the coach speaks the concept during gameplay, not just
 * the move). Null when no ply lands a tactic the engine has a register for.
 */
export function firstTacticInvariant(
  plies: ReadonlyArray<{ facts: { tacticLanded: string | null } }>,
): { index: number; type: string; sentence: string } | null {
  for (let i = 0; i < plies.length; i++) {
    const type = plies[i].facts.tacticLanded;
    if (!type) continue;
    const inv = tacticInvariant(type);
    if (inv) return { index: i, type, sentence: invariantSentence(inv.full) };
  }
  return null;
}

/**
 * The computed CONCEPT behind a single move that lands a tactic — the tactic
 * named plus its invariant, as one sentence for a surface that narrates ply
 * by ply from raw FEN + SAN (the opening walkthrough's PASS 1). Null when the
 * move lands nothing. Same computers as `dnaMoveClause` (computePlyFacts →
 * tacticInvariant); nothing here is decided by the model.
 */
export function landedTacticTeaching(fenBefore: string, san: string): { type: string; text: string } | null {
  let mv: ReturnType<Chess['move']> | null = null;
  let fenAfter = '';
  try {
    const c = new Chess(fenBefore);
    mv = c.move(san);
    fenAfter = c.fen();
  } catch {
    return null;
  }
  if (!mv) return null;
  const facts = computePlyFacts(
    fenBefore,
    fenAfter,
    { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion },
    NO_PREV,
  );
  if (facts.isMate || !facts.tacticLanded) return null;
  const inv = tacticInvariant(facts.tacticLanded);
  if (!inv) return null;
  return { type: facts.tacticLanded, text: `This lands a ${tacticWord(facts.tacticLanded)}: ${inv.full}` };
}

/**
 * Render a projected line as one DNA-register clause: the moves woven with
 * varied connectors, each carrying its computed "why". Verdict is the
 * caller's job (surfaces frame it differently). Empty → ''.
 */
export function narrateDnaLine(
  plies: readonly DnaLinePly[],
  opts: {
    max?: number;
    /** TEACH the first landed tactic's invariant (why the pattern works), once
     *  per line — the computed concept spoken where it lands (David 2026-09-14:
     *  the coach teaches the concept during gameplay, not just names the move).
     *  Opt-in so a caller that already appends the idea (puzzleConceptExplanation)
     *  never double-teaches. */
    teachInvariant?: boolean;
  } = {},
): string {
  const take = plies.slice(0, opts.max ?? plies.length);
  if (take.length === 0) return '';
  let prev: PrevCaptureContext = NO_PREV;
  const parts: string[] = [];
  let taught = false;
  const spoken = new Set<string>();
  for (const p of take) {
    const { text, prev: np, tacticLanded, concept } = dnaMoveClause(p.fenBefore, p.san, prev, spoken);
    prev = np;
    if (concept) spoken.add(concept);
    if (opts.teachInvariant && !taught && tacticLanded) {
      const inv = tacticInvariant(tacticLanded);
      // Mid-line clause: drop the register's terminal period so the comma-join
      // never reads "…falls., then Kd8".
      if (inv) { parts.push(`${text} — ${inv.full.replace(/\.$/, '')}`); taught = true; continue; }
    }
    parts.push(text);
  }
  // Mostly comma-joined (reads like a coach talking), with an occasional
  // "then" so a long line has a beat — never "then" between every move (the
  // old template's monotony). First transition gets the "then"; the rest flow.
  if (parts.length === 1) return parts[0];
  return parts.reduce((acc, part, i) => {
    if (i === 0) return part;
    const connector = i === 1 ? ', then ' : ', ';
    return acc + connector + part;
  }, '');
}
