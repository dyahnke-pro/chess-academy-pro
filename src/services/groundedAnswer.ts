/**
 * groundedAnswer — Phase 1 of the coach-chat grounding inversion
 * (docs/plans/2026-06-10-coach-chat-grounding-inversion.md).
 *
 * The contract: the LLM voices computed facts; it never reasons about the
 * board. This assembles the FACTS for a move / eval question entirely in
 * code — the engine's best move, the line, the eval, and the GROUNDED reason
 * it's strong (`explainBestMoveGrounded`, the no-LLM "why" the review path
 * already uses). The chat path hands the resulting `facts` string to the LLM
 * with a voice-only instruction; the model adds nothing.
 *
 * Pure + side-effect-free so it's trivially testable and can't regress the
 * live chat. Wiring it into `getCoachChatResponse` is the next step.
 */
import { Chess } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';
import type { TacticsLiveContext, LivePlayerGamesContext } from '../coach/types';
import type { BadHabit } from '../types';
import type { MasterPlayResult } from './masterPlayTypes';
import type { ConceptEntry } from './chessConceptService';
import type { TablebaseLookupResult } from './lichessTablebaseService';

// Pure board-fact constants — universal chess values, leaf-local so this module
// imports nothing that could loop back. coachFeatureService imports these FROM
// here (one direction), instead of the reverse that created the cycle.
export const REVIEW_PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const REVIEW_PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export interface GroundedAnswer {
  /** The plain-language facts the LLM must voice — and ONLY these. */
  facts: string;
  /** SAN of the computed best move (for the arrow + the prompt), or null. */
  bestMoveSan: string | null;
  /** The from/to of the best move, for a `[BOARD: arrow:from-to:green]`. */
  bestMoveFromTo: { from: string; to: string } | null;
  /** Where every fact came from (engine / chess.js) — recorded, never the LLM. */
  sources: string[];
}

/** Convert a centipawn eval (side-to-move POV) into a grounded phrase. Never
 *  invents a number — rounds the real one. */
function evalPhrase(evalCp: number | null | undefined, mateIn: number | null | undefined, mover: 'white' | 'black'): string | null {
  if (typeof mateIn === 'number' && mateIn !== 0) {
    const who = mateIn > 0 ? mover : (mover === 'white' ? 'black' : 'white');
    return `there is a forced mate in ${Math.abs(mateIn)} for ${who}`;
  }
  if (typeof evalCp !== 'number') return null;
  const pawns = evalCp / 100;
  const who = pawns >= 0 ? mover : (mover === 'white' ? 'black' : 'white');
  const mag = Math.abs(pawns);
  if (mag < 0.3) return 'the position is roughly balanced';
  if (mag < 1.0) return `${who} is slightly better (about ${mag.toFixed(1)} pawns)`;
  if (mag < 2.5) return `${who} is clearly better (about ${mag.toFixed(1)} pawns)`;
  return `${who} is winning (about ${mag.toFixed(1)} pawns)`;
}

/**
 * assemblePositionAssessment — "who's winning?", "how do I stand here?",
 * "what's the eval?", "is this good for me?". The fact source is Stockfish's
 * eval (already threaded from the surface) PLUS the one most-relevant fact from
 * `liveTacticsContext` — voiced from the STUDENT's perspective. This grounds
 * the single biggest slice of the free-reasoning chat fallback (a bare
 * "who's better / assess this" readout the LLM used to free-narrate). Returns
 * null when there's nothing computed to say (no eval AND no tactic) so the
 * caller falls through. Takes WHITE-perspective eval (LiveState convention)
 * and converts to the student's POV internally.
 */
export function assemblePositionAssessment(opts: {
  evalCp: number | null | undefined;
  mateIn: number | null | undefined;
  tactics?: TacticsLiveContext | null;
  studentColor: 'white' | 'black';
}): GroundedAnswer | null {
  const { tactics, studentColor } = opts;
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const parts: string[] = [];

  // WHITE-perspective eval → student POV (flip sign for Black).
  const studentEvalCp = typeof opts.evalCp === 'number' ? (studentColor === 'white' ? opts.evalCp : -opts.evalCp) : null;
  const studentMateIn = typeof opts.mateIn === 'number' ? (studentColor === 'white' ? opts.mateIn : -opts.mateIn) : null;

  if (typeof studentMateIn === 'number' && studentMateIn !== 0) {
    parts.push(studentMateIn > 0 ? `You have a forced mate in ${Math.abs(studentMateIn)}.` : `There is a forced mate against you in ${Math.abs(studentMateIn)}.`);
  } else if (typeof studentEvalCp === 'number') {
    const mag = Math.abs(studentEvalCp) / 100;
    const side = studentEvalCp >= 0 ? 'better' : 'worse';
    if (mag < 0.3) parts.push('The position is roughly balanced.');
    else if (mag < 1.0) parts.push(`You're slightly ${side} — about ${mag.toFixed(1)} of a pawn.`);
    else if (mag < 2.5) parts.push(`You're clearly ${side} — about ${mag.toFixed(1)} pawns.`);
    else parts.push(studentEvalCp >= 0 ? `You're winning — about ${mag.toFixed(1)} pawns up.` : `You're losing — about ${mag.toFixed(1)} pawns down.`);
  }

  // Add the single most relevant computed fact so the assessment names a WHY.
  if (tactics) {
    if (tactics.boardFacts?.mateInOne) {
      parts.push(`There is checkmate in one on the board: ${tactics.boardFacts.mateInOne}.`);
    } else if (tactics.immediate[0]?.description) {
      parts.push(`${tactics.immediate[0].description}.`);
    } else {
      const myHang = tactics.hanging.find((h) => h.color === sc);
      if (myHang) parts.push(`Your ${REVIEW_PIECE_NAME[myHang.piece] ?? myHang.piece} on ${myHang.square} is hanging.`);
      else if (tactics.threats[0]?.description) parts.push(`Watch out — ${tactics.threats[0].description}.`);
    }
  }

  if (parts.length === 0) return null;
  const sources = tactics ? ['engine:stockfish', 'board:chess.js'] : ['engine:stockfish'];
  return { facts: parts.join(' '), bestMoveSan: null, bestMoveFromTo: null, sources };
}

/**
 * Assemble the grounded facts for a move / best-move / eval question.
 * Returns null when there's no engine move to ground on (caller falls back
 * to the existing path — this never fabricates).
 */
export function assembleMoveEvalAnswer(opts: {
  fen: string;
  /** Engine best move in UCI (e.g. `g1f3`) — from Stockfish PV[0]. */
  bestMoveUci: string | null;
  evalCp?: number | null;
  mateIn?: number | null;
}): GroundedAnswer | null {
  const { fen, bestMoveUci } = opts;
  if (!bestMoveUci || bestMoveUci.length < 4) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  // SAN + from/to from the UCI — chess.js is the truth, not the LLM.
  let bestMoveSan: string | null = null;
  let fromTo: { from: string; to: string } | null = null;
  try {
    const probe = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
    const mv = probe.move({ from, to, promotion });
    if (mv) {
      bestMoveSan = mv.san;
      fromTo = { from, to };
    }
  } catch {
    return null; // illegal best move → don't ground (never fabricate)
  }
  if (!bestMoveSan) return null;

  // The GROUNDED reason it's strong — no LLM. (playedSan null: we're not
  // contrasting a played move here, just stating what the best move achieves.)
  const why = explainBestMoveGrounded(fen, null, bestMoveUci, mover);
  const evalText = evalPhrase(opts.evalCp, opts.mateIn, mover);

  const parts: string[] = [`The best move is ${bestMoveSan}.`];
  if (why) parts.push(why);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const sources = ['engine:stockfish', 'board:chess.js'];

  return {
    facts: parts.join(' '),
    bestMoveSan,
    bestMoveFromTo: fromTo,
    sources,
  };
}

/**
 * explainBestMoveGrounded — the GROUNDED, LLM-FREE "why" (moved here from
 * coachFeatureService 2026-06-10 to break the import cycle: pure board-fact
 * computers belong in the leaf, not in a service tangled with coachApi). It
 * reports ONLY what chess.js can prove about the board — what the best move
 * concretely wins, whether it gives check, what the played move left hanging —
 * never the engine's deep reasoning it can't see.
 */
export function explainBestMoveGrounded(
  fenBefore: string,
  playedSan: string | null,
  bestMoveUci: string | null,
  moverColor: 'white' | 'black',
): string | null {
  if (!bestMoveUci || bestMoveUci.length < 4) return null;
  const mc: 'w' | 'b' = moverColor === 'white' ? 'w' : 'b';

  let bestClause: string | null = null;
  try {
    const c = new Chess(fenBefore);
    const to = bestMoveUci.slice(2, 4);
    const captured = c.get(to as never);
    const mv = c.move({ from: bestMoveUci.slice(0, 2), to, promotion: bestMoveUci.length > 4 ? bestMoveUci[4] : undefined });
    if (mv) {
      if (captured && captured.color !== mc) {
        const recapturable = c.attackers(to as never, captured.color).length > 0;
        const movedVal = REVIEW_PIECE_VALUE[mv.piece] ?? 0;
        const capVal = REVIEW_PIECE_VALUE[captured.type] ?? 0;
        if (!recapturable || capVal > movedVal) {
          bestClause = `it wins the ${REVIEW_PIECE_NAME[captured.type]} on ${to}`;
        }
      }
      if (!bestClause && c.inCheck()) bestClause = 'it comes with check';
    }
  } catch { /* board fact unavailable — stay silent */ }

  let costClause: string | null = null;
  if (playedSan) {
    try {
      const c = new Chess(fenBefore);
      if (c.move(playedSan)) {
        const hung = findHangingPieces(c).filter((h) => h.color === mc);
        if (hung.length > 0) {
          hung.sort((a, b) => (REVIEW_PIECE_VALUE[b.piece] ?? 0) - (REVIEW_PIECE_VALUE[a.piece] ?? 0));
          const h = hung[0];
          const captures = c.moves({ verbose: true }).filter((mm) => mm.to === h.square && mm.captured);
          if (captures.length > 0) {
            captures.sort((a, b) => (REVIEW_PIECE_VALUE[a.piece] ?? 0) - (REVIEW_PIECE_VALUE[b.piece] ?? 0));
            const punish = captures[0];
            const punisher = mc === 'w' ? 'Black' : 'White';
            let givesCheck = false;
            try { const after = new Chess(c.fen()); after.move(punish.san); givesCheck = after.inCheck(); } catch { /* keep false */ }
            costClause = `your move let ${punisher} play ${punish.san}, winning the ${REVIEW_PIECE_NAME[h.piece]}${givesCheck ? ' with check' : ''}`;
          } else {
            costClause = `your move left the ${REVIEW_PIECE_NAME[h.piece]} on ${h.square} hanging`;
          }
        }
      }
    } catch { /* board fact unavailable — stay silent */ }
  }

  if (bestClause && costClause) return `${cap(bestClause)}, while ${costClause}.`;
  if (bestClause) return `${cap(bestClause)}.`;
  if (costClause) return `${cap(costClause)}.`;
  return null;
}

/**
 * assemblePlanAnswer — Phase 3 of the grounding inversion: plan / strategy
 * questions ("what's my plan?", "next three moves?"). The fact source is the
 * ENGINE's principal variation (`enginePlan.pvSan`, computed by Stockfish) —
 * real, legal, verified moves, NOT the LLM free-synthesizing a plan. This
 * replays the PV on the board (chess.js is the truth), extracts the student's
 * moves (the plan) + the opponent's expected replies, and packages them for
 * the voiceFacts chokepoint. The plan is built only when the student is to
 * move, so PV[0] is the student's move (even plies = student). Returns null
 * when the PV is empty or doesn't replay legally (never voices a bad line).
 */
export function assemblePlanAnswer(opts: {
  fen: string;
  pvSan: ReadonlyArray<string>;
  /** White-perspective centipawn eval of the line; null when forced mate. */
  evalCp: number | null;
  /** Mate distance in plies (signed, white-positive); null when not forced. */
  mateIn: number | null;
  studentSide: 'white' | 'black';
}): GroundedAnswer | null {
  if (!opts.pvSan || opts.pvSan.length === 0) return null;
  let chess: Chess;
  try {
    chess = new Chess(opts.fen);
  } catch {
    return null;
  }
  const moves: Array<{ san: string; from: string; to: string; isStudent: boolean }> = [];
  for (let i = 0; i < opts.pvSan.length; i += 1) {
    let mv;
    try {
      mv = chess.move(opts.pvSan[i]);
    } catch {
      break; // PV diverged from legality — stop at the last legal ply.
    }
    if (!mv) break;
    moves.push({ san: mv.san, from: mv.from, to: mv.to, isStudent: i % 2 === 0 });
  }
  if (moves.length === 0) return null;

  const studentMoves = moves.filter((m) => m.isStudent).map((m) => m.san);
  const firstReply = moves.find((m) => !m.isStudent)?.san ?? null;

  const parts: string[] = [];
  if (studentMoves.length === 1) {
    parts.push(`Your plan starts with ${studentMoves[0]}.`);
  } else {
    parts.push(`Your plan: ${studentMoves[0]}`);
    const rest = studentMoves.slice(1);
    parts[parts.length - 1] += `, then ${rest.join(', then ')}.`;
  }
  if (firstReply) parts.push(`The opponent's most likely reply is ${firstReply}.`);

  // PV eval is white-perspective; convert to the student's POV for the phrase.
  const studentEvalCp = opts.evalCp == null ? null : (opts.studentSide === 'white' ? opts.evalCp : -opts.evalCp);
  const studentMateIn = opts.mateIn == null ? null : (opts.studentSide === 'white' ? opts.mateIn : -opts.mateIn);
  const evalText = evalPhrase(studentEvalCp, studentMateIn, opts.studentSide);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const first = moves[0];
  return {
    facts: parts.join(' '),
    bestMoveSan: first.san,
    bestMoveFromTo: { from: first.from, to: first.to },
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

/**
 * assembleTacticsAnswer — Phase 2 of the grounding inversion: tactics / danger
 * questions ("is anything hanging?", "what's the threat?", "is there a fork?").
 * The `liveTacticsContext` engine has ALREADY computed everything — the fork
 * descriptions, the hanging pieces, the mate-in-one — deterministically from
 * the FEN. So this just SELECTS the relevant facts and packages them for the
 * voiceFacts chokepoint. The LLM decides nothing; it voices these descriptions.
 * Returns null when there's no concrete tactic (caller takes the one fallback).
 */
export function assembleTacticsAnswer(
  tactics: TacticsLiveContext,
  studentColor: 'white' | 'black',
): GroundedAnswer | null {
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const parts: string[] = [];

  // Most urgent: a forced mate-in-one for the side to move.
  if (tactics.boardFacts?.mateInOne) {
    parts.push(`There is checkmate in one: ${tactics.boardFacts.mateInOne}.`);
  }
  // Immediate tactics on the board now — voice the engine's own descriptions.
  for (const t of tactics.immediate.slice(0, 2)) {
    if (t.description) parts.push(`${t.description}.`);
  }
  // The STUDENT's pieces left hanging — warn concretely.
  for (const h of tactics.hanging.filter((p) => p.color === sc).slice(0, 2)) {
    parts.push(`Your ${REVIEW_PIECE_NAME[h.piece] ?? h.piece} on ${h.square} is hanging.`);
  }
  // Nothing concrete yet → surface the top threat, then the top opportunity.
  if (parts.length === 0 && tactics.threats[0]?.description) {
    parts.push(`Watch out — ${tactics.threats[0].description}.`);
  }
  if (parts.length === 0 && tactics.opportunities[0]?.description) {
    parts.push(`You have a shot: ${tactics.opportunities[0].description}.`);
  }

  if (parts.length === 0) return null;
  return {
    facts: parts.join(' '),
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

/**
 * assembleMasterPlayAnswer — Phase 4 of the grounding inversion: "how do
 * masters play this?" / "what's the most popular move?". The master-play
 * lookup (`masterPlayLookup`, the Lichess explorer / local DB) has ALREADY
 * computed the top moves with their game counts + White/draw/Black splits.
 * This SELECTS the top few and packages them for the voiceFacts chokepoint —
 * the LLM voices the real frequencies, it never invents "masters play X 55%".
 * Returns null when there's no master data (caller falls through).
 */
export function assembleMasterPlayAnswer(current: MasterPlayResult): GroundedAnswer | null {
  if (current.source === 'none' || current.moves.length === 0) return null;
  const fmt = (n: number): string => n.toLocaleString('en-US');
  const top = current.moves.slice(0, 3);
  const lead = top[0];
  const leadWhite = Math.round(lead.whitePct * 100);
  const leadDraw = Math.round(lead.drawPct * 100);
  const leadBlack = Math.round(lead.blackPct * 100);
  const parts: string[] = [
    `The most popular master move here is ${lead.san}, played in ${fmt(lead.games)} game${lead.games === 1 ? '' : 's'} ` +
      `(White wins ${leadWhite}%, draws ${leadDraw}%, Black wins ${leadBlack}%).`,
  ];
  const others = top.slice(1);
  if (others.length > 0) {
    parts.push(`Masters also play ${others.map((m) => `${m.san} (${fmt(m.games)} games)`).join(' and ')}.`);
  }

  let fromTo: { from: string; to: string } | null = null;
  if (lead.uci && lead.uci.length >= 4) {
    fromTo = { from: lead.uci.slice(0, 2), to: lead.uci.slice(2, 4) };
  }

  return {
    facts: parts.join(' '),
    bestMoveSan: lead.san,
    bestMoveFromTo: fromTo,
    sources: ['master-games:lichess'],
  };
}

/** Did the pro (playing `studentSide`) WIN this game? Lenient on the result
 *  string shape ("1-0" / "0-1" / "win" / "1/2-1/2"). */
function proWonGame(result: string, studentSide: 'white' | 'black'): boolean {
  const r = result.trim().toLowerCase();
  if (r.includes('1/2') || r === 'draw' || r === '=') return false;
  if (studentSide === 'white') return r.startsWith('1-0') || r === 'win' || r === '1';
  return r.startsWith('0-1') || r === 'win' || r === '0';
}

/**
 * assemblePlayerGamesAnswer — Phase 4 (pro-game references): "how does <pro>
 * play this?" / "show me <pro>'s games here". The fact source is the player's
 * REAL game corpus (`pro-game-references.json` → `LivePlayerGamesContext`,
 * already loaded into liveState by coachService), NOT the LLM. This voices the
 * real count + a standout game (highest-rated-opponent win, else the
 * highest-rated game) — opponent, rating, result, the named variation — all
 * board-true from the reference. Returns null when there are no games (caller
 * falls through). The LLM never invents a "<pro> plays X" game.
 */
export function assemblePlayerGamesAnswer(ctx: LivePlayerGamesContext): GroundedAnswer | null {
  if (!ctx.games || ctx.games.length === 0) return null;
  const player = ctx.games[0].player;
  // Prefer a win over the strongest opponent; else just the strongest opponent.
  const ranked = [...ctx.games].sort((a, b) => (b.opponentRating ?? 0) - (a.opponentRating ?? 0));
  const standout = ranked.find((g) => proWonGame(g.result, g.studentSide)) ?? ranked[0];

  const total = ctx.totalAvailable || ctx.games.length;
  const parts: string[] = [
    `${player} has ${total} reference game${total === 1 ? '' : 's'} in the ${ctx.openingName}.`,
  ];
  const won = proWonGame(standout.result, standout.studentSide);
  const oppRating = standout.opponentRating ? ` (${standout.opponentRating})` : '';
  const variation = standout.variationLabel ? ` in the ${standout.variationLabel}` : '';
  if (won) {
    parts.push(`In a standout, ${player} beat ${standout.opponent}${oppRating}${variation}.`);
  } else {
    parts.push(`One notable game was against ${standout.opponent}${oppRating}${variation}.`);
  }

  return {
    facts: parts.join(' '),
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: [`player-games:${ctx.playerId ?? 'pro'}`],
  };
}

/**
 * assembleEndgameAnswer — Phase 5 (endgame): "can I win this?" / "is this a
 * draw?" / "how do I hold this ending?". The fact source is the SYZYGY
 * TABLEBASE (`lookupTablebase` via the `/api/lichess-tablebase` proxy) — literal
 * mathematical truth for ≤7-piece endings, the strongest grounding there is.
 * The caller does the (async) lookup; this packages the verdict from the
 * STUDENT's perspective for the voiceFacts chokepoint. Returns null on an
 * uncertain category (`maybe-*` / `unknown`) so the coach never voices a guess.
 */
export function assembleEndgameAnswer(opts: {
  result: TablebaseLookupResult;
  studentColor: 'white' | 'black';
}): GroundedAnswer | null {
  const { result, studentColor } = opts;
  if (result.checkmate) {
    return { facts: 'This position is already checkmate.', bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  if (result.stalemate || result.insufficientMaterial || result.whiteRelativeResult === 'draw' ||
      result.category === 'cursed-win' || result.category === 'blessed-loss') {
    const why =
      result.stalemate ? ' (stalemate)' :
      result.insufficientMaterial ? ' (insufficient material)' :
      (result.category === 'cursed-win' || result.category === 'blessed-loss') ? ' under the fifty-move rule' : '';
    return { facts: `By the tablebase, this endgame is a theoretical draw${why} with best play.`, bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  if (result.whiteRelativeResult === 'white-wins' || result.whiteRelativeResult === 'black-wins') {
    const studentWins =
      (result.whiteRelativeResult === 'white-wins' && studentColor === 'white') ||
      (result.whiteRelativeResult === 'black-wins' && studentColor === 'black');
    const mate = typeof result.dtm === 'number' ? ` — mate in ${Math.abs(result.dtm)}` : '';
    const facts = studentWins
      ? `By the tablebase, this endgame is a win for you with best play${mate}.`
      : `By the tablebase, this endgame is lost for you with best play${mate} — your goal is to make it as hard as possible.`;
    return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  return null; // maybe-win / maybe-loss / unknown → don't voice a guess.
}

/**
 * assembleConceptAnswer — Phase 5 (concepts): "what's a fork?", "explain
 * zwischenzug", "what does zugzwang mean?". The fact source is the injected
 * book corpus (`chess-concepts.json` — Capablanca / Lasker / Staunton / …),
 * NEVER the LLM's training memory. The caller detects the concept + looks it
 * up (chessConceptService); this packages the real book passage (or the
 * curated fallback definition) for the voiceFacts chokepoint, with the source
 * recorded. Returns null when the concept carries neither a passage nor a
 * fallback (caller falls through). Takes the first 2 sentences of the passage
 * so the voiced answer stays concise + grounded in the actual text.
 */
export function assembleConceptAnswer(concept: ConceptEntry): GroundedAnswer | null {
  const passage = concept.passages?.[0];
  let definition: string | null = null;
  let source: string | null = null;
  if (passage?.text?.trim()) {
    definition = passage.text.trim().split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim();
    source = `book:${passage.bookSlug}`;
  } else if (concept.fallbackDefinition?.trim()) {
    definition = concept.fallbackDefinition.trim();
    source = `concept:${concept.id}`;
  }
  if (!definition || !source) return null;

  return {
    facts: `${cap(concept.name)}: ${definition}`,
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: [source],
  };
}

/**
 * assembleProgressAnswer — Phase 6: "am I improving?" / "what should I work
 * on?". The answer is the student's OWN computed history — `detectBadHabits`
 * already analyzed their games and produced human-readable habit descriptions
 * with occurrence counts. This selects the top unresolved ones and packages
 * them for the voiceFacts chokepoint. The LLM voices the student's real data;
 * it never invents a weakness. Returns null when there's no habit data yet
 * (caller takes the one fallback — e.g. "play a few games and I'll spot
 * patterns").
 */
export function assembleProgressAnswer(badHabits: ReadonlyArray<BadHabit>): GroundedAnswer | null {
  const open = badHabits
    .filter((h) => !h.isResolved && h.description)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);
  if (open.length === 0) return null;

  const phrase = (h: BadHabit): string =>
    `${h.description} (${h.occurrences} time${h.occurrences === 1 ? '' : 's'})`;
  const facts =
    open.length === 1
      ? `The pattern to work on: ${phrase(open[0])}.`
      : `The patterns to work on, most frequent first: ${open.map(phrase).join('; ')}.`;

  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}
