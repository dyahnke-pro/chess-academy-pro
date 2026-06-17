import { useNavigate } from 'react-router-dom';
import { GraduationCap, Library, ChevronLeft } from 'lucide-react';
import { PageHelp } from '../Layout/PageHelp';

/**
 * The Academy — the school surface, reached from Coach. It is a SEPARATE
 * build from the Openings explorer: it holds the structured Opening
 * Courses and the Coaches Library of master books, kept together here.
 */
export function CoachAcademyPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="coach-academy"
    >
      <div className="relative mt-2 flex items-center justify-center">
        <button
          type="button"
          onClick={() => { void navigate('/coach/home'); }}
          aria-label="Back to Coach"
          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-center">The Academy</h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <PageHelp
            helpId="coach-academy"
            title="The Academy"
            steps={[
              { label: 'Opening Courses', body: 'Enrolled GM-style opening courses — a numbered chapter syllabus with progress and a finish line. Pick up where you left off.' },
              { label: 'The Coaches Library', body: "The masters' own public-domain books, read aloud with live playable boards where the original printed a diagram." },
              { label: 'Separate from Openings', body: 'The Academy is its own build — distinct from the Openings explorer, which stays your reference and repertoire trainer.' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 flex-1 content-start max-w-lg mx-auto w-full">
        <button
          type="button"
          data-testid="academy-tile-courses"
          onClick={() => { void navigate('/academy'); }}
          className="border-2 rounded-2xl bg-indigo-500/10 border-indigo-500/30 py-8 px-5 flex items-center gap-4 text-left hover:bg-indigo-500/20 transition-colors"
        >
          <GraduationCap size={40} className="text-indigo-400 shrink-0" />
          <span>
            <span className="block text-lg font-bold text-indigo-300">Opening Courses</span>
            <span className="block text-sm text-theme-text-muted">Structured GM-style courses — a chapter syllabus with progress and a finish line.</span>
          </span>
        </button>

        <button
          type="button"
          data-testid="academy-tile-library"
          onClick={() => { void navigate('/coach/library'); }}
          className="border-2 rounded-2xl bg-rose-500/10 border-rose-500/30 py-8 px-5 flex items-center gap-4 text-left hover:bg-rose-500/20 transition-colors"
        >
          <Library size={40} className="text-rose-400 shrink-0" />
          <span>
            <span className="block text-lg font-bold text-rose-300">The Coaches Library</span>
            <span className="block text-sm text-theme-text-muted">Five master books, read aloud with live boards — the masters' own words.</span>
          </span>
        </button>
      </div>
    </div>
  );
}
