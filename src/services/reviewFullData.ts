/**
 * reviewFullData — the UNCAPPED diagnostic aggregator (David 2026-07-20: "turn off
 * all narration caps … I want to hear ALL the computed data the position holds, on
 * every move"). The production review deliberately speaks ONE beat per move and
 * caps each teaching message to once per game (silence is a feature there). This
 * module does the opposite: on EVERY move it gathers EVERY computed facet the
 * position holds into an ordered list, so nothing is suppressed. It is the single
 * inventory of "what the review can compute" — every fact-computer is called here.
 *
 * Everything is board-truth (G0 — chess.js + the existing pure computers); the
 * uncapped review speaks these verbatim (un-warmed) so no fact is compressed away
 * and the gaps are visible. Each facet is a labeled prose clause.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { plyFactsForMove } from './pvPlayback';
import { seeGain } from './positionReadingService';
import { detectTactics } from './tacticsDetector';
import { describeStructure } from './boardStructure';
import { assessPositionalEdge } from './reviewPositionalAssessment';
import { sacrificeCompensation, enemyKingStuckInCenter, describeSacBreaksKingShield } from './reviewSacrifice';
import { explainMatingSacMechanism } from './reviewForcedSequence';
import { buildMiddlegameOrientation, buildOpeningDevelopmentPlan } from './reviewStrategicOrientation';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';
import { nameEndgamePhase } from './reviewMoveTeaching';
import { detectOpening } from './openingDetectionService';
import { attackerDefenderCount, royalDefenderTarget, rookOnSeventh, badEnemyBishop, worstPlacedFriendlyPiece, passedPawnPush, deriveNextPlans } from './reviewTeachingPoints';

interface Located { type: string; color: Color; square: string; }

export interface MoveFactContext {
  fenBefore: string;
  fenAfter: string;
  san: string;
  ply: number;
  moverColor: 'white' | 'black';
  playerColor: 'white' | 'black' | undefined;
  studentColorWB: Color | null;
  /** White-POV centipawn eval AFTER the move (the analysis pipeline's number). */
  evaluation: number | null;
  preMoveEval: number | null;
  classification: string | null;
  bestMoveSan: string | null;
  prevCap: { square: string | null; capturedValue: number };
  /** Full SAN list of the game (for opening ID + forced-run + sac mechanism). */
  allSans: string[];
  /** 1-based ply where a forced mating run begins (from detectForcedMatingSequence), or null. */
  forcedRunStartPly: number | null;
}

const PIECE_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Every computed facet for this move, ordered, each a prose clause. The uncapped
 * review joins them into the move's narration. This function IS the data inventory.
 */
export function computeMoveFacets(ctx: MoveFactContext): string[] {
  const facets: string[] = [];
  const { fenBefore, fenAfter, san, ply, moverColor, playerColor, studentColorWB } = ctx;
  const isStudent = playerColor ? moverColor === playerColor : false;
  const subj = isStudent ? 'You' : 'Your opponent';
  const moverWB: Color = moverColor === 'white' ? 'w' : 'b';
  const studentPovCp = ctx.evaluation != null && studentColorWB
    ? (studentColorWB === 'w' ? ctx.evaluation : -ctx.evaluation)
    : null;

  // ── 1. MOVE MECHANICS + MATERIAL + STRUCTURE DELTAS (the rich PlyFacts) ──
  const mech = plyFactsForMove(fenBefore, san, ctx.prevCap);
  if (mech) facets.push(`[move] ${subj}: ${lowerFirst(mech)}`);

  // ── 2. MOVE QUALITY (classification + eval swing + the better move) ──
  const swing = ctx.evaluation != null && ctx.preMoveEval != null
    ? Math.abs(ctx.evaluation - ctx.preMoveEval)
    : null;
  if (ctx.classification && ctx.classification !== 'good' && ctx.classification !== 'book') {
    const swingBit = swing != null ? ` (eval swung ${(swing / 100).toFixed(1)})` : '';
    const betterBit = ctx.bestMoveSan ? ` — the stronger move was ${ctx.bestMoveSan}` : '';
    facets.push(`[quality] ${cap(ctx.classification)}${swingBit}${betterBit}.`);
  }

  // ── 3. TACTICS ON THE RESULTING BOARD + LOOSE (undefended) PIECES ──
  try {
    const t = detectTactics(fenAfter);
    for (const tac of t.tactics) {
      if (tac.type !== 'none' && tac.description) facets.push(`[tactic] ${tac.description}.`);
    }
    if (t.hangingPieces.length > 0) {
      const desc = t.hangingPieces.map((h) => `${pieceWord(h.piece)} on ${h.square}`).join(', ');
      facets.push(`[loose] Undefended right now: ${desc}.`);
    }
  } catch { /* ignore */ }

  // ── 4. POSITIONAL VERDICT + THE FULL ASSET LIST (no cap) ──
  // Skip on a mating move — "checkmate" is the verdict, not "you're balanced"
  // (the eval at the mated position reads 0/odd). The mate is named by [move].
  if (studentColorWB && !san.includes('#')) {
    const assess = assessPositionalEdge(fenAfter, studentColorWB, studentPovCp);
    if (assess.verdict) {
      const why = assess.reasons.length ? `: ${assess.reasons.join('; ')}` : '';
      facets.push(`[verdict] You're ${assess.verdict}${why}.`);
    }
  }

  // ── 5. STRUCTURE STATE (open/half-open files, outposts, passed/isolated/doubled) ──
  const struct = describeStructure(fenAfter);
  if (struct) {
    const s: string[] = [];
    if (struct.pawns.openFiles.length) s.push(`open files ${struct.pawns.openFiles.join(',')}`);
    if (struct.outposts.length) s.push(struct.outposts.map((o) => `${o.color === 'w' ? 'White' : 'Black'} ${o.piece === 'n' ? 'knight' : 'bishop'} outpost ${o.square}`).join('; '));
    const passed = [...struct.pawns.passedPawns.w.map((p) => `white ${p}`), ...struct.pawns.passedPawns.b.map((p) => `black ${p}`)];
    if (passed.length) s.push(`passed pawns ${passed.join(', ')}`);
    const iso = [...struct.pawns.isolatedPawns.w.map((p) => `white ${p}`), ...struct.pawns.isolatedPawns.b.map((p) => `black ${p}`)];
    if (iso.length) s.push(`isolated pawns ${iso.join(', ')}`);
    const dbl = [...struct.pawns.doubledFiles.w.map((f) => `white ${f}-file`), ...struct.pawns.doubledFiles.b.map((f) => `black ${f}-file`)];
    if (dbl.length) s.push(`doubled pawns ${dbl.join(', ')}`);
    if (s.length) facets.push(`[structure] ${s.join(' · ')}.`);
  }

  // ── 6. KING SAFETY (enemy king exposed in the centre) ──
  if (studentColorWB && enemyKingStuckInCenter(fenAfter, studentColorWB)) {
    facets.push('[king] Their king is stuck in the centre with a central file open on it.');
  }

  // ── 6b. THE MISSING TEACHING POINTS (Naroditsky message catalog) ──
  if (studentColorWB) {
    const count = attackerDefenderCount(fenAfter, studentColorWB);
    if (count) facets.push(`[count] ${cap(count)}.`);
    const royal = royalDefenderTarget(fenAfter, studentColorWB);
    if (royal) facets.push(`[royal] ${cap(royal)}.`);
    const rook7 = rookOnSeventh(fenAfter, studentColorWB);
    if (rook7) facets.push(`[rook7] ${cap(rook7)}.`);
    const badB = badEnemyBishop(fenAfter, studentColorWB);
    if (badB) facets.push(`[badbishop] ${cap(badB)}.`);
    const worst = worstPlacedFriendlyPiece(fenAfter, studentColorWB);
    if (worst) facets.push(`[worst] ${cap(worst)}.`);
    const passer = struct?.pawns.passedPawns[studentColorWB][0] ?? null; // reuse §5's struct
    const passNote = passedPawnPush(fenAfter, studentColorWB, passer);
    if (passNote) facets.push(`[passer] ${cap(passNote)}.`);
    // FORWARD PLANS — what to DO from here + exactly HOW (David 2026-07-20: "add
    // in more future plans … and exactly how to do those plans"). EVERY applicable
    // plan, each with its method; deduped to first mention of each distinct plan
    // (see the caller) so the agenda is stated when it becomes relevant and
    // re-stated only when it changes.
    for (const plan of deriveNextPlans(fenAfter, studentColorWB)) {
      facets.push(`[plan-now] ${cap(plan)}.`);
    }
  }

  // ── 7. SACRIFICE — compensation + mechanism + king-shield removal ──
  try {
    const sb = new Chess(fenBefore);
    const smv = sb.move(san);
    if (smv) {
      const capVal = smv.captured ? (PIECE_PTS[smv.captured] ?? 0) : 0;
      const oppWins = seeGain(sb, smv.to as Square);
      if (oppWins - capVal >= 1 && studentColorWB) {
        const comp = sacrificeCompensation(fenAfter, moverWB, studentPovCp);
        if (comp.length) facets.push(`[sac] It's a sacrifice — compensation: ${comp.join('; ')}.`);
        const mech = isStudent ? explainMatingSacMechanism(ctx.allSans, ply - 1) : null;
        if (mech) facets.push(`[sac-why] ${cap(mech)}.`);
        const shield = isStudent ? describeSacBreaksKingShield(fenBefore, san) : null;
        if (shield) facets.push(`[sac-why] ${shield}.`);
      }
    }
  } catch { /* ignore */ }

  // ── 8. FORCED MATING RUN — this ply begins a forced checking finish ──
  if (ctx.forcedRunStartPly != null && ply === ctx.forcedRunStartPly) {
    facets.push('[forced] From here it is a forced checking run to mate — every move a check, no escape.');
  }

  // ── 9. PLANS — opening development + middlegame orientation (both sides) ──
  if (studentColorWB) {
    const dev = buildOpeningDevelopmentPlan(fenAfter, studentColorWB, {});
    if (dev) facets.push(`[plan-opening] ${dev.text}`);
    // A slow "advance your majority" plan is a NON-APPLICABLE reason while the
    // enemy king is exposed in the centre — that's a king-hunt, not a majority
    // grind (David 2026-07-20 diagnostic: it fired every move of a mating attack).
    if (!enemyKingStuckInCenter(fenAfter, studentColorWB)) {
      const orient = buildMiddlegameOrientation(fenAfter, studentColorWB);
      if (orient) facets.push(`[plan-middlegame] ${orient.text}`);
    }
  }

  // ── 10. OPENING IDENTITY (the named line so far) ──
  const named = detectOpening(ctx.allSans.slice(0, ply))?.name ?? null;
  if (named) facets.push(`[opening] The line so far is the ${named}.`);

  // ── 11. OPPONENT READ — what the opponent's move targets + their dev lag ──
  if (!isStudent && studentColorWB) {
    const opp = buildOpponentMoveTeaching(fenBefore, san, studentColorWB);
    if (opp) facets.push(`[opp-target] ${opp.text}`);
    // The opponent's OWN moves so far (parity from the student's colour): white
    // plays odd ply numbers (even index), black plays even ply numbers (odd index).
    const oppIsWhite = studentColorWB === 'b';
    const oppSans = ctx.allSans.slice(0, ply).filter((_, i) => (i % 2 === 0) === oppIsWhite);
    const devRead = buildOpponentDevelopmentRead(oppSans, fenAfter, studentColorWB);
    if (devRead) facets.push(`[opp-dev] ${devRead.text}`);
  }

  // ── 12. ENDGAME PHASE ──
  const phase = nameEndgamePhase(fenAfter);
  if (phase) facets.push(`[endgame] The position is ${phase}.`);

  return facets;
}

/**
 * THROUGH-LINE THEME LEDGER (David 2026-07-20, future-analysis teaching #3 —
 * "stateful across plies"). A great review doesn't just narrate move-by-move; it
 * names the ONE idea that ran through the whole game ("this game was the story of
 * your isolated-pawn pressure", "the bad bishop never got into the game"). We tally
 * board-true themes across every middlegame ply and name the dominant one — the
 * through-line — as the closing. Pure board-truth (G0); null when no theme recurs
 * enough to be "the story" (empty > invented).
 */
export function computeThroughLine(fensAfter: string[], studentColorWB: Color | null): string | null {
  if (!studentColorWB || fensAfter.length < 12) return null;
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const tally: Record<string, number> = {};
  const bump = (k: string): void => { tally[k] = (tally[k] ?? 0) + 1; };
  let sampled = 0;

  // Sample from the middlegame onward (skip the opening ~ply 12), where a theme
  // is a real structural through-line rather than a fleeting opening detail.
  for (let i = 11; i < fensAfter.length; i += 1) {
    const fen = fensAfter[i];
    const struct = describeStructure(fen);
    if (!struct) continue;
    sampled += 1;
    let chess: Chess;
    try { chess = new Chess(fen); } catch { continue; }
    const all: Located[] = [];
    for (const row of chess.board()) for (const cell of row) if (cell) all.push({ type: cell.type, color: cell.color, square: cell.square });

    // Enemy isolated CENTRAL pawn we keep pressuring (the IQP story).
    if (struct.pawns.isolatedPawns[enemy].some((sq) => 'cde'.includes(sq[0]))) bump('iqp');
    // A student heavy piece owning an open file.
    if (all.some((p) => (p.type === 'r' || p.type === 'q') && p.color === studentColorWB && struct.pawns.openFiles.includes(p.square[0]))) bump('open-file');
    // A student outpost that lives on the board.
    if (struct.outposts.some((o) => o.color === studentColorWB)) bump('outpost');
    // Enemy king stuck in the centre (the king-hunt story).
    if (enemyKingStuckInCenter(fen, studentColorWB)) bump('king-hunt');
    // A student passed pawn.
    if (struct.pawns.passedPawns[studentColorWB].length) bump('passer');
    // The bishop pair held through the middlegame.
    const myB = all.filter((p) => p.type === 'b' && p.color === studentColorWB).length;
    const enemyB = all.filter((p) => p.type === 'b' && p.color === enemy).length;
    if (myB >= 2 && enemyB <= 1) bump('bishops');
    // A durable material edge.
    const bal = struct.material.balance * (studentColorWB === 'w' ? 1 : -1);
    if (bal >= 2) bump('material');
  }
  if (sampled < 8) return null;

  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const [theme, count] = entries[0] ?? ['', 0];
  // The theme must have run through a real share of the middlegame to be "the story".
  if (!theme || count < Math.ceil(sampled * 0.4)) return null;

  const PHRASING: Record<string, string> = {
    iqp: "the story of this game was the isolated pawn in their camp — you built the whole middlegame around pressuring it, and that's exactly the right way to play against an isolated pawn",
    'open-file': 'the through-line of this game was the open file — you seized it and used it as the highway into their position, and controlling the only open file is what decided it',
    outpost: 'the story of this game was your outpost — a piece planted on a square no pawn could ever challenge, quietly dominating from the middle of the board',
    'king-hunt': 'the through-line of this game was their king caught in the centre — once it was stuck there with the files opening, the whole game became a hunt',
    passer: 'the story of this game was your passed pawn — a long-term trump that hung over the whole middlegame and had to be watched every move',
    bishops: 'the through-line of this game was the bishop pair — two bishops raking the board, and in an open position that pair is worth more than it looks',
    material: 'the through-line of this game was your material edge — once ahead, the job was to simplify and convert, and keeping it clean is the whole skill',
  };
  const p = PHRASING[theme];
  return p ? `${p.charAt(0).toUpperCase()}${p.slice(1)}.` : null;
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function lowerFirst(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }
function pieceWord(p: string): string {
  return ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as Record<string, string>)[p.toLowerCase()] ?? 'piece';
}
