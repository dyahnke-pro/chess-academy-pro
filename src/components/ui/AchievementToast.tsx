import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';

const AUTO_DISMISS_MS = 3000;

export function AchievementToast(): JSX.Element {
  const pendingAchievement = useAppStore((s) => s.pendingAchievement);
  const setPendingAchievement = useAppStore((s) => s.setPendingAchievement);

  useEffect(() => {
    if (!pendingAchievement) return;

    const timer = setTimeout(() => {
      setPendingAchievement(null);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [pendingAchievement, setPendingAchievement]);

  return (
    <AnimatePresence>
      {pendingAchievement && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-lg"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-accent)',
            color: 'var(--color-text)',
          }}
          data-testid="achievement-toast"
        >
          <span className="text-2xl">{pendingAchievement.icon}</span>
          <div>
            <div className="font-semibold text-sm">{pendingAchievement.name}</div>
            <div className="text-xs" style={{ color: 'var(--color-accent)' }}>
              +{pendingAchievement.xpReward} XP
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
