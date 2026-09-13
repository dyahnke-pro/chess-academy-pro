// Computed signals for the Learn-with-Coach classroom opener (David 2026-09-13:
// "an algo based statement that suggests things to work on / things the user
// hasn't tried yet … keeps the intro new … WHILE keeping it relevant to training
// that benefits them"). G0: the coach VOICES these facts, it decides nothing —
// both are computed board/history truth handed to the opener, which caps them so
// the intro stays short ("I don't want the intro too long and annoying").
//
// Two signals, both from the on-device history (no network, no LLM):
//   1. ratingTrendNote  — the student's rating TREND over recent rated games, so
//      the coach visibly tracks their history ("CC noted his elo dropping").
//   2. untriedFeatureNudge — a surface they haven't used yet, chosen to help the
//      weakness the opener is already leading with (relevance is the point).
import { db } from '../db/schema';
import { resolvePlayerColor } from './playerIdentity';
import type { WeaknessCategory } from '../types';

/** The student's own identity for side-resolution (same precedence the rest of
 *  the app uses: chess.com → lichess → profile name). */
async function playerName(): Promise<string | null> {
  try {
    const profile = await db.profiles.toCollection().first();
    return profile?.preferences.chessComUsername
      ?? profile?.preferences.lichessUsername
      ?? profile?.name
      ?? null;
  } catch { return null; }
}

export interface RatingTrend {
  direction: 'down' | 'up';
  deltaPts: number;
  games: number;
  /** A short, ready-to-speak clause — no move-number prefixes, no invented
   *  number (the delta is the real one from the games). */
  clause: string;
}

/** The student's rating delta across their recent RATED games (their own side's
 *  Elo), newest-to-oldest. Null when there isn't enough signal or the swing is
 *  flat — silence over a manufactured trend (empty > generic > invented). Never
 *  invents a number; the delta is measured from the stored per-game Elo. */
export async function ratingTrendNote(windowSize = 12): Promise<RatingTrend | null> {
  try {
    const name = await playerName();
    const games = (await db.games.filter((g) => !g.isMasterGame && g.result !== '*').toArray())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // newest first
    const elos: number[] = [];
    for (const g of games) {
      const color = resolvePlayerColor(g, { profileName: name });
      if (!color) continue;
      const elo = color === 'white' ? g.whiteElo : g.blackElo;
      if (typeof elo === 'number' && elo > 0) elos.push(elo);
      if (elos.length >= windowSize) break;
    }
    if (elos.length < 5) return null; // too few rated games to read a trend honestly
    const latest = elos[0];
    const earliest = elos[elos.length - 1];
    const delta = latest - earliest; // positive = climbing, negative = slipping
    const abs = Math.abs(delta);
    if (abs < 25) return null; // flat — nothing worth saying
    const direction: 'down' | 'up' = delta < 0 ? 'down' : 'up';
    const clause = direction === 'down'
      ? `your rating's slipped about ${abs} points across your last ${elos.length} games`
      : `you've climbed about ${abs} points across your last ${elos.length} games`;
    return { direction, deltaPts: abs, games: elos.length, clause };
  } catch { return null; }
}

type FeatureKey = 'tactics' | 'openings' | 'endgame' | 'review' | 'play';

/** The surface that trains each weakness category — so an untried nudge stays
 *  RELEVANT to what the student needs (David: "keeping it relevant to training
 *  that benefits them"). */
const FEATURE_FOR_WEAKNESS: Record<WeaknessCategory, FeatureKey> = {
  tactics: 'tactics',
  calculation: 'tactics',
  openings: 'openings',
  opening_weakspots: 'openings',
  endgame: 'endgame',
  positional: 'review',
  time_management: 'play',
};

const FEATURE_META: Record<FeatureKey, { chip: string; name: string }> = {
  tactics: { chip: 'Try the tactics trainer', name: 'the tactics trainer' },
  openings: { chip: 'Study an opening', name: 'the openings trainer' },
  endgame: { chip: 'Train an endgame', name: 'the endgame trainer' },
  review: { chip: 'Review your last game', name: 'game review' },
  play: { chip: 'Play a game with me', name: 'Play with Coach' },
};

/** Has the student ever USED this surface? Read off its own on-device stores —
 *  fail-SAFE to "used" so an error never nudges toward something they know. */
async function featureUsed(f: FeatureKey): Promise<boolean> {
  try {
    switch (f) {
      case 'tactics':
        return (await db.mistakePuzzles.count()) > 0
          || (await db.setupPuzzles.count()) > 0
          || (await db.classifiedTactics.count()) > 0;
      case 'openings':
        return (await db.openings.filter((o) => o.isRepertoire).count()) > 0
          || (await db.srsOpeningCards.count()) > 0
          || (await db.flashcards.count()) > 0;
      case 'endgame':
        return (await db.endgameProgress.count()) > 0;
      case 'review':
        return (await db.games.filter((g) => !g.isMasterGame && (g.annotations?.length ?? 0) > 0).count()) > 0;
      case 'play':
        return (await db.games.filter((g) => g.source === 'coach').count()) > 0;
    }
  } catch { return true; }
  return true;
}

export interface UntriedFeature { chip: string; feature: FeatureKey; name: string; }

/** The top surface the student HASN'T tried yet — prefer the one that trains
 *  their current weakness, then fall through a sensible discovery order. Null
 *  when they've already tried everything (don't nudge toward the known). */
export async function untriedFeatureNudge(
  weaknessCategory?: string | null,
): Promise<UntriedFeature | null> {
  try {
    const relevant = weaknessCategory && (weaknessCategory in FEATURE_FOR_WEAKNESS)
      ? FEATURE_FOR_WEAKNESS[weaknessCategory as WeaknessCategory]
      : null;
    const discovery: FeatureKey[] = ['tactics', 'review', 'openings', 'endgame', 'play'];
    const order = relevant ? [relevant, ...discovery.filter((f) => f !== relevant)] : discovery;
    for (const f of order) {
      if (!(await featureUsed(f))) {
        const meta = FEATURE_META[f];
        return { chip: meta.chip, feature: f, name: meta.name };
      }
    }
    return null;
  } catch { return null; }
}
