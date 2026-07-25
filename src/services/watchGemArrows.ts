/**
 * watchGemArrows — surface a curated punish-gem as an ARROW-ONLY crush aside in
 * the Watch walkthrough.
 *
 * David 2026-07-24: "I want learn to play as close to his videos as possible …
 * he states what his move threatens, how the opponent should refute it, and how
 * to crush if they don't. The gem lines would be extremely beneficial here!!!!"
 *
 * When a natural-but-losing move is available to the opponent, Naroditsky traces
 * the punish with ARROWS on his static board and says "if he tries this, watch —
 * we crush." He can't move the pieces (it's a live game); neither can we. So this
 * returns arrows on the CURRENT position plus a present-tense, side-framed line,
 * and the caller draws them WITHOUT advancing the board (the locked mechanism:
 * arrows show the lines, the board never moves).
 *
 * G0/G3: nothing is invented. The gem (`punish-gems.json`) is hand-curated and
 * engine-verified; we only look it up by the exact opening position and compute
 * the two arrow squares via chess.js. Only surfaceable (weapon-tier + narrated)
 * gems qualify, so no thin/unverified line ever surfaces.
 */
import { Chess } from 'chess.js';
import {
  getPunishGemsForOpening,
  isSurfaceableGem,
  gemId,
} from '../data/lessons/punishGems';
import type { NarrationArrow } from '../types/walkthroughTree';

export interface WatchGemAside {
  gemId: string;
  /** The opponent's natural-but-losing move (SAN). */
  inaccuracy: string;
  /** Our crushing reply (SAN). */
  punish: string;
  /** [ opponent inaccuracy (red warning), our punish (green) ] — drawn on the
   *  CURRENT static position; the board is never advanced. */
  arrows: NarrationArrow[];
  /** Present-tense, side-framed crush line (Naroditsky's in-game register). */
  say: string;
  /** ≤8-word cue for Brief mode. */
  short: string;
}

function sideWord(turn: 'w' | 'b'): string {
  return turn === 'w' ? 'White' : 'Black';
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

/**
 * If the walkthrough's current SAN path sits EXACTLY on a surfaceable gem's
 * opening spine (the position where the opponent could play the natural mistake),
 * return the arrow-only crush aside. Otherwise null.
 *
 * @param openingId  the gem key (e.g. "caro-kann"); null/unknown → no aside.
 * @param pathSans   the walkthrough's SAN path so far (no move-number prefixes).
 */
export function computeWatchGemAside(
  openingId: string | undefined | null,
  pathSans: string[],
): WatchGemAside | null {
  const gems = getPunishGemsForOpening(openingId).filter(isSurfaceableGem);
  if (gems.length === 0) return null;

  const key = pathSans.join(' ').trim();
  if (key.length === 0) return null;
  const gem = gems.find((g) => g.lineMoves.trim() === key);
  if (!gem) return null;

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

  // Compute the inaccuracy + punish geometry. Both arrows are drawable on the
  // static board: the punishing piece sits on its origin square before the
  // inaccuracy is played, so `punish.from` is a real occupied square now.
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

  const arrows: NarrationArrow[] = [
    { from: inFrom, to: inTo, color: 'red' }, // the tempting mistake
    { from: puFrom, to: puTo, color: 'green' }, // our crush
  ];

  const opp = sideWord(opponent);
  const us = sideWord(opponent === 'w' ? 'b' : 'w');
  const payoff =
    gem.tier === 'confirmed' ? 'and we win material' : "and we're clearly better";
  const inSan = cleanSan(gem.inaccuracy);
  const puSan = cleanSan(gem.punish);
  const say = `If ${opp} tries ${inSan} here — natural-looking, but a mistake — ${us} crushes with ${puSan}, ${payoff}.`;
  const short = `${inSan}? Punish ${puSan}.`;

  return {
    gemId: gemId(gem),
    inaccuracy: gem.inaccuracy,
    punish: gem.punish,
    arrows,
    say,
    short,
  };
}
