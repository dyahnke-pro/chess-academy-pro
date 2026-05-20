import { BookOpen, ChevronDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { getConceptBookGroups, type BookPassage } from '../../services/chessConceptService';

interface ConceptBookSectionProps {
  /** Opening name — resolves the relevant concepts. */
  openingName: string;
  /** Opening overview, for concept detection. */
  overview?: string | null;
  /** Opening key ideas, for concept detection. */
  keyIdeas?: string[] | null;
  /** Render-prop for the host page's NarrationButton (carries TTS). */
  renderNarrationButton?: (text: string) => ReactNode;
  /** Clicking the header narrates the visible text. */
  onActivate?: (text: string) => void;
}

function citation(p: BookPassage): string {
  const author = p.author.split(';')[0].split(',')[0].trim();
  const where = p.chapter ? `Ch. ${p.chapter}` : p.section ?? '';
  return where ? `${author} — ${p.bookTitle}, ${where}` : `${author} — ${p.bookTitle}`;
}

/**
 * "Middlegame & Endgame — From the Books" reading panel in the
 * Understand zone. Surfaces the public-domain concept passages
 * (Capablanca / Lasker / Staunton …) relevant to this opening —
 * positional play, pawn structures, tactics, attacking plans, and
 * endgame patterns — the counterpart to the opening-specific
 * BookPagesSection. Renders nothing when nothing resolves.
 */
export function ConceptBookSection({
  openingName,
  overview,
  keyIdeas,
  renderNarrationButton,
  onActivate,
}: ConceptBookSectionProps): ReactNode {
  const groups = useMemo(
    () => getConceptBookGroups([openingName, overview ?? '', ...(keyIdeas ?? [])].join('. ')),
    [openingName, overview, keyIdeas],
  );
  const [expanded, setExpanded] = useState(false);

  if (groups.length === 0) return null;

  // First item of the first group shows by default; the rest collapse.
  const allItems = groups.flatMap((g) => g.items);
  const spokenText = allItems
    .map((it) => `${it.name}. ${it.passage.text.replace(/\n\n/g, ' ')}`)
    .join(' ');

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="concept-book-section">
      <div
        className="flex items-center gap-2 mb-1 cursor-pointer"
        onClick={() => onActivate?.(spokenText)}
        role={onActivate ? 'button' : undefined}
        data-testid="concept-book-header"
      >
        <BookOpen size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-theme-text">Middlegame &amp; Endgame — From the Books</h3>
        {renderNarrationButton?.(spokenText)}
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        What the classics teach about the plans and endings this opening leads to.
      </p>

      <div className="space-y-4" data-testid="concept-book-list">
        {groups.map((group) => {
          // Collapsed: show only the first item of the first group.
          const visibleItems = expanded ? group.items : group.items.slice(0, group === groups[0] ? 1 : 0);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-400/80 mb-2">
                {group.label}
              </h4>
              <div className="space-y-4">
                {visibleItems.map((item) => (
                  <article
                    key={item.conceptId}
                    className="border-l-2 border-amber-400/40 pl-3"
                    data-testid={`concept-book-${item.conceptId}`}
                  >
                    <p className="text-sm font-medium text-theme-text mb-1">{item.name}</p>
                    {item.passage.text.split('\n\n').map((para, i) => (
                      <p key={i} className="text-sm text-theme-text-muted leading-relaxed mb-2 last:mb-0">
                        {para}
                      </p>
                    ))}
                    <footer className="text-xs text-theme-text-muted/70 mt-2">
                      — {citation(item.passage)}{' '}
                      <a
                        href={`https://www.gutenberg.org/ebooks/${item.passage.gutenbergId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400/80 hover:text-amber-300 underline"
                      >
                        (Project Gutenberg)
                      </a>
                    </footer>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {allItems.length > 1 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-400/90 hover:text-amber-300"
          data-testid="concept-book-toggle"
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show fewer' : `Read more (${allItems.length - 1})`}
        </button>
      ) : null}
    </div>
  );
}
