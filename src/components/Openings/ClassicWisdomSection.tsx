import { BookMarked } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { getOpeningPassages } from '../../services/chessConceptService';

interface ClassicWisdomSectionProps {
  openingName: string;
  /** Optional narration-button slot — the host page owns the local
   *  NarrationButton component (it carries the page's text-to-speech
   *  hookup), so we accept it as a render-prop rather than reimplement.
   *  Section still renders fine without one. */
  renderNarrationButton?: (text: string) => ReactNode;
}

/**
 * Renders book passages from the 7 Gutenberg classics that mention
 * this opening. Sourced from `src/data/chess-concepts.json` via
 * `chessConceptService.getOpeningPassages`. Up to 2 passages per
 * opening, distinct source books, ranked by quality at build time.
 * Returns null when no passages matched — the section just doesn't
 * render for openings the classics didn't cover.
 */
export function ClassicWisdomSection({ openingName, renderNarrationButton }: ClassicWisdomSectionProps): ReactNode {
  const passages = useMemo(() => getOpeningPassages(openingName).slice(0, 2), [openingName]);
  if (passages.length === 0) return null;
  const allText = passages.map((p) => p.text).join('. ');

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="classic-wisdom-section">
      <div className="flex items-center gap-2 mb-3">
        <BookMarked size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-theme-text">Classic Wisdom</h3>
        {renderNarrationButton?.(allText)}
      </div>
      <div className="space-y-3">
        {passages.map((p, idx) => {
          const author = p.author.split(';')[0].split(',')[0].trim();
          const cite = p.section ? `${author} — ${p.section}` : author;
          return (
            <blockquote
              key={`${p.bookSlug}-${idx}`}
              className="border-l-2 border-amber-400/40 pl-3"
              data-testid="classic-wisdom-passage"
            >
              <p className="text-sm text-theme-text-muted leading-relaxed italic">
                &ldquo;{p.text}&rdquo;
              </p>
              <footer className="text-xs text-theme-text-muted/70 mt-1.5">
                — {cite}{' '}
                <a
                  href={`https://www.gutenberg.org/ebooks/${p.gutenbergId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-300 underline"
                >
                  ({p.bookTitle})
                </a>
              </footer>
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}
