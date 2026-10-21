import { useEffect, useRef } from 'react';
import { Swords } from 'lucide-react';

interface BossIntroProps {
  name: string;
  /** The boss's fixed 2–3 sentence intro (spoken once by the page). */
  intro: string;
  onStart: () => void;
}

/** Before a boss game (Lane C): who it is, then Start. No rewinds, flags or
 *  talk follow until the recap. */
export function BossIntro({ name, intro, onStart }: BossIntroProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, []);
  return (
    <div ref={ref} className="px-3 pb-2" data-testid="boss-intro">
      <div className="rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-lg font-bold text-theme-text"><Swords size={20} className="text-rose-400" />{name}</div>
        <p className="text-sm text-theme-text" data-testid="boss-intro-text">{intro}</p>
        <button onClick={onStart} className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white min-h-[44px]" data-testid="boss-intro-start">
          Start
        </button>
      </div>
    </div>
  );
}
