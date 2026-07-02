import { create } from 'zustand';
import { useAppStore } from './appStore';

/**
 * AI data-sharing consent (Apple Guideline 5.1.1(i)/5.1.2(i)).
 *
 * The coach sends gameplay data — board positions, typed questions, and the
 * spoken transcript when the mic is used — to third-party AI + voice providers
 * (DeepSeek, Anthropic, AWS Polly). Apple requires an explicit in-app
 * permission BEFORE that data is shared; disclosing it only in the privacy
 * policy is "not sufficient."
 *
 * The persisted decision lives on the active profile (`aiDataConsent`, in
 * Dexie). This store holds the transient prompt state + a promise-based
 * `requestConsent()` the coach's send chokepoint awaits, so a single
 * globally-mounted <AiConsentModal /> serves both the blocking first-run
 * prompt and any later just-in-time re-prompt.
 */
interface AiConsentState {
  /** Whether the consent modal is currently shown. */
  promptOpen: boolean;
  /** Resolver(s) for in-flight requestConsent() promises, chained so
   *  concurrent requests all settle from one user decision. */
  _resolve: ((granted: boolean) => void) | null;
  /**
   * Resolve immediately if consent is already granted; otherwise open the
   * blocking modal and resolve when the user chooses. Multiple concurrent
   * callers share the single prompt.
   */
  requestConsent: () => Promise<boolean>;
  /** Called by the modal once the user picks. Closes the prompt and settles
   *  every awaiting requestConsent() promise. */
  resolveConsent: (granted: boolean) => void;
}

export const useAiConsentStore = create<AiConsentState>((set, get) => ({
  promptOpen: false,
  _resolve: null,
  requestConsent: () => {
    if (hasAiConsent()) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      const prev = get()._resolve;
      set({
        promptOpen: true,
        // Chain any existing resolver so a first-run prompt already open and a
        // send-triggered request both settle together.
        _resolve: (granted: boolean) => {
          prev?.(granted);
          resolve(granted);
        },
      });
    });
  },
  resolveConsent: (granted: boolean) => {
    const resolve = get()._resolve;
    set({ promptOpen: false, _resolve: null });
    resolve?.(granted);
  },
}));

/** True when the active profile has granted AI data-sharing consent. */
export function hasAiConsent(): boolean {
  return useAppStore.getState().activeProfile?.aiDataConsent === 'granted';
}

/** True when consent has never been asked (undefined) for the active profile. */
export function aiConsentUnasked(): boolean {
  const p = useAppStore.getState().activeProfile;
  return !!p && p.aiDataConsent === undefined;
}
