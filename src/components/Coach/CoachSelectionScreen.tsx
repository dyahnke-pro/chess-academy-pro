import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { voiceService } from '../../services/voiceService';
import { getScenarioTemplate } from '../../services/coachTemplates';
import { CoachCard } from './CoachCard';
import type { CoachPersonality } from '../../types';

const COACHES: {
  id: CoachPersonality;
  name: string;
  tagline: string;
  style: string;
  requiredLevel: number;
}[] = [
  {
    id: 'danya',
    name: 'Danya',
    tagline: 'The Encouraging Teacher',
    style: 'Warm, clear explanations, celebrates your progress',
    requiredLevel: 1,
  },
  {
    id: 'kasparov',
    name: 'Kasparov',
    tagline: 'The Demanding Champion',
    style: 'Intense, attack-focused, pushes you to the limit',
    requiredLevel: 5,
  },
  {
    id: 'fischer',
    name: 'Fischer',
    tagline: 'The Perfectionist',
    style: 'Precise, theory-focused, demands flawless preparation',
    requiredLevel: 10,
  },
];

interface CoachSelectionScreenProps {
  onSelect: (personality: CoachPersonality) => void;
}

export function CoachSelectionScreen({ onSelect }: CoachSelectionScreenProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const playerLevel = activeProfile?.level ?? 1;

  const handleSelect = async (personality: CoachPersonality): Promise<void> => {
    if (!activeProfile) return;

    const updated = {
      ...activeProfile,
      coachPersonality: personality,
      unlockedCoaches: activeProfile.unlockedCoaches.includes(personality)
        ? activeProfile.unlockedCoaches
        : [...activeProfile.unlockedCoaches, personality],
    };
    setActiveProfile(updated);
    await db.profiles.update(activeProfile.id, {
      coachPersonality: personality,
      unlockedCoaches: updated.unlockedCoaches,
    });

    // Play welcome voice
    const greeting = getScenarioTemplate(personality, 'chat_greeting', {
      playerName: activeProfile.name,
    });
    void voiceService.speak(greeting, personality);

    onSelect(personality);
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-8 p-6 max-w-3xl mx-auto w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="coach-selection-screen"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-theme-text mb-2">Choose Your Coach</h1>
        <p className="text-theme-text-muted">
          Select a coaching style that suits your learning
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {COACHES.map((coach, i) => (
          <motion.div
            key={coach.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
          >
            <CoachCard
              personality={coach.id}
              name={coach.name}
              tagline={coach.tagline}
              style={coach.style}
              unlocked={playerLevel >= coach.requiredLevel}
              requiredLevel={coach.requiredLevel}
              selected={activeProfile?.coachPersonality === coach.id}
              onSelect={() => void handleSelect(coach.id)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
