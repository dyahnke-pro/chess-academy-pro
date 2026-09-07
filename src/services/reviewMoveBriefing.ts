/**
 * reviewMoveBriefing — the review walk's per-move narration, computed to TOTAL
 * BOARD AWARENESS and stated most-important-first.
 *
 * David 2026-09-07: "It should say what it threatens, how it changes the
 * position, the ramifications of the move… total board awareness." → "The
 * computer should compute all the facts, order them in level of importance
 * using the PV and delta looking at the eval drop and state all important
 * aspects of each move." → "Make it do that."
 *
 * The old per-move narration was FIRST-BUILDER-WINS: it returned the single
 * first non-null clause (a capture, OR a fork, OR "bears down on the center")
 * and dropped everything else the move did. This computes EVERY aspect of the
 * move — the concrete threat it creates, the tactic it lands, the material it
 * wins, the check, the king cover it prises open, the outpost / passed pawn /
 * open file it makes, the pawn weakness it inflicts OR concedes, the own-king
 * cover it loosens, the positional idea — ranks them by importance (a weight
 * table, lifted by how much the move swung the eval), and states the top few in
 * the review register.
 *
 * G0/G3: every aspect is board-truth from chess.js + the existing detectors
 * (computePlyFacts, detectNewThreat, detectTactics, boardStructure). Nothing is
 * invented; nothing is a point count (David 2026-07-24). Retrospective register
 * (the student's own finished game) with the locked perspective: the student is
 * "you", the opponent "they".
 */
import { Chess } from 'chess.js';
import { computePlyFacts, type PrevCaptureContext } from './pvPlayback';
import { detectNewThreat } from './groundedAnswer';
import { detectTactics } from './tacticsDetector';
import { describeStructure } from './boardStructure';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';

const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

interface Aspect {
  /** Seat-agnostic clause fragment ("winning the knight", "threatening Nxc7 — a fork"). */
  text: string;
  /** Importance 0-100 (most-important-first). */
  weight: number;
  /** A hard load-bearing beat (mate/threat) always leads, even if another aspect
   *  edges it on weight after the eval lift. */
  keystone?: boolean;
}

/** New pawn weaknesses on `side` created between two structures (isolated / doubled
 *  / backward) — the honest, board-true structural delta. */
function newPawnWeakness(before: ReturnType<typeof describeStructure>, after: ReturnType<typeof describeStructure>, side: 'w' | 'b'): string | null {
  if (!before || !after) return null;
  const iso = after.pawns.isolatedPawns[side].filter((s) => !before.pawns.isolatedPawns[side].includes(s));
  if (iso.length) return `an isolated pawn on the ${iso[0][0]}-file`;
  const dbl = after.pawns.doubledFiles[side].filter((f) => !before.pawns.doubledFiles[side].includes(f));
  if (dbl.length) return `doubled pawns on the ${dbl[0]}-file`;
  return null;
}

/** A tactic of one of `types` newly created by the move, whose agent is the
 *  moved piece (landing square first in involvedSquares). For battery / discovery
 *  / overload — the ones computePlyFacts' fork/pin/skewer set doesn't carry. */
function newNamedTactic(fenBefore: string, fenAfter: string, toSquare: string | null, types: string[]): string | null {
  if (!toSquare) return null;
  try {
    const sig = (t: { type: string; involvedSquares: string[] }): string => `${t.type}:${[...t.involvedSquares].sort().join(',')}`;
    const beforeSigs = new Set(detectTactics(fenBefore).tactics.filter((x) => x.type !== 'none').map(sig));
    const landed = detectTactics(fenAfter).tactics
      .filter((x) => types.includes(x.type))
      .filter((x) => !beforeSigs.has(sig(x)))
      .find((x) => x.involvedSquares[0] === toSquare);
    return landed ? landed.type.replace('_', ' ') : null;
  } catch {
    return null;
  }
}

export interface ReviewMoveBriefingInput {
  fenBefore: string;
  san: string;
  /** Recapture context (an even trade never reads as a windfall). */
  prev?: PrevCaptureContext;
  /** true = student's move ("you"), false = opponent's ("they"), undefined = seat-free. */
  moverIsStudent?: boolean;
  /** Student-POV eval swing of THIS move in centipawns (evalAfter − evalBefore,
   *  student perspective). Positive = the move gained, negative = it cost. Lifts
   *  the importance of the move's aspects when the swing is large (David: rank by
   *  the eval drop). Optional — ranking still works from salience alone. */
  studentSwingCp?: number | null;
  /** This position was a CRITICAL decision point (only-move / big gap / a real
   *  swing happened here). When set, the briefing LEADS with the "this was the
   *  moment" criticality line and the computed facts follow (David 2026-09-07:
   *  "slow down this is the moment should also still fire… say that phrase first
   *  then the computed facts"). The caller computes it (criticality scan /
   *  classification / swing). */
  criticalMoment?: boolean;
  /** REGISTER (David 2026-09-07 two-register rule): 'review' is retrospective
   *  ("This was the moment to slow down"); 'teach' is the present-tense in-game
   *  teaching voice ("This is the critical moment"). Only the criticality lead
   *  phrasing changes; the computed facts are identical. Default 'review'. */
  register?: 'review' | 'teach';
}

/**
 * Build the review narration for one move: all its important aspects, ranked,
 * stated most-important-first. Null only when the move genuinely did nothing
 * nameable (kept silent).
 */
export function buildReviewMoveBriefing(input: ReviewMoveBriefingInput): string | null {
  const { fenBefore, san, prev, moverIsStudent } = input;
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

  const moverWB: 'w' | 'b' = mv.color;
  // Locked perspective (David 2026-08-28): the student is "you/your", the
  // opponent "they/their" — never "we/our". These stamp the seat-dependent
  // clauses (own king, own/enemy pawn weakness) to the mover's side.
  const ownPoss = moverIsStudent === false ? 'their' : 'your';
  const enemyPoss = moverIsStudent === false ? 'your' : 'their';
  const enemyObj = moverIsStudent === false ? 'you' : 'them';
  const facts = computePlyFacts(fenBefore, fenAfter, { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion }, prev);
  const toSquare = mv.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?!.*[a-h][1-8])/)?.[1] ?? mv.to;
  const before = describeStructure(fenBefore);
  const after = describeStructure(fenAfter);

  // ── Checkmate ends the game — the one beat, nothing else matters.
  if (facts.isMate) {
    const subj = moverIsStudent === true ? 'You deliver' : moverIsStudent === false ? 'They deliver' : 'This delivers';
    return `${subj} checkmate — the king has no reply. Game over.`;
  }

  const aspects: Aspect[] = [];

  // 1. THE CONCRETE THREAT the move creates — "what it threatens" (David's ask).
  //    Only when the move is not itself a check (the check is its own beat).
  const threat = facts.isCheck ? null : detectNewThreat(fenBefore, fenAfter, moverWB);
  if (threat) {
    const kw = threat.kind === 'mate' ? 96 : 88;
    aspects.push({ text: `threatening ${cleanSan(threat.san)} — ${threat.detail}`, weight: kw, keystone: true });
  }

  // 2. Material won — name the piece (never a bare "wins material").
  if (mv.captured && facts.materialGained >= 1) {
    aspects.push({ text: `winning the ${PIECE_WORD[mv.captured] ?? 'piece'}`, weight: 90, keystone: true });
  }

  // 3. A tactic LANDED (fork / pin / skewer) — when it isn't already the threat.
  if (facts.tacticLanded && !threat) {
    aspects.push({ text: `landing a ${facts.tacticLanded}`, weight: 84, keystone: true });
  }
  // 3b. Battery / discovery / overload the fork/pin/skewer set doesn't carry.
  const namedTactic = newNamedTactic(fenBefore, fenAfter, toSquare, ['battery', 'discovery', 'overload']);
  if (namedTactic) aspects.push({ text: `setting up a ${namedTactic}`, weight: 66 });

  // 4. Check (a beat of its own when not mate/threat-carried).
  if (facts.isCheck) aspects.push({ text: 'checking the king, forcing a reply', weight: 72, keystone: true });

  // 5. Promotion.
  if (facts.promotion) aspects.push({ text: `promoting to a ${facts.promotion}`, weight: 86, keystone: true });

  // 6. Prising open the enemy king's cover (an attacking ramification).
  if (facts.shieldLost > 0) aspects.push({ text: `prising open ${enemyPoss} king's cover`, weight: 68 });

  // 7. Structure the move MAKES for the mover.
  if (facts.outpostGained) aspects.push({ text: `planting an outpost on ${facts.outpostGained} that no pawn can challenge`, weight: 52 });
  if (facts.newPassedPawns.length > 0) aspects.push({ text: `creating a passed pawn on ${facts.newPassedPawns[0]}`, weight: 54 });
  if (facts.newOpenFiles.length > 0) aspects.push({ text: `opening the ${facts.newOpenFiles[0]}-file`, weight: 44 });

  // 8. Structural damage the move INFLICTS on the opponent vs CONCEDES in its own
  //    camp — both are real ramifications; the self-inflicted one is a downside.
  const enemyWeak = newPawnWeakness(before, after, moverWB === 'w' ? 'b' : 'w');
  if (enemyWeak) aspects.push({ text: `leaving ${enemyObj} with ${enemyWeak}`, weight: 50 });
  const ownWeak = newPawnWeakness(before, after, moverWB);
  if (ownWeak) aspects.push({ text: `but conceding ${ownWeak} of ${ownPoss} own`, weight: 47 });

  // 9. Loosening the mover's OWN king cover (a downside worth flagging).
  const ownShieldLoss = before && after ? before.kings.shieldPawns[moverWB] - after.kings.shieldPawns[moverWB] : 0;
  if (ownShieldLoss > 0) aspects.push({ text: `loosening ${ownPoss} own king's cover`, weight: 58 });

  // 10. The positional idea — the quiet fallback so a purely developing move
  //     still teaches (buildReviewMoveTeaching never returns null).
  if (aspects.length === 0 || aspects.every((a) => a.weight < 40)) {
    const concept = buildReviewMoveTeaching(fenBefore, san);
    if (concept) aspects.push({ text: toClause(concept), weight: 25 });
  }

  if (aspects.length === 0) return null;

  // RANK — the eval swing lifts every aspect's weight when the move mattered
  // (David: order by the eval drop). A big swing (either way) makes the move's
  // aspects the loud part of the walk; a quiet move stays low.
  const swing = Math.abs(input.studentSwingCp ?? 0);
  const lift = swing >= 300 ? 12 : swing >= 150 ? 8 : swing >= 60 ? 4 : 0;
  const ranked = aspects
    .map((a) => ({ ...a, score: a.weight + (a.keystone ? lift : Math.round(lift / 2)) }))
    .sort((a, b) => b.score - a.score);

  // State the top aspects (up to 3), most-important-first, in the review register.
  const top = ranked.slice(0, 3).map((a) => a.text);
  const briefing = joinReview(top, moverIsStudent, mv.san);
  // The criticality line LEADS, then the computed facts (David 2026-09-07). In
  // review it's retrospective ("this was the moment"); teach phrases it
  // present-tense ("this is the critical moment").
  if (!input.criticalMoment) return briefing;
  const lead = input.register === 'teach' ? 'This is the critical moment.' : 'This was the moment to slow down.';
  return `${lead} ${briefing}`;
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

/** A full teaching SENTENCE → a lower-cased clause that flows after a subject,
 *  keeping its article ("The knight bears down…" → "the knight bears down…"). */
function toClause(sentence: string): string {
  const s = sentence.trim().replace(/\.$/, '').replace(/^(It|Now)\s+/i, '');
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Join the ranked aspect clauses into one review-register sentence, seat-stamped:
 *  the student is "you", the opponent "they". A seat-free caller gets "The move X". */
function joinReview(clauses: string[], moverIsStudent: boolean | undefined, san: string): string {
  const subject = moverIsStudent === true ? 'You play ' : moverIsStudent === false ? 'They play ' : `${cleanSan(san)}: `;
  // The clauses are gerund/participle fragments ("winning the knight", "opening
  // the c-file") that read as a list after the move; the "but conceding…" clause
  // already carries its own connective.
  const body = clauses.reduce((acc, c, i) => {
    if (i === 0) return c;
    const sep = c.startsWith('but ') ? ', ' : ', ';
    return acc + sep + c;
  }, '');
  const lead = moverIsStudent === undefined ? subject : `${subject}${cleanSan(san)}, `;
  return `${lead}${body}.`;
}
