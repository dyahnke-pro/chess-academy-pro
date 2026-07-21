/**
 * reviewForcedSequence — detect a FORCED checking sequence that ends in mate, so
 * the review can TEACH the forcing-move concept (David 2026-07-20, narrating vs
 * teaching): "from here it's forced — a string of checks the king can't escape,
 * and it ends in mate. Watch." Then the walk plays the sequence out.
 *
 * A forced mating run is the maximal suffix of the game that ENDS in checkmate
 * where every attacker move gives check (or mate) and every defender move is made
 * WHILE IN CHECK (a forced response). Pure board-truth (chess.js): we replay the
 * game and read `inCheck()` + the SAN's check marker — nothing inferred.
 */
import { Chess } from 'chess.js';

export interface ForcedMatingRun {
  /** 1-based ply where the forced run BEGINS (the first attacker check). */
  startPly: number;
  /** Number of plies in the run (>= 3 to be worth framing). */
  length: number;
}

/**
 * Find the forced checking sequence that ends the game in mate, or null. `sans`
 * is the full game in SAN. Only returns a run of >= 3 plies (a one-move mate is
 * not a "sequence" to frame; it's just named as mate by the conversion beat).
 */
export function detectForcedMatingSequence(sans: string[]): ForcedMatingRun | null {
  if (sans.length === 0) return null;
  const last = sans[sans.length - 1];
  if (!last.trimEnd().endsWith('#')) return null; // game didn't end in mate

  // Replay, recording per ply: was the mover IN CHECK before moving, and does the
  // move give check/mate? Both are board-true (chess.js).
  const chess = new Chess();
  const inCheckBefore: boolean[] = [];
  const givesCheck: boolean[] = [];
  for (const san of sans) {
    let ok = true;
    try {
      inCheckBefore.push(chess.inCheck());
      const mv = chess.move(san);
      if (!mv) ok = false;
    } catch {
      ok = false;
    }
    if (!ok) return null; // an illegal SAN → don't trust the sequence
    givesCheck.push(/[+#]$/.test(san));
  }

  // Walk backward from the mate: a ply belongs to the run if it GIVES check
  // (attacker) OR it was made while in check (forced defender response).
  let start = sans.length - 1; // the mating ply (index)
  for (let i = sans.length - 1; i >= 0; i -= 1) {
    if (givesCheck[i] || inCheckBefore[i]) start = i;
    else break;
  }
  const length = sans.length - start;
  if (length < 3) return null;
  return { startPly: start + 1, length };
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/**
 * Explain the MECHANISM of a mating sacrifice — WHY giving the piece works: the
 * forced recapture DEFLECTS/CLEARS a defender off a line, and a friendly piece
 * crashes down that line to mate (David 2026-07-20: "where is the teaching moment,
 * the WHY?"). Pure board-truth: we replay the game, and for the sac at `sacIdx`
 * check whether the recapturing piece VACATES a square that lies on the mating
 * move's path. Returns a clause like "drags the knight off d7, and the d-file
 * swings open for your rook to crash down to d8", or null when it isn't that motif.
 *
 * @param sans full game SAN
 * @param sacIdx 0-based index of the sacrifice move
 */
export function explainMatingSacMechanism(sans: string[], sacIdx: number): string | null {
  try {
    // Replay the whole game ONCE, reading each move's from/to (chess.js verbs) and
    // finding the checkmate ply by BOARD STATE (isCheckmate) — NOT the '#' glyph,
    // which the analysis pipeline may strip from stored SANs (David 2026-07-20
    // sweep: the Immortal/blackwin mates went unexplained because the glyph check
    // failed on glyph-less SANs).
    const chess = new Chess();
    const mv: ReturnType<Chess['move']>[] = [];
    let mateIdx = -1;
    for (let i = 0; i < sans.length; i += 1) {
      const m = chess.move(sans[i]); if (!m) return null; mv.push(m);
      if (chess.isCheckmate()) { mateIdx = i; break; }
    }
    // The mate must land within a few plies AFTER the sac (a forced finish).
    if (mateIdx < 0 || mateIdx <= sacIdx || mateIdx > sacIdx + 4) return null;
    const recapIdx = sacIdx + 1;
    if (recapIdx >= mateIdx) return null; // need a recapture between sac and mate

    const recap = mv[recapIdx];
    const mate = mv[mateIdx];
    const recapName = PIECE_NAME[recap.piece] ?? 'piece';
    const mateName = PIECE_NAME[mate.piece] ?? 'piece';

    // (A) LINE-CLEARANCE: the mating move is a slider, and the forced recapture
    // VACATED a square on the mating line (Opera: Qb8+ Nxb8 clears d-file for Rd8#).
    const path = squaresBetween(mate.from, mate.to);
    if (path.length > 0 && path.includes(recap.from)) {
      const file = mate.from[0] === mate.to[0] ? `${mate.to[0]}-file` : mate.from[1] === mate.to[1] ? `${mate.to[1]}th rank` : 'diagonal';
      return `it drags the ${recapName} off ${recap.from}, and the ${file} swings wide open — your ${mateName} crashes down to ${mate.to} and it's mate`;
    }

    // (B) DEFLECTION: the forced recapture drags a DEFENDER off the mating square —
    // the recapturing piece was guarding the square the mate lands on (Immortal:
    // Qf6+ decoys the g8 knight off guarding e7, then Be7#). Read the guard by
    // replaying to the position just BEFORE the recapture and checking whether the
    // piece on recap.from attacked mate.to.
    const before = new Chess();
    for (let i = 0; i < recapIdx; i += 1) before.move(sans[i]);
    const defenderColor = recap.color; // the side that recaptures = the defending side
    const guards = before.attackers(mate.to, defenderColor);
    if (Array.isArray(guards) && guards.includes(recap.from)) {
      return `it drags the ${recapName} off ${recap.from} — the piece that was guarding ${mate.to} — and with that guard gone your ${mateName} delivers mate there`;
    }

    return null;
  } catch {
    return null;
  }
}

/** Squares strictly between two squares along a file/rank/diagonal, else []. */
function squaresBetween(from: string, to: string): string[] {
  const f0 = from.charCodeAt(0) - 97; const r0 = Number(from[1]) - 1;
  const f1 = to.charCodeAt(0) - 97; const r1 = Number(to[1]) - 1;
  const df = Math.sign(f1 - f0); const dr = Math.sign(r1 - r0);
  const straight = f0 === f1 || r0 === r1;
  const diagonal = Math.abs(f1 - f0) === Math.abs(r1 - r0);
  if (!straight && !diagonal) return [];
  const out: string[] = [];
  let f = f0 + df; let r = r0 + dr;
  while (f !== f1 || r !== r1) {
    if (f < 0 || f > 7 || r < 0 || r > 7) return [];
    out.push(`${String.fromCharCode(97 + f)}${r + 1}`);
    f += df; r += dr;
  }
  return out;
}
