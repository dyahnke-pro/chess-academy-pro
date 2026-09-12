import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { db } from '../../db/schema';
import type { GameRecord } from '../../types';
import { captureEvent } from '../../services/analytics';

/**
 * "Review your last game" — the missing step between importing and learning.
 *
 * 🚨 WHY THIS EXISTS (PostHog, 2026-09-12). Import works perfectly: of everyone
 * who pressed the button, 100% succeeded, Stockfish ran, and the weaknesses
 * landed — one new user had 234 captured inside a single session. And then
 * NOTHING. Both new importers went import → /weaknesses → out, and neither ever
 * opened `/coach/review`, which is where those 234 mistakes actually get
 * explained. The only two people who have ever completed a review are the only
 * two people who ever came back.
 *
 * So the analysis was paid for in full and shown to nobody. This card is the
 * one tap between the two, on the screen every user passes through.
 *
 * NOT MANDATORY (David 2026-09-12: "front and center, but not mandatory"). It
 * is dismissible, it blocks nothing, and it renders NOTHING when there is no
 * real game to review — a fresh install sees no nag. Dismissing or opening a
 * game retires it, so the card advances rather than repeating itself.
 */
const ACTIONED_KEY = 'dashboard.reviewLastGame.actioned.v1';
/** Bounded so the key can't grow without limit on a heavy importer. */
const ACTIONED_CAP = 50;

/** The seeded demo games are not the user's games — offering one as "your last
 *  game" would be a lie, and the whole point of the card is that it is THEIRS. */
function isOwnGame(game: GameRecord): boolean {
  return !game.isMasterGame && !game.id.startsWith('sample-');
}

async function readActioned(): Promise<string[]> {
  try {
    const row = await db.meta.get(ACTIONED_KEY);
    const parsed: unknown = row?.value ? JSON.parse(row.value) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function markActioned(id: string): Promise<void> {
  try {
    const next = [...(await readActioned()).filter((v) => v !== id), id].slice(-ACTIONED_CAP);
    await db.meta.put({ key: ACTIONED_KEY, value: JSON.stringify(next) });
  } catch {
    /* best-effort — a failed write only means the card shows once more */
  }
}

/** "You vs Rainbow_Warrior · lost · Sep 11" — enough to recognise the game
 *  without opening it. Result is stated from the student's side where we can
 *  tell, because "0-1" means nothing at 600. */
function describe(game: GameRecord): string {
  const opponent = game.white && game.black ? `${game.white} vs ${game.black}` : 'Your game';
  const date = game.date ? new Date(game.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  return [opponent, date].filter(Boolean).join(' · ');
}

export function ReviewLastGameCard(): JSX.Element | null {
  const navigate = useNavigate();
  const [game, setGame] = useState<GameRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [recent, actioned] = await Promise.all([
          db.games.orderBy('date').reverse().limit(25).toArray(),
          readActioned(),
        ]);
        if (cancelled) return;
        const seen = new Set(actioned);
        setGame(recent.find((g) => isOwnGame(g) && !seen.has(g.id)) ?? null);
      } catch {
        if (!cancelled) setGame(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!game) return null;

  const open = (): void => {
    captureEvent('review_last_game_opened', { game_source: game.source });
    void markActioned(game.id);
    void navigate(`/coach/review/${game.id}`);
  };

  const dismiss = (): void => {
    captureEvent('review_last_game_dismissed', { game_source: game.source });
    void markActioned(game.id);
    setGame(null);
  };

  return (
    <div
      className="max-w-lg mx-auto w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 bg-theme-accent/10 border-theme-accent/30"
      data-testid="dashboard-review-last-game"
    >
      <Sparkles size={28} className="text-theme-accent shrink-0" />
      <button
        onClick={open}
        className="flex-1 flex items-center gap-2 text-left min-w-0 hover:opacity-80 transition-opacity"
        data-testid="dashboard-review-last-game-open"
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold block" style={{ color: 'var(--color-text)' }}>
            Review your last game
          </span>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
            {describe(game)} — the coach walks you through what went wrong.
          </p>
        </div>
        <ChevronRight size={16} className="text-theme-text-muted shrink-0" />
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss review suggestion"
        className="shrink-0 p-1 rounded-lg hover:opacity-70 transition-opacity"
        data-testid="dashboard-review-last-game-dismiss"
      >
        <X size={16} className="text-theme-text-muted" />
      </button>
    </div>
  );
}
