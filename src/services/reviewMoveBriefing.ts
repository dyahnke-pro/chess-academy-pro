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
import { introWithGerund, introWithPredicate, type IntroTense } from '../utils/moveIntro';
import { evalBand, evalBandWords } from './evalBand';
import { openSentence, continueSentence } from '../utils/openSentence';
import { settledLeadFor, type LastMove } from './material';
import { Chess } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { actsFromItsSquare, exchangeEnd } from './material';
import { gainHoldsInLine, materialDeficit, netPieceWords, GAIN_HOLDS_PLIES, NO_FOLLOW, type FollowLines } from './exchangeLedger';
import { boardEdgeWords } from '../utils/countWords';
import { computePlyFacts, structureDelta, tacticWord, type PrevCaptureContext } from './pvPlayback';
import { takeBackAhead } from './captureRun';
// The previous-move context is part of this input's contract, so it travels
// with it: a caller builds `prev` without reaching for a second computer.
export { prevCaptureOf, NO_PREV_CAPTURE } from './pvPlayback';
import { detectNewThreat } from './groundedAnswer';
import { detectTactics } from './tacticsDetector';
import { describeStructure, newPawnWeaknesses, type NewPawnWeakness } from './boardStructure';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { shieldLoss } from './kingSafety';
import { gainedBishopPair } from './bishopPair';
import { lossBeyondBestAlternative } from './voluntaryLoss';
import { deepFact, theirTarget, binding, moveHit } from './threeFacts';
import { pieceRoute } from './pieceRoute';
import type { PhraseMemory } from '../utils/phraseMemory';
import { createStoryStore, storyLedger, type SaidSet, type StoryStore } from './gameStory';
import { withArticle } from '../utils/andList';
import { afterCaptureSan } from '../utils/captureWords';
import type { IdeaKind } from './ideaKind';

/** The piece a SAN names by its first letter (a pawn move names none). */
const SAN_PIECE: Record<string, string> = { N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

/** WHICH ASPECT IT IS — one kind per aspect `moveAspects` reads, named by the
 *  computer that reads it, so the one fact shape knows a fact's kind from its
 *  producer, never from its words (WO-STORY-MATRIX-01 P1-3, `coachFact.ts`). */
export type AspectKind =
  | 'aspect-threat' | 'aspect-wins' | 'aspect-trade' | 'aspect-least-loss' | 'aspect-tactic-lands'
  | 'aspect-tactic-set-up' | 'aspect-check' | 'aspect-promotes' | 'aspect-opens-king' | 'aspect-outpost'
  | 'aspect-passer' | 'aspect-passer-handed' | 'aspect-opens-file' | 'aspect-their-weakness'
  | 'aspect-own-weakness' | 'aspect-own-king-cover';

export interface Aspect {
  /** Which aspect it is (REQUIRED: a new aspect fails to compile until named). */
  kind: AspectKind;
  /** Seat-agnostic clause fragment ("winning the knight", "threatening Nxc7 — a fork"). */
  text: string;
  /** The same fact led by a verb, for a line of its own ("trades the bishop for the knight") —
   *  two renderings of one computed fact (the one composer speaks this). */
  verb: string;
  /** Which idea it is (ONE vocabulary, `ideaKind.ts`). */
  idea: IdeaKind;
  /** The squares it is about beyond the move itself. */
  squares: string[];
  /** Importance 0-100 (most-important-first). */
  weight: number;
  /** A hard load-bearing beat (mate/threat) always leads, even if another aspect
   *  edges it on weight after the eval lift. */
  keystone?: boolean;
  /** THE LONG HORIZON, said after the verb (S-LONG-HORIZON, round 4): what the
   *  change means for the rest of the game (", and a pawn never moves back").
   *  A fixed phrase, so a lesson or a game says it at most twice
   *  (`moveThoughtFacts`, the WHY rule). */
  horizon?: string;
  /** Says only what the board already shows — the capture or the check, with
   *  no consequence of its own (the quiet-move rule, WO-DECIDER-02). On a
   *  quiet move a line made of these alone is not said. */
  restates?: boolean;
}

/** Did the move UNCOVER an attack: does a piece of the mover's other than the
 *  one that moved attack an enemy piece now that it did not attack before? */
function unveilsAttack(fenBefore: string, fenAfter: string, mv: { to: string; color: 'w' | 'b' }): boolean {
  try {
    const before = new Chess(fenBefore);
    const after = new Chess(fenAfter);
    for (const cell of after.board().flat()) {
      if (!cell || cell.color === mv.color) continue;
      const was = new Set<string>(before.attackers(cell.square, mv.color));
      if (after.attackers(cell.square, mv.color).some((s) => s !== mv.to && !was.has(s))) return true;
    }
    return false;
  } catch { return false; }
}

/** New pawn weaknesses on `side` created between two structures (isolated / doubled
 *  / backward) — the honest, board-true structural delta. */
function newPawnWeakness(
  before: ReturnType<typeof describeStructure>, after: ReturnType<typeof describeStructure>, side: 'w' | 'b',
  /** The boards a few moves down each line the surface knows follows: a
   *  weakness a line undoes is not one the move conceded (…dxc4 "concedes
   *  doubled pawns on the c-file" in a line that plays Bxc4 three moves on). */
  later: ReadonlyArray<ReturnType<typeof describeStructure>>,
): string | null {
  if (!before || !after) return null;
  const stands = (w: NewPawnWeakness): boolean => later.every((l) => !l || (w.kind === 'doubled'
    ? l.pawns.doubledFiles[side].includes(w.file)
    : l.pawns.isolatedPawns[side].some((s) => s[0] === w.file)));
  const w = newPawnWeaknesses(before.pawns, after.pawns, side).find(stands);
  if (!w) return null;
  return w.kind === 'isolated' ? `an isolated pawn on the ${w.file}-file` : `doubled pawns on the ${w.file}-file`;
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

/** Net material (student − opponent, points), with the exchange the last
 *  capture started played out — a recapture midpoint is not "up a piece". */
function materialNet(fen: string, studentWB: 'w' | 'b', lastMove: LastMove | null): number {
  try { return settledLeadFor(fen, studentWB, lastMove); } catch { return 0; }
}
/** Signed eval band (student POV): 0 balanced, ±1 touch, ±2 clear, ±3 decisive. */
/** The band WITH its side: +slightly and −slightly are different standings. */
const signedBand = (cp: number): string => `${evalBand(cp)}${evalBand(cp) === 'level' ? '' : cp > 0 ? '+' : '-'}`;

function evalVerdict(studentPovCp: number): string {
  // The one ladder (evalBand, census 2026-10-10); review's own words.
  const band = evalBand(studentPovCp);
  if (band === 'level') return 'roughly balanced';
  return `you're ${evalBandWords(band, studentPovCp > 0 ? 'better' : 'worse')}`;
}
/** The board-true imbalances that EXPLAIN the eval sign — material, king safety,
 *  pawn structure — ordered by magnitude, filtered to the eval's side (David
 *  2026-09-07: "why does Stockfish call it balanced / tipping"). */
function evalWhy(fen: string, studentPovCp: number, studentWB: 'w' | 'b', lastMove: LastMove | null): string[] {
  const oppWB: 'w' | 'b' = studentWB === 'w' ? 'b' : 'w';
  const s = describeStructure(fen);
  const cands: { text: string; mag: number; sign: number }[] = [];
  const net = materialNet(fen, studentWB, lastMove);
  if (net >= 1) cands.push({ text: `you're up ${boardEdgeWords(fen, studentWB, net)}`, mag: net, sign: 1 });
  else if (net <= -1) cands.push({ text: `you're down ${boardEdgeWords(fen, oppWB, -net)}`, mag: -net, sign: -1 });
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
function explainEval(fen: string, studentPovCp: number, studentWB: 'w' | 'b', lastMove: LastMove | null): string {
  const why = evalWhy(fen, studentPovCp, studentWB, lastMove);
  const verdict = evalVerdict(studentPovCp);
  const V = openSentence(verdict);
  return why.length ? `${V} — ${why.join(', ')}.` : `${V}.`;
}
/** THE POSITION'S STANDING, SAID WHEN IT MOVED: the verdict and the board's
 *  reason for it, on a band change or a real swing (≥ 40cp) — never as a
 *  mantra every ply. One producer for Review's briefing and the lesson
 *  composer (WO-OPENINGS-REWRITE-01: the writers said it on 15% of beats the
 *  lesson composer never had it for). Null when the standing did not move. */
export function evalReading(fenAfter: string, povBeforeCp: number | null, povAfterCp: number, swingCp: number | null, studentWB: 'w' | 'b', lastMove: LastMove | null): string | null {
  const swing = swingCp ?? (povBeforeCp != null ? povAfterCp - povBeforeCp : 0);
  const bandChanged = povBeforeCp != null && signedBand(povAfterCp) !== signedBand(povBeforeCp);
  if (!bandChanged && Math.abs(swing) < 40) return null;
  return explainEval(fenAfter, povAfterCp, studentWB, lastMove);
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

interface ReviewMoveBriefingInput {
  fenBefore: string;
  san: string;
  /** Recapture context (an even trade never reads as a windfall). REQUIRED:
   *  three lesson builders left it out, so every baked lesson read the
   *  recapture Nxe3 as "winning the bishop" (census group 6, 2026-10-07).
   *  `prevCaptureOf` builds it; NO_PREV_CAPTURE for a first move. */
  prev: PrevCaptureContext;
  /** THE LESSON'S PHRASE MEMORY (`phraseMemory`) — REQUIRED, null for a
   *  one-off read: a lesson that never shares one says "fighting for the
   *  center" on every developing move (150 times over 25 lessons). */
  phrases: PhraseMemory | null;
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
  /** WHAT FOLLOWS THIS MOVE — the other side's reply, then the mover's next
   *  move, … (the game's own continuation in Review, the taught line in a
   *  lesson). REQUIRED, null where there is none: the deep fact (what this
   *  move made possible) is read down it (WO-DECIDER-02, the three facts). */
  line: readonly string[] | null;
  /** The other side's move just before this one, with its own board.
   *  REQUIRED, null at the start: what it aimed at is the second fact. */
  theirLast: { fenBefore: string; san: string } | null;
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

/** The cheapest legal capture on `sq` for the side to move, as SAN ("…Nxb4"
 *  for Black), or null. */
function cheapestCaptureOn(fen: string, sq: string): string | null {
  try {
    const c = new Chess(fen);
    const takes = c.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
    if (takes.length === 0) return null;
    takes.sort((a, b) => (MATERIAL_VALUE[a.piece] ?? 0) - (MATERIAL_VALUE[b.piece] ?? 0));
    return `${takes[0].color === 'b' ? '…' : ''}${takes[0].san}`;
  } catch { return null; }
}

/** THE CAPTURE THAT COMES NEXT on `sq`, named — or `'choice'` when two pieces
 *  of the same worth can make it: which one takes is theirs to decide, so it
 *  is not named (task 172: "it keeps the trade going, with …Bxe5 next" where
 *  the game went …Nxe5). */
function nextCaptureOn(fen: string, sq: string): { san: string } | 'choice' | null {
  try {
    const takes = new Chess(fen).moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
    takes.sort((a, b) => (MATERIAL_VALUE[a.piece] ?? 0) - (MATERIAL_VALUE[b.piece] ?? 0));
    if (takes.length > 1 && (MATERIAL_VALUE[takes[1].piece] ?? 0) === (MATERIAL_VALUE[takes[0].piece] ?? 0)) return 'choice';
  } catch { return null; }
  const san = cheapestCaptureOn(fen, sq);
  return san ? { san } : null;
}

/** Any legal capture on `sq` for the side to move — "nothing can take back"
 *  is said only when this is false. */
function takenBackOn(fen: string, sq: string): boolean {
  return cheapestCaptureOn(fen, sq) !== null;
}

/** The trade a capture starts on its square: their cheapest take-back and the
 *  mover's cheapest answer to it — or null when either is missing. */
function exchangeOn(fenAfter: string, sq: string): { reply: string; again: string } | null {
  try {
    const c = new Chess(fenAfter);
    const takes = c.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
    if (takes.length === 0) return null;
    takes.sort((a, b) => (MATERIAL_VALUE[a.piece] ?? 0) - (MATERIAL_VALUE[b.piece] ?? 0));
    const reply = takes[0];
    c.move(reply.san);
    const again = cheapestCaptureOn(c.fen(), sq);
    return again ? { reply: `${reply.color === 'b' ? '…' : ''}${reply.san}`, again } : null;
  } catch { return null; }
}

/**
 * Build the review narration for one move: all its important aspects, ranked,
 * stated most-important-first. Null only when the move genuinely did nothing
 * nameable (kept silent).
 */
/**
 * WHAT A MOVE DOES ON THE BOARD, as separate facts (WO-ONE-COACH-01): the
 * threat it makes, the material it wins or trades, the tactic it lands, the
 * check, the promotion, the king cover it prises open, the structure it makes
 * or concedes. One computer for both the review briefing (which joins them
 * after the move) and the one composer (which speaks each as a line of the
 * move's thought). Null when the move is illegal.
 */
export function moveAspects(input: {
  fenBefore: string; san: string; prev: PrevCaptureContext; moverIsStudent?: boolean;
  /** REQUIRED: every line the surface knows comes after the move (the
   *  engine's line after it, the taught line), SAN, the reply first —
   *  `NO_FOLLOW` where it knows none. A gain a line gives straight back is not
   *  a gain (task 172). */
  follow: FollowLines;
}): { mate: boolean; aspects: Aspect[]; threat: ReturnType<typeof detectNewThreat> } | null {
  const { fenBefore, san, prev, moverIsStudent, follow } = input;
  let mv: ReturnType<Chess['move']> | null = null;
  let fenAfter = '';
  try {
    const c = new Chess(fenBefore);
    mv = c.move(san);
    fenAfter = c.fen();
  } catch {
    return null;
  }
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
  if (facts.isMate) return { mate: true, aspects: [], threat: null };
  const aspects: Aspect[] = [];

  // 1. THE CONCRETE THREAT the move creates — "what it threatens" (David's ask).
  //    Only when the move is not itself a check (the check is its own beat).
  const threat = facts.isCheck ? null : detectNewThreat(fenBefore, fenAfter, moverWB);
  if (threat) {
    const kw = threat.kind === 'mate' ? 96 : 88;
    aspects.push({ kind: 'aspect-threat', text: `threatening ${cleanSan(threat.san)} — ${threat.detail}`, verb: `threatens ${cleanSan(threat.san)} — ${threat.detail}`, idea: threat.kind === 'mate' ? 'mate' : 'threat', squares: [threatSquare(threat.san)].filter((x): x is string => !!x), weight: kw, keystone: true });
  }

  const recapture = !!mv.captured && prev.square === mv.to && prev.capturedValue > 0;
  // THE ONE READ OF THE EXCHANGE THIS MOVE STARTS OR GOES ON WITH (task 172):
  // the take-backs the legal count says will come, the board when they are
  // over, and what the mover nets by then. Everything below that counts
  // material or reads structure is said of THAT board, never of the one that
  // lasts a single move. An exchange is started by a CAPTURE: a quiet move is
  // read on the board it leaves, as it always was ("f4 opens the f-file" is
  // not said of a pawn push because the count has …Qxf4 taking it).
  const end = mv.captured ? exchangeEnd(fenBefore, san) : null;
  const dots = (s: string, i: number): string => ((i % 2 === 0) === (moverWB === 'w') ? `…${s}` : s);

  // 2. Material won — the count of it (never a bare "wins material"). Every
  //    clause here follows the move's SAN, which already says the capture
  //    ("Qxd8" is spoken "queen takes d 8"), so it says what the capture leads
  //    to and never the capture again — "Qxd8 — it wins the queen" was "queen
  //    takes d8, takes the queen" (David 2026-10-30; `captureWords`). When it
  //    is won only through the trade on the square (they can take back, and
  //    taking back loses it again), the trade is said: "cxb4, winning a pawn —
  //    if axb4, …Nxb4" (2026-10-28).
  if (mv.captured && facts.materialGained >= 1 && gainHoldsInLine(fenBefore, san, follow, moverWB, end?.net ?? facts.materialGained)) {
    // The take-backs that WILL come (each side profits by its own) are the
    // exchange; a take-back that only loses more is shown as the two captures
    // that prove it ("Nxd5 wins a pawn — if Nxd5, …Bxd5").
    const seq = recapture ? [] : end?.sans ?? [];
    const back = recapture || seq.length > 0 ? null : exchangeOn(fenAfter, mv.to);
    const free = seq.length === 0 && !back && !takenBackOn(fenAfter, mv.to);
    // Ahead, but the take-back costs the capturer (no answer to it on the
    // square): the exchange — "winning a rook for a knight", never "winning a
    // rook" (`captureWords`).
    const gave = !free && !back && !recapture ? facts.gaveBack : null;
    // MATERIAL THE MOVER WAS BEHIND BY IS WON BACK, never "won" (the gambit
    // pawn of the Queen's Gambit: "Bxc4 wins a pawn, and nothing can take
    // back" two moves after …dxc4).
    const regains = !recapture && materialDeficit(fenBefore, moverWB) >= facts.materialGained;
    // A longer exchange is named by what it NETS, piece for piece, by the one
    // ledger namer ("Nxc6 wins a knight — if …bxc6, Bxc6+" was a knight for a
    // knight and a pawn: it wins a pawn).
    const netWords = seq.length >= 2 && end ? netPieceWords(end.moverTook, end.otherTook) : null;
    const tail = seq.length === 2 ? ` — if ${dots(seq[0], 0)}, ${dots(seq[1], 1)}` : seq.length > 2 ? ` once the trade on ${mv.to} is over` : back ? ` — if ${back.reply}, ${back.again}` : '';
    // A TAKE-BACK THAT COMES OUT AHEAD wins the run's net, never the piece
    // it takes (Scotch Göring …Nxe5 Nxe5 dxe5: "dxe5 wins a knight, and
    // nothing can take back" — the knight was the other half of a trade, and
    // the pawn is what Black is up). One wording with the move's reason
    // (`captureRun.takeBackAhead`).
    const ahead = recapture ? takeBackAhead(prev, mv, { net: facts.materialGained, fenAfter, final: !takenBackOn(fenAfter, mv.to) }) : null;
    const lead = (form: 'verb' | 'participle'): string => {
      if (ahead) return afterCaptureSan(ahead, form);
      if (regains && (free || netWords === null) && !gave) return afterCaptureSan({ kind: 'wins-back', captured: mv.captured as string }, form);
      if (netWords) return `${form === 'verb' ? 'wins' : 'winning'} ${netWords}${regains ? ' back' : ''}`;
      return afterCaptureSan({ kind: 'nets' as const, captured: mv.captured as string, free, gave }, form);
    };
    aspects.push({
      kind: 'aspect-wins',
      text: `${lead('participle')}${tail}`,
      verb: `${lead('verb')}${tail}`,
      idea: 'win-material', squares: [mv.to], weight: 90, keystone: true,
    });
  }

  // 2b. A capture that wins nothing is a TRADE or a TAKE-BACK, and says so —
  //     with no words of its own it fell through to "the bishop rakes toward
  //     c5, d4, f2" on Bxe3 (census group 6, 2026-10-07). A take-back that
  //     walks into a second capture says so (axb4 after cxb4: …Nxb4 is next).
  if (mv.captured && facts.materialGained <= 0 && (facts.materialGained > -1 || recapture)) {
    const again = recapture && facts.materialGained < 0 ? nextCaptureOn(fenAfter, mv.to) : null;
    const leadsTo = recapture
      ? again === 'choice' ? { kind: 'trade-goes-on' as const } : { kind: 'take-back' as const, next: again?.san ?? null }
      : { kind: 'trade' as const, piece: mv.piece, captured: mv.captured };
    const text = afterCaptureSan(leadsTo, 'participle');
    const verb = afterCaptureSan(leadsTo, 'verb');
    // A take-back that walks into a second capture says a consequence; so
    // does one that wins the bishop pair (Danya's take-backs, measured
    // 2026-10-28: "you recapture with the b-pawn … for the bishop pair"). A
    // plain trade or take-back only restates the capture.
    const pair = !again && gainedBishopPair(fenBefore, san);
    aspects.push({ kind: 'aspect-trade', text: pair ? `${text} and winning the bishop pair` : text, verb: pair ? `${verb} and wins the bishop pair` : verb, idea: recapture ? 'recapture' : 'trade', squares: [mv.to], weight: 60, keystone: true, restates: !again && !pair });
  }

  // 2c. A capture that LOSES material and is not a take-back: when every
  //     other move loses more (a check that also hit the queen, a piece pinned
  //     to the king), it is the least loss and says so — it fell through to the
  //     squares the doomed queen "covers" (review depth eval 2026-10-28, …Qxe5
  //     after Be5+). A loss the mover CHOSE is graded elsewhere (a sacrifice,
  //     or the costly move's own reason), never here.
  if (mv.captured && facts.materialGained <= -1 && !recapture && (lossBeyondBestAlternative(fenBefore, san) ?? 1) < 1) {
    const gives = { kind: 'gives-up' as const, piece: mv.piece, captured: mv.captured };
    aspects.push({ kind: 'aspect-least-loss', text: `${afterCaptureSan(gives, 'participle')} — every other move loses more`, verb: `${afterCaptureSan(gives, 'verb')} — every other move loses more`, idea: 'trade', squares: [mv.to], weight: 80, keystone: true });
  }

  // 3. A tactic LANDED (fork / pin / skewer) — when it isn't already the threat.
  // A TACTIC IS LANDED BY A PIECE THAT STAYS TO MAKE IT (task 172: "Bxf6
  // lands a pin" with …gxf6 taking the bishop next move). The one exchange
  // read says whether the moved piece is still on its square when the
  // take-backs are over.
  const agentStays = !end || actsFromItsSquare(end);
  // …AND A DISCOVERED ATTACK IS LANDED ONLY WHEN THE MOVE UNCOVERED ONE (task
  // 172: "Nxc6 lands a discovered attack" — the knight had stepped in FRONT of
  // its bishop; "d4 lands a discovered attack" with nothing new attacked). The
  // playback's `discovery` is also the board scan's discovery IN WAITING (a
  // piece that could move and unveil), which the set-up aspect says.
  const uncovered = facts.tacticLanded !== 'discovery' || unveilsAttack(fenBefore, fenAfter, mv);
  if (facts.tacticLanded && !threat && agentStays && uncovered) {
    aspects.push({ kind: 'aspect-tactic-lands', text: `landing ${withArticle(tacticWord(facts.tacticLanded))}`, verb: `lands ${withArticle(tacticWord(facts.tacticLanded))}`, idea: 'tactic', squares: [], weight: 84, keystone: true });
  }
  // 3b. Battery / discovery / overload the fork/pin/skewer set doesn't carry.
  const namedTactic = newNamedTactic(fenBefore, fenAfter, toSquare, ['battery', 'discovery', 'overload']);
  if (namedTactic) aspects.push({ kind: 'aspect-tactic-set-up', text: `setting up ${withArticle(namedTactic)}`, verb: `sets up ${withArticle(namedTactic)}`, idea: 'tactic', squares: [], weight: 66 });

  // 4. Check (a beat of its own when not mate/threat-carried).
  if (facts.isCheck) aspects.push({ kind: 'aspect-check', text: 'checking the king, forcing a reply', verb: 'checks the king, forcing a reply', idea: 'check', squares: [], weight: 72, keystone: true, restates: true });

  // 5. Promotion.
  if (facts.promotion) aspects.push({ kind: 'aspect-promotes', text: `promoting to ${withArticle(facts.promotion)}`, verb: `promotes to ${withArticle(facts.promotion)}`, idea: 'promote', squares: [mv.to], weight: 86, keystone: true });

  // 6. Prising open the enemy king's cover (an attacking ramification).
  if (facts.shieldLost > 0) aspects.push({ kind: 'aspect-opens-king', text: `prising open ${enemyPoss} king's cover`, verb: `prises open ${enemyPoss} king's cover`, idea: 'attack-king', squares: [], weight: 68 });

  // NOT IN THE MIDDLE OF AN EXCHANGE (Danya bench reading, 2026-10-30; task
  // 172, 2026-11-11): a move whose piece the other side takes back leaves a
  // board that lasts one move — "cxd4 concedes doubled pawns" (White takes
  // back on d4), "axb5 leaves them an isolated a-pawn" (…axb5 is coming),
  // "bxa6 creates a passed pawn on a6" (…Bxa6 takes it). Every structure read
  // below — the outpost, the passer made or handed over, the file opened, the
  // weakness inflicted or conceded — is said when the exchange is over: on
  // the last capture of it, of the board that stays.
  const midExchange = !!end && (end.sans.length > 0 || !end.standing);
  // WHAT THE EXCHANGE LEAVES is still the move's doing: the file …Qxd5 leaves
  // open after exd5, the passer that stands when the take-backs are done. So
  // the files, passers and outposts are read on the board the exchange ENDS
  // on — the same read (`structureDelta`), a later board — and are silent only
  // when that board is not a standing one. The pawn weaknesses below stay
  // silent until the last capture: whose pawns are doubled is the take-back's
  // fact to state, not the first capture's.
  const settled = !end || end.sans.length === 0
    ? { newOpenFiles: facts.newOpenFiles, newPassedPawns: facts.newPassedPawns, passedPawnsHanded: facts.passedPawnsHanded, outpost: facts.outpostGained, outpostPiece: facts.outpostPiece, outpostLanded: facts.outpostLanded }
    : (() => {
      const d = structureDelta(before, describeStructure(end.fen), moverWB, !!mv.promotion);
      // WHEN A SIDE HAD A CHOICE OF CAPTURER the end board is one of several
      // (…Bxe4 met by dxe4 or Nxe4: only one of them opens the d-file), so a
      // claim is kept only when the board the move leaves shows it too.
      const also = <T,>(xs: readonly T[], now: readonly T[]): T[] => (end.forced ? [...xs] : xs.filter((x) => now.includes(x)));
      const post = d.outpost && (end.forced || d.outpost.square === facts.outpostGained) ? d.outpost : undefined;
      return { newOpenFiles: also(d.newOpenFiles, facts.newOpenFiles), newPassedPawns: also(d.newPassedPawns, facts.newPassedPawns), passedPawnsHanded: also(d.passedPawnsHanded, facts.passedPawnsHanded), outpost: post?.square ?? null, outpostPiece: post ? (post.piece === 'n' ? 'knight' : 'bishop') : undefined, outpostLanded: post ? post.square === mv.to && end.pieceStays : undefined };
    })();
  const structureStands = !end || end.standing;

  // 7. Structure the move MAKES for the mover.
  if (settled.outpost && structureStands) aspects.push({ kind: 'aspect-outpost', text: settled.outpostPiece && settled.outpostLanded === false
    ? `making ${settled.outpost} an outpost for the ${settled.outpostPiece} that no pawn can challenge`
    : `planting an outpost on ${settled.outpost} that no pawn can challenge`, verb: settled.outpostPiece && settled.outpostLanded === false
    ? `makes ${settled.outpost} an outpost for the ${settled.outpostPiece} that no pawn can challenge`
    : `plants an outpost on ${settled.outpost} that no pawn can challenge`, idea: 'outpost', squares: [settled.outpost], weight: 52 });
  if (settled.newPassedPawns.length > 0 && structureStands) aspects.push({ kind: 'aspect-passer', text: `creating a passed pawn on ${settled.newPassedPawns[0]}`, verb: `creates a passed pawn on ${settled.newPassedPawns[0]}`, idea: 'passed-pawn', squares: [settled.newPassedPawns[0]], weight: 54 });
  if (settled.passedPawnsHanded.length > 0 && structureStands) aspects.push({ kind: 'aspect-passer-handed', text: `handing ${moverIsStudent === undefined ? 'the other side' : enemyObj} a passed pawn on ${settled.passedPawnsHanded[0]}`, verb: `hands ${moverIsStudent === undefined ? 'the other side' : enemyObj} a passed pawn on ${settled.passedPawnsHanded[0]}`, idea: 'weakness', squares: [settled.passedPawnsHanded[0]], weight: 54 });
  // Said as a move's own fact, the file it opens is a road for the rooks long
  // after this move (S-LONG-HORIZON, round 4: his "we get the g-file" is about
  // the play to come).
  if (settled.newOpenFiles.length > 0 && structureStands) aspects.push({ kind: 'aspect-opens-file', text: `opening the ${settled.newOpenFiles[0]}-file`, verb: `opens the ${settled.newOpenFiles[0]}-file`, horizon: ', a road for the rooks from now on', idea: 'file', squares: [], weight: 44 });

  // 8. Structural damage the move INFLICTS on the opponent vs CONCEDES in its own
  //    camp — both are real ramifications; the self-inflicted one is a downside.
  // …and still there a few moves down every line the surface knows follows.
  const later = midExchange ? [] : follow.map((line) => {
    try { const c = new Chess(fenAfter); for (const s of line.slice(0, GAIN_HOLDS_PLIES)) c.move(s); return describeStructure(c.fen()); } catch { return null; }
  });
  const enemyWeak = midExchange ? null : newPawnWeakness(before, after, moverWB === 'w' ? 'b' : 'w', later);
  if (enemyWeak) aspects.push({ kind: 'aspect-their-weakness', text: `leaving ${enemyObj} with ${enemyWeak}`, verb: `leaves ${enemyObj} with ${enemyWeak}`, idea: 'weakness', squares: [], weight: 50 });
  const ownWeak = midExchange ? null : newPawnWeakness(before, after, moverWB, later);
  if (ownWeak) aspects.push({ kind: 'aspect-own-weakness', text: `but conceding ${ownWeak} of ${ownPoss} own`, verb: `concedes ${ownWeak} of ${ownPoss} own`, idea: 'weakness', squares: [], weight: 47 });

  // 9. Loosening the mover's OWN king cover (a downside worth flagging).
  const ownShieldLoss = shieldLoss(fenBefore, fenAfter, moverWB);
  // A pawn never moves back, so the cover it leaves is loosened for the rest
  // of the game (S-LONG-HORIZON, round 4).
  if (ownShieldLoss > 0) aspects.push({ kind: 'aspect-own-king-cover', text: `loosening ${ownPoss} own king's cover`, verb: `loosens ${ownPoss} own king's cover`, horizon: ', and a pawn never moves back', idea: 'king-safety', squares: [], weight: 58 });
  return { mate: false, aspects, threat };
}

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

  // The briefing is Review's: the line it holds is the game's own moves, which
  // a later slip of either side changes — the board alone decides here.
  const read = moveAspects({ fenBefore, san, prev, moverIsStudent, follow: NO_FOLLOW });
  if (!read) return null;
  // ── Checkmate ends the game — the one beat, nothing else matters.
  if (read.mate) {
    const subj = moverIsStudent === true ? 'You deliver' : moverIsStudent === false ? 'They deliver' : 'This delivers';
    return `${subj} checkmate — the king has no reply. Game over.`;
  }
  // The briefing's own additions below (the deep fact, the trip, the
  // positional fallback) are not aspects `moveAspects` reads, so they carry
  // no aspect kind.
  const aspects: Array<Omit<Aspect, 'kind'>> = [...read.aspects];
  const threat = read.threat;

  // 9b. THE DEEP FACT (the three facts, WO-DECIDER-02): what this move made
  //     possible down the line — "making room for your bishop on g7, where it
  //     hits their rook on a1 once their b4 opens the diagonal". Same length,
  //     more profound: it outweighs the positional fallback below, which then
  //     stays silent.
  const deep = moverIsStudent === undefined ? null : deepFact(fenBefore, san, input.line, moverIsStudent);
  if (deep) aspects.push({ text: deep.text, verb: deep.verb, idea: 'set-up', squares: [deep.target], weight: 56 });

  // 9c. THE PIECE'S TRIP (lesson voice, P4: the Italian's Nbd2 — "heads for the
  //     kingside by the long road: d2, then f1, then on to e3"). Read down the
  //     line that follows; not said when the deep fact already carries the same
  //     piece on (it says the trip and what it hits at the end).
  const route = pieceRoute(fenBefore, san, input.line);
  if (route && !(deep && route.path.includes(deep.follow.from))) aspects.push({ text: route.text, verb: route.text, idea: 'route', squares: [...route.path], weight: 52 });

  // 10. The positional idea — the quiet fallback so a purely developing move
  //     still teaches (buildReviewMoveTeaching never returns null).
  if (aspects.length === 0 || aspects.every((a) => a.weight < 40)) {
    const concept = buildReviewMoveTeaching(fenBefore, san, moverIsStudent !== false, input.phrases);
    if (concept) aspects.push({ text: toClause(concept), verb: toClause(concept), idea: 'develop', squares: [], weight: 25 });
  }

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
    evalLead = evalReading(fenAfter, povBefore, povAfter, input.studentSwingCp ?? null, input.studentColorWB, { to: mv.to, captured: mv.captured ?? null }) ?? '';
    if (evalLead) deltaTail = deltaTailClause(swing) ?? '';
  }

  // The criticality "this is the moment" line leads (David 2026-09-07: "say that
  // phrase first"). Then, most-important-first: eval assessment → the move and
  // what it did → the delta verdict. This ORDERED package is what the LLM voices.
  const criticalityLead = input.criticalMoment
    ? (input.register === 'teach' ? 'This is the critical moment.' : 'This was the moment to slow down.')
    : '';

  // RANK the move-mechanic aspects (the eval swing lifts them when the move
  // mattered) — these become the "You play X, …" clause. THE QUIET-MOVE RULE
  // (WO-DECIDER-02: "a quiet move says its purpose or nothing"): when every
  // aspect only restates the capture or the check and nothing else about the
  // moment speaks (no critical line, no eval read), the move is not narrated —
  // "You play Nxe3, taking back the bishop" is the board read back. With a
  // critical line or an eval read the restatement stays as the move they hang
  // on.
  const quiet = !criticalityLead && !evalLead && !deltaTail;
  const spokenAspects = quiet && aspects.every((a) => a.restates) ? [] : aspects;
  const swingAbs = Math.abs(input.studentSwingCp ?? 0);
  const lift = swingAbs >= 300 ? 12 : swingAbs >= 150 ? 8 : swingAbs >= 60 ? 4 : 0;
  const rankedMechanics = spokenAspects
    .map((a) => ({ ...a, score: a.weight + (a.keystone ? lift : Math.round(lift / 2)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((a) => a.text);
  // The briefing is Review's: a move already played.
  const moveClause = rankedMechanics.length ? joinReview(rankedMechanics, moverIsStudent, mv.san, 'past') : '';
  // THEIR TARGET AND THE BINDING (facts two and three): what the other side's
  // last move aims at, said only when this move answers it — it covers the
  // target, or its own point lands on the same side of the board. The move's
  // own point is the deep fact's hit, else the square its threat lands on,
  // else what the moved piece itself now attacks.
  let targetLine = '';
  if (moveClause && moverIsStudent !== undefined) {
    const tgt = theirTarget(input.theirLast, moverIsStudent);
    // The deep fact's hit counts only when the deep fact is said.
    const deepSaid = deep && rankedMechanics.includes(deep.text) ? deep.target : null;
    const ownPoint = deepSaid ?? (threat ? threatSquare(threat.san) : null) ?? moveHit(fenBefore, san);
    const bind = tgt ? binding(fenBefore, san, tgt, ownPoint, moverIsStudent) : null;
    // Said once: when the move's own clause already names the target ("it
    // guards your bishop on c8, which their rook attacks"), it is not said
    // again.
    if (tgt && bind && !new RegExp(`\\b${tgt.square}\\b`).test(moveClause)) targetLine = `${openSentence(tgt.text)}, ${bind}.`;
  }
  const composed = [criticalityLead, evalLead, moveClause, targetLine, deltaTail].filter(Boolean).join(' ');
  return composed.length ? composed : null;
}

/** The square a threatened capture lands on ("Bxa1" → a1), or null. */
function threatSquare(san: string): string | null {
  return san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?:=[QRBN])?$/)?.[1] ?? null;
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

/** A full teaching SENTENCE → a lower-cased clause that flows after a subject,
 *  keeping its article ("The knight bears down…" → "the knight bears down…"). */
export function toClause(sentence: string): string {
  const s = sentence.trim().replace(/\.$/, '').replace(/^(It|Now)\s+/i, '');
  const clause = continueSentence(s);
  // A VERB-LED sentence ("Stakes a claim in the center and opens lines") has
  // no subject of its own; after "You play e4," it read "You play e4, stakes
  // a claim…". It gets one: "it stakes a claim", joined with a dash below.
  // "Your knight …" / "Their knight …" HAVE a subject (the board teacher names
  // whose piece since 2026-11-08): read as verb-led, they became "it their
  // knight joins the fight" on every Review and lesson turn.
  return /^(The|A|An|This|That|Your|Their)\b/.test(s) ? clause : `it ${clause}`;
}

/** Join the ranked aspect clauses into one review-register sentence, seat-stamped:
 *  the student is "you", the opponent "they". A seat-free caller gets "The move X". */
export function joinReview(clauses: string[], moverIsStudent: boolean | undefined, san: string, tense: IntroTense): string {
  const subject = moverIsStudent === true ? 'You play ' : moverIsStudent === false ? 'They play ' : `${cleanSan(san)}: `;
  // The clauses are gerund/participle fragments ("winning the knight", "opening
  // the c-file") that read as a list after the move; the "but conceding…" clause
  // already carries its own connective.
  const body = clauses.reduce((acc, c, i) => {
    if (i === 0) return c;
    const sep = c.startsWith('but ') ? ', ' : ', ';
    return acc + sep + c;
  }, '');
  // A gerund list reads after a comma ("You play Nxe3, taking back the
  // bishop"); a clause with its own subject takes a dash ("You play Nf3 — the
  // knight trains on …"). A comma there spliced two sentences.
  // The move just named its piece: "You play Nf3 — the knight trains on …"
  // says the knight twice. The piece it names is "it".
  const named = SAN_PIECE[cleanSan(san)[0]] ?? (/^[a-h]/.test(cleanSan(san)) ? 'pawn' : null);
  const own = named ? /^(?:the|your|their) /.exec(body) : null;
  const said = named && own && body.startsWith(`${own[0]}${named} `) ? `it ${body.slice(`${own[0]}${named} `.length)}` : body;
  // A clause that carries its own dash takes a colon, so one sentence never
  // holds two dashes ("Be6 — it unpins … — and the bishop eyes …").
  const joiner = /^\w+ing\b/.test(said) ? ', ' : said.includes(' — ') ? ': ' : ' — ';
  if (moverIsStudent === undefined) return `${subject}${said}.`;
  // SAID LIKE A PERSON, ROTATED (David 2026-11-09: "mix up the phrasing
  // whenever possible"): the move is still named, the words around it vary.
  const seat = moverIsStudent ? 'student' : 'opponent';
  // The head in the caller's tense: Review's walk says a move already played,
  // a lesson the move as it is shown.
  if (/^\w+ing\b/.test(said)) return `${introWithGerund(seat, cleanSan(san), said, tense)}.`;
  if (said.startsWith('it ')) return `${introWithPredicate(seat, cleanSan(san), said.slice(3), tense)}.`;
  return `${subject}${cleanSan(san)}${joiner}${said}.`;
}


/** ONE LESSON'S VOICE: the phrase memory (say an idea once, then refer) and
 *  the lesson line's STORY — what the line has said, kept in the one per-game
 *  story every surface keeps (`GameStory`, WO-STORY-MATRIX-01 P1-8e), its
 *  spoken keys read and written through `keys` at the ply the line is at.
 *  One per lesson line; a branch takes a copy of the spine's story, so each
 *  line it continues still remembers the spine. */
export interface LessonVoice { phrases: PhraseMemory; story: StoryStore; keys: SaidSet }
function lessonVoiceOn(story: StoryStore, phrases: PhraseMemory): LessonVoice {
  return { phrases, story, keys: storyLedger(story, '', 'sentences') };
}
export function newLessonVoice(): LessonVoice { return lessonVoiceOn(createStoryStore('lesson'), new Map()); }
export function forkLessonVoice(v: LessonVoice): LessonVoice {
  const story = createStoryStore('lesson');
  story.restore(v.story.serialize());
  return lessonVoiceOn(story, new Map(v.phrases));
}

/** HOW MUCH OF THE LINE AHEAD A BRIEFING READS: six moves a side — the trip a
 *  piece makes (`pieceRoute`) and the deep fact's proven tier (five of the
 *  mover's moves, `threeFacts`) both sit inside it. Every caller passes this
 *  much of the line that follows (the taught line, the game's own moves). */
export const BRIEFING_LINE_PLIES = 12;

