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
const GENERIC_TEACH = /quiet development|ready to join the attack|getting into the game|steps to [a-h][1-8]/i;

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
): { text: string; prev: PrevCaptureContext } {
  let mv: ReturnType<Chess['move']> | null = null;
  let fenAfter = '';
  try {
    const c = new Chess(fenBefore);
    mv = c.move(san);
    fenAfter = c.fen();
  } catch {
    return { text: san, prev: NO_PREV };
  }
  if (!mv) return { text: san, prev: NO_PREV };

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
  if (facts.isMate) return { text: `${mv.san} — checkmate`, prev: nextPrev };

  // Tactical outcome, in the DNA register. A winning capture NAMES the piece
  // it wins (concrete + naturally varied by piece) rather than the flat,
  // repeated "wins material" that was David's complaint. An even trade /
  // recapture (materialGained < 1) says nothing here — the concept clause
  // below carries it, so the line never reads "wins material" on a swap.
  const bits: string[] = [];
  if (mv.captured && facts.materialGained >= 1) bits.push(`winning the ${facts.captured}`);
  if (facts.tacticLanded) bits.push(`landing a ${tacticWord(facts.tacticLanded)}`);
  if (facts.promotion) bits.push(`promoting to a ${facts.promotion}`);
  if (facts.isCheck) bits.push('with check');
  if (facts.outpostGained) bits.push(`planting an outpost on ${facts.outpostGained}`);
  if (facts.newPassedPawns.length > 0) bits.push(`creating a passed pawn on ${facts.newPassedPawns[0]}`);
  if (facts.newOpenFiles.length > 0) bits.push(`opening the ${facts.newOpenFiles[0]}-file`);
  if (facts.shieldLost > 0) bits.push('stripping the king cover');

  // The board-true positional concept — the SAME DNA voice the rest of the
  // walk speaks. buildReviewMoveTeaching never returns null and never
  // restates the move.
  const teach = buildReviewMoveTeaching(fenBefore, san);
  const concept = teach && !GENERIC_TEACH.test(teach) ? toClause(teach) : null;

  // Compose. A quiet move rides its concept alone. A tactical move leads with
  // the outcome; the concept is added only when it brings a DISTINCT idea and
  // the line hasn't already earned two clauses (keeps each move tight).
  if (bits.length === 0) {
    return { text: concept ? `${mv.san}, ${concept}` : mv.san, prev: nextPrev };
  }
  let text = `${mv.san}, ${bits.join(', ')}`;
  if (concept && bits.length <= 1) text += `, ${concept}`;
  return { text, prev: nextPrev };
}

/**
 * Render a projected line as one DNA-register clause: the moves woven with
 * varied connectors, each carrying its computed "why". Verdict is the
 * caller's job (surfaces frame it differently). Empty → ''.
 */
export function narrateDnaLine(
  plies: readonly DnaLinePly[],
  opts: { max?: number } = {},
): string {
  const take = plies.slice(0, opts.max ?? plies.length);
  if (take.length === 0) return '';
  let prev: PrevCaptureContext = NO_PREV;
  const parts: string[] = [];
  for (const p of take) {
    const { text, prev: np } = dnaMoveClause(p.fenBefore, p.san, prev);
    prev = np;
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
