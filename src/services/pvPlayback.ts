/**
 * pvPlayback — compute the full winning/punishment LINE from a review
 * position, with rich per-ply fact bundles for narration (Phase 1 of the
 * Danya review build; David 2026-07-18: lines you can WATCH, not a text
 * list).
 *
 * G0/G3 by construction: the moves are the engine's PV (validated by
 * chess.js replay), the facts are board truth (chess.js + tacticsDetector +
 * boardStructure). The LLM never picks a move and never states a fact —
 * voiceFactsBatch (coachApi) phrases these bundles; `renderPlyFactLine` is
 * the deterministic fallback voice.
 *
 * R3 (PV soundness) is enforced here: the line is seeded from the STORED
 * best move when given (consistency with the shot question), and the
 * terminal position is re-analyzed — a line whose end collapses below the
 * root promise is truncated/refused (`delivers=false`): a line we can't
 * verify is a line we don't teach.
 */
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { detectTactics } from './tacticsDetector';
import { describeStructure } from './boardStructure';
import { seeGain } from './positionReadingService';
import type { StockfishAnalysis } from '../types';

/** Face values for the recapture-net calc (mirrors positionReadingService). */
const PIECE_POINTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Context the material calc needs about the PREVIOUS ply: if the opponent just
 *  captured on the square we're now capturing on, this move is a RECAPTURE and
 *  its honest material figure is the NET of the two-ply swap, not the face value
 *  (David 2026-07-20: "Qxf3 nets three points" was an even recapture). */
export interface PrevCaptureContext {
  /** The square the previous ply captured on (its destination), or null. */
  square: string | null;
  /** The value of the piece the previous ply captured (0 if it wasn't a capture). */
  capturedValue: number;
}

/** Minimal engine surface pvPlayback needs — injectable for tests. */
export interface PvEngine {
  analyzePosition(fen: string, depth: number): Promise<StockfishAnalysis>;
}

export interface PlyFacts {
  /** 'capture' facts: what was taken, in plain words ("takes the knight"). */
  captured: string | null;
  isCheck: boolean;
  isMate: boolean;
  promotion: string | null;
  /** Tactic the move LANDS on the resulting board ('fork' | 'pin' | 'skewer'), if any. */
  tacticLanded: string | null;
  /** Material swing this ply in points, mover's perspective (>0 = mover gained). */
  materialGained: number;
  /** Files newly opened by this ply. */
  newOpenFiles: string[];
  /** Passed pawns newly created (squares). */
  newPassedPawns: string[];
  /** Outpost newly established by the mover (square), if any. */
  outpostGained: string | null;
  /** Defender king-shield pawns lost this ply (>0 = the defense got airier). */
  shieldLost: number;
}

export interface PvPly {
  san: string;
  uci: string;
  moverColor: 'white' | 'black';
  fenBefore: string;
  fenAfter: string;
  facts: PlyFacts;
}

export interface PvLine {
  plies: PvPly[];
  /** Root eval of the line, WHITE POV centipawns (the engine's promise). */
  rootEvalCp: number;
  /** Terminal re-analysis eval, WHITE POV cp (R3 verification), null when
   *  the verify pass could not run. */
  terminalEvalCp: number | null;
  /** R3: the line holds its promise at the end (terminal within 100cp of
   *  root, mover's perspective). A false line should not be TAUGHT as
   *  winning. */
  delivers: boolean;
  /** Root decision tension: the runner-up candidate within 40cp — Danya's
   *  "it's actually hard to decide" moment, as a computable fact. */
  closeAlternative: { san: string; gapCp: number } | null;
}

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

function computePlyFacts(fenBefore: string, fenAfter: string, mv: {
  captured?: string; san: string; color: 'w' | 'b'; promotion?: string;
}, prev?: PrevCaptureContext): PlyFacts {
  const before = describeStructure(fenBefore);
  const after = describeStructure(fenAfter);
  const mover = mv.color;
  const defender: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  // The square this move lands on (SAN's last coordinate) — used by both the
  // tactic-agent check and the material calc below.
  const toSquare = mv.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?!.*[a-h][1-8])/)?.[1] ?? null;

  // A tactic only "landed" if THIS move CREATED it — not one that was already
  // on the board (David 2026-07-20: every PV move narrated "lands a pin"
  // because a full middlegame board almost always has some pre-existing pin;
  // "O-O lands a pin" was the nonsense that resulted). Compare the tactic
  // signatures before vs after and keep only a newly-appeared one whose
  // involved squares include the square the mover just moved to (so it's the
  // move's own doing, not the opponent's standing threat). G0: board-true.
  let tacticLanded: string | null = null;
  try {
    const sig = (t: { type: string; involvedSquares: string[] }): string =>
      `${t.type}:${[...t.involvedSquares].sort().join(',')}`;
    const beforeSigs = new Set(detectTactics(fenBefore).tactics.filter((x) => x.type !== 'none').map(sig));
    // Only the MOVED piece can be the tactic's agent. A pin or skewer is made
    // by a SLIDER (bishop/rook/queen) — a knight/pawn/king move that merely
    // touches a pin's involved squares did NOT "land a pin" (David 2026-07-20:
    // "the knight lands on c3 and suddenly it's pinning" — knights can't pin).
    const isSlider = /^[BRQ]/.test(mv.san); // bishop/rook/queen — the only pinning pieces
    const afterBoard = new Chess(fenAfter);
    const landed = detectTactics(fenAfter).tactics
      .filter((x) => x.type !== 'none')
      .filter((x) => !beforeSigs.has(sig(x)))
      .filter((x) => !((x.type === 'pin' || x.type === 'skewer') && !isSlider))
      // The MOVED piece must be the tactic's AGENT (the maker of the fork/pin/
      // skewer) — not merely a square it involves. detectTactics puts the agent
      // square FIRST, so require involvedSquares[0] === the landing square. Without
      // this the mover was credited for the OPPONENT's pin whenever its move just
      // landed BEHIND the pinned piece (David 2026-07-20 Opera nitpick: Black's
      // "Rd8 lands a pin" was really White's Rd1 pinning Black's own knight).
      .filter((x) => toSquare !== null && x.involvedSquares[0] === toSquare)
      // Drop a shallow pin whose pinned piece is a mere PAWN (e.g. Qf3 "pinning"
      // the f7 pawn to the bishop) — technically true, not worth a tactic call.
      .filter((x) => !(x.type === 'pin' && afterBoard.get(x.involvedSquares[1] as Square)?.type === 'p'))
      .find(() => true);
    // BOARD-TRUE tactic-reality gate (David 2026-07-23: "Bg7 lands a skewer" /
    // "Qh4 lands a fork" fired on routine developing moves). detectTactics
    // reports a bare geometric alignment even when every target is DEFENDED and
    // of equal-or-greater value — winning nothing. A tactic only "lands" if the
    // moved piece actually threatens to WIN material: a fork needs >=2 winnable
    // targets; a pin/skewer needs its front target winnable (or an absolute pin
    // against the king). "Winnable" = the target is worth more than the mover
    // OR is undefended (it hangs). Kills the false alarms; keeps the real ones.
    if (landed) {
      const val = (t?: string): number => (t ? (PIECE_POINTS[t] ?? 0) : 0);
      const attackerVal = val(afterBoard.get(landed.involvedSquares[0] as Square)?.type);
      const winnable = (sq: string): boolean => {
        const p = afterBoard.get(sq as Square);
        if (!p) return false;
        const undefended = afterBoard.attackers(sq as Square, p.color).length === 0;
        return val(p.type) > attackerVal || undefended;
      };
      let real: boolean;
      if (landed.type === 'fork') {
        // A fork wins because the defender can't save BOTH — needs >=2 winnable
        // targets. (Kills "Qh4 lands a fork" on two defended minors.)
        real = landed.involvedSquares.slice(1).filter(winnable).length >= 2;
      } else if (landed.type === 'skewer') {
        // A skewer is real only if its FRONT piece can actually be won (or it's
        // a royal skewer). (Kills "Bg7 lands a skewer" on a defended, equal-
        // value knight with a pawn behind.)
        const backIsKing = afterBoard.get(landed.involvedSquares[2] as Square)?.type === 'k';
        real = winnable(landed.involvedSquares[1]) || backIsKing;
      } else {
        // A pin immobilizes its front piece against a more valuable one — the
        // detector already requires back > front and filters pins-to-a-pawn, so
        // the pressure is real even when the front can't be won immediately
        // (Bg5 pinning the f6 knight to the queen). Keep it.
        real = true;
      }
      tacticLanded = real ? landed.type : null;
    }
  } catch { /* facts stay null */ }

  const isCheck = /[+#]$/.test(mv.san);
  const isMate = mv.san.endsWith('#');

  // Material this move HONESTLY wins — never the captured piece's face value,
  // which reads a recapture (even trade) or a sacrifice as a windfall (David
  // 2026-07-20 Opera-game nitpick: "Qxf3 nets three points" on an even trade;
  // "Rxd7 grabs three points" on an exchange sac). Two board-true cases:
  //   • RECAPTURE (opponent just captured on this same square) → the NET of the
  //     two-ply swap (face value taken − value the opponent took last ply). An
  //     even trade → 0, so no "wins material" claim fires.
  //   • fresh capture → static exchange (SEE) on the target: a defended even
  //     trade nets ~0, a hanging piece nets its value, a SACRIFICE nets NEGATIVE
  //     (so it never reads as "wins material" — the sacrifice register handles it).
  let materialGained = 0;
  if (mv.captured && toSquare) {
    const capturedVal = PIECE_POINTS[mv.captured] ?? 0;
    if (prev && prev.square === toSquare) {
      materialGained = capturedVal - prev.capturedValue;
    } else {
      try { materialGained = seeGain(new Chess(fenBefore), toSquare as Square); }
      catch { materialGained = 0; }
    }
  }

  const newOpenFiles = before && after
    ? after.pawns.openFiles.filter((f) => !before.pawns.openFiles.includes(f))
    : [];
  const passedBefore = before ? [...before.pawns.passedPawns.w, ...before.pawns.passedPawns.b] : [];
  const newPassedPawns = after
    ? [...after.pawns.passedPawns.w, ...after.pawns.passedPawns.b].filter((sq) => !passedBefore.includes(sq))
    : [];
  const outpostsBefore = before ? before.outposts.filter((o) => o.color === mover).map((o) => o.square) : [];
  const outpostAfterNew = after
    ? after.outposts.find((o) => o.color === mover && !outpostsBefore.includes(o.square))
    : undefined;
  const shieldLost = before && after
    ? Math.max(0, before.kings.shieldPawns[defender] - after.kings.shieldPawns[defender])
    : 0;

  return {
    captured: mv.captured ? PIECE_WORD[mv.captured] ?? null : null,
    isCheck,
    isMate,
    promotion: mv.promotion ? PIECE_WORD[mv.promotion] ?? null : null,
    tacticLanded,
    materialGained,
    newOpenFiles,
    newPassedPawns,
    outpostGained: outpostAfterNew?.square ?? null,
    shieldLost,
  };
}

/**
 * Compute the PV line from `fen`. When `firstUci` is provided (the stored
 * best move the shot question used), the line is seeded from it — R3
 * consistency: the sequence must continue the move the student was just
 * asked to find, never contradict it.
 */
export async function computePvLine(
  fen: string,
  opts: {
    firstUci?: string;
    maxPlies?: number;
    depth?: number;
    engine?: PvEngine;
  } = {},
): Promise<PvLine | null> {
  const engine = opts.engine ?? stockfishEngine;
  const maxPlies = opts.maxPlies ?? 8;
  const depth = opts.depth ?? 14;

  let root: StockfishAnalysis;
  try {
    root = await engine.analyzePosition(fen, depth);
  } catch {
    return null;
  }
  const lines = root.topLines ?? [];
  if (lines.length === 0) return null;

  // Seed from the stored best move when given: prefer the multipv line that
  // starts with it; else analyze the position AFTER it and prepend.
  let uciMoves: string[];
  let rootEvalCp = root.evaluation;
  const primary = lines[0];
  if (opts.firstUci && primary.moves[0] !== opts.firstUci) {
    const seeded = lines.find((l) => l.moves[0] === opts.firstUci);
    if (seeded) {
      uciMoves = seeded.moves.slice(0, maxPlies);
      rootEvalCp = seeded.evaluation;
    } else {
      try {
        const probe = new Chess(fen);
        const applied = probe.move({
          from: opts.firstUci.slice(0, 2),
          to: opts.firstUci.slice(2, 4),
          promotion: opts.firstUci.length > 4 ? opts.firstUci.slice(4) : undefined,
        });
        if (!applied) return null;
        const cont = await engine.analyzePosition(probe.fen(), depth);
        uciMoves = [opts.firstUci, ...(cont.topLines?.[0]?.moves ?? [])].slice(0, maxPlies);
        rootEvalCp = cont.evaluation;
      } catch {
        return null;
      }
    }
  } else {
    uciMoves = primary.moves.slice(0, maxPlies);
    rootEvalCp = primary.evaluation;
  }

  // Replay through chess.js — SAN, fens, facts. Stop at the first illegal
  // (defensive: a PV should always replay, but never trust unreplayed moves).
  const chess = new Chess(fen);
  const plies: PvPly[] = [];
  let prevCap: PrevCaptureContext = { square: null, capturedValue: 0 };
  for (const uci of uciMoves) {
    if (!uci || uci.length < 4) break;
    const fenBefore = chess.fen();
    let mv;
    try {
      mv = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
    } catch {
      break;
    }
    if (!mv) break;
    const fenAfter = chess.fen();
    plies.push({
      san: mv.san,
      uci,
      moverColor: mv.color === 'w' ? 'white' : 'black',
      fenBefore,
      fenAfter,
      facts: computePlyFacts(fenBefore, fenAfter, mv, prevCap),
    });
    // Carry this ply's capture forward so the NEXT ply can detect a recapture.
    prevCap = { square: mv.to, capturedValue: mv.captured ? (PIECE_POINTS[mv.captured] ?? 0) : 0 };
  }
  if (plies.length === 0) return null;

  // R3 — verify the line DELIVERS: re-analyze the terminal position; the
  // mover's-POV eval must hold within 100cp of the root promise. A mate
  // found on the way trivially delivers.
  const moverIsWhite = plies[0].moverColor === 'white';
  const moverPov = (whitePovCp: number): number => (moverIsWhite ? whitePovCp : -whitePovCp);
  let terminalEvalCp: number | null = null;
  let delivers: boolean;
  const lastPly = plies[plies.length - 1];
  if (lastPly.facts.isMate) {
    delivers = true;
  } else {
    try {
      const term = await engine.analyzePosition(lastPly.fenAfter, Math.max(10, depth - 2));
      terminalEvalCp = term.evaluation;
      delivers = moverPov(terminalEvalCp) >= moverPov(rootEvalCp) - 100;
    } catch {
      // Verify pass unavailable → don't teach an unverified line as winning.
      delivers = false;
    }
  }

  // Root decision tension (Danya's "hard to decide"): runner-up within 40cp.
  let closeAlternative: PvLine['closeAlternative'] = null;
  if (lines.length >= 2) {
    const gap = Math.abs(lines[0].evaluation - lines[1].evaluation);
    if (gap <= 40 && lines[1].moves[0]) {
      try {
        const probe = new Chess(fen);
        const alt = probe.move({
          from: lines[1].moves[0].slice(0, 2),
          to: lines[1].moves[0].slice(2, 4),
          promotion: lines[1].moves[0].length > 4 ? lines[1].moves[0].slice(4) : undefined,
        });
        if (alt) closeAlternative = { san: alt.san, gapCp: gap };
      } catch { /* no tension fact */ }
    }
  }

  return { plies, rootEvalCp, terminalEvalCp, delivers, closeAlternative };
}

/**
 * Deterministic per-ply narration — the offline/LLM-failure fallback voice
 * (R1: never the primary; voiceFactsBatch phrases the bundles). States only
 * computed facts; quiet plies (no facts) return null → no line spoken.
 */
export function renderPlyFactLine(ply: PvPly): string | null {
  const f = ply.facts;
  const bits: string[] = [];
  if (f.isMate) return `${ply.san} — checkmate.`;
  if (f.captured) bits.push(`takes the ${f.captured}`);
  if (f.isCheck) bits.push('with check');
  if (f.promotion) bits.push(`promoting to a ${f.promotion}`);
  if (f.tacticLanded) bits.push(`landing a ${f.tacticLanded}`);
  if (f.outpostGained) bits.push(`planting an outpost on ${f.outpostGained}`);
  if (f.newPassedPawns.length > 0) bits.push(`creating a passed pawn on ${f.newPassedPawns[0]}`);
  if (f.newOpenFiles.length > 0) bits.push(`opening the ${f.newOpenFiles[0]}-file`);
  if (f.shieldLost > 0) bits.push('stripping the king cover');
  if (bits.length === 0) return null;
  return `${ply.san}, ${bits.join(', ')}.`;
}

/** One ply's fact bundle as a compact facts string — the voiceFacts input
 *  for that ply's spoken line (per-ply calls, per-ply validation). Returns
 *  null for a quiet ply (no facts → no line — silence, not filler). */
export function plyFactsString(ply: PvPly): string | null {
  const f = ply.facts;
  const parts: string[] = [];
  if (f.captured) parts.push(`captures the ${f.captured}`);
  if (f.isMate) parts.push('checkmate');
  else if (f.isCheck) parts.push('check');
  if (f.promotion) parts.push(`promotes to ${f.promotion}`);
  if (f.tacticLanded) parts.push(`lands a ${f.tacticLanded}`);
  if (f.outpostGained) parts.push(`outpost established on ${f.outpostGained}`);
  if (f.newPassedPawns.length > 0) parts.push(`creates a passed pawn on ${f.newPassedPawns.join(', ')}`);
  if (f.newOpenFiles.length > 0) parts.push(`opens the ${f.newOpenFiles.join(' and ')}-file`);
  if (f.shieldLost > 0) parts.push(`strips ${f.shieldLost} pawn${f.shieldLost > 1 ? 's' : ''} from the king's cover`);
  // Say "wins material" — NEVER the point count (David 2026-07-24: "we don't need
  // to call out how many points were gained with each capture. Sounds bad").
  if (f.materialGained >= 1) parts.push('wins material');
  if (parts.length === 0) return null;
  return `The move ${ply.san} ${parts.join(', ')}.`;
}

/** The SAME per-move facts as `plyFactsString`, but as a SUBJECT-LESS clause
 *  (no "The move X" prefix) so the caller can frame the subject — "You …" for
 *  the student, "Your opponent …" for the other side (David 2026-07-20: "always
 *  narrate both sides"). Returns e.g. "captures the knight, lands a fork, wins 3
 *  points of material", or null on a genuinely quiet move. Board-true (G0). */
export function plyFactsClause(fenBefore: string, san: string, prev?: PrevCaptureContext): string | null {
  try {
    const c = new Chess(fenBefore);
    const mv = c.move(san);
    if (!mv) return null;
    const f = computePlyFacts(fenBefore, c.fen(), {
      captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion,
    }, prev);
    const parts: string[] = [];
    if (f.captured) parts.push(`captures the ${f.captured}`);
    if (f.isMate) parts.push('delivers checkmate');
    else if (f.isCheck) parts.push('gives check');
    if (f.promotion) parts.push(`promotes to a ${f.promotion}`);
    if (f.tacticLanded) parts.push(`lands a ${f.tacticLanded}`);
    if (f.outpostGained) parts.push(`plants an outpost on ${f.outpostGained}`);
    if (f.newPassedPawns.length > 0) parts.push(`creates a passed pawn on ${f.newPassedPawns.join(', ')}`);
    if (f.newOpenFiles.length > 0) parts.push(`opens the ${f.newOpenFiles.join(' and ')}-file`);
    if (f.shieldLost > 0) parts.push(`strips ${f.shieldLost} pawn${f.shieldLost > 1 ? 's' : ''} from the king's cover`);
    // "wins material", never the point count (David 2026-07-24 — sounds bad).
    if (f.materialGained >= 1) parts.push('wins material');
    return parts.length === 0 ? null : parts.join(', ');
  } catch {
    return null;
  }
}

/**
 * Rich per-move facts for a REAL game move (fenBefore + SAN) — the SAME deep
 * PlyFacts computer the PV playout narrates (captures, newly-created tactics,
 * outposts, passed pawns, opened files, material, king-shield). The basic walk
 * used only the thinner `buildReviewMoveTeaching`, so quiet-but-eventful moves
 * went silent and read worse than the best-move lines (David 2026-07-20: "the
 * best move lines have way better narration"). Routing the walk through this
 * unifies the quality. Null on a genuinely quiet move (no concrete fact) →
 * silence, per the Narration Voice Rules. Pure — chess.js validates the SAN.
 */
export function plyFactsForMove(fenBefore: string, san: string, prev?: PrevCaptureContext, moverIsStudent?: boolean): string | null {
  try {
    const c = new Chess(fenBefore);
    const mv = c.move(san);
    if (!mv) return null;
    const f = computePlyFacts(fenBefore, c.fen(), {
      captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion,
    }, prev);

    // Don't RESTATE a bare capture the student watched happen (Narration rule
    // #3 — the board already told that story): if the only fact is the capture
    // itself, no material won and no tactical/structural consequence, stay
    // silent. A capture that WINS material or lands a real tactic still speaks.
    const onlyBareCapture = !!f.captured && f.materialGained < 1 && !f.tacticLanded
      && !f.isCheck && !f.outpostGained && f.newPassedPawns.length === 0
      && f.newOpenFiles.length === 0 && f.shieldLost === 0;

    // Name the PLAYER, not "The move Nxb5 …" (David 2026-07-23: the robotic
    // "The move X …" prefix restated the move). "You capture" (student) /
    // "Your opponent captures" (other side) with correct verb agreement; the
    // subjectless "The move …" only when the seat isn't known (back-compat).
    const isYou = moverIsStudent === true;
    const subject = isYou ? 'You' : moverIsStudent === false ? 'Your opponent' : `The move ${mv.san}`;
    const vb = (base: string, third: string): string => (isYou ? base : third);
    const plural = (n: number): string => (n > 1 ? 's' : '');
    const parts: string[] = [];
    if (f.captured) parts.push(vb(`capture the ${f.captured}`, `captures the ${f.captured}`));
    if (f.isMate) parts.push(vb('deliver checkmate', 'delivers checkmate'));
    else if (f.isCheck) parts.push(vb('give check', 'gives check'));
    if (f.promotion) parts.push(vb(`promote to a ${f.promotion}`, `promotes to a ${f.promotion}`));
    if (f.tacticLanded) parts.push(vb(`land a ${f.tacticLanded}`, `lands a ${f.tacticLanded}`));
    if (f.outpostGained) parts.push(vb(`plant an outpost on ${f.outpostGained}`, `plants an outpost on ${f.outpostGained}`));
    if (f.newPassedPawns.length > 0) parts.push(vb(`create a passed pawn on ${f.newPassedPawns[0]}`, `creates a passed pawn on ${f.newPassedPawns[0]}`));
    if (f.newOpenFiles.length > 0) parts.push(vb(`open the ${f.newOpenFiles[0]}-file`, `opens the ${f.newOpenFiles[0]}-file`));
    if (f.shieldLost > 0) parts.push(vb(`strip ${f.shieldLost} pawn${plural(f.shieldLost)} from the king's cover`, `strips ${f.shieldLost} pawn${plural(f.shieldLost)} from the king's cover`));
    // "win/wins material", never the point count (David 2026-07-24 — sounds bad).
    if (f.materialGained >= 1) parts.push(vb('win material', 'wins material'));

    if (parts.length === 0 || onlyBareCapture) return null;
    // A check ALONE teaches nothing as bare "gives check" — say what it DOES:
    // forces a reply and hands the checker a free move (David 2026-07-25: TEACH
    // every move, no thin lines). Only when the check is the SOLE fact; joined
    // with a capture/tactic the plain "gives check" clause still reads fine.
    if (parts.length === 1 && f.isCheck && !f.isMate) {
      return `${subject} ${vb('check the king, forcing a reply and taking the initiative for a move', 'checks the king, forcing a reply and taking the initiative for a move')}.`;
    }
    return `${subject} ${parts.join(', ')}.`;
  } catch {
    return null;
  }
}

/** The whole line's facts, one numbered bundle per ply (audit/debug view). */
export function pvFactsForVoice(line: PvLine): string {
  return line.plies
    .map((p, i) => `${i + 1}) ${plyFactsString(p) ?? p.san}`)
    .join('\n');
}
