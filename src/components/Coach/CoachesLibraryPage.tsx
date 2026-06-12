/**
 * The Coaches Library — our books, brought to life.
 *
 * A shelf of the books we have; tap one and it opens like a book: the master's
 * OWN public-domain words, read aloud (tap a paragraph to start there), turnable
 * pages — and wherever the book printed a drawn diagram, a LIVE, playable board
 * in its place.
 *
 * SUPREME LAW (G0): zero LLM-authored words. Page text is verbatim book prose
 * (read via the shared `useProseReader` audiobook engine); boards are chess.js-
 * validated facts. The voice only READS; it never writes.
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import {
  ArrowLeft, BookOpen, Play, Pause, Volume2, ChevronLeft, ChevronRight,
  SkipBack, SkipForward, RotateCcw, Library,
} from 'lucide-react';
import { ConsistentChessboard, type BoardArrow } from '../Chessboard/ConsistentChessboard';
import { useProseReader, type ProseUnit } from '../../hooks/useProseReader';
import {
  COACHES_LIBRARY, getLibraryBook,
  type LibraryBook, type LibraryPage, type LivingBoard,
} from '../../data/coachesLibrary';

/** Split a page's verbatim text into displayable/readable paragraphs. */
function paragraphsOf(page: LibraryPage): { id: string; text: string }[] {
  return page.text
    .split('\n\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `${page.id}-p${i}`, text }));
}

// ── The live board that replaces a drawn diagram ────────────────────────────
function LivingBoardView({ board }: { board: LivingBoard }): JSX.Element {
  // index = how many of the book's moves have been played. 0 = the diagram.
  const [index, setIndex] = useState(0);

  // Replay the line up to `index`; derive the FEN + the last-move arrow.
  const { fen, arrows } = useMemo(() => {
    const game = new Chess(board.fen);
    let lastArrow: BoardArrow | null = null;
    for (let i = 0; i < index; i++) {
      const applied = game.move(board.moves[i]);
      if (!applied) break;
      lastArrow = { startSquare: applied.from, endSquare: applied.to, color: 'rgba(34,197,94,0.8)' };
    }
    return { fen: game.fen(), arrows: lastArrow ? [lastArrow] : [] };
  }, [board, index]);

  const atStart = index === 0;
  const atEnd = index >= board.moves.length;

  return (
    <div className="my-3 rounded-lg border border-amber-400/30 bg-theme-bg/40 p-3" data-testid="library-living-board">
      <div className="max-w-[20rem] mx-auto">
        <ConsistentChessboard
          fen={fen}
          boardOrientation={board.orientation}
          arrows={arrows}
          animationDurationInMs={400}
        />
      </div>
      <p className="text-center text-[11px] text-amber-300/80 italic mt-2">
        {atEnd ? 'The line, played out.' : board.caption}
      </p>
      <div className="flex items-center justify-center gap-4 mt-1.5">
        <button
          type="button"
          onClick={() => setIndex(0)}
          disabled={atStart}
          className="p-1.5 rounded-lg text-theme-text-muted hover:text-amber-300 disabled:opacity-25 transition-colors"
          aria-label="Reset to the diagram"
          data-testid="living-board-reset"
        >
          <RotateCcw size={18} />
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={atStart}
          className="p-1.5 rounded-lg text-theme-text-muted hover:text-amber-300 disabled:opacity-25 transition-colors"
          aria-label="Previous move"
          data-testid="living-board-prev"
        >
          <SkipBack size={18} />
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(board.moves.length, i + 1))}
          disabled={atEnd}
          className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 disabled:opacity-30 transition-colors flex items-center gap-1.5"
          aria-label="Play the next move"
          data-testid="living-board-next"
        >
          <SkipForward size={16} /> Play move
        </button>
      </div>
    </div>
  );
}

// ── The book reader (mirrors the opening tab's "From the Book") ──────────────
function LibraryBookReader({ book, onBack }: { book: LibraryBook; onBack: () => void }): JSX.Element {
  const [page, setPage] = useState(0);
  const pageCount = book.pages.length;
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const current = book.pages[safePage];
  const paras = useMemo(() => (current ? paragraphsOf(current) : []), [current]);

  const units = useMemo<ProseUnit[]>(() => paras.map((p) => ({ id: p.id, text: p.text })), [paras]);
  const reader = useProseReader(units);

  const touchX = useRef<number | null>(null);
  const goPage = (next: number): void => {
    reader.stop();
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="library-book-reader"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back to the library"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <h1 className="text-lg font-bold text-center leading-tight">{book.bookTitle}</h1>
          <p className="text-xs text-theme-text-muted">{book.author}</p>
        </div>
        <button
          type="button"
          onClick={reader.toggle}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-amber-300 hover:bg-amber-500/15 transition-colors"
          aria-label={reader.isPlaying ? 'Pause reading' : 'Listen to this page'}
          data-testid="library-listen"
        >
          {reader.isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>

      <div className="max-w-lg mx-auto w-full">
        {current?.heading && (
          <p className="text-sm font-semibold text-amber-200 mb-1">{current.heading}</p>
        )}
        <p className="text-[11px] text-theme-text-muted/60 mb-3">
          Tap a paragraph to listen · swipe or use the arrows to turn pages.
        </p>

        <div
          className="border-l-2 border-amber-400/30 pl-3 min-h-[8rem]"
          data-testid="library-page"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx < -50) goPage(safePage + 1);
            else if (dx > 50) goPage(safePage - 1);
            touchX.current = null;
          }}
        >
          {paras.map((para) => {
            const reading = reader.currentId === para.id;
            return (
              <div
                key={para.id}
                className={`group flex items-start gap-2 rounded -ml-1 pl-1 pr-1 py-0.5 mb-2 cursor-pointer transition-colors ${
                  reading ? 'bg-amber-400/10' : 'hover:bg-amber-400/5'
                }`}
                onClick={() => reader.playFrom(para.id)}
                data-testid={`library-paragraph-${para.id}`}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); reader.playOne(para.id); }}
                  className={`shrink-0 mt-0.5 p-1 rounded text-amber-400/70 hover:text-amber-300 transition-opacity ${
                    reading ? 'opacity-100 text-amber-300' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  aria-label="Relisten to this paragraph"
                >
                  <Volume2 size={13} />
                </button>
                <p className="text-[15px] text-theme-text leading-relaxed font-serif">{para.text}</p>
              </div>
            );
          })}

          {/* Where the book drew a diagram, the live board. */}
          {current?.board && <LivingBoardView board={current.board} />}

          {/* Full citation — public-domain provenance (market-ready). */}
          <footer className="text-[11px] text-theme-text-muted/70 mt-3 pt-2 border-t border-theme-border/50 leading-snug not-italic">
            <span className="italic">{book.bookTitle}</span> by {book.author}.
            {book.citation.translator ? ` English version by ${book.citation.translator}.` : ''}{' '}
            {book.citation.edition}.{' '}
            <span className="text-theme-text-muted/60">{book.citation.publicDomain}</span>{' '}
            <a
              href={book.citation.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/80 hover:text-amber-300 underline"
            >
              Source: {book.citation.sourceLabel}
            </a>
          </footer>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-5 mt-3" data-testid="library-pager">
            <button
              type="button"
              onClick={() => goPage(safePage - 1)}
              disabled={safePage === 0}
              className="p-1.5 rounded-lg text-theme-text-muted hover:text-amber-300 disabled:opacity-25 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-semibold text-theme-text-muted tabular-nums">
              {safePage + 1}/{pageCount}
            </span>
            <button
              type="button"
              onClick={() => goPage(safePage + 1)}
              disabled={safePage === pageCount - 1}
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 disabled:opacity-25 transition-colors drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── The shelf ────────────────────────────────────────────────────────────────
export function CoachesLibraryPage(): JSX.Element {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const openBook = openId ? getLibraryBook(openId) : undefined;

  if (openBook && openBook.pages.length > 0) {
    return <LibraryBookReader book={openBook} onBack={() => setOpenId(null)} />;
  }

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="coaches-library-page"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => { void navigate('/coach/home'); }}
          className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back to coach hub"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <h1 className="text-xl font-bold text-center flex items-center gap-2">
            <Library size={20} className="text-amber-400" /> The Coaches Library
          </h1>
          <p className="text-xs text-theme-text-muted text-center">The masters’ own words — brought to life on a live board.</p>
        </div>
        <div className="w-[44px]" />
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
        {COACHES_LIBRARY.map((book) => {
          const alive = book.pages.length > 0 && !book.comingToLife;
          return (
            <button
              key={book.id}
              type="button"
              onClick={() => alive && setOpenId(book.id)}
              disabled={!alive}
              className={`text-left border-2 rounded-2xl p-4 flex flex-col gap-2 transition-colors ${
                alive
                  ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-theme-surface border-theme-border opacity-60 cursor-not-allowed'
              }`}
              data-testid={`library-book-${book.id}`}
            >
              <BookOpen size={26} className={alive ? 'text-amber-400' : 'text-theme-text-muted'} />
              <div className="font-bold text-sm leading-tight">{book.bookTitle}</div>
              <div className="text-[11px] text-theme-text-muted">{book.author}</div>
              <div className="text-[11px] text-theme-text-muted/70 leading-snug">{book.shelfNote}</div>
              <span className="mt-auto text-[9px] font-semibold uppercase tracking-wide text-emerald-400/50">
                Public domain
              </span>
              {!alive && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/60">
                  Coming to life
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
