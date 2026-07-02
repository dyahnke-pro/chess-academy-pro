import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';
import { useAiConsentStore, hasAiConsent, aiConsentUnasked } from './aiConsentStore';
import { buildUserProfile } from '../test/factories';

function setConsent(consent: 'granted' | 'denied' | undefined): void {
  useAppStore.setState({ activeProfile: buildUserProfile({ aiDataConsent: consent }) });
}

describe('aiConsentStore', () => {
  beforeEach(() => {
    useAiConsentStore.setState({ promptOpen: false, _resolve: null });
    useAppStore.setState({ activeProfile: null });
  });

  it('hasAiConsent reflects the active profile', () => {
    setConsent('granted');
    expect(hasAiConsent()).toBe(true);
    setConsent('denied');
    expect(hasAiConsent()).toBe(false);
    setConsent(undefined);
    expect(hasAiConsent()).toBe(false);
  });

  it('aiConsentUnasked is true only when undefined', () => {
    setConsent(undefined);
    expect(aiConsentUnasked()).toBe(true);
    setConsent('granted');
    expect(aiConsentUnasked()).toBe(false);
    useAppStore.setState({ activeProfile: null });
    expect(aiConsentUnasked()).toBe(false);
  });

  it('requestConsent resolves immediately when already granted, without opening the prompt', async () => {
    setConsent('granted');
    const result = await useAiConsentStore.getState().requestConsent();
    expect(result).toBe(true);
    expect(useAiConsentStore.getState().promptOpen).toBe(false);
  });

  it('requestConsent opens the blocking prompt and settles on the user decision', async () => {
    setConsent(undefined);
    const pending = useAiConsentStore.getState().requestConsent();
    expect(useAiConsentStore.getState().promptOpen).toBe(true);

    useAiConsentStore.getState().resolveConsent(true);
    await expect(pending).resolves.toBe(true);
    expect(useAiConsentStore.getState().promptOpen).toBe(false);
    expect(useAiConsentStore.getState()._resolve).toBeNull();
  });

  it('a single decision settles multiple concurrent requests', async () => {
    setConsent(undefined);
    const a = useAiConsentStore.getState().requestConsent();
    const b = useAiConsentStore.getState().requestConsent();
    useAiConsentStore.getState().resolveConsent(false);
    await expect(a).resolves.toBe(false);
    await expect(b).resolves.toBe(false);
  });
});
