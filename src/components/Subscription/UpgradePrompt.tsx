import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles } from 'lucide-react';
import type { ProFeatureId } from '../../types/subscription';

const FEATURE_LABELS: Record<ProFeatureId, { title: string; description: string }> = {
  aiCoach: {
    title: 'AI Chess Coach',
    description: 'Get personalized coaching, game analysis, and lesson plans powered by AI.',
  },
  weaknessDetection: {
    title: 'Weakness Detection',
    description: 'Identify and train your weak spots with targeted drills.',
  },
  proRepertoires: {
    title: 'Pro Repertoires',
    description: 'Access advanced opening lines and gambits from top players.',
  },
  voiceCoaching: {
    title: 'Voice Coaching',
    description: 'Hear your coach explain moves and ideas aloud.',
  },
  cloudSync: {
    title: 'Cloud Sync',
    description: 'Back up your progress and sync across devices.',
  },
  gameAnalysisAI: {
    title: 'AI Game Analysis',
    description: 'Get deep AI-powered insights on your games beyond engine evaluation.',
  },
};

interface UpgradePromptProps {
  feature: ProFeatureId;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps): JSX.Element {
  const navigate = useNavigate();
  const { title, description } = FEATURE_LABELS[feature];

  if (compact) {
    return (
      <button
        onClick={() => void navigate('/upgrade')}
        className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400 transition-colors hover:bg-amber-500/20"
      >
        <Crown className="h-4 w-4" />
        <span>Unlock {title}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
        <Sparkles className="h-8 w-8 text-amber-400" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-white">{title}</h2>
      <p className="mb-6 max-w-sm text-sm text-neutral-400">{description}</p>
      <button
        onClick={() => void navigate('/upgrade')}
        className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-amber-400"
      >
        <Crown className="h-5 w-5" />
        Upgrade to Pro
      </button>
      <p className="mt-3 text-xs text-neutral-500">
        $4.99/month or $34.99/year — 7-day free trial
      </p>
    </div>
  );
}
