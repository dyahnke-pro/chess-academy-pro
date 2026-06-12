import { BookMarked, Play, Pause, Volume2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { getOpeningDefinition, getOpeningPassages } from '../../services/chessConceptService';
import { useProseReader, type ProseUnit } from '../../hooks/useProseReader';
import { splitIntoReadableBlocks } from '../../utils/proseParagraphs';

interface ClassicWisdomSectionProps {
  openingName: string;
  /** Optional narration-button slot — the host page owns the local
   *  NarrationButton component (it carries the page's text-to-speech
   *  hookup), so we accept it as a render-prop rather than reimplement.
   *  Section still renders fine without one. */
  renderNarrationButton?: (text: string) => ReactNode;
  /** When provided, clicking the card header triggers narration of
   *  the wisdom text. Receives the full text to speak. Retained for
   *  back-compat; the section now also reads via its own audiobook
   *  engine (tap any paragraph to start there). */
  onActivate?: (text: string) => void;
}

/** One tappable paragraph, tracked back to the passage it belongs to so the
 *  per-passage "Drawn from" footer can render after its last paragraph. */
interface WisdomParagraph extends ProseUnit {
  passageIdx: number;
}

/**
 * Renders the Classic Wisdom card on every opening detail page.
 * Two-tier content:
 *
 *   1. Book passages (preferred) — when `chess-concepts.json` carries
 *      ≥1 passage for this opening: a modern retelling of the classic
 *      masters' ideas (drawn from the 7 Gutenberg works), rendered with
 *      a "drawn from" credit + Gutenberg link. Covers 16/40 of our
 *      taxonomy.
 *
 *   2. Modern definition (fallback) — when no book passage matched,
 *      render the static OpeningDefinition (description + character
 *      + key ideas) so EVERY opening shows a wisdom card. Consistent
 *      shape, varied content. The fallback is labeled "Modern
 *      definition" to distinguish from book quotes.
 *
 * The wisdom text reads aloud through the shared `useProseReader` audiobook
 * engine — tap any paragraph and reading starts from THERE (matching the
 * "From the Books" reader), with a follow-along highlight + per-paragraph
 * relisten. The header "Listen" toggle reads the whole card.
 *
 * Returns null only when the opening name doesn't resolve at all
 * (unknown opening) — guarantees consistency across the 40-strong
 * opening taxonomy.
 */
export function ClassicWisdomSection({ openingName, renderNarrationButton, onActivate }: ClassicWisdomSectionProps): ReactNode {
  const passages = useMemo(() => getOpeningPassages(openingName).slice(0, 2), [openingName]);
  const definition = useMemo(() => getOpeningDefinition(openingName), [openingName]);

  // Build the tappable paragraph list. Prefer book passages; fall back to the
  // modern definition (description + key ideas) so the card always reads.
  const paragraphs = useMemo<WisdomParagraph[]>(() => {
    if (passages.length > 0) {
      return passages.flatMap((p, pi) =>
        splitIntoReadableBlocks(p.text).map((text, j) => ({ id: `cw-${pi}-${j}`, text, passageIdx: pi })),
      );
    }
    if (definition) {
      const blocks = [
        ...splitIntoReadableBlocks(definition.description),
        ...definition.keyIdeas,
      ];
      return blocks.map((text, j) => ({ id: `cw-def-${j}`, text, passageIdx: 0 }));
    }
    return [];
  }, [passages, definition]);

  const reader = useProseReader(paragraphs);

  const allText = passages.length > 0
    ? passages.map((p) => p.text).join('. ')
    : definition
      ? `${definition.description}. Key ideas: ${definition.keyIdeas.join('. ')}.`
      : '';

  if (passages.length === 0 && !definition) return null;

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="classic-wisdom-section">
      {/* Header doubles as the listen affordance — the Listen toggle reads
          the whole card; the title row keeps the onActivate hook for the
          host page's narration state. */}
      <div className="flex items-center gap-2 mb-3" data-testid="classic-wisdom-header">
        <BookMarked size={14} className="text-amber-400" />
        <h3
          className={`text-sm font-semibold text-theme-text ${onActivate ? 'cursor-pointer' : ''}`}
          onClick={() => onActivate?.(allText)}
          role={onActivate ? 'button' : undefined}
        >
          Classic Wisdom
        </h3>
        {renderNarrationButton?.(allText)}
        <button
          type="button"
          onClick={reader.toggle}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors"
          aria-label={reader.isPlaying ? 'Pause reading' : 'Listen to this section'}
          data-testid="classic-wisdom-play"
        >
          {reader.isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {reader.isPlaying ? 'Pause' : 'Listen'}
        </button>
      </div>

      {passages.length > 0 ? (
        <div className="space-y-3" data-testid="classic-wisdom-passages">
          {passages.map((p, idx) => {
            const author = p.author.split(';')[0].split(',')[0].trim();
            const title = p.bookTitle.split(':')[0].trim();
            const paras = paragraphs.filter((para) => para.passageIdx === idx);
            return (
              <blockquote
                key={`${p.bookSlug}-${idx}`}
                className="border-l-2 border-amber-400/40 pl-3"
                data-testid="classic-wisdom-passage"
              >
                {paras.map((para) => (
                  <WisdomParagraphRow key={para.id} para={para} reader={reader} />
                ))}
                <footer className="text-xs text-theme-text-muted/60 mt-1.5 italic">
                  Drawn from {author},{' '}
                  <a
                    href={`https://www.gutenberg.org/ebooks/${p.gutenbergId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400/80 hover:text-amber-300 underline not-italic"
                  >
                    {title}
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
          {paragraphs.map((para, i) => (
            <WisdomParagraphRow
              key={para.id}
              para={para}
              reader={reader}
              testid={i >= splitIntoReadableBlocks(definition.description).length ? 'classic-wisdom-idea' : undefined}
            />
          ))}
          {definition.character ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-amber-400/80">Character</span>
              <span className="text-xs text-theme-text-muted">{definition.character}</span>
            </div>
          ) : null}
          <footer className="text-[10px] text-theme-text-muted/60 mt-2">
            {definition.sourceUrl ? (
              <>
                {definition.sourceAttribution ?? 'External source'} —{' '}
                <a
                  href={definition.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-300 underline"
                >
                  read more
                </a>
              </>
            ) : (
              'Modern definition'
            )}
          </footer>
        </div>
      ) : null}
    </div>
  );
}

/** A single tappable wisdom paragraph: tap the row to start reading from here,
 *  tap the speaker to relisten just this one. Mirrors the From-the-Books row. */
function WisdomParagraphRow({
  para,
  reader,
  testid,
}: {
  para: WisdomParagraph;
  reader: ReturnType<typeof useProseReader>;
  testid?: string;
}): ReactNode {
  const reading = reader.currentId === para.id;
  return (
    <div
      className={`group flex items-start gap-2 rounded -ml-1 pl-1 pr-1 py-0.5 mb-1.5 last:mb-0 cursor-pointer transition-colors ${
        reading ? 'bg-amber-400/10' : 'hover:bg-amber-400/5'
      }`}
      onClick={() => reader.playFrom(para.id)}
      data-testid={testid ?? `wisdom-paragraph-${para.id}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          reader.playOne(para.id);
        }}
        className={`shrink-0 mt-0.5 p-1 rounded text-amber-400/70 hover:text-amber-300 transition-opacity ${
          reading ? 'opacity-100 text-amber-300' : 'opacity-0 group-hover:opacity-100'
        }`}
        aria-label="Relisten to this part"
      >
        <Volume2 size={13} />
      </button>
      <p className="text-sm text-theme-text-muted leading-relaxed">{para.text}</p>
    </div>
  );
}
