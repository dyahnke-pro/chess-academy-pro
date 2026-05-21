import { useMemo } from 'react';
import { Play, Pause, Volume2, type LucideIcon } from 'lucide-react';
import { useProseReader, type ProseUnit } from '../../hooks/useProseReader';

interface ListenableProseProps {
  /** Section heading. */
  title: string;
  /** Icon for the heading. */
  icon: LucideIcon;
  /** Tailwind text color for the icon (e.g. "text-yellow-500"). */
  iconColor?: string;
  /** Stable key prefix for paragraph ids. */
  idPrefix: string;
  /** Paragraphs/bullets to render and read. */
  items: string[];
  /** Render items as a bulleted list (Key Ideas) vs flowing paragraphs. */
  variant?: 'paragraphs' | 'bullets';
}

/**
 * A prose section with the standard audiobook Listen control: a
 * play/pause toggle reads the whole section aloud, tapping any
 * paragraph/bullet starts reading from there, and the speaker icon
 * relistens a single item. Built on the shared useProseReader engine
 * (sanitize + descriptive-notation scrub). Use on any text surface to
 * make Listen standard.
 */
export function ListenableProse({
  title,
  icon: Icon,
  iconColor = 'text-theme-accent',
  idPrefix,
  items,
  variant = 'paragraphs',
}: ListenableProseProps): React.ReactNode {
  const units = useMemo<ProseUnit[]>(
    () => items.map((text, i) => ({ id: `${idPrefix}-${i}`, text })),
    [items, idPrefix],
  );
  const reader = useProseReader(units);

  if (items.length === 0) return null;

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid={`listenable-${idPrefix}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={iconColor} />
        <h3 className="text-sm font-semibold text-theme-text">{title}</h3>
        <button
          type="button"
          onClick={reader.toggle}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-theme-accent/10 border border-theme-accent/30 text-theme-accent text-xs font-semibold hover:bg-theme-accent/20 transition-colors"
          aria-label={reader.isPlaying ? 'Pause reading' : 'Listen to this section'}
          data-testid={`listenable-${idPrefix}-play`}
        >
          {reader.isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {reader.isPlaying ? 'Pause' : 'Listen'}
        </button>
      </div>

      <div className={variant === 'bullets' ? 'space-y-1' : 'space-y-1'}>
        {items.map((text, i) => {
          const id = `${idPrefix}-${i}`;
          const reading = reader.currentId === id;
          return (
            <div
              key={id}
              className={`group flex items-start gap-2 rounded -ml-1 pl-1 pr-1 py-0.5 cursor-pointer transition-colors ${
                reading ? 'bg-theme-accent/10' : 'hover:bg-theme-accent/5'
              }`}
              onClick={() => reader.playFrom(id)}
              data-testid={`listenable-${idPrefix}-item-${i}`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  reader.playOne(id);
                }}
                className={`shrink-0 mt-0.5 p-1 rounded text-theme-accent/70 hover:text-theme-accent transition-opacity ${
                  reading ? 'opacity-100 text-theme-accent' : 'opacity-0 group-hover:opacity-100'
                }`}
                aria-label="Relisten to this part"
                data-testid={`listenable-${idPrefix}-replay-${i}`}
              >
                <Volume2 size={13} />
              </button>
              {variant === 'bullets' ? (
                <span className="text-sm text-theme-text-muted flex gap-2">
                  <span className="text-theme-accent mt-0.5 shrink-0">-</span>
                  <span>{text}</span>
                </span>
              ) : (
                <p className="text-sm text-theme-text-muted leading-relaxed">{text}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
