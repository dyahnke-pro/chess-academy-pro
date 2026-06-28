import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useReviewPromptStore } from '../../stores/reviewPromptStore';
import { handlePositiveResponse, handleNegativeResponse } from '../../services/reviewPromptService';
import { FeedbackForm } from './FeedbackForm';

/**
 * ReviewPrompt — the two-step "happiness gate" before the store-review dialog.
 *
 * Step 1 ("ask"): "Enjoying Chess Academy Pro?" → Yes / Not really.
 *   - Yes        → request the native store-review dialog (public 5-stars).
 *   - Not really → swap to the FeedbackForm so the gripe (and any lurking bug)
 *                  reaches David PRIVATELY instead of becoming a 1-star review.
 *
 * Mounted globally in App.tsx; renders only when `reviewPromptStore.isOpen`.
 * Armed by reviewPromptService after enough positive moments.
 */
export function ReviewPrompt(): JSX.Element | null {
  const isOpen = useReviewPromptStore((s) => s.isOpen);
  const close = useReviewPromptStore((s) => s.close);
  const [step, setStep] = useState<'ask' | 'feedback'>('ask');

  if (!isOpen) return null;

  function dismiss(): void {
    setStep('ask');
    close();
  }

  async function onLoveIt(): Promise<void> {
    await handlePositiveResponse();
    dismiss();
  }

  async function onNotReally(): Promise<void> {
    await handleNegativeResponse();
    setStep('feedback');
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-[#1a1a1a] p-5 shadow-xl">
        {step === 'ask' ? (
          <>
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c9a84c]/15">
                <Star className="h-6 w-6 text-[#c9a84c]" />
              </div>
              <button type="button" onClick={dismiss} aria-label="Close" className="text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-lg font-bold text-zinc-100">Enjoying Chess Academy Pro?</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Your feedback helps the coach get better.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void onLoveIt()}
                className="w-full rounded-xl bg-[#c9a84c] py-3 text-sm font-bold text-[#0f0f0f] transition active:scale-[0.99]"
              >
                Yes, I love it
              </button>
              <button
                type="button"
                onClick={() => void onNotReally()}
                className="w-full rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 transition active:scale-[0.99]"
              >
                Not really
              </button>
            </div>
          </>
        ) : (
          <FeedbackForm onClose={dismiss} />
        )}
      </div>
    </div>
  );
}
