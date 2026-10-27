import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { answerReminderPrompt, shouldOfferReminders } from '../../services/reviewReminders';

/**
 * The one-time reminder offer (WO-COURSE-01 F): shown after the first Learn
 * puts positions into spaced review, never at launch. Our own card first, so
 * "Not now" leaves iOS's one-shot permission prompt unspent. Native only.
 * `recheck` changes when the page reloads its opening, so the card appears
 * the moment a Learn adds the first cards.
 */
export function ReminderOffer({ recheck }: { recheck: unknown }): JSX.Element | null {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    void shouldOfferReminders().then((v) => { if (live) setShow(v); });
    return () => { live = false; };
  }, [recheck]);
  if (!show) return null;
  const answer = (yes: boolean): void => {
    setShow(false);
    void answerReminderPrompt(yes);
  };
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-3" data-testid="reminder-offer">
      <BellRing size={18} className="text-purple-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-theme-text">Want a reminder when these are due?</p>
        <p className="text-xs text-theme-text-muted mt-0.5">One a day at most, only when something is due.</p>
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={() => answer(true)} className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-semibold" data-testid="reminder-offer-yes">
            Remind me
          </button>
          <button type="button" onClick={() => answer(false)} className="px-3 py-1.5 rounded-lg text-xs text-theme-text-muted hover:text-theme-text" data-testid="reminder-offer-no">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
