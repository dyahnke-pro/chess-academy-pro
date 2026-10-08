import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OpeningCard } from './OpeningCard';
import {
  BLACK_GROUP_LABEL,
  blackShelfGroup,
  openingsForSide,
} from '../../utils/openingShelf';
import type { BlackShelfGroup, ShelfSide } from '../../utils/openingShelf';
import type { OpeningRecord } from '../../types';

// One shelf for every opening list (Masterclasses, Gambits, Counter, each Elite
// player): a White | Black switch, A–Z within the side, and Black split by the
// first move it answers. The side lives in the URL (`?side=black`) so coming
// back from an opening lands on the side you left.

interface OpeningShelfProps {
  openings: OpeningRecord[];
  onOpen: (opening: OpeningRecord) => void;
  onToggleFavorite?: (opening: OpeningRecord) => void;
}

const BLACK_GROUPS: BlackShelfGroup[] = ['vs-e4', 'vs-other'];

export function OpeningShelf({ openings, onOpen, onToggleFavorite }: OpeningShelfProps): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const white = useMemo(() => openingsForSide(openings, 'white'), [openings]);
  const black = useMemo(() => openingsForSide(openings, 'black'), [openings]);

  const requested = searchParams.get('side');
  const side: ShelfSide =
    requested === 'black' || requested === 'white'
      ? requested
      : white.length === 0 && black.length > 0
        ? 'black'
        : 'white';

  const pick = (next: ShelfSide): void => {
    const params = new URLSearchParams(searchParams);
    params.set('side', next);
    setSearchParams(params, { replace: true });
  };

  const renderCards = (list: OpeningRecord[]): JSX.Element[] =>
    list.map((opening, i) => (
      <motion.div
        key={opening.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.25 }}
      >
        <OpeningCard
          opening={opening}
          onClick={() => onOpen(opening)}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(opening) : undefined}
        />
      </motion.div>
    ));

  const shown = side === 'white' ? white : black;

  return (
    <div data-testid="opening-shelf">
      <div className="grid grid-cols-2 gap-1 mb-4 p-1 bg-theme-surface rounded-xl" role="group" aria-label="Side you play" data-testid="side-toggle">
        {/* Same chrome as the Openings tab bar, but the halo sits on the
            SELECTED side only, so it visibly moves White ↔ Black (David
            2026-10-08: "so user knows which they have selected easier"). */}
        {([
          {
            id: 'white' as const, label: 'White', count: white.length,
            dot: 'bg-white border-neutral-400',
            activeClasses: 'bg-slate-200/20 text-white',
            borderColor: 'border-slate-200/80 shadow-[0_0_6px_rgba(226,232,240,0.6),0_0_14px_rgba(226,232,240,0.35),0_0_24px_rgba(226,232,240,0.2)]',
          },
          {
            id: 'black' as const, label: 'Black', count: black.length,
            dot: 'bg-neutral-900 border-neutral-400',
            activeClasses: 'bg-zinc-500/25 text-zinc-100',
            borderColor: 'border-zinc-400/90 shadow-[0_0_6px_rgba(161,161,170,0.8),0_0_14px_rgba(161,161,170,0.5),0_0_24px_rgba(161,161,170,0.3)]',
          },
        ]).map(({ id, label, count, dot, activeClasses, borderColor }) => (
          <button
            key={id}
            aria-pressed={side === id}
            onClick={() => pick(id)}
            className={`flex items-center justify-center gap-2 py-2 px-1 rounded-lg text-xs font-medium transition-all border-l-2 border-b-2 ${
              side === id ? `${borderColor} ${activeClasses}` : 'border-transparent text-theme-text-muted hover:text-theme-text'
            }`}
            data-testid={`side-toggle-${id}`}
          >
            <span className={`w-3 h-3 rounded-full border ${dot}`} />
            {label}
            <span className="font-normal opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-8 text-center text-sm text-theme-text-muted" data-testid="side-empty">
          Nothing for {side === 'white' ? 'White' : 'Black'} here yet.
        </p>
      )}

      {side === 'white' && <div className="space-y-2" data-testid="shelf-white">{renderCards(white)}</div>}

      {side === 'black' &&
        BLACK_GROUPS.map((group) => {
          const list = black.filter((o) => blackShelfGroup(o) === group);
          if (list.length === 0) return null;
          return (
            <div key={group} className="mb-5" data-testid={`shelf-black-${group}`}>
              <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-2">
                {BLACK_GROUP_LABEL[group]}
              </h2>
              <div className="space-y-2">{renderCards(list)}</div>
            </div>
          );
        })}
    </div>
  );
}
