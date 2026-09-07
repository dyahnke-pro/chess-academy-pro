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

const MAT_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Net material (student − opponent, points) on the board. */
function materialNet(fen: string, studentWB: 'w' | 'b'): number {
  try {
    let net = 0;
    for (const row of new Chess(fen).board()) for (const sq of row) if (sq) net += (sq.color === studentWB ? 1 : -1) * (MAT_VAL[sq.type] ?? 0);
    return net;
  } catch { return 0; }
}
function materialWord(pts: number): string {
  if (pts >= 8) return 'a queen';
  if (pts >= 5) return 'a rook';
  if (pts >= 3) return 'a piece';
  if (pts === 2) return 'the exchange';
  return 'a pawn';
}
/** Signed eval band (student POV): 0 balanced, ±1 touch, ±2 clear, ±3 decisive. */
function evalBand(studentPovCp: number): number {
  const a = Math.abs(studentPovCp);
  const b = a < 50 ? 0 : a < 150 ? 1 : a < 300 ? 2 : 3;
  return studentPovCp < 0 ? -b : b;
}
function evalVerdict(studentPovCp: number): string {
  switch (evalBand(studentPovCp)) {
    case 0: return 'roughly balanced';
    case 1: return "you're a touch better";
    case 2: return "you're clearly better";
    case 3: return "you're winning";
    case -1: return "you're a touch worse";
    case -2: return "you're clearly worse";
    default: return "you're in trouble";
  }
}
/** The board-true imbalances that EXPLAIN the eval sign — material, king safety,
 *  pawn structure — ordered by magnitude, filtered to the eval's side (David
 *  2026-09-07: "why does Stockfish call it balanced / tipping"). */
function evalWhy(fen: string, studentPovCp: number, studentWB: 'w' | 'b'): string[] {
  const oppWB: 'w' | 'b' = studentWB === 'w' ? 'b' : 'w';
  const s = describeStructure(fen);
  const cands: { text: string; mag: number; sign: number }[] = [];
  const net = materialNet(fen, studentWB);
  if (net >= 1) cands.push({ text: `you're up ${materialWord(net)}`, mag: net, sign: 1 });
  else if (net <= -1) cands.push({ text: `you're down ${materialWord(-net)}`, mag: -net, sign: -1 });
  if (s) {
    const kd = s.kings.shieldPawns[studentWB] - s.kings.shieldPawns[oppWB];
    if (kd >= 2) cands.push({ text: 'their king is the more exposed', mag: 1.8, sign: 1 });
    else if (kd <= -2) cands.push({ text: 'your king is the more exposed', mag: 1.8, sign: -1 });
    if (s.pawns.passedPawns[studentWB].length) cands.push({ text: `you have a passed pawn on ${s.pawns.passedPawns[studentWB][0]}`, mag: 1.2, sign: 1 });
    if (s.pawns.passedPawns[oppWB].length) cands.push({ text: `they have a passed pawn on ${s.pawns.passedPawns[oppWB][0]}`, mag: 1.2, sign: -1 });
    if (s.pawns.isolatedPawns[oppWB].length) cands.push({ text: "they're left with an isolated pawn", mag: 0.7, sign: 1 });
    if (s.pawns.isolatedPawns[studentWB].length) cands.push({ text: "you're left with an isolated pawn", mag: 0.7, sign: -1 });
  }
  if (Math.abs(studentPovCp) < 50) {
    // Balanced: the WHY is the TENSION — a plus offset by a minus. A lone
    // one-sided imbalance would contradict "balanced" (other factors must
    // compensate), so say nothing rather than mislead.
    const plus = cands.find((c) => c.sign > 0);
    const minus = cands.find((c) => c.sign < 0);
    if (plus && minus) return [plus.text, minus.text];
    if (cands.length === 0) return ['the material is level and neither king is in danger'];
    return [];
  }
  const sign = studentPovCp > 0 ? 1 : -1;
  const matching = cands.filter((c) => c.sign === sign).sort((a, b) => b.mag - a.mag);
  return matching.length === 0
    ? [sign > 0 ? 'your pieces are the more active' : 'their pieces are the more active']
    : matching.map((c) => c.text).slice(0, 2);
}
/** The eval VERDICT + WHY as a lead sentence. */
function explainEval(fen: string, studentPovCp: number, studentWB: 'w' | 'b'): string {
  const why = evalWhy(fen, studentPovCp, studentWB);
  const verdict = evalVerdict(studentPovCp);
  const V = verdict.charAt(0).toUpperCase() + verdict.slice(1);
  return why.length ? `${V} — ${why.join(', ')}.` : `${V}.`;
}
/** The DELTA — how this move moved the eval (student POV cp swing). Null when it
 *  barely moved (a quiet move keeps its silence rather than "held the balance"
 *  every ply). */
function deltaTailClause(swing: number): string | null {
  if (Math.abs(swing) < 40) return null;
  return swing >= 150 ? 'It swung the game your way.'
    : swing >= 40 ? 'It nudged the balance your way.'
    : swing > -150 ? 'It gave a little ground.'
    : 'It let a real edge slip.';
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
  /** Engine eval AFTER the move, WHITE-POV centipawns. Enables the eval VERDICT
   *  + WHY (the imbalance that explains the number) — David 2026-09-07: "I want
   *  to hear the reasons for the eval… why balanced, why tipping." */
  evalAfterWhiteCp?: number | null;
  /** Engine eval BEFORE the move, WHITE-POV cp. Enables the band-change gate so
   *  the eval verdict is stated when it becomes NEWS, not every quiet ply. */
  evalBeforeWhiteCp?: number | null;
  /** The mover/student side, for POV. Required for the eval verdict + why. */
  studentColorWB?: 'w' | 'b';
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

  // RANK the move-mechanic aspects (the eval swing lifts them when the move
  // mattered) — these become the "You play X, …" clause.
  const swingAbs = Math.abs(input.studentSwingCp ?? 0);
  const lift = swingAbs >= 300 ? 12 : swingAbs >= 150 ? 8 : swingAbs >= 60 ? 4 : 0;
  const rankedMechanics = aspects
    .map((a) => ({ ...a, score: a.weight + (a.keystone ? lift : Math.round(lift / 2)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((a) => a.text);
  const moveClause = rankedMechanics.length ? joinReview(rankedMechanics, moverIsStudent, mv.san) : '';

  // EVAL REASONING — the assessment (WHY the position is what it is) + the DELTA
  // (how THIS move moved it). The most important facts, so they lead / close the
  // package (David 2026-09-07). Gated so a run of quiet, stable moves states the
  // verdict once — on a band change or a real swing — not as a mantra every ply.
  let evalLead = '';
  let deltaTail = '';
  if (input.evalAfterWhiteCp != null && input.studentColorWB) {
    const povAfter = input.studentColorWB === 'w' ? input.evalAfterWhiteCp : -input.evalAfterWhiteCp;
    const povBefore = input.evalBeforeWhiteCp != null
      ? (input.studentColorWB === 'w' ? input.evalBeforeWhiteCp : -input.evalBeforeWhiteCp)
      : null;
    const swing = input.studentSwingCp ?? (povBefore != null ? povAfter - povBefore : 0);
    const bandChanged = povBefore != null && evalBand(povAfter) !== evalBand(povBefore);
    if (bandChanged || Math.abs(swing) >= 40) {
      evalLead = explainEval(fenAfter, povAfter, input.studentColorWB);
      deltaTail = deltaTailClause(swing) ?? '';
    }
  }

  // The criticality "this is the moment" line leads (David 2026-09-07: "say that
  // phrase first"). Then, most-important-first: eval assessment → the move and
  // what it did → the delta verdict. This ORDERED package is what the LLM voices.
  const criticalityLead = input.criticalMoment
    ? (input.register === 'teach' ? 'This is the critical moment.' : 'This was the moment to slow down.')
    : '';
  const composed = [criticalityLead, evalLead, moveClause, deltaTail].filter(Boolean).join(' ');
  return composed.length ? composed : null;
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
