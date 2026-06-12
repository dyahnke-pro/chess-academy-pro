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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import {
  ArrowLeft, BookOpen, Play, Pause, ChevronLeft, ChevronRight,
  SkipBack, SkipForward, RotateCcw, Library, Search, X, List, ChevronRight as Chevron,
} from 'lucide-react';
import { ConsistentChessboard, type BoardArrow } from '../Chessboard/ConsistentChessboard';
import { useProseReader, type ProseUnit } from '../../hooks/useProseReader';
import {
  COACHES_LIBRARY, getLibraryBook, searchLibrary,
  type LibraryBook, type LibraryPage, type LivingBoard,
} from '../../data/coachesLibrary';

interface Paragraph { id: string; text: string; chunks: { id: string; text: string }[] }

// Polly / /api/tts rejects very long requests — split only when a paragraph
// exceeds this, on sentence boundaries, so a normal paragraph is ONE TTS call
// (no inter-sentence pauses).
const MAX_TTS = 2200;
function chunkParagraph(text: string): string[] {
  if (text.length <= MAX_TTS) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + s).length > MAX_TTS) { chunks.push(cur.trim()); cur = ''; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

/** Split a page into paragraphs. The PARAGRAPH is the read/click unit — it's
 *  spoken in one go (chunked only if it's over the TTS limit) so there are no
 *  pauses between sentences. */
function paragraphsOf(page: LibraryPage): Paragraph[] {
  return page.text
    .split('\n\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((para, pi) => ({
      id: `${page.id}-p${pi}`,
      text: para,
      chunks: chunkParagraph(para).map((text, ci) => ({ id: `${page.id}-p${pi}-c${ci}`, text })),
    }));
}

interface Chapter { title: string; page: number }

// Real titles where the source heading is bare (e.g. Chess Strategy prints only
// "CHAPTER II"); keyed by book id → the bare chapter heading → its real title.
const CHAPTER_TITLE_OVERRIDES: Record<string, Record<string, string>> = {
  'edward-lasker-chess-strategy': {
    'Chess Strategy': 'Introductory — The Rules of the Game',
    'CHAPTER II': 'Hints for Beginners — Elementary Combinations',
    'CHAPTER III': 'General Principles of Chess Strategy',
    'CHAPTER IV': 'The Opening',
    'CHAPTER V': 'The End-Game',
    'CHAPTER VI': 'The Middle Game',
    'PART II': 'Illustrative Games from Master Tournaments',
  },
  'capablanca-chess-fundamentals': {
    'CHAPTER II': 'Further Principles in End-Game Play',
    'CHAPTER III': 'Planning a Win in Middle-Game Play',
    'CHAPTER IV': 'General Theory',
    'CHAPTER V': 'End-Game Strategy',
    '32. SOME POSSIBLE DEVELOPMENTS FROM': 'Some Possible Developments from a Ruy Lopez',
    'PART II': 'Illustrative Games',
  },
};

const GENERIC_HEADING = /^(Chapter\s+[IVXLC]+|My System|Untitled|Chess Fundamentals|Chess Strategy|PART\s+[IVXLC]+|CHAPTER\s+[IVXLC]+)$/i;
const SMALL_WORDS = new Set(['of', 'the', 'a', 'an', 'to', 'and', 'with', 'in', 'on', 'for', 'from', 'as', 'at', 'by', 'or']);
function titleCaseIfShouting(s: string): string {
  // Convert ALL-CAPS headings to Title Case; leave already-mixed-case alone.
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length <= 2 || letters !== letters.toUpperCase()) return s;
  const words = s.toLowerCase().split(/(\s+)/);
  let wordIdx = 0;
  return words
    .map((w) => {
      if (/^\s+$/.test(w) || !w) return w;
      const cap = wordIdx > 0 && SMALL_WORDS.has(w) ? w : w.replace(/^([a-z])/, (m) => m.toUpperCase());
      wordIdx++;
      return cap;
    })
    .join('');
}
function clip(s: string, n = 64): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1).trim()}…` : t;
}
/** The most descriptive title available for the chapter starting at page i. */
function chapterTitle(book: LibraryBook, p: LibraryPage): string {
  const h = p.heading ?? '';
  const chap = h.split(' · ')[0].trim();
  const ov = CHAPTER_TITLE_OVERRIDES[book.id]?.[chap];
  if (ov) return ov;
  const sect = h.includes(' · ') ? h.split(' · ').slice(1).join(' · ') : '';
  const sd = sect.replace(/^Section\s+\S+\s*[—-]?\s*/i, '').trim();
  // Short label-style chapter ("Lesson 1", "Prologue") → keep its title too.
  if (sd && chap.length <= 14 && /^(Lesson|Prologue|Epilogue|Game)/i.test(chap)) {
    return clip(`${chap} · ${sd}`, 70);
  }
  if (chap && !GENERIC_HEADING.test(chap)) return titleCaseIfShouting(chap.replace(/^\d+\.\s*/, ''));
  // generic/garbled chapter label → use the descriptive section, else the text
  if (sd) return titleCaseIfShouting(clip(sd));
  const firstLine = p.text.replace(/\s+/g, ' ').trim();
  return titleCaseIfShouting(clip(firstLine, 60)) || 'Untitled';
}

/** The book's chapters with the page each starts on — drives the contents picker. */
function chaptersOf(book: LibraryBook): Chapter[] {
  const out: Chapter[] = [];
  let lastGroup: string | null = null;
  book.pages.forEach((p, i) => {
    const group = (p.heading ?? 'Untitled').split(' · ')[0].trim() || 'Untitled';
    if (group !== lastGroup) { out.push({ title: chapterTitle(book, p), page: i }); lastGroup = group; }
  });
  return out;
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
function LibraryBookReader({ book, onBack, initialPage = 0 }: { book: LibraryBook; onBack: () => void; initialPage?: number }): JSX.Element {
  const [page, setPage] = useState(initialPage);
  const chapters = useMemo(() => chaptersOf(book), [book]);
  // Page one of every book is the appendix — a chapter picker. Opening from a
  // search result (initialPage > 0) jumps straight to that page instead.
  const [showContents, setShowContents] = useState(initialPage === 0);
  const pageCount = book.pages.length;
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const current = book.pages[safePage];
  const paras = useMemo(() => (current ? paragraphsOf(current) : []), [current]);

  // Paragraph-level units — each paragraph is one TTS call (chunked only if it
  // exceeds the limit), so there are no pauses between sentences.
  const units = useMemo<ProseUnit[]>(
    () => paras.flatMap((p) => p.chunks.map((c) => ({ id: c.id, text: c.text }))),
    [paras],
  );
  // Auto-advance: when a page finishes reading, turn to the next page and keep
  // going. `resumeRef` carries the intent across the page change.
  const resumeRef = useRef(false);
  const onPageComplete = useCallback(() => {
    if (safePage < pageCount - 1) { resumeRef.current = true; setPage(safePage + 1); }
  }, [safePage, pageCount]);
  const reader = useProseReader(units, onPageComplete);
  // After the next page's units render, resume reading from its first paragraph.
  useEffect(() => {
    if (resumeRef.current && units.length > 0) {
      resumeRef.current = false;
      reader.playFrom(units[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const touchX = useRef<number | null>(null);
  const goPage = (next: number): void => {
    resumeRef.current = false;
    reader.stop();
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
  };
  const openChapter = (p: number): void => {
    resumeRef.current = false;
    reader.stop();
    setPage(p);
    setShowContents(false);
  };

  // ── The appendix: a chapter picker (page one of every book) ───────────────
  if (showContents) {
    return (
      <div
        className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
        style={{ color: 'var(--color-text)' }}
        data-testid="library-contents"
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
          <div className="w-[44px]" />
        </div>

        <div className="max-w-lg mx-auto w-full">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300/80 mb-1">Contents</p>
          <p className="text-[11px] text-theme-text-muted/70 mb-3">{chapters.length} chapters · tap one to start reading.</p>
          <div className="flex flex-col gap-2" data-testid="library-chapter-list">
            {chapters.map((ch) => (
              <button
                key={`${ch.page}-${ch.title}`}
                type="button"
                onClick={() => openChapter(ch.page)}
                className="group flex items-center gap-3 text-left rounded-xl border border-theme-border bg-theme-surface/60 hover:bg-rose-500/10 hover:border-rose-400/40 px-3 py-3 transition-colors"
                data-testid={`library-chapter-${ch.page}`}
              >
                <span className="text-[11px] tabular-nums text-theme-text-muted/60 w-6 shrink-0">{ch.page + 1}</span>
                <span className="flex-1 text-sm text-theme-text leading-snug">{ch.title}</span>
                <Chevron size={16} className="text-theme-text-muted/50 group-hover:text-rose-300 shrink-0" />
              </button>
            ))}
          </div>

          <footer className="text-[11px] text-theme-text-muted/70 mt-4 pt-2 border-t border-theme-border/50 leading-snug">
            <span className="italic">{book.bookTitle}</span> by {book.author}.
            {book.citation.translator ? ` English version by ${book.citation.translator}.` : ''}{' '}
            {book.citation.edition}.{' '}
            <span className="text-theme-text-muted/60">{book.citation.rights}</span>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="library-book-reader"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Back to the library"
          >
            <ArrowLeft size={20} className="text-theme-text" />
          </button>
          <button
            type="button"
            onClick={() => { reader.stop(); setShowContents(true); }}
            className="p-2 rounded-lg hover:bg-rose-500/15 min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-300"
            aria-label="Contents"
            data-testid="library-contents-btn"
          >
            <List size={20} />
          </button>
        </div>
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
            const reading = para.chunks.some((c) => c.id === reader.currentId);
            return (
              <p
                key={para.id}
                onClick={() => reader.playFrom(para.chunks[0].id)}
                className={`text-[15px] leading-relaxed font-serif mb-3 cursor-pointer rounded px-1 -mx-1 transition-colors ${
                  reading ? 'bg-amber-400/20 text-theme-text' : 'text-theme-text hover:bg-amber-400/10'
                }`}
                data-testid={`library-paragraph-${para.id}`}
              >
                {para.text}
              </p>
            );
          })}

          {/* Where the book drew a diagram, the live board. */}
          {current?.board && <LivingBoardView board={current.board} />}

          {/* Full citation — public-domain provenance (market-ready). */}
          <footer className="text-[11px] text-theme-text-muted/70 mt-3 pt-2 border-t border-theme-border/50 leading-snug not-italic">
            <span className="italic">{book.bookTitle}</span> by {book.author}.
            {book.citation.translator ? ` English version by ${book.citation.translator}.` : ''}{' '}
            {book.citation.edition}.{' '}
            <span className="text-theme-text-muted/60">{book.citation.rights}</span>{' '}
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
  const [open, setOpen] = useState<{ id: string; page: number } | null>(null);
  const [query, setQuery] = useState('');
  const openBook = open ? getLibraryBook(open.id) : undefined;
  const results = useMemo(() => searchLibrary(query), [query]);

  if (openBook && openBook.pages.length > 0) {
    return <LibraryBookReader book={openBook} initialPage={open?.page ?? 0} onBack={() => setOpen(null)} />;
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

      {/* Search every book for a topic, jump straight to the page. */}
      <div className="max-w-lg mx-auto w-full relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the books — “isolated pawn”, “the pin”…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-sm text-theme-text placeholder:text-theme-text-muted/60 focus:outline-none focus:border-amber-400/50"
          data-testid="library-search-input"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-theme-text-muted hover:text-theme-text"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {query.trim().length >= 2 ? (
        <div className="max-w-lg mx-auto w-full flex flex-col gap-2" data-testid="library-search-results">
          <p className="text-xs text-theme-text-muted">
            {results.length} {results.length === 1 ? 'passage' : 'passages'} across the books
          </p>
          {results.map((hit) => (
            <button
              key={`${hit.bookId}-${hit.pageIndex}`}
              type="button"
              onClick={() => { setOpen({ id: hit.bookId, page: hit.pageIndex }); setQuery(''); }}
              className="text-left rounded-xl border border-theme-border bg-theme-surface/60 hover:bg-amber-500/10 hover:border-amber-400/30 p-3 transition-colors"
              data-testid={`library-search-hit-${hit.bookId}-${hit.pageIndex}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-amber-300">{hit.bookTitle}</span>
                <span className="text-[10px] text-theme-text-muted shrink-0">p. {hit.pageIndex + 1}</span>
              </div>
              {hit.heading && <div className="text-[11px] text-theme-text-muted/80 truncate">{hit.heading}</div>}
              <div className="text-[12px] text-theme-text leading-snug mt-0.5">{hit.snippet}</div>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-sm text-theme-text-muted text-center py-6">No passages found. Try another word.</p>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
        {COACHES_LIBRARY.map((book) => {
          const alive = book.pages.length > 0 && !book.comingToLife;
          return (
            <button
              key={book.id}
              type="button"
              onClick={() => alive && setOpen({ id: book.id, page: 0 })}
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
              <span className={`mt-auto text-[9px] font-semibold uppercase tracking-wide ${book.house ? 'text-amber-300/70' : 'text-emerald-400/50'}`}>
                {book.house ? 'Our book' : 'Public domain'}
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
      )}
    </div>
  );
}
