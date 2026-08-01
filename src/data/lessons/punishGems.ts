// Punish-the-inaccuracy gems → WLPP-ready lines (WO: docs/plans/2026-05-23-punish-gems-wo.md).
//
// The weapon section's SPINE: the common move the opponent actually plays at
// your level that scores badly for them, and the punish played out to its
// resolution. Mined from the amateur DB (the mistake) + masters (the crush)
// by scripts/mine-punish-gems.mjs. Every move comes from the DB; every claim
// from explorer numbers / the engine — nothing invented (G3).
import { Chess } from 'chess.js';
import gemsData from '../punish-gems.json';
import gambitGemsData from '../gambit-punish-gems.json';
import { getGemNarration, hasGemNarration } from './punishGemNarration';
import { narrateContinuationMove } from '../../services/continuationMoveNarration';
import { deriveNarrationArrows } from '../../services/narrationArrows';
import { GAMBIT_GEM_NARRATION } from './gambitGemNarration';
import type { PlayableMiddlegameLine, AnnotationArrow } from '../../types';

export interface PunishGem {
  openingId: string;
  lineMoves: string;
  inaccuracy: string;
  freqPct: number;
  games: number;
  practicalScore: number;
  mainMove: string;
  punish: string;
  punishSeq: string[];
  playLine: string;
  engineCp: number | null;
  // 'confirmed' = engine ≥ +1.0 (a real crush — wins material or decisive
  // edge). 'positional' = +0.5 to +1.0 (clearly better, not winning).
  // 'practical' = DB-scored only, NOT engine-verified (sandbox). 'weak' =
  // engine < +0.5 (dropped by the miner). Only confirmed + positional are
  // WEAPONS that surface (David 2026-05-24).
  tier: 'practical' | 'positional' | 'confirmed' | 'weak';
  why: string;
  /** Plies appended by `extend-punish-gems.mjs` to play the advantage out onto
   *  the board. Hand-authored narration covers only the plies BEFORE these;
   *  the tail is narrated board-true at runtime. Absent on un-extended gems. */
  demonstrationPlies?: number;
}

// Masterclass gems + the SEPARATE-LANE gambit gems (David 2026-05-27). Sourced
// from distinct files (gambit-punish-gems.json is never touched by the
// masterclass lane); merged only here in the consumer, and they never collide
// because they're keyed by distinct openingIds (gambit-* vs masterclass ids).
const GEMS = [...(gemsData as PunishGem[]), ...(gambitGemsData as PunishGem[])];

// Narration lookup that also covers the gambit-lane narration map, so gambit
// gems surface + play through the same WLPP path without the masterclass
// punishGemNarration.ts depending on the gambit file.
export function gemNarrationFor(id: string): ReturnType<typeof getGemNarration> {
  return GAMBIT_GEM_NARRATION[id] ?? getGemNarration(id);
}
function hasNarrationFor(id: string): boolean {
  return id in GAMBIT_GEM_NARRATION || hasGemNarration(id);
}

/** The tiers that earn a place in the weapon section: engine-verified REAL
 *  benefit (≥ +0.5). Practical (unverified) and weak (< +0.5) are not weapons
 *  — a 6%-better win-rate or a recapture is a scouting signal, not a crush.
 *  David 2026-05-24: "any add of real benefit — winning a piece or real
 *  strategic advantage; positional ok but ~+1.0 or greater." */
export const WEAPON_TIERS: ReadonlySet<PunishGem['tier']> = new Set(['confirmed', 'positional']);
export function isWeaponGem(gem: PunishGem): boolean {
  return WEAPON_TIERS.has(gem.tier);
}

/** A gem SURFACES only when it's both a real weapon AND has hand-authored
 *  narration — no thin-narration gems ship (David 2026-05-24). As each gem's
 *  Watch script + Learn cues are hand-written, it lights up. */
export function isSurfaceableGem(gem: PunishGem): boolean {
  return isWeaponGem(gem) && hasNarrationFor(gemId(gem));
}

/** A stable id for state/keys — opening + the inaccuracy's position + the slip. */
export function gemId(gem: PunishGem): string {
  return `${gem.openingId}:${gem.lineMoves.replace(/\s+/g, '_')}:${gem.inaccuracy}`;
}

export function getPunishGemsForOpening(openingId: string | undefined | null): PunishGem[] {
  if (!openingId) return [];
  return GEMS.filter((g) => g.openingId === openingId);
}

/** Every gem (both lanes). A gem's `lineMoves` is a unique full opening spine, so
 *  a caller can look one up by position alone — no openingId resolution needed
 *  (the Watch walkthrough / review walk have the SAN path, not the kebab id). */
export function getAllPunishGems(): PunishGem[] {
  return GEMS;
}

/** Gems that sit on a given variation tab. A gem belongs to a tab when the
 *  gem's (short) opening spine is a PREFIX of the tab's (long, curated) line —
 *  i.e. the inaccuracy happens on the early part of that variation. When
 *  `tabSpinePgn` is empty/undefined (main line) every gem for the opening
 *  surfaces. A gem on a shared early structure (e.g. the e5 Advance) correctly
 *  surfaces on every variation that shares that prefix (Advance AND Short). */
export function getPunishGemsForTab(
  openingId: string | undefined | null,
  tabSpinePgn?: string | null,
): PunishGem[] {
  const all = getPunishGemsForOpening(openingId);
  const spine = (tabSpinePgn ?? '').trim();
  if (!spine) return all;
  const spineMoves = spine.split(/\s+/).filter(Boolean);
  return all.filter((g) => {
    const line = g.lineMoves.split(/\s+/).filter(Boolean);
    return line.length <= spineMoves.length && line.every((m, i) => spineMoves[i] === m);
  });
}

export function getPunishGemById(id: string): PunishGem | null {
  return GEMS.find((g) => gemId(g) === id) ?? null;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** FEN of the position the opponent faces just before they play the
 *  inaccuracy — the still the gem tile shows. */
export function gemInaccuracyFen(gem: PunishGem): string {
  const chess = new Chess();
  for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) {
    try { chess.move(san); } catch { break; }
  }
  return chess.fen();
}

/** Convert a gem into a WLPP-ready PlayableMiddlegameLine: the full line from
 *  move 1, each move carrying its lead-the-eye move-arrow (ORANGE = the move's
 *  two squares, per the locked colour language). Voice is grounded and
 *  lead-the-eye-clean: silent through the book setup, the inaccuracy beat
 *  names ONLY the inaccuracy (its move-arrow points there), the punish beat
 *  names ONLY the punish. No square is named without an arrow on it. */
export function gemToPlayableLine(gem: PunishGem): PlayableMiddlegameLine | null {
  const moves = gem.playLine.split(/\s+/).filter(Boolean);
  if (moves.length === 0) return null;

  const setup = gem.lineMoves.split(/\s+/).filter(Boolean);
  const inaccuracyPly = setup.length; // the inaccuracy is the first move after the spine
  const punishPly = inaccuracyPly + 1;

  // Hand-authored narration (Watch full + Learn cues), keyed by gemId. When
  // present it's used verbatim; otherwise the line falls back to a minimal
  // factual annotation (and won't surface — see isWeaponGem usage / the
  // narration gate). NEVER generated.
  const narration = gemNarrationFor(gemId(gem));

  const chess = new Chess(START_FEN);
  const arrows: AnnotationArrow[][] = [];
  const annotations: string[] = [];
  const learnCues: string[] = [];

  // The DEMONSTRATION TAIL (David 2026-08-01: "extend the trap lines until the
  // full advantage has played out. Some of the gems stopped short and didn't
  // really explain or show the advantage"). The miner used to stop at a fixed
  // 8 plies, routinely mid-recapture, so the student was told they won
  // something they never saw land. `extend-punish-gems.mjs` now plays each
  // refutation out to a quiet position where the material is actually on the
  // board, and records how many plies that took.
  //
  // Those extra plies are NOT hand-authored — authoring them would mean writing
  // prose for ~1,900 new plies, and inventing it is exactly what G3 forbids.
  // They are narrated by the same board-true composer the middlegame play-out
  // uses: every clause is checked against the position before it is spoken, so
  // the tail explains the advantage instead of just replaying moves silently.
  const authoredPlies = moves.length - (gem.demonstrationPlies ?? 0);

  for (let i = 0; i < moves.length; i++) {
    let from = '';
    let to = '';
    const fenBefore = chess.fen();
    let san = moves[i];
    try {
      const mv = chess.move(moves[i]);
      from = mv.from;
      to = mv.to;
      san = mv.san;
    } catch {
      // playLine is gate-proven legal, but stay defensive.
      break;
    }
    if (i >= authoredPlies) {
      const computed = narrateContinuationMove(fenBefore, chess.fen(), san, from, to);
      arrows.push(computed.arrows);
      annotations.push(computed.say);
      learnCues.push(computed.short);
      continue;
    }
    // The SAME arrow grammar the walkthrough uses (David 2026-08-01): ORANGE
    // trail on the move just played, GREEN vision arrows for the moves the
    // narration NAMES. Gems used to draw the orange trail alone, so a beat
    // saying "the knight on d5 hits c7 and e7" pointed at none of it — the
    // lead-the-eye rule broken on the one surface that is pure tactics.
    // Grounded the same way too: the authored Watch prose IS the gem's
    // teaching, and `deriveNarrationArrows` resolves each named move against
    // this exact position or draws nothing (G3).
    const watch = narration?.watch[i] ?? '';
    arrows.push(
      from && to
        ? [
            { from, to, color: 'orange' },
            ...deriveNarrationArrows(watch, chess.fen(), [{ from, to }]).arrows.map((a) => ({
              from: a.from,
              to: a.to,
              color: 'green' as const,
            })),
          ]
        : [],
    );
    learnCues.push(narration?.learn[i] ?? '');

    if (narration) {
      annotations.push(watch);
    } else if (i === inaccuracyPly) {
      annotations.push(
        `${gem.inaccuracy} is a common try here — at your level it scores worse for your opponent than the main move.`,
      );
    } else if (i === punishPly) {
      annotations.push(`Punish with ${gem.punish}.`);
    } else {
      annotations.push('');
    }
  }

  const title = `Punish ${gem.inaccuracy} with ${gem.punish}`;
  return { fen: START_FEN, moves, annotations, arrows, learnCues, title };
}
