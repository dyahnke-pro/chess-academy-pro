import { BookOpen, ChevronDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { getOpeningBookPages, type BookPage } from '../../services/chessConceptService';

interface BookPagesSectionProps {
  openingName: string;
  /** Render-prop for the host page's NarrationButton (carries TTS). */
  renderNarrationButton?: (text: string) => ReactNode;
  /** Clicking the header narrates the currently-visible page text. */
  onActivate?: (text: string) => void;
}

function citation(p: BookPage): string {
  const author = p.author.split(';')[0].split(',')[0].trim();
  const where = p.chapter ? `Ch. ${p.chapter}` : p.section ?? '';
  return where ? `${author} — ${p.bookTitle}, ${where}` : `${author} — ${p.bookTitle}`;
}

/**
 * "From the Books" reading panel in the Understand zone. Renders the
 * fuller multi-paragraph pages mined from the 7 public-domain classics
 * (Capablanca, Lasker, Staunton, …) that discuss this opening. The
 * first page shows expanded; the rest collapse behind "Read more
 * pages". Renders nothing when no book page mentions the opening.
 */
export function BookPagesSection({ openingName, renderNarrationButton, onActivate }: BookPagesSectionProps): ReactNode {
  const pages = useMemo(() => getOpeningBookPages(openingName), [openingName]);
  const [expanded, setExpanded] = useState(false);

  if (pages.length === 0) return null;

  const visible = expanded ? pages : pages.slice(0, 1);
  const spokenText = visible.map((p) => p.text.replace(/\n\n/g, ' ')).join(' ');

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="book-pages-section">
      <div
        className="flex items-center gap-2 mb-3 cursor-pointer"
        onClick={() => onActivate?.(spokenText)}
        role={onActivate ? 'button' : undefined}
        data-testid="book-pages-header"
      >
        <BookOpen size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-theme-text">From the Books</h3>
        <span className="text-[10px] uppercase tracking-wider text-theme-text-muted/60">
          {pages.length} page{pages.length === 1 ? '' : 's'}
        </span>
        {renderNarrationButton?.(spokenText)}
      </div>

      <div className="space-y-4" data-testid="book-pages-list">
        {visible.map((p, idx) => (
          <article
            key={`${p.bookSlug}-${idx}`}
            className="border-l-2 border-amber-400/40 pl-3"
            data-testid="book-page"
          >
            {p.text.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-theme-text-muted leading-relaxed mb-2 last:mb-0">
                {para}
              </p>
            ))}
            <footer className="text-xs text-theme-text-muted/70 mt-2">
              — {citation(p)}{' '}
              <a
                href={`https://www.gutenberg.org/ebooks/${p.gutenbergId}`}
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

      {pages.length > 1 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-400/90 hover:text-amber-300"
          data-testid="book-pages-toggle"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          {expanded ? 'Show fewer pages' : `Read more pages (${pages.length - 1})`}
        </button>
      ) : null}
    </div>
  );
}
