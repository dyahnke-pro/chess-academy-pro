import { BookMarked } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { getOpeningDefinition, getOpeningPassages } from '../../services/chessConceptService';

interface ClassicWisdomSectionProps {
  openingName: string;
  /** Optional narration-button slot — the host page owns the local
   *  NarrationButton component (it carries the page's text-to-speech
   *  hookup), so we accept it as a render-prop rather than reimplement.
   *  Section still renders fine without one. */
  renderNarrationButton?: (text: string) => ReactNode;
}

/**
 * Renders the Classic Wisdom card on every opening detail page.
 * Two-tier content:
 *
 *   1. Book passages (preferred) — when `chess-concepts.json` carries
 *      ≥1 tagged passage for this opening from the 7 Gutenberg
 *      classics. Up to 2 passages rendered with citation + Gutenberg
 *      link. Covers 16/40 of our taxonomy.
 *
 *   2. Modern definition (fallback) — when no book passage matched,
 *      render the static OpeningDefinition (description + character
 *      + key ideas) so EVERY opening shows a wisdom card. Consistent
 *      shape, varied content. The fallback is labeled "Modern
 *      definition" to distinguish from book quotes.
 *
 * Returns null only when the opening name doesn't resolve at all
 * (unknown opening) — guarantees consistency across the 40-strong
 * opening taxonomy.
 */
export function ClassicWisdomSection({ openingName, renderNarrationButton }: ClassicWisdomSectionProps): ReactNode {
  const passages = useMemo(() => getOpeningPassages(openingName).slice(0, 2), [openingName]);
  const definition = useMemo(() => getOpeningDefinition(openingName), [openingName]);

  if (passages.length === 0 && !definition) return null;

  const allText = passages.length > 0
    ? passages.map((p) => p.text).join('. ')
    : definition
      ? `${definition.description}. Key ideas: ${definition.keyIdeas.join('. ')}.`
      : '';

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="classic-wisdom-section">
      <div className="flex items-center gap-2 mb-3">
        <BookMarked size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-theme-text">Classic Wisdom</h3>
        {renderNarrationButton?.(allText)}
      </div>
      {passages.length > 0 ? (
        <div className="space-y-3" data-testid="classic-wisdom-passages">
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
      ) : definition ? (
        <div
          className="border-l-2 border-amber-400/40 pl-3"
          data-testid="classic-wisdom-definition"
        >
          <p className="text-sm text-theme-text-muted leading-relaxed">
            {definition.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-400/80">Character</span>
            <span className="text-xs text-theme-text-muted">{definition.character}</span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {definition.keyIdeas.map((idea, i) => (
              <li
                key={i}
                className="text-xs text-theme-text-muted flex gap-2"
                data-testid="classic-wisdom-idea"
              >
                <span className="text-amber-400/70 mt-0.5 shrink-0">·</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
          <footer className="text-[10px] text-theme-text-muted/60 mt-2">
            Modern definition
          </footer>
        </div>
      ) : null}
    </div>
  );
}
