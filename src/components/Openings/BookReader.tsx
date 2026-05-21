import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Play, Pause, SkipForward } from 'lucide-react';
import { sanitizeForTTS, voiceService } from '../../services/voiceService';
import {
  getOpeningBookPages,
  getConceptBookGroups,
  type BookPage,
  type BookPassage,
} from '../../services/chessConceptService';

interface ReaderPassage {
  /** Optional lead-in (concept name) shown bold above the passage. */
  title?: string;
  paragraphs: string[];
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

function pageToPassage(p: BookPage): ReaderPassage {
  return {
    paragraphs: p.text.split('\n\n').filter(Boolean),
    citation: citationFor(p),
    gutenbergId: p.gutenbergId,
  };
}

function conceptToPassage(name: string, p: BookPassage): ReaderPassage {
  return {
    title: name,
    paragraphs: p.text.split('\n\n').filter(Boolean),
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
 * Audiobook-style tabbed book reader for the Understand zone. Replaces
 * the separate "From the Books" (opening) and middlegame/endgame book
 * cards with one reader: chapters as tabs (Opening / Middlegame /
 * Endgame), each read aloud passage-by-passage via the canonical voice
 * path with a follow-along highlight. Renders nothing when no chapter
 * has content.
 */
export function BookReader({ openingName, overview, keyIdeas }: BookReaderProps): React.ReactNode {
  const chapters = useMemo<Chapter[]>(() => {
    const out: Chapter[] = [];
    const openingPages = getOpeningBookPages(openingName).map(pageToPassage);
    if (openingPages.length > 0) {
      out.push({ id: 'opening', label: 'Opening', intro: CHAPTER_INTRO.opening, passages: openingPages });
    }
    const groups = getConceptBookGroups([openingName, overview ?? '', ...(keyIdeas ?? [])].join('. '));
    for (const g of groups) {
      const id = g.label.toLowerCase() === 'endgame' ? 'endgame' : 'middlegame';
      const passages = g.items.map((it) => conceptToPassage(it.name, it.passage));
      if (passages.length > 0) {
        out.push({ id, label: g.label, intro: CHAPTER_INTRO[id], passages });
      }
    }
    return out;
  }, [openingName, overview, keyIdeas]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPassage, setCurrentPassage] = useState(-1);
  // Supersedes any in-flight playback chain so a stale promise can't
  // advance the highlight after pause / chapter switch / unmount.
  const tokenRef = useRef(0);
  const passageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const stop = useCallback(() => {
    tokenRef.current++;
    voiceService.stop();
    setIsPlaying(false);
  }, []);

  // Stop voice on unmount.
  useEffect(() => () => { tokenRef.current++; voiceService.stop(); }, []);

  const activeChapter = chapters[activeIdx];

  const playFrom = useCallback(
    async (chapterIdx: number, startPassage: number): Promise<void> => {
      const chapter = chapters[chapterIdx];
      const token = ++tokenRef.current;
      setIsPlaying(true);
      for (let i = startPassage; i < chapter.passages.length; i++) {
        if (tokenRef.current !== token) return;
        setCurrentPassage(i);
        passageRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const p = chapter.passages[i];
        const text = `${p.title ? p.title + '. ' : ''}${p.paragraphs.join(' ')}`;
        try {
          await voiceService.speakForced(sanitizeForTTS(text));
        } catch {
          /* keep reading even if one passage fails */
        }
        if (tokenRef.current !== token) return;
      }
      if (tokenRef.current === token) {
        setIsPlaying(false);
        setCurrentPassage(-1);
      }
    },
    [chapters],
  );

  if (chapters.length === 0) return null;

  const togglePlay = (): void => {
    if (isPlaying) stop();
    else void playFrom(activeIdx, currentPassage < 0 ? 0 : currentPassage);
  };

  const skip = (): void => {
    const next = Math.min(activeChapter.passages.length - 1, (currentPassage < 0 ? 0 : currentPassage) + 1);
    if (isPlaying) void playFrom(activeIdx, next);
    else setCurrentPassage(next);
  };

  const selectChapter = (idx: number): void => {
    if (idx === activeIdx) return;
    stop();
    setActiveIdx(idx);
    setCurrentPassage(-1);
    passageRefs.current = [];
  };

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="book-reader">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-theme-text">From the Books</h3>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors"
            aria-label={isPlaying ? 'Pause reading' : 'Read aloud'}
            data-testid="book-reader-play"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause' : 'Listen'}
          </button>
          <button
            type="button"
            onClick={skip}
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-amber-300 hover:bg-amber-500/15 transition-colors"
            aria-label="Next passage"
            data-testid="book-reader-skip"
          >
            <SkipForward size={14} />
          </button>
        </div>
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

      <p className="text-xs text-theme-text-muted/80 italic mb-3">{activeChapter.intro}</p>

      <div className="space-y-4" data-testid="book-reader-passages">
        {activeChapter.passages.map((p, i) => {
          const reading = isPlaying && i === currentPassage;
          return (
            <div
              key={`${activeChapter.id}-${i}`}
              ref={(el) => { passageRefs.current[i] = el; }}
              className={`border-l-2 pl-3 transition-colors rounded-r ${
                reading ? 'border-amber-400 bg-amber-400/5' : 'border-amber-400/30'
              }`}
              data-testid={`book-reader-passage-${i}`}
            >
              {p.title && <p className="text-sm font-medium text-theme-text mb-1">{p.title}</p>}
              {p.paragraphs.map((para, j) => (
                <p key={j} className="text-sm text-theme-text-muted leading-relaxed mb-2 last:mb-0">
                  {para}
                </p>
              ))}
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
          );
        })}
      </div>
    </div>
  );
}
