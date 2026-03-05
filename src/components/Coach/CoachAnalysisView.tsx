import { useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { getPostGameAnalysis, getDailyLesson, getWeeklyReport, buildProfileContext } from '../../services/coachFeatureService';
import { Loader, BookOpen, TrendingUp, Calendar } from 'lucide-react';

type AnalysisType = 'post_game_analysis' | 'daily_lesson' | 'weekly_report';

const ANALYSIS_OPTIONS: { type: AnalysisType; label: string; icon: JSX.Element; description: string }[] = [
  { type: 'daily_lesson', label: 'Daily Lesson', icon: <BookOpen size={16} />, description: 'Learn something new today' },
  { type: 'post_game_analysis', label: 'Game Analysis', icon: <TrendingUp size={16} />, description: 'Review your recent play' },
  { type: 'weekly_report', label: 'Weekly Report', icon: <Calendar size={16} />, description: 'Your progress this week' },
];

const ANALYSIS_FN: Record<AnalysisType, typeof getPostGameAnalysis> = {
  post_game_analysis: getPostGameAnalysis,
  daily_lesson: getDailyLesson,
  weekly_report: getWeeklyReport,
};

export function CoachAnalysisView(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [activeType, setActiveType] = useState<AnalysisType | null>(null);

  const handleRequest = useCallback(async (type: AnalysisType): Promise<void> => {
    if (!activeProfile) return;
    setLoading(true);
    setResult('');
    setActiveType(type);

    const context = buildProfileContext(activeProfile);
    const fn = ANALYSIS_FN[type];
    const text = await fn(context, activeProfile.coachPersonality, (chunk) => {
      setResult((prev) => prev + chunk);
    });

    setResult(text);
    setLoading(false);
  }, [activeProfile]);

  if (!activeProfile) {
    return (
      <div className="space-y-4" data-testid="coach-analysis-view">
        <p className="text-sm text-theme-text-muted p-4">Set up your profile to use the AI coach.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="coach-analysis-view">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {ANALYSIS_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => void handleRequest(opt.type)}
            disabled={loading}
            className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
              activeType === opt.type
                ? 'border-theme-accent bg-theme-accent/10'
                : 'border-theme-border bg-theme-surface hover:bg-theme-border'
            } disabled:opacity-50`}
            data-testid={`analysis-${opt.type}`}
          >
            <div className="text-theme-accent">{opt.icon}</div>
            <div>
              <div className="text-sm font-medium text-theme-text">{opt.label}</div>
              <div className="text-xs text-theme-text-muted">{opt.description}</div>
            </div>
          </button>
        ))}
      </div>

      {loading && !result && (
        <div className="flex items-center gap-2 text-theme-text-muted p-4">
          <Loader size={14} className="animate-spin" />
          <span className="text-sm">Generating analysis...</span>
        </div>
      )}

      {result && (
        <div className="bg-theme-surface rounded-lg p-4 border border-theme-border">
          <p className="text-sm text-theme-text leading-relaxed whitespace-pre-wrap" data-testid="analysis-result">
            {result}
          </p>
        </div>
      )}
    </div>
  );
}
