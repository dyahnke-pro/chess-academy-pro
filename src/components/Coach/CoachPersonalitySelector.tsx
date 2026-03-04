import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { CoachPersonality } from '../../types';

const PERSONALITIES: { id: CoachPersonality; name: string; style: string }[] = [
  { id: 'danya', name: 'Danya', style: 'Warm, encouraging, clear explanations' },
  { id: 'kasparov', name: 'Kasparov', style: 'Aggressive, demanding, attack-focused' },
  { id: 'fischer', name: 'Fischer', style: 'Perfectionist, precise, theory-focused' },
];

export function CoachPersonalitySelector(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const current = activeProfile?.coachPersonality ?? 'danya';

  const handleSelect = (personality: CoachPersonality): void => {
    if (!activeProfile) return;
    const updated = { ...activeProfile, coachPersonality: personality };
    setActiveProfile(updated);
    void db.profiles.update(activeProfile.id, { coachPersonality: personality });
  };

  return (
    <div className="space-y-2" data-testid="coach-personality-selector">
      {PERSONALITIES.map((p) => (
        <button
          key={p.id}
          onClick={() => handleSelect(p.id)}
          className={`w-full text-left p-3 rounded-lg border transition-colors ${
            current === p.id
              ? 'border-theme-accent bg-theme-accent/10'
              : 'border-theme-border bg-theme-surface hover:bg-theme-border'
          }`}
          data-testid={`personality-${p.id}`}
        >
          <div className="text-sm font-semibold text-theme-text">{p.name}</div>
          <div className="text-xs text-theme-text-muted">{p.style}</div>
        </button>
      ))}
    </div>
  );
}
