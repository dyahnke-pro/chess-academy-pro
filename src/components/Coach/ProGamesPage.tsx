import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Medal } from 'lucide-react';
import { ModelGameViewer } from '../Openings/ModelGameViewer';
import { PageHelp } from '../Layout/PageHelp';
import { getPlayers } from '../../services/proRepertoireService';
import { getGameReferencesForPlayer } from '../../services/proGameReferenceService';
import { loadProGameReferenceData } from '../../services/proGameReferenceData';
import { logAppAudit } from '../../services/appAuditor';
import type { ModelGame, ProGameReference } from '../../types';

/**
 * Pro Games — rewatch how any pro plays a certain opening.
 *
 * 🔒 DAVID 2026-08-13: "The pro games under coach tab are so users can rewatch
 * how any pro plays a certain opening. Make sure that's wired in, it's not
 * dead weight." The full-map audit had filed the 2,209-game reference corpus
 * (STEP 11.5's breadth layer) as dead duplication because no user-facing
 * surface read it — the coach's LLM context was its only consumer. This page
 * is the surface it was collected FOR: pick a pro, pick the opening, watch
 * their actual games play out.
 *
 * Data path: the Dexie store (`proGameReferenceService`) — seeded on every
 * boot by dataLoader, pruned per G8 — with the fetch loader as the fallback
 * for the boot race where the page mounts before the seed lands. Replay goes
 * through the existing `ModelGameViewer` (the same board students already
 * know from model games) rather than a new player; a reference is adapted
 * into the viewer's shape, never duplicated.
 */

/** A reference game in the shape the ModelGameViewer replays. */
export function referenceToViewerGame(ref: ProGameReference): ModelGame {
  return {
    id: ref.id,
    openingId: ref.proOpeningId,
    white: ref.white,
    black: ref.black,
    whiteElo: ref.studentSide === 'black' ? ref.opponentRating : null,
    blackElo: ref.studentSide === 'white' ? ref.opponentRating : null,
    result: ref.result,
    year: ref.date ? Number(ref.date.slice(0, 4)) : 0,
    event: ref.source === 'otb' ? 'Over the board' : ref.source,
    pgn: ref.pgn,
    studentSide: ref.studentSide,
    // The whole corpus is real, unannotated games — the overview states what
    // the viewer is looking at, computed from the reference's own fields (G0:
    // no prose is invented about the moves).
    overview: `${ref.variationLabel} — ${ref.white} vs ${ref.black}`
      + `${ref.opponentRating ? ` (${ref.opponentRating})` : ''}, ${ref.result}`
      + `${ref.date ? `, ${ref.date}` : ''}. Source: ${ref.source}.`,
  } as ModelGame;
}

interface OpeningGroup {
  proOpeningId: string;
  label: string;
  games: ProGameReference[];
}

/** Group one player's references by opening, most games first. */
export function groupByOpening(refs: ProGameReference[]): OpeningGroup[] {
  const byId = new Map<string, ProGameReference[]>();
  for (const r of refs) {
    const list = byId.get(r.proOpeningId) ?? [];
    list.push(r);
    byId.set(r.proOpeningId, list);
  }
  return [...byId.entries()]
    .map(([proOpeningId, games]) => ({
      proOpeningId,
      // Human label from the opening id — "pro-aman-anti-caro" → "Anti Caro".
      label: proOpeningId
        .replace(/^pro-[^-]+-/, '')
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      games: games.sort((a, b) => (b.opponentRating ?? 0) - (a.opponentRating ?? 0)),
    }))
    .sort((a, b) => b.games.length - a.games.length);
}

export function ProGamesPage(): JSX.Element {
  const navigate = useNavigate();
  const players = useMemo(() => getPlayers(), []);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [refs, setRefs] = useState<ProGameReference[] | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [watching, setWatching] = useState<ProGameReference | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    let alive = true;
    setRefs(null);
    setLoadError(false);
    void (async () => {
      try {
        // Dexie first (seeded every boot); if the page won the boot race and
        // the store is still empty, prime it from the fetched asset directly.
        let rows = await getGameReferencesForPlayer(playerId);
        if (rows.length === 0) {
          const all = await loadProGameReferenceData();
          rows = all.filter((r) => r.playerId === playerId);
        }
        if (alive) setRefs(rows);
      } catch {
        if (alive) { setRefs([]); setLoadError(true); }
      }
    })();
    return () => { alive = false; };
  }, [playerId]);

  const groups = useMemo(() => (refs ? groupByOpening(refs) : []), [refs]);
  const group = groups.find((g) => g.proOpeningId === openingId) ?? null;
  const playerName = players.find((p) => p.id === playerId)?.name ?? playerId ?? '';

  // ── Watching a game: the ModelGameViewer owns the whole screen ──────────
  if (watching) {
    return (
      <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        <ModelGameViewer
          game={referenceToViewerGame(watching)}
          boardOrientation={watching.studentSide}
          onExit={() => setWatching(null)}
        />
      </div>
    );
  }

  const back = (): void => {
    if (openingId) { setOpeningId(null); return; }
    if (playerId) { setPlayerId(null); return; }
    void navigate('/coach/home');
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      data-testid="pro-games-page"
    >
      <div className="relative mt-2">
        <button
          onClick={back}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:opacity-80"
          data-testid="pro-games-back"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-center">
          {group ? group.label : playerId ? playerName : 'Pro Games'}
        </h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <PageHelp
            helpId="pro-games"
            title="Rewatch the pros"
            steps={[
              { label: 'Pick a pro', body: 'Every player whose repertoire is in the app, with their real games behind them.' },
              { label: 'Pick an opening', body: 'Their games are grouped by the opening and variation they actually played.' },
              { label: 'Watch it play out', body: 'Step through the full game on the board — the same viewer the model games use. Strongest opponents first.' },
            ]}
          />
        </div>
      </div>

      {/* ── Step 1: pick a pro ─────────────────────────────────────────── */}
      {!playerId && (
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full" data-testid="pro-games-players">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlayerId(p.id)}
              className="border-2 rounded-2xl bg-amber-500/10 border-amber-500/30 py-6 flex flex-col items-center gap-2 hover:opacity-80 transition-all"
              data-testid={`pro-games-player-${p.id}`}
            >
              <Medal size={28} className="text-amber-400" />
              <span className="text-sm font-bold text-amber-400 text-center px-2">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: pick the opening ───────────────────────────────────── */}
      {playerId && !group && (
        <div className="flex flex-col gap-2 max-w-lg mx-auto w-full" data-testid="pro-games-openings">
          {refs === null && (
            <p className="text-sm text-center opacity-70 py-8" data-testid="pro-games-loading">
              Loading {playerName}&rsquo;s games…
            </p>
          )}
          {refs !== null && groups.length === 0 && (
            <p className="text-sm text-center opacity-70 py-8" data-testid="pro-games-empty">
              {loadError
                ? 'The game library could not be loaded. Check your connection and come back.'
                : `No reference games for ${playerName} yet.`}
            </p>
          )}
          {groups.map((g) => (
            <button
              key={g.proOpeningId}
              onClick={() => setOpeningId(g.proOpeningId)}
              className="flex items-center justify-between px-4 py-3 rounded-xl border-2 bg-amber-500/5 border-amber-500/20 hover:opacity-80 transition-all"
              data-testid={`pro-games-opening-${g.proOpeningId}`}
            >
              <span className="text-sm font-semibold">{g.label}</span>
              <span className="text-xs opacity-70 flex items-center gap-1">
                {g.games.length} game{g.games.length === 1 ? '' : 's'}
                <ChevronRight size={14} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 3: pick the game ──────────────────────────────────────── */}
      {group && (
        <div className="flex flex-col gap-2 max-w-lg mx-auto w-full" data-testid="pro-games-list">
          {group.games.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setWatching(g);
                void logAppAudit({
                  kind: 'pro-game-rewatch-opened',
                  category: 'app',
                  source: 'ProGamesPage',
                  summary: `rewatch: ${g.playerId} ${g.variationLabel} vs ${g.studentSide === 'white' ? g.black : g.white} (${g.opponentRating ?? '?'})`,
                });
              }}
              className="flex flex-col items-start px-4 py-3 rounded-xl border-2 bg-amber-500/5 border-amber-500/20 hover:opacity-80 transition-all text-left"
              data-testid={`pro-games-game-${g.id}`}
            >
              <span className="text-sm font-semibold">
                {g.white} vs {g.black}
                {g.opponentRating ? ` (${g.opponentRating})` : ''}
              </span>
              <span className="text-xs opacity-70">
                {g.variationLabel} · {g.result}{g.date ? ` · ${g.date}` : ''} · {g.plyCount} plies
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
