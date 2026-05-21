import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Play, Pause, Volume2 } from 'lucide-react';
import { useProseReader, type ProseUnit } from '../../hooks/useProseReader';
import {
  getOpeningBookPages,
  getConceptBookGroups,
  type BookPage,
  type BookPassage,
} from '../../services/chessConceptService';

interface ReaderParagraph {
  id: string;
  text: string;
  /** Spoken form — title prepended on a passage's first paragraph. */
  spoken: string;
}

interface ReaderPassage {
  title?: string;
  paragraphs: ReaderParagraph[];
  citation: string;
  gutenbergId: number;
}

interface Chapter {
  id: 'opening' | 'middlegame' | 'endgame';
  label: string;
  intro: string;
  passages: ReaderPassage[];
}

const CHAPTER_INTRO: Record<Chapter['id'], string> = {
  opening: 'What the classic masters wrote about this opening — in their own words.',
  middlegame: 'The plans, structures, and tactics it leads to, taught by the greats.',
  endgame: 'The endgames you steer toward, and how the masters handled them.',
};

function citationFor(p: { author: string; bookTitle: string; chapter: string | null; section: string | null }): string {
  const author = p.author.split(';')[0].split(',')[0].trim();
  const where = p.chapter ? `Ch. ${p.chapter}` : p.section ?? '';
  return where ? `${author} — ${p.bookTitle}, ${where}` : `${author} — ${p.bookTitle}`;
}

function buildParagraphs(
  chapterId: string,
  passageIdx: number,
  title: string | undefined,
  text: string,
): ReaderParagraph[] {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((para, j) => ({
      id: `${chapterId}-p${passageIdx}-${j}`,
      text: para,
      spoken: j === 0 && title ? `${title}. ${para}` : para,
    }));
}

function pageToPassage(chapterId: string, idx: number, p: BookPage): ReaderPassage {
  return {
    paragraphs: buildParagraphs(chapterId, idx, undefined, p.text),
    citation: citationFor(p),
    gutenbergId: p.gutenbergId,
  };
}

function conceptToPassage(chapterId: string, idx: number, name: string, p: BookPassage): ReaderPassage {
  return {
    title: name,
    paragraphs: buildParagraphs(chapterId, idx, name, p.text),
    citation: citationFor(p),
    gutenbergId: p.gutenbergId,
  };
}

interface BookReaderProps {
  openingName: string;
  overview?: string | null;
  keyIdeas?: string[] | null;
}

/**
 * Audiobook-style tabbed book reader for the Understand zone. Chapters
 * as tabs (Opening / Middlegame / Endgame); each chapter reads aloud
 * paragraph-by-paragraph via the shared useProseReader engine, with a
 * follow-along highlight, click-any-paragraph-to-start-there, and a
 * per-paragraph relisten. Renders nothing when no chapter has content.
 */
export function BookReader({ openingName, overview, keyIdeas }: BookReaderProps): React.ReactNode {
  const chapters = useMemo<Chapter[]>(() => {
    const out: Chapter[] = [];
    const openingPages = getOpeningBookPages(openingName).map((p, i) => pageToPassage('opening', i, p));
    if (openingPages.length > 0) {
      out.push({ id: 'opening', label: 'Opening', intro: CHAPTER_INTRO.opening, passages: openingPages });
    }
    const groups = getConceptBookGroups([openingName, overview ?? '', ...(keyIdeas ?? [])].join('. '));
    for (const g of groups) {
      const id = g.label.toLowerCase() === 'endgame' ? 'endgame' : 'middlegame';
      const passages = g.items.map((it, i) => conceptToPassage(id, i, it.name, it.passage));
      if (passages.length > 0) {
        out.push({ id, label: g.label, intro: CHAPTER_INTRO[id], passages });
      }
    }
    return out;
  }, [openingName, overview, keyIdeas]);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeChapter = chapters[activeIdx] as Chapter | undefined;

  const units = useMemo<ProseUnit[]>(
    () =>
      (activeChapter?.passages ?? []).flatMap((p) =>
        p.paragraphs.map((para) => ({ id: para.id, text: para.spoken })),
      ),
    [activeChapter],
  );

  const reader = useProseReader(units);

  // Stop playback when the chapter changes.
  useEffect(() => {
    reader.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  if (chapters.length === 0 || !activeChapter) return null;

  const selectChapter = (idx: number): void => {
    if (idx === activeIdx) return;
    reader.stop();
    setActiveIdx(idx);
  };

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="book-reader">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-theme-text">From the Books</h3>
        <button
          type="button"
          onClick={reader.toggle}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors"
          aria-label={reader.isPlaying ? 'Pause reading' : 'Listen to this chapter'}
          data-testid="book-reader-play"
        >
          {reader.isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {reader.isPlaying ? 'Pause' : 'Listen'}
        </button>
      </div>

      {/* Chapter tabs */}
      <div className="flex gap-1.5 mb-3" role="tablist" data-testid="book-reader-tabs">
        {chapters.map((ch, idx) => {
          const active = idx === activeIdx;
          return (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectChapter(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                  : 'bg-theme-surface border border-theme-border text-theme-text-muted hover:text-amber-300 hover:border-amber-400/30'
              }`}
              data-testid={`book-reader-tab-${ch.id}`}
            >
              {ch.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-theme-text-muted/80 italic mb-1">{activeChapter.intro}</p>
      <p className="text-[11px] text-theme-text-muted/60 mb-3">Tap any paragraph to listen from there.</p>

      <div className="space-y-4" data-testid="book-reader-passages">
        {activeChapter.passages.map((p, i) => (
          <div key={`${activeChapter.id}-${i}`} className="border-l-2 border-amber-400/30 pl-3" data-testid={`book-reader-passage-${i}`}>
            {p.title && <p className="text-sm font-medium text-theme-text mb-1">{p.title}</p>}
            {p.paragraphs.map((para) => {
              const reading = reader.currentId === para.id;
              return (
                <div
                  key={para.id}
                  className={`group flex items-start gap-2 rounded -ml-1 pl-1 pr-1 py-0.5 mb-2 last:mb-0 cursor-pointer transition-colors ${
                    reading ? 'bg-amber-400/10' : 'hover:bg-amber-400/5'
                  }`}
                  onClick={() => reader.playFrom(para.id)}
                  data-testid={`book-paragraph-${para.id}`}
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
                    aria-label="Relisten to this paragraph"
                    data-testid={`book-paragraph-replay-${para.id}`}
                  >
                    <Volume2 size={13} />
                  </button>
                  <p className="text-sm text-theme-text-muted leading-relaxed">{para.text}</p>
                </div>
              );
            })}
            <footer className="text-xs text-theme-text-muted/70 mt-2">
              — {p.citation}{' '}
              <a
                href={`https://www.gutenberg.org/ebooks/${p.gutenbergId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400/80 hover:text-amber-300 underline"
              >
                (Project Gutenberg)
              </a>
            </footer>
          </div>
        ))}
      </div>
    </div>
  );
}
