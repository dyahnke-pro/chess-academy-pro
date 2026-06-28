import { create } from 'zustand';

/**
 * reviewPromptStore — tiny runtime flag for the two-step review prompt.
 *
 * `reviewPromptService` decides WHEN to ask (after enough positive moments,
 * once) and flips `isOpen`. The globally-mounted <ReviewPrompt/> renders when
 * open. Kept separate from the service so the decision logic (async, Dexie-
 * backed) stays out of React.
 */
interface ReviewPromptState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useReviewPromptStore = create<ReviewPromptState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
