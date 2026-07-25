/**
 * gemCrushLines — surface a curated punish-gem as an ARROW-traced crush line, in
 * BOTH the Learn Watch walkthrough AND the post-game review.
 *
 * David 2026-07-24: "I want learn to play as close to his videos as possible …
 * how to crush if they don't [refute]. The gem lines would be extremely
 * beneficial here!!!!" — then: "Add the gem calculator into review with coach as
 * well! I want it calculating and showing crush lines during review!!! And during
 * learn!!!"
 *
 * THE LOCKED MECHANISM: arrows show the lines, the board NEVER moves. Naroditsky
 * can't shove the pieces around a live position — he traces the crush with arrows
 * and talks through it. So this returns arrows on the CURRENT static position; the
 * caller draws them without advancing the board.
 *
 * THE TWO REGISTERS (2026-07-19 law — do not blur):
 *   - Learn / Watch  → present-tense, a DEMO line: "If White tries f3 here —
 *     natural, but a mistake — Black crushes with exf3." (`buildWatchGemSay`)
 *   - Review         → retrospective, the USER'S OWN game: "Your opponent played
 *     f3 — a known mistake; the crush was exf3." (`buildReviewGemSay`)
 * The CALCULATION (`computeGemCrush`) is register-neutral and shared.
 *
 * G0/G3: nothing invented. The gem (`punish-gems.json`) is hand-curated and
 * engine-verified; we only look it up by the exact position and compute the two
 * arrow squares via chess.js. Only surfaceable (weapon-tier + narrated) gems
 * qualify.
 */
import { Chess } from 'chess.js';
import {
  getPunishGemsForOpening,
  getAllPunishGems,
  isSurfaceableGem,
  gemId,
} from '../data/lessons/punishGems';
import type { NarrationArrow } from '../types/walkthroughTree';

/** Register-neutral crush facts + arrows. Both surfaces build their voicing from
 *  this; neither invents chess. */
export interface GemCrush {
  gemId: string;
  /** The opponent's natural-but-losing move (SAN). */
  inaccuracy: string;
  /** Our crushing reply (SAN). */
  punish: string;
  /** [ inaccuracy (red warning), punish (green) ] — drawn on the CURRENT static
   *  position; the board is never advanced. Both origins are real occupied
   *  squares (the punisher sits on its origin before the inaccuracy is played). */
  arrows: NarrationArrow[];
  /** Side that would play the inaccuracy (the opponent of the taught side). */
  opponentSide: 'white' | 'black';
  /** The taught side — the one that plays the punish. */
  studentSide: 'white' | 'black';
  /** 'confirmed' = wins material; 'positional' = clearly better. */
  tier: 'confirmed' | 'positional';
  /** FEN of the position the arrows are drawn on (after the gem's spine). */
  staticFen: string;
}

function sideWord(turn: 'w' | 'b'): 'white' | 'black' {
  return turn === 'w' ? 'white' : 'black';
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

/**
 * If the SAN path sits EXACTLY on a surfaceable gem's opening spine (the position
 * where the opponent could play the natural mistake), compute the crush facts +
 * arrows. Register-neutral — the caller adds the voicing. Otherwise null.
 */
export function computeGemCrush(
  openingId: string | undefined | null,
  pathSans: string[],
): GemCrush | null {
  const key = pathSans.join(' ').trim();
  if (key.length === 0) return null;

  // Scope to the opening's gems when we know the id; otherwise scan all gems —
  // a gem's `lineMoves` is a unique full opening spine, so a position match is
  // unambiguous even without the kebab id (the walkthrough has the SAN path,
  // not the id).
  const pool = openingId ? getPunishGemsForOpening(openingId) : getAllPunishGems();
  const gem = pool
    .filter(isSurfaceableGem)
    .find((g) => g.lineMoves.trim() === key);
  if (!gem || (gem.tier !== 'confirmed' && gem.tier !== 'positional')) return null;

  // Static position = after the gem's opening spine (opponent to move).
  let staticFen: string;
  try {
    const c = new Chess();
    for (const s of gem.lineMoves.split(/\s+/).filter(Boolean)) {
      if (!c.move(s)) return null;
    }
    staticFen = c.fen();
  } catch {
    return null;
  }

  // Compute inaccuracy + punish geometry. Both arrows are drawable on the static
  // board: the punishing piece sits on its origin square before the inaccuracy.
  let inFrom: string;
  let inTo: string;
  let puFrom: string;
  let puTo: string;
  let opponent: 'w' | 'b';
  try {
    const c = new Chess(staticFen);
    opponent = c.turn();
    const im = c.move(gem.inaccuracy);
    if (!im) return null;
    inFrom = im.from;
    inTo = im.to;
    const pm = c.move(gem.punish);
    if (!pm) return null;
    puFrom = pm.from;
    puTo = pm.to;
  } catch {
    return null;
  }

  return {
    gemId: gemId(gem),
    inaccuracy: gem.inaccuracy,
    punish: gem.punish,
    arrows: [
      { from: inFrom, to: inTo, color: 'red' }, // the tempting mistake
      { from: puFrom, to: puTo, color: 'green' }, // our crush
    ],
    opponentSide: sideWord(opponent),
    studentSide: sideWord(opponent === 'w' ? 'b' : 'w'),
    tier: gem.tier,
    staticFen,
  };
}

// ─── Learn / Watch voicing — PRESENT TENSE, a demo line ────────────────────
export interface GemAside {
  gemId: string;
  arrows: NarrationArrow[];
  say: string;
  short: string;
}

/** Present-tense crush aside for the Watch walkthrough (Naroditsky's in-game
 *  register). "If White tries f3 here — natural, but a mistake — Black crushes
 *  with exf3." */
export function buildWatchGemSay(crush: GemCrush): string {
  const opp = cap(crush.opponentSide);
  const us = cap(crush.studentSide);
  const payoff = crush.tier === 'confirmed' ? 'and we win material' : "and we're clearly better";
  return `If ${opp} tries ${cleanSan(crush.inaccuracy)} here — natural-looking, but a mistake — ${us} crushes with ${cleanSan(crush.punish)}, ${payoff}.`;
}

export function computeWatchGemAside(
  openingId: string | undefined | null,
  pathSans: string[],
): GemAside | null {
  const crush = computeGemCrush(openingId, pathSans);
  if (!crush) return null;
  return {
    gemId: crush.gemId,
    arrows: crush.arrows,
    say: buildWatchGemSay(crush),
    short: `${cleanSan(crush.inaccuracy)}? Punish ${cleanSan(crush.punish)}.`,
  };
}

// ─── Review voicing — RETROSPECTIVE, the user's own game ───────────────────
export interface ReviewGemOptions {
  /** Did the opponent actually play the gem inaccuracy in this game? */
  opponentPlayedInaccuracy: boolean;
  /** Did the student then actually play the crushing punish? */
  studentPlayedPunish?: boolean;
}

/**
 * Retrospective crush note for the post-game review. Framed around what actually
 * happened in the USER'S game (never the present-tense demo register):
 *   - opponent played the mistake + student found the crush → confirm it landed
 *   - opponent played the mistake + student missed it        → the missed crush
 *   - opponent avoided it                                    → they sidestepped it
 */
export function buildReviewGemSay(crush: GemCrush, opts: ReviewGemOptions): string {
  const opp = cap(crush.opponentSide);
  const inSan = cleanSan(crush.inaccuracy);
  const puSan = cleanSan(crush.punish);
  const payoff = crush.tier === 'confirmed' ? 'winning material' : 'with a clearly better game';
  if (!opts.opponentPlayedInaccuracy) {
    // The opponent stayed on the main move — a teaching aside, not a live line.
    return `${opp} avoided ${inSan} here — the natural move that loses to ${puSan}, ${payoff}.`;
  }
  if (opts.studentPlayedPunish) {
    return `${opp} played ${inSan} — a known mistake — and you punished it correctly with ${puSan}, ${payoff}. Well spotted.`;
  }
  return `${opp} played ${inSan} here — a known mistake — and the crush was ${puSan}, ${payoff}.`;
}
