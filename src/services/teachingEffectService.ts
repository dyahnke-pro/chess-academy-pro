/**
 * teachingEffectService — the I/O DOOR for `teachingEffect` (the pure leaf).
 *
 * Reads the student's mistake record and analysed games, runs the computer,
 * and publishes the verdicts: one `teaching-effect` audit row (the local log)
 * and one PostHog `teaching_effect` event per kind with a direction. Called on
 * the two discrete student events that add evidence — a Play game finishing
 * and a Review being opened — never per game of a backfill sweep.
 */
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import { captureEvent } from './analytics';
import { isFixtureGame } from './fixtureGames';
import { teachingEffects, type EffectGame, type EffectRow, type TeachingEffect } from './teachingEffect';

/** A game's own time: PGN dates use dots ("2026.10.01"), coach games ISO. */
export function gameTime(date: string | undefined | null): number | null {
  if (!date) return null;
  const t = Date.parse(date.replace(/\./g, '-'));
  return Number.isFinite(t) ? t : null;
}

export async function reportTeachingEffects(trigger: 'play-finished' | 'review-opened'): Promise<TeachingEffect[]> {
  const [tagRows, gameRows] = await Promise.all([db.misconceptionTags.toArray(), db.games.toArray()]);
  const games: EffectGame[] = [];
  const timeById = new Map<string, number>();
  for (const g of gameRows) {
    if (isFixtureGame(g) || !g.annotations || g.annotations.length === 0) continue;
    const at = gameTime(g.date);
    if (at === null) continue;
    games.push({ id: g.id, at });
    timeById.set(g.id, at);
  }
  // A failed PUZZLE is not a slip in a game: counting it per game would read
  // a run of missed drills as the lesson failing to hold in play.
  const rows: EffectRow[] = tagRows.filter((r) => r.source !== 'puzzle').map((r) => ({
    kind: r.fundamentalId ?? r.tag,
    source: r.source === 'discussion-practice' || r.source === 'game-review' ? r.source : 'auto-analysis',
    at: (r.sourceGameId ? timeById.get(r.sourceGameId) : undefined) ?? r.createdAt,
    gameId: r.sourceGameId ?? null,
  }));
  const effects = teachingEffects(rows, games);
  const counts = { declining: 0, flat: 0, rising: 0, 'too-early': 0 };
  for (const e of effects) counts[e.verdict]++;
  void logAppAudit({
    kind: 'teaching-effect',
    category: 'subsystem',
    source: `teachingEffectService.${trigger}`,
    summary: `taught ${effects.length} kind(s): declining=${counts.declining} flat=${counts.flat} rising=${counts.rising} too-early=${counts['too-early']}`,
    details: JSON.stringify({ trigger, games: games.length, effects }),
  });
  for (const e of effects) {
    if (e.verdict === 'too-early') continue;
    captureEvent('teaching_effect', {
      kind: e.kind,
      verdict: e.verdict,
      rate_before: Math.round(e.rateBefore * 100) / 100,
      rate_after: Math.round(e.rateAfter * 100) / 100,
      games_before: e.gamesBefore,
      games_after: e.gamesAfter,
      trigger,
    });
  }
  return effects;
}
