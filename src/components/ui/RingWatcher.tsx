import { useEffect } from 'react';
import { onRepCompleted, getCompletedRepKeysToday } from '../../services/repCompletion';
import { loadUpNext } from '../../services/upNextLoader';
import { freeUserOnPaywall } from '../../services/upNextLoader';
import { recordRingClosed } from '../../services/trainingWeek';
import { grantTrainingOpeningCredit } from '../../services/freeTierService';
import { reward } from '../../services/rewardService';
import { captureEvent } from '../../services/analytics';
import { logAppAudit } from '../../services/appAuditor';

/**
 * The ONE listener for finished bites (mounted once in the app shell): a bite
 * finished → the finish burst; the third closes today's ring → the fanfare and
 * a trained day; a gold week (once a month, free users on paywall builds) →
 * an earned opening. Surfaces only mark reps done; this decides how it feels.
 */
export function RingWatcher(): null {
  useEffect(() => {
    const off = onRepCompleted((key) => {
      void (async () => {
        const [{ ring }, done] = await Promise.all([loadUpNext(), getCompletedRepKeysToday()]);
        const inRing = ring.some((p) => p.key === key);
        if (!inRing) {
          if (key.startsWith('up:')) reward({ kind: 'solved', label: 'Done' });
          return;
        }
        const filled = ring.filter((p) => done.has(p.key)).length;
        if (filled < ring.length) {
          reward({ kind: 'solved', label: `Done · ${filled}/${ring.length} today` });
          return;
        }
        const res = await recordRingClosed(new Date(), freeUserOnPaywall(), grantTrainingOpeningCredit);
        if (!res.firstCloseToday) return;
        if (res.earnedOpening) {
          reward({ kind: 'newBest', label: 'Gold week — you earned a free opening' });
          captureEvent('opening_earned', { days_this_week: res.daysThisWeek, source: 'gold-week' });
        } else {
          reward({ kind: 'rankUp', label: res.goldWeek ? "Gold week · today's training done" : "Today's training: done" });
        }
        void logAppAudit({
          kind: 'today-ring-closed',
          category: 'subsystem',
          source: 'RingWatcher',
          summary: `ring closed · ${res.daysThisWeek} days this week${res.goldWeek ? ' · gold' : ''}${res.earnedOpening ? ' · opening earned' : ''}`,
          details: JSON.stringify({ ...res, ring: ring.map((p) => p.kind) }),
        });
      })().catch(() => undefined);
    });
    return off;
  }, []);
  return null;
}
