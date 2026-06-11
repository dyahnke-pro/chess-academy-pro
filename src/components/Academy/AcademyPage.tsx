import { useEffect, useRef, useState } from 'react';
import { Swords, Play, Pause, SkipForward, SkipBack, Headphones } from 'lucide-react';
import { voiceService } from '../../services/voiceService';
import { PHILOSOPHY_OF_A_GENERAL } from '../../data/academy/philosophyOfAGeneral';
import { PageHelp } from '../Layout/PageHelp';

/**
 * The Academy — the school surface. v1 hosts "The Philosophy of A General",
 * the board-free doctrine, as an audiobook: tap play and it reads the whole
 * book aloud chapter-to-chapter via TTS (`voiceService.speakReadAloud`, which
 * bypasses the verbosity gate — the sanctioned read-aloud path), or tap any
 * chapter to read its text + CliffsNotes. Zero-LLM: authored prose only.
 */
export function AcademyPage(): JSX.Element {
  const book = PHILOSOPHY_OF_A_GENERAL;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Guards auto-advance against stop/skip: a new play increments the token,
  // so an in-flight chapter that resolves after a stop won't advance.
  const tokenRef = useRef(0);

  const speakFrom = (start: number, token: number): void => {
    const run = async (i: number): Promise<void> => {
      if (token !== tokenRef.current) return;
      if (i >= book.chapters.length) {
        setPlaying(false);
        return;
      }
      setIndex(i);
      const ch = book.chapters[i];
      const text = `${ch.title}. ${ch.paragraphs.join(' ')}`;
      try {
        await voiceService.speakReadAloud(text);
      } catch {
        /* interrupted — stop/skip handles state */
      }
      if (token !== tokenRef.current) return;
      await run(i + 1);
    };
    void run(start);
  };

  const play = (from?: number): void => {
    voiceService.stop();
    const token = ++tokenRef.current;
    setPlaying(true);
    speakFrom(from ?? index, token);
  };

  const pause = (): void => {
    tokenRef.current += 1;
    voiceService.stop();
    setPlaying(false);
  };

  const toggle = (): void => {
    if (playing) pause();
    else play();
  };

  const goTo = (i: number): void => {
    play(i);
  };

  const prev = (): void => goTo(Math.max(0, index - 1));
  const next = (): void => goTo(Math.min(book.chapters.length - 1, index + 1));

  // Stop speech if the user navigates away.
  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      voiceService.stop();
    };
  }, []);

  const current = book.chapters[index];

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="academy"
    >
      <div className="relative mt-2">
        <h1 className="text-xl font-bold text-center">The Academy</h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <PageHelp
            helpId="academy"
            title="The Academy"
            steps={[
              { label: 'Listen', body: 'Tap play to hear the whole book read aloud — made for the commute. It keeps playing chapter to chapter, so you can pocket the phone and just listen.' },
              { label: 'Read', body: 'Tap any chapter to open its full text, CliffsNotes, and sources, and read along.' },
              { label: 'The doctrine', body: 'Learn to think like a general: see the whole field, seize the initiative, mass at the decisive point, and impose your will.' },
            ]}
          />
        </div>
      </div>

      {/* Book / audiobook hero */}
      <div
        className="max-w-lg mx-auto w-full rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 p-5 flex flex-col gap-3"
        data-testid="academy-book"
      >
        <div className="flex items-center gap-3">
          <Swords size={28} className="text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">{book.title}</h2>
            <p className="text-xs text-indigo-300/80">{book.subtitle}</p>
          </div>
        </div>
        <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>{book.tagline}</p>

        <div className="flex items-center justify-center gap-5 pt-1">
          <button
            onClick={prev}
            className="text-indigo-300/80 hover:text-indigo-300 transition-colors disabled:opacity-30"
            disabled={index === 0}
            aria-label="Previous chapter"
            data-testid="academy-prev"
          >
            <SkipBack size={24} />
          </button>
          <button
            onClick={toggle}
            className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-400/60 flex items-center justify-center text-indigo-200 hover:bg-indigo-500/30 transition-all"
            aria-label={playing ? 'Pause' : 'Play'}
            data-testid="academy-play"
          >
            {playing ? <Pause size={28} /> : <Play size={28} className="ml-0.5" />}
          </button>
          <button
            onClick={next}
            className="text-indigo-300/80 hover:text-indigo-300 transition-colors disabled:opacity-30"
            disabled={index === book.chapters.length - 1}
            aria-label="Next chapter"
            data-testid="academy-next"
          >
            <SkipForward size={24} />
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          {playing ? 'Now playing' : 'Paused'} · {current.label} — {current.title}
        </p>
      </div>

      {/* Chapter list / reader */}
      <div className="max-w-lg mx-auto w-full flex flex-col gap-2" data-testid="academy-chapters">
        {book.chapters.map((ch, i) => {
          const active = i === index;
          return (
            <div
              key={ch.id}
              className={`rounded-xl border transition-all ${active ? 'bg-indigo-500/10 border-indigo-500/40' : 'border-white/10'}`}
            >
              <button
                onClick={() => goTo(i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                data-testid={`academy-chapter-${i}`}
              >
                {active && playing
                  ? <Headphones size={16} className="text-indigo-400 shrink-0 animate-pulse" />
                  : <Play size={16} className="text-indigo-400/70 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] uppercase tracking-wide text-indigo-300/70">{ch.label}</span>
                  <p className="text-sm font-semibold truncate">{ch.title}</p>
                </div>
              </button>

              {active && (
                <div className="px-4 pb-4 flex flex-col gap-3" data-testid="academy-chapter-body">
                  {ch.paragraphs.map((p, pi) => (
                    <p key={pi} className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{p}</p>
                  ))}
                  {ch.cliffsNotes.length > 0 && (
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-300/80 mb-1">CliffsNotes</p>
                      <ul className="list-disc pl-5 flex flex-col gap-1">
                        {ch.cliffsNotes.map((c, ci) => (
                          <li key={ci} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ch.sources && (
                    <p className="text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>Sources: {ch.sources}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
